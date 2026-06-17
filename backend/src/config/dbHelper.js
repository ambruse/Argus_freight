// src/config/dbHelper.js
const db = require('./db');

const getOperatorSuffixes = async () => {
  try {
    const res = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name LIKE 'shipments_%'`
    );
    return res.rows.map(r => r.table_name.replace('shipments_', ''));
  } catch (err) {
    console.error('Error fetching operator suffixes:', err);
    return [];
  }
};

const findUsernameForRefNo = async (ref_no) => {
  if (!ref_no) return null;
  const suffixes = await getOperatorSuffixes();
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
  const suffixes = await getOperatorSuffixes();
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

  if (isAdmin) {
    if (req?.query?.user) {
      targetUser = req.query.user;
    } else if (ref_no || id) {
      // Find the specific operator for the shipment or file
      const foundUser = (await findUsernameForRefNo(ref_no)) || (await findUsernameForFileId(id));
      if (foundUser) {
        targetUser = foundUser;
      } else {
        targetUser = 'admin';
      }
    } else if (isSelect) {
      // Global SELECT query for admin: Query UNION ALL across all tables
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

      const modifiedSql = sql
        .replace(/\bshipments\b/g, shipmentsUnion)
        .replace(/\bshipment_replies\b/g, repliesUnion)
        .replace(/\bfiles\b/g, filesUnion);

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
