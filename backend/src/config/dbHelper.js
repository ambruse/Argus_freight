// src/config/dbHelper.js
const db = require('./db');

const ensuredTables = new Set(['admin']);

const ensureUserTables = async (username) => {
  if (!username || username === 'admin') return;
  const clean = username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  if (ensuredTables.has(clean)) return;
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS shipments_${clean} (LIKE shipments INCLUDING ALL)`);
  } catch (e) {
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS shipments_${clean} LIKE shipments`);
    } catch (err) {}
  }
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS shipment_replies_${clean} (LIKE shipment_replies INCLUDING ALL)`);
  } catch (e) {
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS shipment_replies_${clean} LIKE shipment_replies`);
    } catch (err) {}
  }
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS files_${clean} (LIKE files INCLUDING ALL)`);
  } catch (e) {
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS files_${clean} LIKE files`);
    } catch (err) {}
  }
  ensuredTables.add(clean);
};

let cachedAllSuffixes = null;
let cachedOperatorSuffixes = null;
let lastCacheTime = 0;

const getAllSuffixes = async () => {
  const now = Date.now();
  if (cachedAllSuffixes && (now - lastCacheTime < 10000)) return cachedAllSuffixes;
  try {
    const res = await db.query(
      `SELECT LOWER(username) AS suffix FROM users`
    );
    const dbTablesRes = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_name LIKE 'shipments_%'`
    ).catch(() => ({ rows: [] }));
    const dbSuffixes = (dbTablesRes.rows || []).map(r => ((r.table_name || '').replace('shipments_', '')));
    const userSuffixes = res.rows.map(r => ((r.suffix || '').replace(/[^a-zA-Z0-9_]/g, '')));
    cachedAllSuffixes = Array.from(new Set([...userSuffixes, ...dbSuffixes].filter(s => s && s !== 'admin')));
    lastCacheTime = now;
    return cachedAllSuffixes;
  } catch (err) {
    console.error('Error fetching all suffixes:', err);
    return cachedAllSuffixes || [];
  }
};

const getOperatorSuffixes = async () => {
  const now = Date.now();
  if (cachedOperatorSuffixes && (now - lastCacheTime < 10000)) return cachedOperatorSuffixes;
  try {
    const res = await db.query(
      `SELECT LOWER(username) AS suffix FROM users WHERE role = 'operator'`
    );
    const dbTablesRes = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_name LIKE 'shipments_%'`
    ).catch(() => ({ rows: [] }));
    const dbSuffixes = (dbTablesRes.rows || [])
      .map(r => ((r.table_name || '').replace('shipments_', '')))
      .filter(suffix => suffix && !suffix.includes('replies') && !suffix.includes('files') && !suffix.includes('chats'));
    const userSuffixes = res.rows.map(r => ((r.suffix || '').replace(/[^a-zA-Z0-9_]/g, '')));
    cachedOperatorSuffixes = Array.from(new Set([...userSuffixes, ...dbSuffixes].filter(s => s && s !== 'admin')));
    lastCacheTime = now;
    return cachedOperatorSuffixes;
  } catch (err) {
    console.error('Error fetching operator suffixes:', err);
    return cachedOperatorSuffixes || [];
  }
};

const findUsernameForRefNo = async (ref_no) => {
  if (!ref_no) return null;
  const suffixes = await getAllSuffixes();
  let queries = [`SELECT 'admin' AS username FROM shipments WHERE ref_no = $1`];
  const params = [ref_no];
  for (const suffix of suffixes) {
    queries.push(`SELECT '${suffix}' AS username FROM shipments_${suffix} WHERE ref_no = $1`);
  }
  const unionSql = queries.join(' UNION ALL ');
  try {
    const res = await db.query(unionSql, params);
    return res.rows[0]?.username || null;
  } catch (err) {
    console.error('Error in findUsernameForRefNo:', err);
    return null;
  }
};

const findUsernameForFileId = async (id) => {
  if (!id) return null;
  const suffixes = await getAllSuffixes();
  let queries = [`SELECT 'admin' AS username FROM files WHERE id = $1`];
  const params = [id];
  for (const suffix of suffixes) {
    queries.push(`SELECT '${suffix}' AS username FROM files_${suffix} WHERE id = $1`);
  }
  const unionSql = queries.join(' UNION ALL ');
  try {
    const res = await db.query(unionSql, params);
    return res.rows[0]?.username || null;
  } catch (err) {
    console.error('Error in findUsernameForFileId:', err);
    return null;
  }
};

