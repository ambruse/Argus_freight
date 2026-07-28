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
    const res = await db.query(
      "SELECT name, username, role, email_address, contact_number, email_signature FROM users WHERE id = $1",
      [userId]
    );
    const user = res.rows[0];
    if (user) {
      if (user.role === 'sales') {
        const salesName = user.name || user.username || '';
        const salesText = `Best regards,${salesName ? '\n\n' + salesName : ''}`;
        const salesHtml = `<p>Best regards,</p>${salesName ? `<p><b>${salesName}</b></p>` : ''}`;
        return { html: salesHtml, text: salesText };
      }
      if (user.email_signature && user.email_signature.trim()) {
        return { html: user.email_signature, text: stripHtml(user.email_signature) };
      }
      const name = user.name || user.username || 'Operator';
      const email = user.email_address || 'ops@argusshipping.co';
      const phone = user.contact_number || '+974 30512233';

      const customHtml = `
        <p>Best regards,</p>
        <p style="color:#3b78c8;">
          <b>${name}</b><br>
          PRICING AND OPERATION<br>
          ARGUS SHIPPING
        </p>
        <p>📞 ${phone}</p>
        <p>📧 <a href="mailto:${email}">${email}</a></p>
        <p>🌐 <a href="https://www.argusshipping.co">www.argusshipping.co</a></p>
        <br>
        <p style="background-color:yellow;color:red;padding:8px;font-size:10px;">
          Confidentiality Notice: This email and any attachments are confidential and may contain legally privileged information intended solely for the named recipient(s). Any unauthorized review, use, disclosure, copying, or distribution is strictly prohibited. If received in error, please notify the sender immediately and permanently delete the message.
        </p>
      `;
      const customText = `
Best regards,

${name}
PRICING AND OPERATION
ARGUS SHIPPING

📞 ${phone}

📧 ${email}

🌐 www.argusshipping.co

Confidentiality Notice: This email and any attachments are confidential and may contain legally privileged information intended solely for the named recipient(s). Any unauthorized review, use, disclosure, copying, or distribution is strictly prohibited. If received in error, please notify the sender immediately and permanently delete the message.
      `;
      return { html: customHtml, text: customText };
    }
  } catch (err) {
    console.error('Error fetching signature for user:', err);
  }
  return { html: DEFAULT_SIGNATURE_HTML, text: DEFAULT_SIGNATURE_TEXT };
};

module.exports = { getSignatureForUser, DEFAULT_SIGNATURE_HTML, DEFAULT_SIGNATURE_TEXT };
