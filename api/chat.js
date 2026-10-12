// Vercel Serverless Function: POST /api/chat
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const msgObj = {
      id: Date.now(),
      senderId: data.senderId || 'anon',
      senderName: data.senderName || 'Classmate',
      senderAvatar: data.senderAvatar || '🎓',
      text: data.text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAdmin: !!data.isAdmin
    };
    return res.status(200).json({ success: true, message: msgObj });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
};
