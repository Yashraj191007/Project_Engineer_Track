
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { users, blacklist } = require('../data/store');
const { signToken } = require('../auth/jwt');

router.post('/signup', async (req, res) => {
  const { email, password, role } = req.body;
  if(users.find(u => u.email === email)) return res.status(400).json({ error: 'User exists' });
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), email, password: hashedPassword, role: role || 'reader' };
  users.push(user);
  
  // FIX F2: Role is now included in the JWT payload so backend can enforce it
  const token = signToken({ userId: user.id, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if(!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // FIX F2: Role is now included in the JWT payload so backend can enforce it
  const token = signToken({ userId: user.id, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

// FIX F6: Server-side logout — adds token to blacklist so replayed tokens are rejected
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && !blacklist.includes(token)) {
      blacklist.push(token);
    }
  }
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
