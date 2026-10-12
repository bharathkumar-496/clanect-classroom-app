// Vercel Serverless Function: POST /api/register
let memoryUsers = [];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const inputReg = (data.regNo || '').trim();
    const inputPass = (data.passcode || '').trim();

    const MASTER_ADMIN_REG_NO = '44733013';
    const MASTER_ADMIN_PASSWORD = 'Bharath@040906';

    const isMasterAdmin = (inputReg === MASTER_ADMIN_REG_NO && inputPass === MASTER_ADMIN_PASSWORD);

    const userObj = {
      id: isMasterAdmin ? 'admin-master' : ('user-' + Date.now()),
      name: (data.name || '').trim() || 'Classmate',
      regNo: inputReg,
      passcode: inputPass,
      avatar: isMasterAdmin ? '⚡' : (data.avatar || '🎓'),
      role: isMasterAdmin ? 'admin' : 'student',
      status: isMasterAdmin ? 'approved' : 'pending',
      isAdmin: isMasterAdmin
    };

    return res.status(200).json({ success: true, user: userObj });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
};
