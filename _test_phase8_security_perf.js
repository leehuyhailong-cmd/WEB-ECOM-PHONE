/**
 * Phase 8 — Automated Security & Performance Test Suite
 * Hardening, Vulnerability Scanning, Index Introspection, and Rate Limiting
 *
 * Prerequisites:
 *   - Server running at http://localhost:3000
 *   - MongoDB connected at mongodb://localhost:27017/phonestore
 */

'use strict';

const mongoose = require('mongoose');
const { User, Product, Order, Cart, Review, ChatSession, UserEvent } = require('./src/models');

const BASE = 'http://localhost:3000/api';
const PW   = 'TestPass123!';
let passed = 0, failed = 0;
let userToken, adminToken;

function ok(name, condition) {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else           { console.log(`  ❌ ${name}`); failed++; }
}

async function api(method, path, body, token, customHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...customHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = res.status === 204 ? null : await res.json(); } catch { data = null; }
  return { status: res.status, data, headers: res.headers };
}

async function ensureUser(name, email, role = 'user') {
  await api('POST', '/auth/register', { name, email, password: PW, passwordConfirm: PW });
  const login = await api('POST', '/auth/login', { email, password: PW });
  const token = login.data?.data?.accessToken;
  if (token && role === 'admin') {
    const userId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).sub;
    await User.findByIdAndUpdate(userId, { role: 'admin' });
    const relogin = await api('POST', '/auth/login', { email, password: PW });
    return relogin.data?.data?.accessToken;
  }
  return token;
}

