// src/controllers/dashboardController.js
// ─────────────────────────────────────────────────────────────
//  Returns all metric counts for the dashboard in one query.
//  "Follow Ups Due" = active-status shipments whose last_follow_up
//  is older than 4 hours from now.
// ─────────────────────────────────────────────────────────────
const { query } = require('../config/dbHelper');

const ACTIVE_STATUSES = ['Pending', 'Quoted', 'Customer Review'];

const getMetrics = async (req, res, next) => {
  try {
    const result = await query(req, `
      SELECT
        -- ── Row 1: Pipeline ──────────────────────────────────
        COUNT(*) FILTER (WHERE note IS NULL OR note != 'Direct Booking') AS total_rfqs,
        COUNT(*) FILTER (WHERE status = 'Pending' AND (note IS NULL OR note != 'Direct Booking')) AS quotation_pending,
        COUNT(*) FILTER (WHERE status = 'Quoted' AND (note IS NULL OR note != 'Direct Booking')) AS quoted,
        COUNT(*) FILTER (WHERE status = 'Customer Review' AND (note IS NULL OR note != 'Direct Booking')) AS customer_review,
        COUNT(*) FILTER (WHERE status = 'Confirmed')                  AS confirmed,

        -- ── Row 2: Execution ─────────────────────────────────
        COUNT(*) FILTER (WHERE status = 'Files Pending')              AS files_pending,
        COUNT(*) FILTER (WHERE status = 'Completed')                  AS completed,
        COUNT(*) FILTER (WHERE status = 'Return Pending')             AS return_pending,
        COUNT(*) FILTER (WHERE status = 'Cancelled')                  AS cancelled,

        -- ── Follow Ups Due ───────────────────────────────────
        --  Shipments in active pipeline statuses whose last follow-up
        --  was more than 4 hours ago.
        COUNT(*) FILTER (
          WHERE status = ANY($1::shipment_status[])
            AND last_follow_up < NOW() - INTERVAL '4 hours'
            AND (note IS NULL OR note != 'Direct Booking')
        )                                                             AS follow_ups_due

      FROM shipments
    `, [ACTIVE_STATUSES]);

    // All values come back as strings from pg — cast to integers
    const raw = result.rows[0];
    const metrics = {
      // Pipeline
      totalRFQs:        parseInt(raw.total_rfqs),
      quotationPending: parseInt(raw.quotation_pending),
      quoted:           parseInt(raw.quoted),
      customerReview:   parseInt(raw.customer_review),
      confirmed:        parseInt(raw.confirmed),
      // Execution
      filesPending:     parseInt(raw.files_pending),
      completed:        parseInt(raw.completed),
      returnPending:    parseInt(raw.return_pending),
      cancelled:        parseInt(raw.cancelled),
      followUpsDue:     parseInt(raw.follow_ups_due),
    };

    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
};

const getMonthlySummary = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);

    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required.' });
    }

    const result = await query(req, `
      SELECT
        COUNT(*) FILTER (WHERE note IS NULL OR note != 'Direct Booking') AS total_rfqs,
        COUNT(*) FILTER (WHERE status = 'Confirmed') AS total_confirmed,
        SUM(cost) FILTER (WHERE status = 'Confirmed') AS total_cost,
        SUM(profit) FILTER (WHERE status = 'Confirmed') AS total_profit
      FROM shipments
      WHERE EXTRACT(YEAR FROM created_at) = $1
        AND EXTRACT(MONTH FROM created_at) = $2
    `, [year, month]);

    const raw = result.rows[0];
    const cost = parseFloat(raw.total_cost || 0);
    const profit = parseFloat(raw.total_profit || 0);
    const summary = {
      totalRFQs: parseInt(raw.total_rfqs || 0),
      totalConfirmed: parseInt(raw.total_confirmed || 0),
      totalCost: cost,
      totalProfit: profit,
      totalCustomerPrice: cost + profit
    };

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

const getUnreadReplies = async (req, res, next) => {
  try {
    const myEmail = process.env.SMTP_USER || '';
    const result = await query(req, `
      SELECT r.*, s.pol, s.pod, s.dear_who, s.status AS shipment_status
      FROM shipment_replies r
      JOIN shipments s ON r.ref_no = s.ref_no
      WHERE r.is_read = false 
        AND LOWER(r.from_email) != LOWER($1)
      ORDER BY r.received_at ASC
    `, [myEmail]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMetrics, getMonthlySummary, getUnreadReplies };
