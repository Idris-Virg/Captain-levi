const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'access_portal',
  password: 'Root',
  port: 5432,
});

const Approval = {
  async create({ request_id, approver_role, approver_name, approver_email, decision, comments }) {
    const query = `
      INSERT INTO approvals 
        (request_id, approver_role, approver_name, approver_email, decision, comments, decided_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *; 
    `;
    const values = [
      request_id, 
      approver_role,
      approver_name || null, 
      approver_email || null, 
      decision,    
      comments || null,
  ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async createStage(request_id, approver_role, approver_name, approver_email) {
    const query = `
      INSERT INTO approvals 
        (request_id, approver_role, approver_name, approver_email, decision, comments, decided_at)
      VALUES ($1, $2, $3, $4, 'Pending', 'Waiting for review', NULL)
    `;
    await pool.query(query, [request_id, approver_role, approver_name, approver_email]);
  }, 
 
  async findByRequestId(request_id) { 
    const query = `   
      SELECT * FROM approvals 
      WHERE request_id = $1 
      ORDER BY decided_at NULLS FIRST, id
    `;
    const { rows } = await pool.query(query, [request_id]);
    return rows;
  },
}; 
 
module.exports = Approval;