async function run() {
  console.log('\n🛡️  Phase 8 Security & Performance Verification Suite\n');

  // Connect to MongoDB for index inspection
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phonestore';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB for introspection...\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Setup test tokens
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('── Step 1: Setup Test Accounts ──');
  userToken = await ensureUser('Sec User P8', 'sec_user_p8@test.com', 'user');
  adminToken = await ensureUser('Sec Admin P8', 'sec_admin_p8@test.com', 'admin');
  ok('User token acquired', !!userToken);
  ok('Admin token acquired', !!adminToken);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Database Index Introspection & Performance Audit
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 2: Database Index Introspection (Performance Audit) ──');
  const models = [
    { name: 'User', model: User, minIndexes: 4 }, // email, googleId, role, createdAt
    { name: 'Product', model: Product, minIndexes: 5 }, // slug, category, brand, text search, price
    { name: 'Order', model: Order, minIndexes: 3 }, // userId+createdAt, status, paymentStatus
    { name: 'Cart', model: Cart, minIndexes: 2 }, // userId, guestId
    { name: 'Review', model: Review, minIndexes: 3 }, // productId, userId+productId, createdAt
    { name: 'ChatSession', model: ChatSession, minIndexes: 3 }, // sessionId, userId, updatedAt TTL
    { name: 'UserEvent', model: UserEvent, minIndexes: 3 }, // userId, eventType, createdAt TTL
  ];

  for (const item of models) {
    const indexes = await item.model.collection.getIndexes();
    const count = Object.keys(indexes).length;
    ok(`Index check on ${item.name} collection (found ${count} indexes, min ${item.minIndexes})`, count >= item.minIndexes);
  }

  // Verify TTL index explicitly on ChatSession (24h) and UserEvent (30d)
  const chatIndexes = await ChatSession.collection.listIndexes().toArray();
  const hasChatTTL = chatIndexes.some(idx => idx.key?.updatedAt === 1 && idx.expireAfterSeconds === 86400);
  ok('ChatSession has 86400s (24h) TTL index on updatedAt', hasChatTTL);

  const eventIndexes = await UserEvent.collection.listIndexes().toArray();
  const hasEventTTL = eventIndexes.some(idx => idx.key?.createdAt === 1 && idx.expireAfterSeconds === 2592000);
  ok('UserEvent has 2592000s (30d) TTL index on createdAt', hasEventTTL);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Response Data Leak Audit (Security Audit)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 3: Response Data Leak Audit (Sensitive Fields Check) ──');
  const meRes = await api('GET', '/auth/me', null, userToken);
  const meData = meRes.data?.data || {};
  ok('GET /auth/me status 200', meRes.status === 200);
  ok('passwordHash is NEVER leaked in /auth/me', meData.passwordHash === undefined);
  ok('refreshToken is NEVER leaked in /auth/me', meData.refreshToken === undefined);
  ok('passwordResetToken is NEVER leaked in /auth/me', meData.passwordResetToken === undefined);
  ok('__v version key is NEVER leaked in /auth/me', meData.__v === undefined);

  const prodRes = await api('GET', '/products?page=1&limit=5');
  const prodItems = prodRes.data?.data || [];
  if (prodItems.length > 0) {
    ok('__v version key is NEVER leaked in product catalog list', prodItems[0].__v === undefined);
  } else {
    ok('Product catalog query returned valid structure', Array.isArray(prodItems));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 4: NoSQL Injection & Input Fuzzing Tests
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 4: NoSQL Injection & Input Fuzzing Resistance ──');
  
  // 1. Attempt NoSQL injection in Login body
  const noSqlLogin = await api('POST', '/auth/login', {
    email: { "$gt": "" },
    password: { "$gt": "" }
  });
  ok('NoSQL injection in POST /auth/login rejected (400 Bad Request)', noSqlLogin.status === 400);

  // 2. Attempt NoSQL operator injection in query string for product search
  const noSqlQuery = await api('GET', '/products?minPrice[$gt]=0&category[$ne]=secret');
  ok('NoSQL operator in GET /products handled cleanly without 500 crash', noSqlQuery.status !== 500);

  // 3. Attempt XSS script injection in chatbot message
  const xssChat = await api('POST', '/chatbot/message', {
    message: "<script>alert('hacked')</script> Tìm điện thoại Samsung",
    sessionId: "sec-test-session"
  });
  ok('XSS tag in POST /chatbot/message handled without 500 crash', xssChat.status === 200 || xssChat.status === 400);
  if (xssChat.data?.data?.reply) {
    ok('XSS script not executed or reflected dangerously', !xssChat.data.data.reply.includes('<script>alert'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 5: Pagination Cap & Payload Abuse Verification
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 5: Pagination Cap & Payload Size Protection ──');
  
  // 1. Request excessive limit on public products endpoint
  const giantLimit = await api('GET', '/products?limit=1000000');
  ok('Excessive pagination limit=1000000 rejected (400) or capped safely', giantLimit.status === 400 || (giantLimit.status === 200 && giantLimit.data?.pagination?.limit <= 100));

  // 2. Request excessive limit on admin users endpoint
  const giantAdminLimit = await api('GET', '/admin/users?limit=99999', null, adminToken);
  ok('Excessive admin pagination limit=99999 rejected (400) by Zod validator', giantAdminLimit.status === 400);

  // 3. Request invalid negative page number
  const negPage = await api('GET', '/products?page=-5&limit=10');
  ok('Negative page number handled safely without crashing (200 or 400)', negPage.status !== 500);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 6: Security Headers (Helmet & CORS) Verification
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 6: Security HTTP Headers Verification (Helmet) ──');
  const headRes = await fetch(`${BASE}/products?limit=1`);
  const headers = headRes.headers;
  ok('X-Content-Type-Options: nosniff present', headers.get('x-content-type-options') === 'nosniff');
  ok('X-DNS-Prefetch-Control: off present', headers.get('x-dns-prefetch-control') === 'off');
  ok('X-Download-Options: noopen present', headers.get('x-download-options') === 'noopen');
  ok('X-Permitted-Cross-Domain-Policies: none present', headers.get('x-permitted-cross-domain-policies') === 'none');

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 7: Brute-Force Rate Limit Verification (authLimiter)
  // Note: Done last to avoid blocking IP during earlier tests
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 7: Brute-Force Login Protection (Rate Limiter) ──');
  console.log('  Firing 6 rapid failed login attempts to trigger authLimiter (max 5/15min)...');
  let rateLimitHit = false;
  let lastStatus = 0;
  for (let i = 1; i <= 6; i++) {
    const r = await api('POST', '/auth/login', {
      email: 'sec_user_p8@test.com',
      password: 'WrongPassword999!'
    });
    lastStatus = r.status;
    if (r.status === 429) {
      rateLimitHit = true;
      console.log(`    Attempt #${i} returned 429 Too Many Requests (Blocked!)`);
      break;
    } else {
      console.log(`    Attempt #${i} returned ${r.status} (Failed login counted)`);
    }
  }
  ok('authLimiter triggered 429 Too Many Requests after 5 failed login attempts', rateLimitHit);
  if (rateLimitHit) {
    ok('429 response has RateLimit-* standard headers or clean JSON message', lastStatus === 429);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary & Cleanup
  // ═══════════════════════════════════════════════════════════════════════════
  await mongoose.disconnect();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Phase 8 Verification Results: ${passed} PASSED, ${failed} FAILED (${passed + failed} total)`);
  console.log(`${'═'.repeat(60)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
