const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { createService } = require('../freight/service');

function createRouter(pool) {
  const router = express.Router();
  const service = createService(pool);
  const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 } });
  router.use((req,res,next) => { res.set('Cache-Control','no-store'); res.set('X-Robots-Tag','noindex, nofollow'); next(); });
  router.use((req,res,next) => {
    if (req.is('application/json') && Buffer.byteLength(JSON.stringify(req.body || {}),'utf8') > 32768) return res.status(413).json({ message: 'Rate data exceeds 32 KB.' });
    next();
  });
  router.use(wrap(async (req,res,next) => { await service.throttle(`ip:${req.ip}`,180); next(); }));
  router.get('/catalog', wrap(async (req,res) => res.json(await service.catalogs())));
  router.get('/public', wrap(async (req,res) => res.json(await service.publicRates(req.query))));
  router.get('/quote/:id', wrap(async (req,res) => {
    try { res.redirect(303,await service.quote(req.params.id,req.query)); }
    catch (error) {
      if (!error.status) throw error;
      const message = error.message.replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      res.status(error.status).type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Freight enquiry | Argus Shipping</title><body style="font:16px/1.6 system-ui;background:#F8F5EE;color:#30271a;padding:32px;max-width:600px;margin:auto"><h1>Freight enquiry</h1><p>${message}</p><p><a href="/freight-rates" style="color:#805b0d">Return to this week's freight rates</a></p></body></html>`);
    }
  }));
  // Use the existing JWT verifier, but never accept query tokens for this feature.
  router.use((req,res,next) => {
    if (!/^Bearer \S+$/.test(req.get('authorization') || '')) return res.status(401).json({ message: 'Log in to manage freight rates.' });
    authenticateToken(req,res,next);
  });
  router.use(wrap(async (req,res,next) => {
    const [[user]] = await pool.query('SELECT id,username,role,is_deleted,is_stalled FROM users WHERE id=?',[req.user.id]);
    if (!user || user.is_deleted || user.is_stalled || !['admin','operator'].includes(user.role)) return res.status(403).json({ message: 'Active operator or administrator access required.' });
    req.user = user;
    if (req.method !== 'GET') {
      // Bearer-only credentials are not ambient cookies; JSON/custom authorization
      // requires CORS preflight. Explicitly reject cross-site browser mutations too.
      if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ message: 'Cross-site changes are not allowed.' });
      await service.throttle(`write:${user.id}`,30);
    }
    next();
  }));
  router.get('/',wrap(async (req,res) => res.json(await service.list(req.user,req.query))));
  router.get('/contact-settings',wrap(async (req,res) => res.json(await service.contact(req.user))));
  router.put('/contact-settings',wrap(async (req,res) => res.json(await service.saveContact(req.user,req.body))));
  router.post('/',wrap(async (req,res) => res.status(201).json(await service.save(req.user,req.body))));
  router.put('/:id',wrap(async (req,res) => res.json(await service.save(req.user,req.body,req.params.id))));
  router.post('/:id/decision',wrap(async (req,res) => res.json(await service.decide(req.user,req.params.id,req.body))));
  router.get('/:id/history',wrap(async (req,res) => res.json(await service.history(req.user,req.params.id))));
  router.post('/config/:type',wrap(async (req,res) => {
    if (!['locations','containers'].includes(req.params.type)) return res.sendStatus(404);
    res.json(await service.configure(req.user,req.params.type,req.body));
  }));
  router.post('/:id/attachments',upload.single('file'),wrap(async (req,res) => res.status(201).json(await service.attach(req.user,req.params.id,Number(req.body.version),req.file))));
  router.get('/attachments/:id',wrap(async (req,res) => {
    const file = await service.download(req.user,req.params.id);
    res.set('Content-Type','application/pdf');
    res.set('Content-Disposition',`attachment; filename="${file.filename}"`);
    res.set('Content-Security-Policy',"sandbox; default-src 'none'");
    res.send(file.content);
  }));
  router.use((err,req,res,next) => {
    if (res.headersSent) return next(err);
    const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
    if (status === 500) console.error('[Freight]', err.code || err.name);
    if (status === 429) res.set('Retry-After','60');
    res.status(status).json({ message: status === 500 ? 'Freight rates are temporarily unavailable. Please try again.' : err.message });
  });
  return router;
}
module.exports = { createRouter };
