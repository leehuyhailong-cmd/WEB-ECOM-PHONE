'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const { requestLogger } = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/error-handler');
const { apiLimiter } = require('./middlewares/rate-limit');
const passport = require('./config/passport');
const { configureCloudinary } = require('./config/cloudinary');

// ── Initialise optional services ─────────────────────────────────────────────
configureCloudinary();

const app = express();

// ── 1. Security (always first) ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "script-src-attr": ["'unsafe-inline'"],
      frameSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
}));

// ── 2. Performance ────────────────────────────────────────────────────────────
app.use(compression());

// ── 3. Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── 4. Input sanitisation ─────────────────────────────────────────────────────
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(xssClean());

// ── 5. Session ────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'phonestore_session_secret_2026',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
    autoRemove: 'native',
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// ── 6. Passport ───────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── 7. Request logging ────────────────────────────────────────────────────────
app.use(requestLogger);

// ── 8. Static files with 1-day browser cache & compression ────────────────────
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// ── 9. Rate limiting on all API routes ───────────────────────────────────────
app.use('/api/', apiLimiter);

// ── 10. Health check (no auth required) ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ── 11. Feature routers ──────────────────────────────────────────────────────
const authRouter = require('./modules/auth/auth.router');
const categoryRouter = require('./modules/categories/categories.router');
const productRouter = require('./modules/products/product.router');
const cartRouter = require('./modules/cart/cart.router');
const orderRouter = require('./modules/orders/order.router');
const paymentRouter = require('./vnpay.integration');
// Uncomment as each module is built:
// const userRouter            = require('./modules/users/user.router');
const reviewRouter          = require('./modules/reviews/review.router');
const chatbotRouter         = require('./modules/chatbot/chatbot.router');
const recommendationRouter  = require('./modules/recommendations/recommendation.router');
const adminRouter           = require('./modules/admin/admin.router');

app.use('/api/auth', authRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/payment', paymentRouter);
app.use('/', paymentRouter);
// app.use('/api/users',           userRouter);
app.use('/api/reviews',         reviewRouter);
app.use('/api/chatbot',         chatbotRouter);
app.use('/api/recommendations', recommendationRouter);
app.use('/api/admin',           adminRouter);

// ── 12. Error handlers (always last) ─────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
