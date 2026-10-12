// Clanect Multi-User Backend & Admin Security Enforcement
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9090;

// Master Admin Security Directive Credentials
const MASTER_ADMIN_REG_NO = '44733013';
const MASTER_ADMIN_PASSWORD = 'Bharath@040906';

// Connected Real-Time Clients
let sseClients = [];

// Database Storage
let users = [
  {
    id: 'admin-master',
    name: 'Class Rep (Master Admin)',
    regNo: MASTER_ADMIN_REG_NO,
    avatar: '⚡',
    role: 'admin',
    status: 'approved'
  }
];

let pendingUsers = [
  { id: 'user-2', name: 'Priya Sharma', regNo: '312221104038', avatar: '🎓', role: 'student', status: 'pending' },
  { id: 'user-3', name: 'Rohan Sharma', regNo: '312221104045', avatar: '💻', role: 'student', status: 'pending' }
];

let chatHistory = [
  {
    id: 1,
    senderId: 'admin-master',
    senderName: 'Class Rep (Admin)',
    senderAvatar: '⚡',
    text: 'Welcome classmates to Clanect! Please register with your Register Number for admin approval.',
    time: '09:00 AM',
    isAdmin: true
  }
];

let unit2StudyingCount = 14;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const cleanUrl = req.url.split('?')[0];

  // 1. Real-Time SSE Stream Endpoint: GET /api/events
  if (cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    res.write(`data: ${JSON.stringify({
      type: 'init',
      history: chatHistory,
      pending: pendingUsers,
      approvedUsers: users,
      count: unit2StudyingCount
    })}\n\n`);

    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(client => client !== res);
    });
    return;
  }

  // 2. Student Registration Endpoint: POST /api/register
  if (cleanUrl === '/api/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.name || !data.regNo) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Name and Register Number are required.' }));
          return;
        }

        const inputReg = data.regNo.trim();
        const inputPass = (data.passcode || '').trim();

        // Enforce Exclusive Master Admin Credentials Rule
        const isMasterAdmin = (inputReg === MASTER_ADMIN_REG_NO && inputPass === MASTER_ADMIN_PASSWORD);

        const newUser = {
          id: isMasterAdmin ? 'admin-master' : ('user-' + Date.now()),
          name: data.name.trim(),
          regNo: inputReg,
          avatar: isMasterAdmin ? '⚡' : (data.avatar || '🎓'),
          role: isMasterAdmin ? 'admin' : 'student',
          status: isMasterAdmin ? 'approved' : 'pending',
          isAdmin: isMasterAdmin
        };

        if (isMasterAdmin) {
          const existingIndex = users.findIndex(u => u.regNo === MASTER_ADMIN_REG_NO);
          if (existingIndex !== -1) {
            users[existingIndex] = newUser;
          } else {
            users.push(newUser);
          }
        } else {
          pendingUsers.push(newUser);
          broadcastEvent({ type: 'pending_update', pending: pendingUsers });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: newUser }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  // 3. Admin Approval Endpoint: POST /api/approve
  if (cleanUrl === '/api/approve' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const targetIndex = pendingUsers.findIndex(u => u.id === data.userId);

        if (targetIndex !== -1) {
          const approvedUser = pendingUsers[targetIndex];
          approvedUser.status = 'approved';
          pendingUsers.splice(targetIndex, 1);
          users.push(approvedUser);

          broadcastEvent({
            type: 'account_approved',
            userId: approvedUser.id,
            user: approvedUser,
            pending: pendingUsers,
            approvedUsers: users
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, approvedUser }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Student not found in pending list.' }));
        }
      } catch (err) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  // 4. Real-Time Chat Messaging Endpoint: POST /api/chat
  if (cleanUrl === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const newMsg = {
          id: Date.now(),
          senderId: data.senderId || 'anon',
          senderName: data.senderName || 'Classmate',
          senderAvatar: data.senderAvatar || '🎓',
          text: data.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAdmin: !!data.isAdmin
        };

        chatHistory.push(newMsg);
        if (chatHistory.length > 60) chatHistory.shift();

        broadcastEvent({ type: 'chat', message: newMsg });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: newMsg }));
      } catch (err) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  // 5. Admin Push Notification Broadcast Endpoint: POST /api/broadcast
  if (cleanUrl === '/api/broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.isAdmin) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Admin permission required.' }));
          return;
        }

        const alertPayload = {
          type: 'broadcast',
          sender: data.sender || 'Class Rep (Admin)',
          text: data.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        broadcastEvent(alertPayload);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  // 6. Static File Server
  let filePath = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);
  const extname = path.extname(cleanUrl);
  let contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

function broadcastEvent(payload) {
  const jsonStr = JSON.stringify(payload);
  sseClients.forEach(client => {
    client.write(`data: ${jsonStr}\n\n`);
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Clanect Backend running on http://0.0.0.0:${PORT}`);
});
