// src/routes/shipments.js
const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllShipments, getShipmentByRef, createShipment,
  updateShipment, updateStatus, updateTracking, deleteShipment, getReplies, sendReply, sendFollowUp, sendQuotation,
  getChatMessages, sendChatMessage
} = require('../controllers/shipmentController');

// All shipment routes require authentication
router.use(authenticateToken);

router.get('/',                     getAllShipments);
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
router.get('/chat/:cust_req_no',    getChatMessages);
router.post('/chat/:cust_req_no',   sendChatMessage);

module.exports = router;
