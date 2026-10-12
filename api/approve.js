// Vercel Serverless Function: POST /api/approve
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    return res.status(200).json({
      success: true,
      approvedUser: { id: data.userId, status: 'approved' }
    });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
};
