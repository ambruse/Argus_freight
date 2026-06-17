const db = require('./src/config/db');

const runMigration = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id          SERIAL PRIMARY KEY,
        email       VARCHAR(255) NOT NULL UNIQUE,
        dear_who    VARCHAR(255),
        pol         VARCHAR(100),
        pod         VARCHAR(100),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      INSERT INTO contacts (email, dear_who, pol, pod)
      VALUES
        ('chen@example.com', 'Mr. Chen', 'Shanghai', 'Rotterdam'),
        ('alice@example.com', 'Ms. Alice', 'Hong Kong', 'Los Angeles'),
        ('bob@example.com', 'Mr. Bob', 'Dubai', 'Singapore')
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
};

runMigration();
