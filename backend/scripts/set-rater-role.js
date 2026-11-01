// Run on the deployed backend: node scripts/set-rater-role.js rates
// Repairs one explicitly named Operator account; never changes other roles.
async function setRaterRole(pool, username) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Provide the exact account username: node scripts/set-rater-role.js rates');
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.query(
      'SELECT id, username, role FROM users WHERE LOWER(username) = LOWER(?) AND (is_deleted IS NOT TRUE) FOR UPDATE',
      [username]
    );
    if (users.length !== 1) throw new Error('Expected exactly one active account with that username. No account changed.');
    const user = users[0];
    if (!['operator', 'rater'].includes(user.role)) throw new Error(`Account has role ${user.role}; this repair only converts Operator to Rater. No account changed.`);
    if (user.role === 'operator') {
      await connection.query("UPDATE users SET role = 'rater' WHERE id = ? AND role = 'operator'", [user.id]);
    }
    const [[saved]] = await connection.query('SELECT id, username, role FROM users WHERE id = ?', [user.id]);
    if (saved?.role !== 'rater') throw new Error('The database did not preserve the Rater role. Repair rolled back.');
    await connection.commit();
    return saved;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  const { pool } = require('../src/config/db');
  setRaterRole(pool, process.argv[2])
    .then(user => console.log(`${user.username}: verified role ${user.role}. Sign out and sign in again to load the Rater workspace.`))
    .catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}

module.exports = { setRaterRole };
