// src/config/dbHelper.js
const db = require('./db');

const ensuredTables = new Set(['admin']);

const getUserSuffix = (input) => {
  if (!input) return 'admin';
  if (typeof input === 'object') {
    if (input.role === 'admin' || input.username === 'admin') return 'admin';
    if (input.id) return `u${input.id}`;
    if (input.username) return input.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  }
  if (typeof input === 'number') return `u${input}`;
  if (typeof input === 'string') {
    const clean = input.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (clean === 'admin') return 'admin';
    if (/^\d+$/.test(clean)) return `u${clean}`;
    return clean;
  }
  return 'admin';
};

const ensureUserTables = async (userOrSuffix) => {
  if (!userOrSuffix || userOrSuffix === 'admin') return;
  const suffix = getUserSuffix(userOrSuffix);
  if (suffix === 'admin' || ensuredTables.has(suffix)) return;

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS shipments_${suffix} (LIKE shipments INCLUDING ALL)`);
  } catch (e) {
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS shipments_${suffix} LIKE shipments`);
    } catch (err) {}
  }
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS shipment_replies_${suffix} (LIKE shipment_replies INCLUDING ALL)`);
  } catch (e) {
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS shipment_replies_${suffix} LIKE shipment_replies`);
    } catch (err) {}
  }
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS files_${suffix} (LIKE files INCLUDING ALL)`);
  } catch (e) {
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS files_${suffix} LIKE files`);
    } catch (err) {}
  }
  ensuredTables.add(suffix);
};

let cachedAllSuffixes = null;
let cachedOperatorSuffixes = null;
let lastCacheTime = 0;

