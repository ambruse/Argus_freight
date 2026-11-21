'use strict';
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { createTrackingService } = require('./service');
const { notifyTracking } = require('./realtime');
const { check } = require('./schema');
function respond(handler) { return async (req, res) => { try {
    await handler(req, res);
}
catch (error) {
    const status = error.statusCode || error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
    if (status >= 500)
        console.error('[Tracking]', error.message);
    res.status(status).json({ success: false, message: status >= 500 ? 'Tracking is temporarily unavailable. Please retry or contact support.' : error.message });
} }; }
function createTrackingRouters(pool, { io, ready = Promise.resolve(), service: providedService } = {}) {
    const service = providedService || createTrackingService(pool, { notify: (key, row) => notifyTracking(io || global.io, key, row) });
    const internal = express.Router(), publicRouter = express.Router();
    let checked = false;
    const requireReady = async (req, res, next) => { try {
        await (typeof ready === 'function' ? ready() : ready);
        if (!checked) {
            const result = await check(pool);
            if (!result.ready)
                throw new Error('Run backend/scripts/migrate-tracking.js --up');
            checked = true;
        }
        next();
    }
    catch (error) {
        console.error('[Tracking readiness]', error.message);
        res.status(503).json({ success: false, message: 'Tracking is temporarily unavailable. Please contact Argus support.' });
    } };
    internal.use(authenticateToken, requireReady, async (req, res, next) => { try {
        req.trackingUser = await service.userForToken(req.user);
        if (!['admin', 'operator', 'tracker'].includes(req.trackingUser.role))
            return res.status(403).json({ success: false, message: 'Tracking management requires an administrator, Tracker or assigned operator.' });
        next();
    }
    catch (error) {
        res.status(error.status || 403).json({ success: false, message: error.message });
    } });
    internal.get('/tracking', respond(async (req, res) => res.json(await service.list(req.trackingUser, req.query))));
    internal.get('/tracking/:ref', respond(async (req, res) => res.json(await service.detail(req.trackingUser, req.params.ref))));
    internal.post('/tracking', respond(async (req, res) => {
        if (!['existing', 'new'].includes(req.body?.method))
            return res.status(400).json({ success: false, message: 'Choose existing or new shipment registration.' });
        if (req.body.method === 'new' && req.body.ref_no)
            return res.status(400).json({ success: false, message: 'New shipment references are generated automatically.' });
        res.status(req.body.method === 'new' ? 201 : 200).json(await service.save(req.trackingUser, req.body.ref_no, req.body, { isNew: req.body.method === 'new' }));
    }));
    internal.post('/tracking/bulk', respond(async (req, res) => {
        const { references, changes } = req.body || {};
        if (!Array.isArray(references) || references.length < 1 || references.length > 100 || references.some(r => typeof r !== 'string') || !changes || Object.keys(changes).some(k => !['track_status', 'eta', 'public_message'].includes(k)))
            return res.status(400).json({ success: false, message: 'Select 1–100 shipments and a shared stage, ETA or public message.' });
        const results = [];
        for (const ref of [...new Set(references)]) {
            try {
                await service.save(req.trackingUser, ref, changes);
                results.push({ ref_no: ref, success: true });
            }
            catch (error) {
                results.push({ ref_no: ref, success: false, message: error.statusCode < 500 ? error.message : 'Update failed; no changes saved for this shipment.' });
            }
        }
        res.json({ success: true, results });
    }));
    internal.patch('/:ref_no/tracking', respond(async (req, res) => res.json(await service.save(req.trackingUser, req.params.ref_no, req.body))));
    internal.get('/:ref_no/tracking/events', respond(async (req, res) => res.json(await service.history(req.trackingUser, req.params.ref_no))));
    internal.post('/:ref_no/tracking/events', respond(async (req, res) => { const body = { ...req.body }; delete body.correction_reason; res.status(201).json(await service.addEvent(req.trackingUser, req.params.ref_no, body)); }));
    internal.patch('/:ref_no/tracking/events/:id', respond(async (req, res) => { if (!/^\d+$/.test(req.params.id))
        return res.status(400).json({ success: false, message: 'Invalid event ID.' }); const body = { ...req.body }; if (body.correction_reason) {
        body.reason = body.correction_reason;
        delete body.correction_reason;
    } res.json(await service.addEvent(req.trackingUser, req.params.ref_no, body, req.params.id)); }));
    internal.get('/:ref_no/tracking/audit', respond(async (req, res) => res.json(await service.audits(req.trackingUser, req.params.ref_no))));
    // Keep non-tracking shipment routes out of this router's authentication guards.
    const scoped = express.Router();
    scoped.use((req, res, next) => /^\/(?:tracking(?:\/|$)|[^/]+\/tracking(?:\/|$))/.test(req.path) ? internal(req, res, next) : next());
    const limits = new Map();
    publicRouter.use((req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        const now = Date.now(), key = req.ip || req.socket.remoteAddress;
        let entry = limits.get(key);
        if (!entry || entry.until <= now) {
            entry = { hits: 0, until: now + 60000 };
            limits.set(key, entry);
        }
        if (limits.size > 10000) {
            for (const [ip, item] of limits)
                if (item.until <= now)
                    limits.delete(ip);
            if (limits.size > 10000) {
                res.setHeader('Retry-After', '60');
                return res.status(429).json({ success: false, message: 'Please wait before trying again.' });
            }
        }
        if (++entry.hits > 60) {
            res.setHeader('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
            return res.status(429).json({ success: false, message: 'Too many tracking requests. Please try again shortly.' });
        }
        next();
    }, requireReady);
    publicRouter.get('/:ref', respond(async (req, res) => { try {
        const data = await service.publicLookup(req.params.ref);
        res.json({ success: true, data });
    }
    catch (error) {
        if ([400, 404, 409].includes(error.status || error.statusCode))
            return res.json({ success: false, message: 'No tracking information found. Please enter the full reference.' });
        throw error;
    } }));
    return { internal: scoped, publicRouter, service };
}
module.exports = { createTrackingRouters };
