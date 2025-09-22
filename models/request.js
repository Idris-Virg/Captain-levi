const pool = require('../config/db');

const createRequest = async (data) => {
  const {
    summary, description, reason, date_needed,
  } = data;

  const result = await pool.query(
    `INSERT INTO requests (summary, description, reason, date_needed, status, current_approver)
     VALUES ($1, $2, $3, $4, 'Pending', 'IT Help Desk') RETURNING *`,
    [summary, description, reason, date_needed]
  );

  return result.rows[0];
};
 
const getAllRequests = async () => {   
  const result = await pool.query(`SELECT * FROM requests ORDER BY created_at DESC`);
  return result.rows;
};

const updateApproval = async (id, approver, decision, comments) => {
  const result = await pool.query(
    `UPDATE requests SET current_approver=$2, status=$3, comments=$4 WHERE id=$1 RETURNING *`,
    [id, approver, decision, comments]
  );
  return result.rows[0];
};

module.exports = {
  createRequest, 
  getAllRequests,
  updateApproval,
};
