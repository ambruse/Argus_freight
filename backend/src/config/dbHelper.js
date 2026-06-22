// src/config/dbHelper.js
const db = require('./db');

const getAllSuffixes = async () => {
  try {
    const res = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name LIKE 'shipments_%'`
    );
    return res.rows.map(r => r.table_name.replace('shipments_', ''));
  } catch (err) {
    console.error('Error fetching all suffixes:', err);
    return [];
  }
};

const getOperatorSuffixes = async () => {
  try {
    const usersRes = await db.query("SELECT username FROM users WHERE role = 'operator'");
    const opUsernames = usersRes.rows.map(r => r.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
    
    const tablesRes = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name LIKE 'shipments_%'`
    );
    const allSuffixes = tablesRes.rows.map(r => r.table_name.replace('shipments_', ''));
    
    return allSuffixes.filter(suffix => opUsernames.includes(suffix));
  } catch (err) {
    console.error('Error fetching operator suffixes:', err);
    return [];
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
      // Find the specific operator for the shipment or file
      const foundUser = (await findUsernameForRefNo(ref_no)) || (await findUsernameForFileId(id));
      if (foundUser) {
        // If sales or customer, ensure they actually have access to this ref_no/id
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
              targetUser = req.user.username; // fallback to their own sandbox
           }
        } else {
           targetUser = foundUser;
        }
      } else {
        targetUser = 'admin';
      }
    } else if (isSelect) {
      // Global SELECT query: Query UNION ALL across all tables
      const suffixes = await getOperatorSuffixes();
      
      let shipmentsUnion = `(SELECT * FROM shipments`;
      for (const suffix of suffixes) {
        shipmentsUnion += ` UNION ALL SELECT * FROM shipments_${suffix}`;
      }
      shipmentsUnion += `)`;

      let repliesUnion = `(SELECT * FROM shipment_replies`;
      for (const suffix of suffixes) {
        repliesUnion += ` UNION ALL SELECT * FROM shipment_replies_${suffix}`;
      }
      repliesUnion += `)`;

      let filesUnion = `(SELECT * FROM files`;
      for (const suffix of suffixes) {
        filesUnion += ` UNION ALL SELECT * FROM files_${suffix}`;
      }
      filesUnion += `)`;

      let modifiedSql = sql
        .replace(/\bshipments\b/g, shipmentsUnion)
        .replace(/\bshipment_replies\b/g, repliesUnion)
        .replace(/\bfiles\b/g, filesUnion);

      if (req?.user?.role === 'sales' || req?.user?.role === 'customer') {
         const globalShipmentsUnion = shipmentsUnion;
         const cleanRoleUser = req.user.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
         const userSuffixes = suffixes.includes(cleanRoleUser) ? suffixes : [...suffixes, cleanRoleUser];
         
         // Wrap the whole query and filter by their shipments
         // Since sql could be anything, we must be careful.
         // Prioritize operator sandboxes (1), then admin (2), then sales/customer fallback (3)
         let sUnion = `SELECT 2 as __p, * FROM shipments WHERE ref_no IN (SELECT ref_no FROM shipments_${cleanRoleUser})`;
         for (const suffix of userSuffixes) {
           sUnion += ` UNION ALL SELECT ${suffix === cleanRoleUser ? 3 : 1} as __p, * FROM shipments_${suffix} WHERE ref_no IN (SELECT ref_no FROM shipments_${cleanRoleUser})`;
         }
         shipmentsUnion = `(SELECT DISTINCT ON (ref_no) * FROM (${sUnion}) sub ORDER BY ref_no, __p ASC)`;
         
         let rUnion = `SELECT 2 as __p, * FROM shipment_replies WHERE ref_no IN (SELECT ref_no FROM shipments_${cleanRoleUser} UNION SELECT ref_no FROM ${globalShipmentsUnion} tmp WHERE cust_req_no IN (SELECT ref_no FROM shipments_${cleanRoleUser}))`;
         for (const suffix of userSuffixes) {
           rUnion += ` UNION ALL SELECT ${suffix === cleanRoleUser ? 3 : 1} as __p, * FROM shipment_replies_${suffix} WHERE ref_no IN (SELECT ref_no FROM shipments_${cleanRoleUser} UNION SELECT ref_no FROM ${globalShipmentsUnion} tmp WHERE cust_req_no IN (SELECT ref_no FROM shipments_${cleanRoleUser}))`;
         }
         repliesUnion = `(SELECT DISTINCT ON (id) * FROM (${rUnion}) sub ORDER BY id, __p ASC)`;
         
         let fUnion = `SELECT 2 as __p, * FROM files WHERE shipment_ref_no IN (SELECT ref_no FROM shipments_${cleanRoleUser} UNION SELECT ref_no FROM ${globalShipmentsUnion} tmp WHERE cust_req_no IN (SELECT ref_no FROM shipments_${cleanRoleUser}))`;
         for (const suffix of userSuffixes) {
           fUnion += ` UNION ALL SELECT ${suffix === cleanRoleUser ? 3 : 1} as __p, * FROM files_${suffix} WHERE shipment_ref_no IN (SELECT ref_no FROM shipments_${cleanRoleUser} UNION SELECT ref_no FROM ${globalShipmentsUnion} tmp WHERE cust_req_no IN (SELECT ref_no FROM shipments_${cleanRoleUser}))`;
         }
         filesUnion = `(SELECT DISTINCT ON (id) * FROM (${fUnion}) sub ORDER BY id, __p ASC)`;
         
         modifiedSql = sql
           .replace(/\bshipments\b/g, shipmentsUnion)
           .replace(/\bshipment_replies\b/g, repliesUnion)
           .replace(/\bfiles\b/g, filesUnion);
      }

      return db.query(modifiedSql, params);
    }
  }

  // Non-admin or targeted admin query
  const cleanUsername = targetUser.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
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

module.exports = { getTables, query, findUsernameForRefNo, findUsernameForFileId };
