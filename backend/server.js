require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const quizRoutes = require('./routes/quiz');
const aiRoutes = require('./routes/ai');
const teacherRoutes = require('./routes/teacher');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware
app.use(helmet());
app.use(morgan('dev'));

// ── Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ── CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// ── Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/teacher', teacherRoutes);

// ── Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VidyaAI Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// ── 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ── Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 VidyaAI Server running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV}`);
  console.log(`🤖 Azure OpenAI: ${process.env.AZURE_OPENAI_ENDPOINT ? 'Configured ✓' : 'Not configured ✗'}`);
  console.log(`🗄️  Database: ${process.env.DB_SERVER ? 'Configured ✓' : 'Using mock data'}\n`);
});

module.exports = app;
