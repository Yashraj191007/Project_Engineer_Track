
require('dotenv').config();
const jwt = require('jsonwebtoken');

// FIX F1: Secret loaded from environment variable — never hardcoded in source
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
}

const signToken = (payload) => {
  // FIX F1: Tokens now expire after 1 hour — stolen tokens have a bounded lifetime
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
};

const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

module.exports = { signToken, verifyToken };
