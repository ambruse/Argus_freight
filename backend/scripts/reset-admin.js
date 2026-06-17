const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

async function resetAdmin() {
  try {
    const password = 'Admin@1234';
    const hash = await bcrypt.hash(password, 10);
    
    // Check if admin exists
    const res = await db.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    if (res.rows.length === 0) {
      console.log('Admin user not found. Creating it now...');
      await db.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        ['admin', hash, 'admin']
      );
      console.log('Admin user created successfully!');
    } else {
      console.log('Admin user exists. Resetting password...');
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [hash, 'admin']
      );
      console.log('Admin password reset successfully!');
    }
  } catch (err) {
    console.error('Error resetting admin:', err);
  } finally {
    process.exit(0);
  }
}

resetAdmin();
