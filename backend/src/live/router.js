const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { createStore } = require('./store');
const { createEnquiries } = require('./enquiries');
const { isIP } = require('node:net');
const referenceCatalog = require('../../../frontend/lib/data/port-catalog.json');
function clientAddress(req) {
    const remote = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    // Only accept the last forwarded hop from an explicitly trusted proxy.
    // The reverse proxy must append/overwrite X-Forwarded-For, never pass it unchanged.
    const trusted = ['127.0.0.1', '::1', ...(process.env.LIVE_PRICING_PROXY_IPS || '').split(',').map(x=>x.trim()).filter(Boolean)];
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').at(-1)?.trim();
    return trusted.includes(remote) && isIP(forwarded) ? forwarded : remote;
}
function createRouter(pool, coreReady = Promise.resolve(), enquiryOptions = {}) {
    const router = express.Router(), store = createStore(pool);
    const enquiries = createEnquiries(pool, store, enquiryOptions);
    const run = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
    router.use(express.json({ limit: '256kb' }));
    // The host application's JSON parser runs first; enforce our smaller limit too.
    router.use((req,res,next)=>{
        if (req.method !== 'GET' && (!req.is('application/json') || !req.body || typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({message:'Send a JSON object.'});
        if (req.body && Buffer.byteLength(JSON.stringify(req.body)) > 262144) return res.status(413).json({message:'Shipment or tariff data exceeds 256 KB.'});
        next();
    });
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    // The real reference directory remains usable during a pricing database outage.
    // Keep this read-only route independent of database-backed request throttling.
    const directoryRequests = new Map();
    router.get('/locations', run(async (req, res) => {
        const now = Date.now(), address = clientAddress(req);
        for (const [key, entry] of directoryRequests) if (entry.until <= now) directoryRequests.delete(key);
        const entry = directoryRequests.get(address) || { hits: 0, until: now + 60000 };
        if (++entry.hits > 120 || (!directoryRequests.has(address) && directoryRequests.size >= 4096))
            return res.status(429).json({ message: 'Too many requests. Please wait a minute.' });
        directoryRequests.set(address, entry);
        try {
            await coreReady;
            return res.json(await store.options());
        } catch (err) {
            console.error('Live pricing location directory fallback:', err.code || err.name);
            return res.json({
                directory_source: 'reference',
                countries: referenceCatalog.countries,
                locations: referenceCatalog.ports.map(p => ({ id: p.id, name: p.port_name, country: p.country_name, kind: p.mode, aliases: p.aliases || [] }))
            });
        }
    }));
    router.use((req, res, next) => { Promise.resolve(coreReady).then(() => store.ready()).then(() => next(), next); });
    router.use((req, res, next) => { if (req.method !== 'GET' && req.headers['sec-fetch-site'] === 'cross-site')
        return res.status(403).json({ message: 'Cross-site requests are not allowed.' }); next(); });
    router.use((req, res, next) => store.limit(clientAddress(req), 120).then(() => next(), next));
    router.get('/catalog', run(async (req, res) => res.json(await store.publicCatalog())));
    router.post('/enquiries', run(async (req, res) => {
        await store.limit('enquiry:' + clientAddress(req), 5);
        await store.limit('enquiry-global', 120);
        res.json(await enquiries.submit(req.body));
    }));
    router.post('/quotes', run(async (req, res) => { await store.limit('quote:' + clientAddress(req), 20); res.status(201).json(await store.quote(req.body)); }));
    router.get('/quotes/:id', run(async (req, res) => res.json(await store.getQuote(req.params.id))));
    router.use((req, res, next) => { if (!/^Bearer \S+$/.test(req.headers.authorization || ''))
        return res.status(401).json({ message: 'Sign in to manage freight rates.' }); authenticateToken(req, res, next); });
    router.use((req, res, next) => { pool.query('SELECT id,role,is_deleted,is_stalled FROM users WHERE id=?', [req.user.id]).then(([[u]]) => { if (!u || u.is_deleted || u.is_stalled || !['operator', 'admin'].includes(u.role))
        return res.status(403).json({ message: 'Freight rate access is not permitted.' }); req.user = u; next(); }, next); });
    router.get('/rates', run(async (req, res) => res.json(await store.list(req.user, req.query))));
    const adminOnly = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Administrator access required.' });
    router.get('/enquiry-settings', adminOnly, run(async (req, res) => res.json(await enquiries.settings())));
    router.put('/enquiry-settings', adminOnly, run(async (req, res) => res.json(await enquiries.saveSettings(req.user, req.body))));
    router.get('/enquiries', adminOnly, run(async (req, res) => res.json(await enquiries.history())));
    router.post('/rates', run(async (req, res) => res.status(201).json(await store.save(req.user, req.body))));
    router.put('/rates/:id', run(async (req, res) => res.json(await store.save(req.user, req.body, req.params.id))));
    router.post('/rates/:id/action', run(async (req, res) => res.json(await store.action(req.user, req.params.id, req.body))));
    router.get('/rates/:id/history', run(async (req, res) => res.json(await store.history(req.user, req.params.id))));
    router.post('/preview', run(async (req, res) => res.json(await store.preview(req.body))));
    router.post('/comparison', run(async (req, res) => { if (req.user.role !== 'admin')
        return res.status(403).json({ message: 'Administrator access required.' }); res.json(await store.comparison(req.body)); }));
    router.post('/road-locations', run(async (req, res) => res.status(201).json(await store.road(req.user, req.body))));
    router.use((err, req, res, next) => { if (res.headersSent)
        return next(err); if (!err.status)
        console.error('Live pricing request failed:', err.code || err.name); res.status(err.status || 503).json({ message: err.status ? err.message : 'Live pricing is temporarily unavailable. Please retry or request a custom quotation.' }); });
    return router;
}
module.exports = { createRouter };
