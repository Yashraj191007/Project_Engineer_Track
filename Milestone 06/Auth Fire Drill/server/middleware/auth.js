
const { verifyToken } = require('../auth/jwt');
const { blacklist } = require('../data/store');

const auth = (req, res, next) => {
  const token = req.headers['authorization'];
  if(!token) return res.status(401).json({ error: 'Unauthorized' });

  const rawToken = token.split(' ')[1];

  // FIX F6: Reject tokens that have been blacklisted (logged out server-side)
  if (blacklist.includes(rawToken)) {
    return res.status(401).json({ error: 'Token has been invalidated. Please log in again.' });
  }

  try {
    const decoded = verifyToken(rawToken);
    // FIX F2: req.user now contains role since we added it to the JWT payload
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Auth failed' });
  }
};

module.exports = auth;
