const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'access_portal',
  password: 'Root',
  port: 5432,
});  

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id SERIAL PRIMARY KEY,
      requester_name VARCHAR(100),
      requester_email VARCHAR(100),
      request_type VARCHAR(50),
      summary TEXT,
      current_stage VARCHAR(50) DEFAULT 'IT Help Desk',
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS approvals (
      id SERIAL PRIMARY KEY,
      request_id INT REFERENCES access_requests(id) ON DELETE CASCADE,
      approver_role VARCHAR(50),
      approver_name VARCHAR(100),
      approver_email VARCHAR(100),
      decision VARCHAR(50),
      comments TEXT, 
      decided_at TIMESTAMP
    );
  `);
}    

initDb().catch(err => console.error("DB init error:", err));

module.exports = pool;