const getAllSuffixes = async () => {
  const now = Date.now();
  if (cachedAllSuffixes && (now - lastCacheTime < 10000)) return cachedAllSuffixes;
  try {
    const dbTablesRes = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_name LIKE 'shipments_%' AND table_schema = DATABASE()`
    ).catch(() => ({ rows: [] }));
    const dbSuffixes = (dbTablesRes.rows || [])
      .map(r => ((r.table_name || r.TABLE_NAME || '').replace('shipments_', '')))
      .filter(suffix => suffix && !suffix.includes('replies') && !suffix.includes('files') && !suffix.includes('chats') && suffix !== 'admin');
    cachedAllSuffixes = Array.from(new Set(dbSuffixes));
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
    const dbTablesRes = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_name LIKE 'shipments_%' AND table_schema = DATABASE()`
    ).catch(() => ({ rows: [] }));
    const dbSuffixes = (dbTablesRes.rows || [])
      .map(r => ((r.table_name || r.TABLE_NAME || '').replace('shipments_', '')))
      .filter(suffix => suffix && !suffix.includes('replies') && !suffix.includes('files') && !suffix.includes('chats') && suffix !== 'admin');
    cachedOperatorSuffixes = Array.from(new Set(dbSuffixes));
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

const getUserSuffixFromReq = (req) => {
  if (!req?.user || req.user.role === 'admin' || req.user.username === 'admin') {
    if (req?.user?.role === 'admin' && req?.query?.user) {
      const qUser = req.query.user;
      if (/^\d+$/.test(qUser)) return `u${qUser}`;
      if (/^u\d+$/i.test(qUser)) return qUser.toLowerCase();
      return qUser.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    }
    return 'admin';
  }
  if (req.user.id) {
    return `u${req.user.id}`;
  }
  return (req.user.username || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'admin';
};

const getTables = (req) => {
  const suffix = getUserSuffixFromReq(req);
  if (!suffix || suffix === 'admin') {
    return {
      shipments: 'shipments',
      replies: 'shipment_replies',
      files: 'files'
    };
  }
  return {
    shipments: `shipments_${suffix}`,
    replies: `shipment_replies_${suffix}`,
    files: `files_${suffix}`
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
        targetUser = getUserSuffixFromReq(req);
      } else {
        const foundUser = (await findUsernameForRefNo(ref_no)) || (await findUsernameForFileId(id));
        if (foundUser) {
          if (req?.user?.role === 'sales' || req?.user?.role === 'customer') {
             const cleanRoleUser = getUserSuffixFromReq(req);
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
                targetUser = getUserSuffixFromReq(req);
             }
          } else {
             targetUser = foundUser;
          }
        } else {
          if (!isAdmin) {
            targetUser = getUserSuffixFromReq(req);
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
         const cleanRoleUser = getUserSuffixFromReq(req);
         await ensureUserTables(cleanRoleUser);
         const userSuffixes = suffixes.includes(cleanRoleUser) ? suffixes : [...suffixes, cleanRoleUser];
         
         const safeUser = cleanRoleUser;
         const safeName = (req.user.name || '').replace(/'/g, "''");
         const safeUsername = (req.user.username || '').replace(/'/g, "''");
         const safeUserEmail = (req.user.email_address || '').replace(/'/g, "''");
         const safeCid = (req.user.customer_id || '').replace(/'/g, "''");

         const conds = [];
         if (req?.user?.role === 'sales') {
           conds.push(`LOWER(refer_by) = LOWER('${safeUsername}')`);
           if (safeName && safeName.toLowerCase() !== safeUsername.toLowerCase()) {
             conds.push(`LOWER(refer_by) = LOWER('${safeName}')`);
           }
           conds.push(`(refer_by IS NULL OR refer_by = '')`);
         } else if (req?.user?.role === 'customer') {
           conds.push(`LOWER(email) = LOWER('${safeUsername}')`);
           conds.push(`LOWER(customer_email) = LOWER('${safeUsername}')`);
           if (safeUserEmail && safeUserEmail.toLowerCase() !== safeUsername.toLowerCase()) {
             conds.push(`LOWER(email) = LOWER('${safeUserEmail}')`);
             conds.push(`LOWER(customer_email) = LOWER('${safeUserEmail}')`);
           }
           conds.push(`LOWER(refer_by) = LOWER('${safeUsername}')`);
           if (safeName && safeName.toLowerCase() !== safeUsername.toLowerCase()) {
             conds.push(`LOWER(refer_by) = LOWER('${safeName}')`);
             conds.push(`(customer_name IS NOT NULL AND LOWER(customer_name) = LOWER('${safeName}'))`);
           } else if (safeUsername) {
             conds.push(`(customer_name IS NOT NULL AND LOWER(customer_name) = LOWER('${safeUsername}'))`);
           }
           if (safeCid) {
             conds.push(`(customer_id IS NOT NULL AND customer_id = '${safeCid}')`);
           }
         }

         const userFilter = conds.length > 0 ? `(${conds.join(' OR ')})` : `(1=1)`;

         let sUnion = `SELECT 2 as __p, shipments.* FROM shipments WHERE ${userFilter}`;
         for (const suffix of userSuffixes) {
           await ensureUserTables(suffix);
           sUnion += ` UNION ALL SELECT ${suffix === safeUser ? 3 : 1} as __p, shipments_${suffix}.* FROM shipments_${suffix} WHERE ${userFilter}`;
         }
         shipmentsUnion = `(SELECT * FROM (SELECT *, ROW_NUMBER() OVER (
            PARTITION BY COALESCE(NULLIF(cust_req_no, ''), ref_no) 
            ORDER BY 
              CASE LOWER(TRIM(status))
                WHEN 'confirmed' THEN 10
                WHEN 'completed' THEN 9
                WHEN 'customer review' THEN 8
                WHEN 'under review' THEN 8
                WHEN 'customer_review' THEN 8
                WHEN 'under_review' THEN 8
                WHEN 'review' THEN 8
                WHEN 'quoted' THEN 7
                WHEN 'quote sent' THEN 7
                WHEN 'quote_sent' THEN 7
                WHEN 'files pending' THEN 5
                WHEN 'files_pending' THEN 5
                WHEN 'return pending' THEN 4
                WHEN 'return_pending' THEN 4
                WHEN 'cancelled' THEN 2
                ELSE 1
              END DESC,
              __p DESC
          ) AS _rn FROM (${sUnion}) _s) _ranked WHERE _rn = 1)`;
         
         let rUnion = `SELECT 2 as __p, shipment_replies.* FROM shipment_replies WHERE ref_no IN (SELECT ref_no FROM shipments WHERE ${userFilter})`;
         for (const suffix of userSuffixes) {
           rUnion += ` UNION ALL SELECT ${suffix === safeUser ? 3 : 1} as __p, shipment_replies_${suffix}.* FROM shipment_replies_${suffix} WHERE ref_no IN (SELECT ref_no FROM shipments WHERE ${userFilter})`;
         }
         repliesUnion = `(SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY __p ASC) AS _rn FROM (${rUnion}) _r) _ranked WHERE _rn = 1)`;
         
         let fUnion = `SELECT 2 as __p, files.* FROM files WHERE shipment_ref_no IN (SELECT ref_no FROM shipments WHERE ${userFilter})`;
         for (const suffix of userSuffixes) {
           fUnion += ` UNION ALL SELECT ${suffix === safeUser ? 3 : 1} as __p, files_${suffix}.* FROM files_${suffix} WHERE shipment_ref_no IN (SELECT ref_no FROM shipments WHERE ${userFilter})`;
         }
         filesUnion = `(SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY __p ASC) AS _rn FROM (${fUnion}) _f) _ranked WHERE _rn = 1)`;
      } else {
         let sBase = `SELECT shipments.* FROM shipments`;
         for (const suffix of suffixes) {
           sBase += ` UNION ALL SELECT shipments_${suffix}.* FROM shipments_${suffix}`;
         }
         shipmentsUnion = `(SELECT * FROM (${sBase}) _u_s_inner)`;

         let rBase = `SELECT shipment_replies.* FROM shipment_replies`;
         for (const suffix of suffixes) {
           rBase += ` UNION ALL SELECT shipment_replies_${suffix}.* FROM shipment_replies_${suffix}`;
         }
         repliesUnion = `(SELECT * FROM (${rBase}) _u_r_inner)`;

         let fBase = `SELECT files.* FROM files`;
         for (const suffix of suffixes) {
           fBase += ` UNION ALL SELECT files_${suffix}.* FROM files_${suffix}`;
         }
         filesUnion = `(SELECT * FROM (${fBase}) _u_f_inner)`;
      }

      const replaceTableWithUnion = (rawSql, tableName, unionSql, defaultAlias) => {
         const keywords = new Set([
           'WHERE', 'ORDER', 'GROUP', 'LIMIT', 'JOIN', 'SET', 'USING', 'ON', 'UNION',
           'SELECT', 'HAVING', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'STRAIGHT_JOIN', 'NATURAL',
           'AND', 'OR', 'NOT', 'AS', 'END', 'THEN', 'ELSE', 'WHEN', 'CASE', 'IN'
         ]);

         const regex = new RegExp(`\\b(FROM|JOIN)\\s+${tableName}\\b(?:\\s+(?:AS\\s+)?([a-zA-Z0-9_]+))?`, 'gi');

         return rawSql.replace(regex, (match, prefix, alias) => {
           if (alias && keywords.has(alias.toUpperCase())) {
             return `${prefix} ${unionSql} ${defaultAlias} ${alias}`;
           }
           const finalAlias = alias || defaultAlias;
           return `${prefix} ${unionSql} ${finalAlias}`;
         });
      };

      let modifiedSql = sql;
      modifiedSql = replaceTableWithUnion(modifiedSql, 'shipment_replies', repliesUnion, '_u_r');
      modifiedSql = replaceTableWithUnion(modifiedSql, 'files', filesUnion, '_u_f');
      modifiedSql = replaceTableWithUnion(modifiedSql, 'shipments', shipmentsUnion, '_u_s');

      return db.query(modifiedSql, params);
    }
  }

  // Non-admin or targeted admin query
  const targetSuffix = getUserSuffixFromReq(req);
  await ensureUserTables(targetSuffix);

  const tables = (targetSuffix === 'admin') ? {
    shipments: 'shipments',
    replies: 'shipment_replies',
    files: 'files'
  } : {
    shipments: `shipments_${targetSuffix}`,
    replies: `shipment_replies_${targetSuffix}`,
    files: `files_${targetSuffix}`
  };

  const modifiedSql = sql
    .replace(/\bshipments\b/g, tables.shipments)
    .replace(/\bshipment_replies\b/g, tables.replies)
    .replace(/\bfiles\b/g, tables.files);

  return db.query(modifiedSql, params);
};

module.exports = { getTables, query, findUsernameForRefNo, findUsernameForFileId, getOperatorSuffixes, ensureUserTables, getUserSuffix, getUserSuffixFromReq };
