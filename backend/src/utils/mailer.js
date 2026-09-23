const nodemailer = require('nodemailer');

/**
 * Creates and returns a configured Nodemailer transporter
 * with resilient fallback to smtp.gmail.com and IPv4 resolution.
 *
 * @param {string} user - SMTP username / email address
 * @param {string} pass - SMTP password / Google App Password
 * @returns {import('nodemailer').Transporter}
 */
const createSmtpTransporter = (user, pass) => {
  const cleanUser = user && typeof user === 'string' ? user.trim().replace(/^["']|["']$/g, '') : user;
  const cleanPass = pass && typeof pass === 'string' ? pass.trim().replace(/^["']|["']$/g, '') : pass;

  const rawHost = process.env.SMTP_HOST ? process.env.SMTP_HOST.trim() : '';
  const host = (rawHost && rawHost !== 'localhost' && rawHost !== '127.0.0.1' && rawHost !== '::1')
    ? rawHost
    : 'smtp.gmail.com';

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: cleanUser,
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    },
    family: 4
  });
};

module.exports = {
  createSmtpTransporter
};
