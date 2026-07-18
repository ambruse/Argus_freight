const db = require('../config/db');

const DEFAULT_SIGNATURE_HTML = `
  <p>Best regards,</p>
  <p style="color:#3b78c8;">
    <b>Muhammed Jabir</b><br>
    PRICING AND OPERATION<br>
    ARGUS SHIPPING
  </p>
  <p>📞 +974 30512233</p>
  <p>📧 <a href="mailto:jabir@argusshipping.co">jabir@argusshipping.co</a></p>
  <p>🌐 <a href="https://www.argusshipping.co">www.argusshipping.co</a></p>
  <br>
  <p style="background-color:yellow;color:red;padding:8px;font-size:10px;">
    Confidentiality Notice: This email and any attachments are confidential and may contain legally privileged information intended solely for the named recipient(s). Any unauthorized review, use, disclosure, copying, or distribution is strictly prohibited. If received in error, please notify the sender immediately and permanently delete the message.
  </p>
`;

const DEFAULT_SIGNATURE_TEXT = `
Best regards,

Muhammed Jabir
PRICING AND OPERATION
ARGUS SHIPPING

📞 +974 30512233

📧 jabir@argusshipping.co

🌐 www.argusshipping.co

Confidentiality Notice: This email and any attachments are confidential and may contain legally privileged information intended solely for the named recipient(s). Any unauthorized review, use, disclosure, copying, or distribution is strictly prohibited. If received in error, please notify the sender immediately and permanently delete the message.
`;

const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

const getSignatureForUser = async (userId) => {
  if (!userId) {
    return { html: DEFAULT_SIGNATURE_HTML, text: DEFAULT_SIGNATURE_TEXT };
  }
  try {
    const res = await db.query("SELECT email_signature FROM users WHERE id = $1", [userId]);
    const sig = res.rows[0]?.email_signature;
    if (sig && sig.trim()) {
      return { html: sig, text: stripHtml(sig) };
    }
  } catch (err) {
    console.error('Error fetching signature for user:', err);
  }
  return { html: DEFAULT_SIGNATURE_HTML, text: DEFAULT_SIGNATURE_TEXT };
};

module.exports = { getSignatureForUser, DEFAULT_SIGNATURE_HTML, DEFAULT_SIGNATURE_TEXT };
