const axios = require('axios');
require('dotenv').config();

exports.sendToSecretSharing = async (data) => {
  try {
    await axios.post(process.env.SECRET_SHARING_URL, {
      requestId: data.id,
      summary: data.summary,
      reason: data.reason,
      approvedDate: new Date(),
    });
    console.log('Sent to Secret Sharing App');
  } catch (err) {
    console.error('Failed to send to Secret Sharing App:', err.message);
  }
};
