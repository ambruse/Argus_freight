const nodemailer = require('nodemailer');

/**
 * Creates and returns a configured Nodemailer transporter.
 * Always uses smtp.gmail.com:587 with IPv4 — never localhost.
 * The user/pass come from DB credentials (set in Settings), not env vars.
 *
 * @param {string} user - SMTP username / email address
 * @param {string} pass - SMTP password / Google App Password
 * @returns {import('nodemailer').Transporter}
 */
const createSmtpTransporter = (user, pass) => {
  // Strip accidental surrounding quotes and whitespace from credentials
  const cleanUser = user && typeof user === 'string'
    ? user.trim().replace(/^["']|["']$/g, '')
    : user;
  const cleanPass = pass && typeof pass === 'string'
    ? pass.trim().replace(/^["']|["']$/g, '')
    : pass;

  // ALWAYS use smtp.gmail.com — never trust SMTP_HOST env var since it
  // defaults to undefined/localhost on many cPanel setups and causes
  // "connect ECONNREFUSED ::1:587"
  const host = 'smtp.gmail.com';
  const port = 587;

  console.log(`[mailer] Creating transporter: host=${host}:${port} user=${cleanUser}`);

  return nodemailer.createTransport({
    host,
    port,
    secure: false,   // port 587 uses STARTTLS, not SSL
    auth: {
      user: cleanUser,
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    },
    family: 4        // force IPv4 — prevents ::1 loopback issue
  });
};

module.exports = {
  createSmtpTransporter
};