const getTables = (req) => {
  let username = req?.user?.username;
  if (req?.user?.role === 'admin' && req?.query?.user) {
    username = req.query.user;
  }
  if (!username || username === 'admin') {
    return {
      shipments: 'shipments',
      replies: 'shipment_replies',
      files: 'files'
    };
  }
  const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return {
    shipments: `shipments_${cleanUsername}`,
    replies: `shipment_replies_${cleanUsername}`,
    files: `files_${cleanUsername}`
  };
};

const query = async (req, sql, params) => {
  let targetUser = req?.user?.username || 'admin';
  const isAdmin = req?.user?.role === 'admin';

  const ref_no = req?.params?.ref_no || req?.body?.ref_no || req?.body?.shipment_ref_no || req?.query?.ref_no;
  const id = req?.params?.id || req?.body?.id || req?.query?.id;
  const isSelect = /^\s*(SELECT|WITH)\b/i.test(sql);

  if (isAdmin || req?.user?.role === 'sales' || req?.user?.role === 'customer') {
    if (isAdmin && req?.query?.user) {
      targetUser = req.query.user;
    } else if (ref_no || id) {
      if (!isSelect && (req?.user?.role === 'sales' || req?.user?.role === 'customer')) {
        targetUser = req.user.username;
      } else {
        const foundUser = (await findUsernameForRefNo(ref_no)) || (await findUsernameForFileId(id));
        if (foundUser) {
          if (req?.user?.role === 'sales' || req?.user?.role === 'customer') {
             const cleanRoleUser = req.user.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
             let hasAccess = false;
             if (ref_no) {
                const chk = await db.query(`SELECT 1 FROM shipments_${cleanRoleUser} WHERE ref_no = $1`, [ref_no]);
                if (chk.rows.length > 0) hasAccess = true;
             } else if (id) {
                const chk = await db.query(`SELECT 1 FROM files_${cleanRoleUser} WHERE id = $1`, [id]);
                if (chk.rows.length > 0) hasAccess = true;
             }
             if (hasAccess) {
                targetUser = foundUser;
             } else {
                targetUser = req.user.username;
             }
          } else {
             targetUser = foundUser;
          }
        } else {
          if (!isAdmin) {
            targetUser = req.user.username;
          } else {
            targetUser = 'admin';
          }
        }
      }
    } else if (isSelect) {
      const suffixes = await getOperatorSuffixes();
      for (const suffix of suffixes) {
        await ensureUserTables(suffix);
      }
      
      let shipmentsUnion, repliesUnion, filesUnion;

      if (req?.user?.role === 'sales' || req?.user?.role === 'customer') {
         const cleanRoleUser = req.user.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
         await ensureUserTables(cleanRoleUser);
         const userSuffixes = suffixes.includes(cleanRoleUser) ? suffixes : [...suffixes, cleanRoleUser];
         
         const safeUser = cleanRoleUser;
         const safeName = (req.user.name || '').replace(/'/g, "''");
         const safeUsername = (req.user.username || '').replace(/'/g, "''");
         const safeCid = (req.user.customer_id || '').replace(/'/g, "''");

         let userFilter = `(
           ref_no IN (SELECT ref_no FROM shipments_${safeUser}) OR 
           LOWER(refer_by) = LOWER('${safeUsername}') OR 
           (LOWER(refer_by) = LOWER('${safeName}') AND '${safeName}' != '')
         )`;

         if (req?.user?.role === 'customer') {
           userFilter = `(
             ref_no IN (SELECT ref_no FROM shipments_${safeUser}) OR 
             LOWER(refer_by) = LOWER('${safeUsername}') OR 
             (LOWER(refer_by) = LOWER('${safeName}') AND '${safeName}' != '') OR 
             LOWER(created_by) = LOWER('${safeUsername}') OR 
             LOWER(email) = LOWER('${safeUsername}') OR 
             LOWER(customer_email) = LOWER('${safeUsername}') OR 
             ${safeCid ? `(customer_id IS NOT NULL AND customer_id = '${safeCid}') OR ` : ''}
             (customer_name IS NOT NULL AND LOWER(customer_name) = LOWER('${safeName || safeUsername}'))
           )`;
         }

         let sUnion = `SELECT 2 as __p, shipments.* FROM shipments WHERE ${userFilter}`;
         for (const suffix of userSuffixes) {
           await ensureUserTables(suffix);
           sUnion += ` UNION ALL SELECT ${suffix === safeUser ? 3 : 1} as __p, shipments_${suffix}.* FROM shipments_${suffix} WHERE ${userFilter}`;
         }
         shipmentsUnion = `(SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY ref_no ORDER BY __p ASC) AS _rn FROM (${sUnion}) _s) _ranked WHERE _rn = 1)`;
         
         let rUnion = `SELECT 2 as __p, shipment_replies.* FROM shipment_replies WHERE ref_no IN (SELECT ref_no FROM shipments_${safeUser} UNION SELECT ref_no FROM shipments WHERE ${userFilter})`;
         for (const suffix of userSuffixes) {
           rUnion += ` UNION ALL SELECT ${suffix === safeUser ? 3 : 1} as __p, shipment_replies_${suffix}.* FROM shipment_replies_${suffix} WHERE ref_no IN (SELECT ref_no FROM shipments_${safeUser} UNION SELECT ref_no FROM shipments WHERE ${userFilter})`;
         }
         repliesUnion = `(SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY __p ASC) AS _rn FROM (${rUnion}) _r) _ranked WHERE _rn = 1)`;
         
         let fUnion = `SELECT 2 as __p, files.* FROM files WHERE shipment_ref_no IN (SELECT ref_no FROM shipments_${safeUser} UNION SELECT ref_no FROM shipments WHERE ${userFilter})`;
         for (const suffix of userSuffixes) {
           fUnion += ` UNION ALL SELECT ${suffix === safeUser ? 3 : 1} as __p, files_${suffix}.* FROM files_${suffix} WHERE shipment_ref_no IN (SELECT ref_no FROM shipments_${safeUser} UNION SELECT ref_no FROM shipments WHERE ${userFilter})`;
         }
         filesUnion = `(SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY __p ASC) AS _rn FROM (${fUnion}) _f) _ranked WHERE _rn = 1)`;
      } else {
         shipmentsUnion = `(SELECT shipments.* FROM shipments`;
         for (const suffix of suffixes) {
           shipmentsUnion += ` UNION ALL SELECT shipments_${suffix}.* FROM shipments_${suffix}`;
         }
         shipmentsUnion += `)`;

         repliesUnion = `(SELECT shipment_replies.* FROM shipment_replies`;
         for (const suffix of suffixes) {
           repliesUnion += ` UNION ALL SELECT shipment_replies_${suffix}.* FROM shipment_replies_${suffix}`;
         }
         repliesUnion += `)`;

         filesUnion = `(SELECT files.* FROM files`;
         for (const suffix of suffixes) {
           filesUnion += ` UNION ALL SELECT files_${suffix}.* FROM files_${suffix}`;
         }
         filesUnion += `)`;
      }

      let modifiedSql = sql
        .replace(/\bshipment_replies\b/g, '___REPLIES___')
        .replace(/\bfiles\b/g, '___FILES___')
        .replace(/\bshipments\b/g, '___SHIPMENTS___');

      modifiedSql = modifiedSql
        .replace(/___REPLIES___/g, repliesUnion)
        .replace(/___FILES___/g, filesUnion)
        .replace(/___SHIPMENTS___/g, shipmentsUnion);

      return db.query(modifiedSql, params);
    }
  }

  // Non-admin or targeted admin query
  const cleanUsername = targetUser.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  await ensureUserTables(cleanUsername);

  const tables = (targetUser === 'admin') ? {
    shipments: 'shipments',
    replies: 'shipment_replies',
    files: 'files'
  } : {
    shipments: `shipments_${cleanUsername}`,
    replies: `shipment_replies_${cleanUsername}`,
    files: `files_${cleanUsername}`
  };

  const modifiedSql = sql
    .replace(/\bshipments\b/g, tables.shipments)
    .replace(/\bshipment_replies\b/g, tables.replies)
    .replace(/\bfiles\b/g, tables.files);

  return db.query(modifiedSql, params);
};

module.exports = { getTables, query, findUsernameForRefNo, findUsernameForFileId, getOperatorSuffixes, ensureUserTables };
