
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const fragmentRoutes = require('./routes/fragments');

const app = express();
const PORT = 5001;

// FIX F5: Restrict CORS to trusted origins only — no more wildcard '*'
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: Origin '${origin}' is not allowed`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());

// FIX F5: CSRF mitigation — state-changing requests must include X-Requested-With header
// Browsers cannot set custom headers cross-origin without a CORS preflight, which we block above
const csrfGuard = (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (mutatingMethods.includes(req.method)) {
    const requestedWith = req.headers['x-requested-with'];
    if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
      return res.status(403).json({ error: 'CSRF check failed: Missing X-Requested-With header' });
    }
  }
  next();
};

app.use('/api/fragments', csrfGuard);

app.use('/api/auth', authRoutes);
app.use('/api/fragments', fragmentRoutes);

app.get('/', (req, res) => {
  res.send('Fragments API Running (Secured)');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
