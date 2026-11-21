// src/routes/shipments.js
const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllShipments, getShipmentByRef, createShipment,
  updateShipment, updateStatus, updateTracking, deleteShipment, getReplies, sendReply, sendFollowUp, sendQuotation,
  getChatMessages, sendChatMessage, markAllRepliesAsRead, getFollowUpOverdue, snoozeFollowUp
} = require('../controllers/shipmentController');

// All shipment routes require authentication
router.use(authenticateToken);
router.use(async (req, res, next) => {
  try {
    const service = req.app.locals.trackingService;
    if (!service) return next();
    const user = await service.userForToken(req.user);
    req.user = { ...req.user, role: user.role };
    if (user.role !== 'admin') {
      const json = res.json.bind(res);
      const removeFinancials = value => {
        if (Array.isArray(value)) return value.map(removeFinancials);
        if (!value || typeof value !== 'object' || value instanceof Date) return value;
        return Object.fromEntries(Object.entries(value)
          .filter(([key]) => !['cost','profit','customer_charge','actual_profit'].includes(key))
          .map(([key, item]) => [key, removeFinancials(item)]));
      };
      res.json = value => json(removeFinancials(value));
    }
    next();
  } catch (error) { next(error); }
});

// Legacy mutations must not bypass the tracking service or its ownership checks.
router.use(async (req, res, next) => {
  const service = req.app.locals.trackingService;
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const recordMutation = (req.method === 'POST' && req.path === '/')
    || /^\/[^/]+(?:\/status)?$/.test(req.path) && mutating;
  if (!service || !recordMutation) return next();
  try {
    const user = await service.userForToken(req.user);
    if (!['admin', 'operator', 'sales'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Shipment changes require an authorized staff account.' });
    }
    if (req.method === 'POST' && req.path === '/') {
      if (user.role === 'sales') return res.status(403).json({ success: false, message: 'Direct shipment creation requires an administrator or operator.' });
      if (String(req.body?.status || '').toLowerCase() === 'confirmed') {
        return res.status(409).json({ success: false, message: 'Register confirmed shipments in Shipment Tracking Management (/shipment-tracking).' });
      }
    } else {
      const ref = decodeURIComponent(req.path.split('/')[1]);
      if (!await service.canAccessReference(user, ref)) return res.status(403).json({ success: false, message: 'This shipment is not assigned to your account.' });
      if (req.method === 'PUT') {
        let confirmed = false;
        try { confirmed = !!(await service.resolvePublic(ref)); } catch (error) { if (![400,404].includes(error.statusCode)) throw error; }
        if (confirmed) return res.status(409).json({ success: false, message: 'Edit confirmed shipment details using Shipment Tracking Management.' });
      }
    }
    if (user.role !== 'admin' && ['cost','profit','customer_charge','actual_profit'].some(field => req.body?.[field] != null && req.body[field] !== '')) {
      return res.status(403).json({ success: false, message: 'Only administrators can edit shipment financial information.' });
    }
    next();
  } catch (error) { next(error); }
});

router.get('/',                     getAllShipments);
router.get('/follow-up-overdue',     getFollowUpOverdue);
router.post('/replies/mark-all-read', markAllRepliesAsRead);
router.get('/:ref_no',              getShipmentByRef);
router.post('/',                    createShipment);
router.put('/:ref_no',              updateShipment);
router.patch('/:ref_no/status',     updateStatus);
router.patch('/:ref_no/tracking',   updateTracking);
router.delete('/:ref_no',           deleteShipment);
router.get('/:ref_no/replies',      getReplies);
router.post('/:ref_no/replies',     sendReply);
router.post('/:ref_no/follow-up',   sendFollowUp);
router.post('/:ref_no/send-quotation', sendQuotation);
router.post('/:ref_no/snooze-follow-up', snoozeFollowUp);
router.get('/chat/:cust_req_no',    getChatMessages);
router.post('/chat/:cust_req_no',   sendChatMessage);

module.exports = router;
