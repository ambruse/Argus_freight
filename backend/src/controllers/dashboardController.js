// src/controllers/dashboardController.js
// ─────────────────────────────────────────────────────────────
//  Returns all metric counts for the dashboard in one query.
//  "Follow Ups Due" = active-status shipments whose last_follow_up
//  is older than 4 hours from now.
// ─────────────────────────────────────────────────────────────
const { query } = require('../config/dbHelper');
const db = require('../config/db');

const ACTIVE_STATUSES = ['Pending', 'Quoted', 'Customer Review'];

const getMetrics = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'calling_agent') {
      const result = await db.query(`
        SELECT
          COUNT(*) AS total_enquiries,
          COUNT(*) FILTER (WHERE status = 'Lost') AS lost,
          COUNT(*) FILTER (WHERE status = 'Lead') AS lead,
          COUNT(*) FILTER (WHERE status = 'No Lead') AS no_lead,
          COUNT(*) FILTER (WHERE status = 'Confirmed') AS confirmed
        FROM call_enquiries
        WHERE calling_agent = $1
      `, [req.user.username]);

      const raw = result.rows[0];
      return res.json({
        success: true,
        data: {
          totalEnquiries: parseInt(raw.total_enquiries || 0),
          lost: parseInt(raw.lost || 0),
          lead: parseInt(raw.lead || 0),
          noLead: parseInt(raw.no_lead || 0),
          confirmed: parseInt(raw.confirmed || 0),
          isCallingAgent: true
        }
      });
    }

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
    let filterRole = req.query.role; // e.g. "operator" | "sales" | "calling_agent" | "customer"
    let filterUser = req.query.filter_user; // username of the selected user

    // Secure/default filters for non-admins to their own user records
    if (req.user.role !== 'admin') {
      filterRole = req.user.role;
      filterUser = req.user.username;
    }

    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required.' });
    }

    let sql = `
      SELECT
        COUNT(*) FILTER (WHERE note IS NULL OR note != 'Direct Booking') AS total_rfqs,
        COUNT(*) FILTER (WHERE status = 'Confirmed') AS total_confirmed,
        SUM(cost) FILTER (WHERE status = 'Confirmed') AS total_cost,
        SUM(profit) FILTER (WHERE status = 'Confirmed') AS total_profit
      FROM shipments
      WHERE EXTRACT(YEAR FROM created_at) = $1
        AND EXTRACT(MONTH FROM created_at) = $2
    `;

    const params = [year, month];
    let paramIndex = 3;

    if (filterRole && filterRole !== 'all') {
      if (filterRole === 'customer') {
        if (filterUser && filterUser !== 'all') {
          // Get customer_id for this specific username
          const userRes = await query(req, `SELECT customer_id FROM users WHERE username = $1 AND role = 'customer'`, [filterUser]);
          if (userRes.rows.length > 0 && userRes.rows[0].customer_id) {
            sql += ` AND customer_id = $${paramIndex}`;
            params.push(userRes.rows[0].customer_id);
            paramIndex++;
          } else {
            sql += ` AND customer_id = 'NONE'`;
          }
        } else {
          sql += ` AND customer_id IS NOT NULL`;
        }
      } else if (filterRole === 'operator') {
        if (filterUser && filterUser !== 'all') {
          sql += ` AND LOWER(operator) = LOWER($${paramIndex})`;
          params.push(filterUser);
          paramIndex++;
        } else {
          // Filter by all operators from the users table
          sql += ` AND LOWER(operator) IN (SELECT LOWER(username) FROM users WHERE role = 'operator')`;
        }
      } else if (filterRole === 'sales') {
        if (filterUser && filterUser !== 'all') {
          sql += ` AND LOWER(refer_by) = LOWER($${paramIndex})`;
          params.push(filterUser);
          paramIndex++;
        } else {
          // Filter by all sales users from the users table
          sql += ` AND LOWER(refer_by) IN (SELECT LOWER(username) FROM users WHERE role = 'sales')`;
        }
      } else if (filterRole === 'calling_agent') {
        if (filterUser && filterUser !== 'all') {
          sql += ` AND LOWER(refer_by) = LOWER($${paramIndex})`;
          params.push(filterUser);
          paramIndex++;
        } else {
          // Filter by all calling agents from the users table
          sql += ` AND LOWER(refer_by) IN (SELECT LOWER(username) FROM users WHERE role = 'calling_agent')`;
        }
      }
    }

    const result = await query(req, sql, params);
    const raw = result.rows[0];
    const cost = parseFloat(raw.total_cost || 0);
    const profit = parseFloat(raw.total_profit || 0);

    // Query Call Enquiries and Leads metrics for Calling Agent and Sales
    let enquiriesSql = `
      SELECT
        COUNT(*) AS total_call_enquiries,
        COUNT(*) FILTER (WHERE is_lead = true OR status = 'Lead') AS total_leads,
        COUNT(*) FILTER (WHERE status = 'Confirmed') AS total_enquiries_won,
        COUNT(*) FILTER (WHERE assigned_sales IS NOT NULL) AS total_assigned_call_enquiries,
        COUNT(*) FILTER (WHERE assigned_sales IS NOT NULL AND status = 'Confirmed') AS total_assigned_enquiries_won
      FROM call_enquiries
      WHERE EXTRACT(YEAR FROM created_at) = $1
        AND EXTRACT(MONTH FROM created_at) = $2
    `;

    const enquiriesParams = [year, month];
    let enquiriesParamIndex = 3;

    if (filterRole && filterRole !== 'all') {
      if (filterRole === 'calling_agent') {
        if (filterUser && filterUser !== 'all') {
          enquiriesSql += ` AND LOWER(calling_agent) = LOWER($${enquiriesParamIndex})`;
          enquiriesParams.push(filterUser);
          enquiriesParamIndex++;
        } else {
          enquiriesSql += ` AND LOWER(calling_agent) IN (SELECT LOWER(username) FROM users WHERE role = 'calling_agent')`;
        }
      } else if (filterRole === 'sales') {
        if (filterUser && filterUser !== 'all') {
          enquiriesSql += ` AND LOWER(assigned_sales) = LOWER($${enquiriesParamIndex})`;
          enquiriesParams.push(filterUser);
          enquiriesParamIndex++;
        } else {
          enquiriesSql += ` AND LOWER(assigned_sales) IN (SELECT LOWER(username) FROM users WHERE role = 'sales')`;
        }
      } else {
        // Operator or Customer - no call enquiries
        enquiriesSql += ` AND 1 = 0`;
      }
    }

    const enquiriesResult = await query(req, enquiriesSql, enquiriesParams);
    const enqRaw = enquiriesResult.rows[0];

    const summary = {
      totalRFQs: parseInt(raw.total_rfqs || 0),
      totalConfirmed: parseInt(raw.total_confirmed || 0),
      totalCost: cost,
      totalProfit: profit,
      totalCustomerPrice: cost + profit,
      
      // Call Enquiries stats
      totalCallEnquiries: parseInt(enqRaw?.total_call_enquiries || 0),
      totalLeads: parseInt(enqRaw?.total_leads || 0),
      totalEnquiriesWon: parseInt(enqRaw?.total_enquiries_won || 0),
      totalAssignedCallEnquiries: parseInt(enqRaw?.total_assigned_call_enquiries || 0),
      totalAssignedEnquiriesWon: parseInt(enqRaw?.total_assigned_enquiries_won || 0)
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
