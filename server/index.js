require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { initDB, pool } = require('./db');
const { passport } = require('./auth');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const featuresRoutes = require('./routes/features');
const exportRoutes = require('./routes/export');
const aiFeaturesRoutes = require('./routes/ai-features');

const app = express();
const PORT = process.env.PORT || 3000;

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Session
const isProd = process.env.NODE_ENV === 'production';

// Trust Render's proxy for secure cookies
if (isProd) app.set('trust proxy', 1);

app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'dude_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,       // HTTPS only in production
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/features', requireAuth, featuresRoutes);
app.use('/api/export', requireAuth, exportRoutes);
app.use('/api/ai', requireAuth, aiFeaturesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    features: {
      database: 'connected',
      ai: process.env.GROQ_API_KEY ? 'configured' : 'missing',
      imageGen: process.env.TOGETHER_API_KEY || process.env.OPENAI_API_KEY ? 'configured' : 'missing'
    }
  });
});

// Protect main app — redirect to login if not authenticated
app.get('/', requireAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/signup.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

function requireAuthPage(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'GROQ_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these in your Render dashboard or .env file');
  process.exit(1);
}

console.log('✓ Environment variables validated');
console.log('✓ Starting server initialization...');

initDB().then(() => {
  console.log('✓ Database initialized successfully');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Health check: http://localhost:${PORT}/health`);
  });
}).catch(err => {
  console.error('❌ Database initialization failed:', err.message);
  console.error('Full error:', err);
  process.exit(1);
});
