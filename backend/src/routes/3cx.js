const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── POST /api/3cx/webhook ────────────────────────────────────
// Expected payload from 3CX CRM XML template:
// {
//   "CallType": "Inbound" | "Outbound" | "Missed",
//   "Number": "07987654321",
//   "Agent": "101", 
//   "Duration": "120",
//   "Status": "Answered"
// }
router.post('/webhook', async (req, res) => {
  try {
    const { CallType, Number: customerNumber, Agent, Duration, Status } = req.body;
    console.log('[3CX Webhook] Received payload:', req.body);

    if (!Agent) {
      return res.status(400).json({ success: false, message: 'Missing Agent extension.' });
    }

    // Lookup the user associated with this 3CX extension
    const userRes = await db.query('SELECT username FROM users WHERE agent_extension = $1', [Agent]);
    if (userRes.rows.length === 0) {
      console.warn(`[3CX Webhook] No ARGUS user found for extension ${Agent}`);
      return res.status(200).send('OK (Unmapped Extension)');
    }

    const username = userRes.rows[0].username;

    // Auto-create a call log record
    const insertRes = await db.query(
      `INSERT INTO call_enquiries 
       (customer_name, customer_number, details, status, calling_agent, is_lead, call_duration, call_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        'Unknown Customer',
        customerNumber || 'Unknown',
        `3CX Call (${CallType || 'Inbound'} - ${Status || 'Answered'})`,
        'No Lead',
        username,
        false,
        parseInt(Duration, 10) || 0
      ]
    );

    const newEnquiry = insertRes.rows[0];

    if (global.io) {
      // We expect the frontend to join a room with their username in lowercase
      global.io.to(`user_${username.toLowerCase()}`).emit('call_ended', {
        enquiry_id: newEnquiry.id,
        customer_number: customerNumber,
        call_duration: parseInt(Duration, 10) || 0,
        call_type: CallType,
        status: Status
      });
      console.log(`[3CX Webhook] Auto-created log ID ${newEnquiry.id} and emitted call_ended to user_${username.toLowerCase()}`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[3CX Webhook] Error processing payload:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ── GET /api/3cx/contact-lookup ──────────────────────────────
router.get('/contact-lookup', (req, res) => {
  console.log('[3CX Contact Lookup] Checking number:', req.query.Number);
  // Return empty array (standard 3CX expectation when no CRM record matched)
  res.json([]);
});

module.exports = router;
