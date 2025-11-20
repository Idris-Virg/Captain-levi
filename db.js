const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'access_portal',
  password: 'Root',
  port: 5432,
});  

async function initDb() {
  // Create access_requests table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id SERIAL PRIMARY KEY,
      requester_name VARCHAR(100),
      requester_email VARCHAR(100),
      request_type VARCHAR(50),
      request_details VARCHAR(250),
      summary TEXT,
      current_stage VARCHAR(50) DEFAULT 'IT Help Desk',
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ); 
  `); 
   
  // Create approvals table
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

  // Create approval_workflows table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_workflows (
      id SERIAL PRIMARY KEY,
      workflow_name VARCHAR(100) NOT NULL,
      description TEXT,
      stages JSONB NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create approval_requests table (for the approval system)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_requests (
      id SERIAL PRIMARY KEY,
      workflow_id INTEGER REFERENCES approval_workflows(id),
      request_title VARCHAR(200) NOT NULL,
      requester_name VARCHAR(100) NOT NULL,
      requester_email VARCHAR(150) NOT NULL,
      request_details JSONB NOT NULL,
      current_stage VARCHAR(50) NOT NULL,
      overall_status VARCHAR(20) DEFAULT 'Pending' CHECK (overall_status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create approval_stages table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_stages (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES approval_requests(id) ON DELETE CASCADE,
      stage_role VARCHAR(50) NOT NULL,
      stage_status VARCHAR(20) DEFAULT 'Pending' CHECK (stage_status IN ('Pending', 'Approved', 'Rejected')),
      stage_comment TEXT,
      stage_order INTEGER NOT NULL,
      assigned_to VARCHAR(150),
      due_date TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create approval_decisions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_decisions (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES approval_requests(id) ON DELETE CASCADE,
      stage_id INTEGER REFERENCES approval_stages(id) ON DELETE CASCADE,
      approver_role VARCHAR(50) NOT NULL,
      approver_name VARCHAR(100),
      approver_email VARCHAR(150),
      decision VARCHAR(20) NOT NULL CHECK (decision IN ('Approved', 'Rejected')),
      comments TEXT,
      decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default workflow if it doesn't exist
  const workflowCheck = await pool.query(
    `SELECT id FROM approval_workflows WHERE workflow_name = 'Database Access Approval'`
  );

  if (workflowCheck.rows.length === 0) {
    await pool.query(`
      INSERT INTO approval_workflows (workflow_name, description, stages) VALUES 
      (
        'Database Access Approval',
        'Standard workflow for database access requests',
        '["User", "Admin", "Super_Admin"]'::JSONB
      )
    `);
  }

  // Insert sample approval request if none exist
  const requestCheck = await pool.query(
    `SELECT id FROM approval_requests WHERE request_title = 'Application Database Access Request'`
  );

  if (requestCheck.rows.length === 0) {
    // Insert sample approval request
    const requestResult = await pool.query(`
      INSERT INTO approval_requests (workflow_id, request_title, requester_name, requester_email, request_details, current_stage) VALUES 
      (
        1,
        'Application Database Access Request',
        'John Smith',
        'john.smith@summitbank.com',
        '{"database_name": "Customer_Data", "access_level": "Read Only", "justification": "Monthly reporting requirements"}'::JSONB,
        'User'
      )
      RETURNING id
    `);

    const requestId = requestResult.rows[0].id;

    // Insert approval stages for the sample request
    await pool.query(`
      INSERT INTO approval_stages (request_id, stage_role, stage_order) VALUES
      (${requestId}, 'User', 1),
      (${requestId}, 'Admin', 2),
      (${requestId}, 'Super_Admin', 3)
    `);
  }

  console.log('Database tables initialized successfully');
}    

initDb().catch(err => console.error("DB init error:", err));

module.exports = pool;