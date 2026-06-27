const db = require('../config/db');

// ── Helper for Round Robin Assignment ───────────────────────
async function getNextSalesUser() {
  const resUsers = await db.query("SELECT username FROM users WHERE role = 'sales' ORDER BY id ASC");
  if (resUsers.rows.length === 0) return null;
  const salesUsers = resUsers.rows.map(r => r.username);

  const resLast = await db.query("SELECT assigned_sales FROM call_enquiries WHERE assigned_sales IS NOT NULL ORDER BY id DESC LIMIT 1");
  if (resLast.rows.length === 0) {
    return salesUsers[0];
  }

  const lastAssigned = resLast.rows[0].assigned_sales;
  const idx = salesUsers.indexOf(lastAssigned);
  if (idx === -1) {
    return salesUsers[0];
  }

  const nextIdx = (idx + 1) % salesUsers.length;
  return salesUsers[nextIdx];
}

// ── POST /api/call-enquiries ─────────────────────────────────
const createEnquiry = async (req, res, next) => {
  try {
    const {
      customer_name, company, type, customer_number, customer_email,
      customer_address, details, status, is_lead, call_duration
    } = req.body;

    if (!customer_name || !customer_number || !details || !status) {
      return res.status(400).json({ success: false, message: 'Missing compulsory fields.' });
    }

    // Assign sales person ONLY if it is a lead
    const assigned_sales = is_lead ? await getNextSalesUser() : null;
    const calling_agent = req.user.username;

    const result = await db.query(
      `INSERT INTO call_enquiries 
       (customer_name, company, type, customer_number, customer_email, customer_address, details, status, calling_agent, assigned_sales, is_lead, call_duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        customer_name, company || null, type || null, customer_number,
        customer_email || null, customer_address || null, details, status,
        calling_agent, assigned_sales, is_lead || false, call_duration || null
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/call-enquiries ──────────────────────────────────
const getEnquiries = async (req, res, next) => {
  try {
    const { role, username } = req.user;
    let queryStr = 'SELECT * FROM call_enquiries';
    const params = [];

    if (role === 'calling_agent') {
      queryStr += ' WHERE calling_agent = $1';
      params.push(username);
    } else if (role === 'sales') {
      queryStr += ' WHERE assigned_sales = $1';
      params.push(username);
    } else if (role === 'admin') {
      // admin sees all
    } else {
      // other roles shouldn't access this ideally, return empty or all?
      // For now, let's just return empty for operator if they hit this route
      return res.json({ success: true, data: [] });
    }

    queryStr += ' ORDER BY created_at DESC';

    const result = await db.query(queryStr, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/call-enquiries/:id/status ─────────────────────
const updateEnquiryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { role, username } = req.user;

    // Verify it exists
    const chk = await db.query('SELECT assigned_sales FROM call_enquiries WHERE id = $1', [id]);
    if (chk.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    // Only assigned sales can update status (or admin)
    if (role === 'sales' && chk.rows[0].assigned_sales !== username) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this enquiry.' });
    }

    const validStatuses = ['Lead', 'No Lead', 'Confirmed', 'Lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const result = await db.query(
      'UPDATE call_enquiries SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { createEnquiry, getEnquiries, updateEnquiryStatus };
