const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const db = require('../config/db');

// Map to store active user sessions: username (lowercase) -> session details
const activeSessions = new Map();

/**
 * Resolves shipments and replies tables based on user role and username
 */
const getUserTables = (username, role) => {
  const cleanUsername = username.toLowerCase();
  if (role === 'admin' || cleanUsername === 'admin') {
    return {
      shipments: 'shipments',
      replies: 'shipment_replies'
    };
  }
  const suffix = cleanUsername.replace(/[^a-zA-Z0-9_]/g, '');
  return {
    shipments: `shipments_${suffix}`,
    replies: `shipment_replies_${suffix}`
  };
};

/**
 * Periodically or on-demand synchronises the inbox for a specific user session
 */
const syncInboxForUser = async (session, limit = 40) => {
  const { client, username, role, email } = session;
  if (session.isFetching) return;
  session.isFetching = true;

  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.mailboxOpen('INBOX');
      const total = status.exists;
      if (total === 0) return;

      const startSeq = Math.max(1, total - (limit - 1));
      const endSeq = total;
      const sequenceRange = `${startSeq}:${endSeq}`;

      const fetchedMessages = [];
      for await (let message of client.fetch(sequenceRange, { envelope: true, uid: true, flags: true })) {
        fetchedMessages.push(message);
      }

      const myEmail = email.toLowerCase().trim();
      const tables = getUserTables(username, role);

      // Verify if the shipments table exists to avoid errors on dynamic login/tables creation timing
      const tableCheck = await db.query(
        `SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = $1`,
        [tables.shipments]
      );
      if (tableCheck.rows.length === 0) {
        return;
      }

      for (const msg of fetchedMessages) {
        const fromEmail = msg.envelope?.from?.[0]?.address || 'Unknown';
        
        // Skip messages sent by ourselves
        if (fromEmail.toLowerCase().trim() === myEmail) continue;

        const messageId = msg.envelope?.messageId || null;
        const subject = msg.envelope?.subject || '';
        const date = msg.envelope?.date || new Date();
        const flags = msg.flags || new Set();
        const isReadInImap = flags.has('\\Seen');

        // Match ref_no
        const refMatch = subject.match(/(ARG-\d+)/i);
        const rfqPatternMatch = subject.match(/\/([A-Za-z0-9_-]+)\/CID\s*:\s*/i);
        const cidMatch = subject.match(/CID\s*:\s*([A-Za-z0-9]+)/i);

        const matchedRefNos = new Set();

        if (refMatch) {
          matchedRefNos.add(refMatch[1].toUpperCase());
        } else if (rfqPatternMatch) {
          matchedRefNos.add(rfqPatternMatch[1].toUpperCase());
        } else if (cidMatch) {
          const cid = cidMatch[1];
          try {
            const s = await db.query(`SELECT ref_no FROM ${tables.shipments} WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1`, [cid]);
            if (s.rows.length > 0) matchedRefNos.add(s.rows[0].ref_no);
          } catch (err) {
            // Ignore table query errors
          }
        }

        let bodyText = null;

        for (const linkedRefNo of matchedRefNos) {
          try {
            const exist = await db.query(`SELECT 1 FROM ${tables.shipments} WHERE ref_no = $1`, [linkedRefNo]);
            if (exist.rows.length > 0) {
              // Check if already in replies table
              let existsInDb = false;
              if (messageId) {
                const dupCheck = await db.query(`SELECT 1 FROM ${tables.replies} WHERE message_id = $1`, [messageId]);
                existsInDb = dupCheck.rows.length > 0;
              } else {
                const dupCheck = await db.query(
                  `SELECT 1 FROM ${tables.replies} 
                   WHERE ref_no = $1 AND from_email = $2 AND subject = $3 AND received_at = $4`,
                  [linkedRefNo, fromEmail, subject, date]
                );
                existsInDb = dupCheck.rows.length > 0;
              }

              if (!existsInDb) {
                if (bodyText === null) {
                  const singleFetch = await client.fetch(msg.uid, { source: true }, { uid: true });
                  let rawSource = null;
                  for await (let singleMsg of singleFetch) {
                    rawSource = singleMsg.source;
                  }
                  if (rawSource) {
                    const parsed = await simpleParser(rawSource);
                    bodyText = parsed.text || parsed.html || '';
                  } else {
                    bodyText = '';
                  }
                }

                if (bodyText && bodyText !== '') {
                  console.log(`[IMAP Service - ${username}] Importing reply to ${linkedRefNo} in ${tables.replies} from ${fromEmail} (Message-ID: ${messageId})`);
                  await db.query(
                    `INSERT INTO ${tables.replies} (ref_no, from_email, subject, body_text, received_at, is_read, message_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [linkedRefNo, fromEmail, subject, bodyText, date, isReadInImap, messageId]
                  );

                  // Update last_follow_up
                  await db.query(`UPDATE ${tables.shipments} SET last_follow_up = NOW() WHERE ref_no = $1`, [linkedRefNo]);
                }
              }
            }
          } catch (tableErr) {
            console.error(`[IMAP Service - ${username}] Error syncing for table ${tables.shipments}:`, tableErr.message);
          }
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error(`[IMAP Service - ${username}] Error during syncInboxForUser:`, err);
  } finally {
    session.isFetching = false;
  }
};

/**
 * Stops an active session for a user
 */
const stopUserSession = async (username, session) => {
  if (session.intervalId) {
    clearInterval(session.intervalId);
  }
  if (session.client) {
    try {
      await session.client.logout();
    } catch (e) {}
  }
  activeSessions.delete(username);
  console.log(`[IMAP Service] Stopped active IMAP session for user: ${username}`);
};

/**
 * Starts a new IMAP connection session for a configured user
 */
const startUserSession = async (user) => {
  const username = user.username.toLowerCase();
  const host = process.env.IMAP_HOST || 'imap.gmail.com';
  const port = parseInt(process.env.IMAP_PORT || '993', 10);
  const email = user.email_address;
  const pass = user.email_password;

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user: email, pass },
    logger: false,
  });

  const session = {
    client,
    username,
    role: user.role,
    email,
    pass,
    isFetching: false,
    intervalId: null
  };

  activeSessions.set(username, session);

  try {
    await client.connect();
    console.log(`[IMAP Service - ${username}] Connected successfully to inbox.`);

    await client.mailboxOpen('INBOX');

    // Sync history
    await syncInboxForUser(session, 50);

    // Live exists listener
    client.on('exists', async (data) => {
      console.log(`[IMAP Service - ${username}] New message exists. Count: ${data.count}`);
      await syncInboxForUser(session, 20);
    });

    // Fallback polling interval
    session.intervalId = setInterval(async () => {
      await syncInboxForUser(session, 20);
    }, 5000);

  } catch (err) {
    console.error(`[IMAP Service - ${username}] Connection error:`, err.message);
    // Cleanup failed session so we can retry on next start/update
    if (session.intervalId) clearInterval(session.intervalId);
    activeSessions.delete(username);
  }
};

/**
 * Main service launcher
 */
const startImapService = async () => {
  try {
    // Query all users from database who have email credentials configured
    const usersRes = await db.query(
      `SELECT username, role, email_address, email_password 
       FROM users 
       WHERE email_address IS NOT NULL AND email_address != '' 
         AND email_password IS NOT NULL AND email_password != ''`
    );

    const configuredUsers = usersRes.rows;
    const configuredUsernames = new Set(configuredUsers.map(u => u.username.toLowerCase()));

    // 1. Terminate sessions for users that are no longer configured
    for (const [username, session] of activeSessions.entries()) {
      if (!configuredUsernames.has(username)) {
        await stopUserSession(username, session);
      }
    }

    // 2. Start or update sessions for currently configured users
    for (const user of configuredUsers) {
      const username = user.username.toLowerCase();
      const existingSession = activeSessions.get(username);

      if (existingSession) {
        // If credentials changed, stop and restart
        if (existingSession.email !== user.email_address || existingSession.pass !== user.email_password) {
          console.log(`[IMAP Service - ${username}] Credentials changed. Restarting session...`);
          await stopUserSession(username, existingSession);
          startUserSession(user);
        }
      } else {
        startUserSession(user);
      }
    }
  } catch (err) {
    console.error('[IMAP Service] Error during startImapService query:', err);
  }
};

module.exports = { startImapService };
