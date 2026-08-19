const crypto = require('crypto');
const db = require('../src/config/db');

async function runMigration() {
  console.log('[IAM Migration] Starting IAM & Surrogate Key Schema Migration...');
  try {
    // 1. Helper function to safely add columns
    const addColumn = async (tableName, colName, colSpec) => {
      try {
        const check = await db.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_schema = DATABASE() AND table_name = $1 AND column_name = $2`,
          [tableName, colName]
        );
        if (!check.rows || check.rows.length === 0) {
          await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colSpec}`);
          console.log(`[IAM Migration] Added column \`${colName}\` to table \`${tableName}\`.`);
        }
      } catch (err) {
        console.warn(`[IAM Migration] Warning adding \`${colName}\` to \`${tableName}\`:`, err.message);
      }
    };

    // 2. Enhance USERS table with IAM columns
    await addColumn('users', 'user_id', 'VARCHAR(36) UNIQUE NULL AFTER id');
    await addColumn('users', 'status', "VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'");
    await addColumn('users', 'is_deleted', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumn('users', 'deleted_at', 'DATETIME NULL');

    // Generate UUIDs for any existing users missing a user_id
    const existingUsers = await db.query("SELECT id, username FROM users WHERE user_id IS NULL OR user_id = ''");
    for (const u of existingUsers.rows || []) {
      const uuid = crypto.randomUUID();
      await db.query("UPDATE users SET user_id = $1 WHERE id = $2", [uuid, u.id]);
      console.log(`[IAM Migration] Assigned user_id ${uuid} to user "${u.username}".`);
    }

    // 3. Create Roles & Permissions Tables (RBAC)
    await db.query(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id      VARCHAR(36) PRIMARY KEY,
        role_name    VARCHAR(64) NOT NULL UNIQUE,
        description  TEXT,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        permission_id   VARCHAR(36) PRIMARY KEY,
        permission_code VARCHAR(128) NOT NULL UNIQUE,
        description     TEXT NOT NULL,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id       VARCHAR(36) NOT NULL,
        permission_id VARCHAR(36) NOT NULL,
        created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id     VARCHAR(36) NOT NULL,
        role_id     VARCHAR(36) NOT NULL,
        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        audit_id                INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        actor_user_id           VARCHAR(36) NULL,
        actor_username_snapshot VARCHAR(100) NOT NULL,
        action                  VARCHAR(128) NOT NULL,
        resource_type           VARCHAR(64) NOT NULL,
        resource_id             VARCHAR(255) NOT NULL,
        ip_address              VARCHAR(64) NULL,
        payload                 JSON NULL,
        created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Seed Standard Roles
    const standardRoles = [
      { name: 'admin', desc: 'Full System Administrator Access' },
      { name: 'operator', desc: 'Pricing and Logistics Operator' },
      { name: 'sales', desc: 'Sales Executive' },
      { name: 'customer', desc: 'Customer Account' },
      { name: 'calling_agent', desc: 'Outbound Calling Agent' }
    ];

    const roleMap = new Map();
    for (const r of standardRoles) {
      const check = await db.query("SELECT role_id FROM roles WHERE role_name = $1", [r.name]);
      let roleId;
      if (!check.rows || check.rows.length === 0) {
        roleId = crypto.randomUUID();
        await db.query("INSERT INTO roles (role_id, role_name, description) VALUES ($1, $2, $3)", [roleId, r.name, r.desc]);
        console.log(`[IAM Migration] Created role "${r.name}" (${roleId}).`);
      } else {
        roleId = check.rows[0].role_id;
      }
      roleMap.set(r.name, roleId);
    }

    // 5. Populate user_roles for existing users
    const allUsers = await db.query("SELECT user_id, role, username FROM users WHERE user_id IS NOT NULL");
    for (const u of allUsers.rows || []) {
      const roleId = roleMap.get(u.role);
      if (roleId && u.user_id) {
        await db.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [u.user_id, roleId]
        );
      }
    }

    // 6. Enhance SHIPMENTS, FILES, & REPLIES with Surrogate Key FKs
    await addColumn('shipments', 'owner_user_id', 'VARCHAR(36) NULL');
    await addColumn('shipments', 'operator_user_id', 'VARCHAR(36) NULL');
    await addColumn('files', 'owner_user_id', 'VARCHAR(36) NULL');
    await addColumn('shipment_replies', 'user_id', 'VARCHAR(36) NULL');

    // 7. Backfill operator_user_id & owner_user_id on central shipments table
    const usersList = await db.query("SELECT user_id, LOWER(username) AS username, LOWER(email_address) AS email, customer_id FROM users");
    const userByUsernameMap = new Map();
    const userByCustomerIdMap = new Map();

    (usersList.rows || []).forEach(u => {
      if (u.username) userByUsernameMap.set(u.username, u.user_id);
      if (u.email) userByUsernameMap.set(u.email, u.user_id);
      if (u.customer_id) userByCustomerIdMap.set(u.customer_id, u.user_id);
    });

    const centralShipments = await db.query("SELECT ref_no, operator, refer_by, customer_id FROM shipments");
    for (const s of centralShipments.rows || []) {
      let opUserId = null;
      let ownerUserId = null;

      if (s.operator) {
        opUserId = userByUsernameMap.get(s.operator.toLowerCase()) || null;
      }
      if (s.refer_by) {
        ownerUserId = userByUsernameMap.get(s.refer_by.toLowerCase()) || null;
      }
      if (!ownerUserId && s.customer_id) {
        ownerUserId = userByCustomerIdMap.get(s.customer_id) || null;
      }

      if (opUserId || ownerUserId) {
        await db.query(
          "UPDATE shipments SET operator_user_id = COALESCE($1, operator_user_id), owner_user_id = COALESCE($2, owner_user_id) WHERE ref_no = $3",
          [opUserId, ownerUserId, s.ref_no]
        );
      }
    }

    // 8. Consolidate legacy dynamic sandbox tables (`shipments_<suffix>`) into central table with user_id
    const dbTablesRes = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name LIKE 'shipments_%'
    `).catch(() => ({ rows: [] }));

    for (const r of dbTablesRes.rows || []) {
      const suffix = r.table_name.replace('shipments_', '');
      if (!suffix || suffix.includes('replies') || suffix.includes('files') || suffix.includes('chats')) continue;

      const targetUserId = userByUsernameMap.get(suffix.toLowerCase());
      if (targetUserId) {
        console.log(`[IAM Migration] Consolidating legacy sandbox table \`${r.table_name}\` for user_id ${targetUserId}...`);
        try {
          // Backfill operator_user_id / owner_user_id inside sandbox table
          await addColumn(r.table_name, 'owner_user_id', 'VARCHAR(36) NULL');
          await addColumn(r.table_name, 'operator_user_id', 'VARCHAR(36) NULL');
          await db.query(`UPDATE \`${r.table_name}\` SET operator_user_id = $1 WHERE operator_user_id IS NULL`, [targetUserId]);

          // Copy distinct missing shipments into main shipments table
          await db.query(`
            INSERT INTO shipments (
              ref_no, cust_req_no, refer_by, pol, pod, commodity, term, dimension,
              container, mode, weight, pickup_address, delivery_address, dear_who,
              email, status, note, customer_id, customer_name, customer_email, operator,
              operator_user_id, owner_user_id
            )
            SELECT 
              s.ref_no, s.cust_req_no, s.refer_by, s.pol, s.pod, s.commodity, s.term, s.dimension,
              s.container, s.mode, s.weight, s.pickup_address, s.delivery_address, s.dear_who,
              s.email, s.status, s.note, s.customer_id, s.customer_name, s.customer_email, s.operator,
              $1, s.owner_user_id
            FROM \`${r.table_name}\` s
            ON CONFLICT (ref_no) DO UPDATE SET
              operator_user_id = EXCLUDED.operator_user_id
          `, [targetUserId]);
        } catch (subErr) {
          console.warn(`[IAM Migration] Warning consolidating \`${r.table_name}\`:`, subErr.message);
        }
      }
    }

    console.log('[IAM Migration] IAM & Surrogate Key Schema Migration completed successfully!');
  } catch (err) {
    console.error('[IAM Migration] Fatal migration error:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runMigration };
