/**
 * Phase 5 — Automated Integration Test
 * Reviews CRUD + Recommendations Engine
 *
 * Prerequisites:
 *   - Server running at http://localhost:3000
 *   - MongoDB connected
 *   - Admin user promoted to admin role in DB
 */

'use strict';

const BASE = 'http://localhost:3000/api';
const PW   = 'TestPass123!';
let passed = 0, failed = 0;

// ── State ────────────────────────────────────────────────────────────────────
let adminToken, userToken, user2Token;
let productId, orderId, reviewId;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = res.status === 204 ? null : await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function apiForm(method, path, fields, token) {
  const formData = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    formData.append(k, String(v));
  }
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: formData });
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function ok(name, condition) {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else           { console.log(`  ❌ ${name}`); failed++; }
}

async function ensureUser(name, email) {
  await api('POST', '/auth/register', { name, email, password: PW, passwordConfirm: PW });
  const r = await api('POST', '/auth/login', { email, password: PW });
  return r.data?.data?.accessToken;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🧪 Phase 5 Integration Test — Reviews & Recommendations\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Setup users (admin was promoted via DB script)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('── Step 1: Setup users ──');
  adminToken = await ensureUser('Admin P5', 'admin_p5_test@test.com');
  ok('Admin login', !!adminToken);

  userToken = await ensureUser('User1 P5', 'user1_p5_test@test.com');
  ok('User1 login', !!userToken);

  user2Token = await ensureUser('User2 P5', 'user2_p5_test@test.com');
  ok('User2 login', !!user2Token);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Create test product (admin, multipart/form-data)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 2: Create test product ──');
  const prodRes = await apiForm('POST', '/products', {
    name:        'Samsung Galaxy S25 Ultra P5 Test ' + Date.now(),
    price:       '32990000',
    brand:       'Samsung',
    category:    'smartphone',
    stock:       '50',
    isActive:    'true',
    description: 'Test product for Phase 5 review testing',
  }, adminToken);
  productId = prodRes.data?.data?.product?._id || prodRes.data?.data?._id;
  ok('Create product (201)', prodRes.status === 201 && !!productId);
  if (!productId) {
    console.log('    DEBUG prodRes:', JSON.stringify(prodRes.data).slice(0, 300));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Create & fast-track order → delivered
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 3: Create & deliver order ──');
  if (productId) {
    const cartRes = await api('POST', '/cart/items', { productId, quantity: 1 }, userToken);
    ok('Add to cart', cartRes.status === 200);

    const orderRes = await api('POST', '/orders', {
      shippingAddress: {
        fullName: 'Test User P5', phone: '0912345678', street: '123 Phase5 St',
        ward: 'Ward 1', district: 'District 1', province: 'HCM',
      },
      paymentMethod: 'cod',
    }, userToken);
    orderId = orderRes.data?.data?.order?._id || orderRes.data?.data?._id;
    ok('Create order (201)', orderRes.status === 201 && !!orderId);
    if (!orderId) console.log('    DEBUG orderRes:', JSON.stringify(orderRes.data).slice(0, 400));

    if (orderId) {
      await api('PATCH', `/orders/${orderId}/status`, { status: 'confirmed' }, adminToken);
      await api('PATCH', `/orders/${orderId}/status`, { status: 'processing' }, adminToken);
      await api('PATCH', `/orders/${orderId}/status`, { status: 'shipping' }, adminToken);
      const deliverRes = await api('PATCH', `/orders/${orderId}/status`, { status: 'delivered' }, adminToken);
      ok('Order → delivered', deliverRes.status === 200);
    }
  } else {
    console.log('  ⚠️  Skipping — no productId');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 4: Track events
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 4: Track events ──');
  if (productId) {
    const ev1 = await api('POST', '/recommendations/events', {
      productId, eventType: 'view', sessionId: 'sess-p5-' + Date.now(),
    }, userToken);
    ok('Track view event (200)', ev1.status === 200);

    await api('POST', '/recommendations/events', {
      productId, eventType: 'cart', sessionId: 'sess-p5-cart',
    }, userToken);
    await api('POST', '/recommendations/events', {
      productId, eventType: 'purchase', sessionId: 'sess-p5-purchase',
    }, userToken);
    console.log('  (3 events tracked)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 5: Create review
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 5: Create review ──');
  if (productId) {
    const revRes = await api('POST', '/reviews', {
      productId,
      rating: 5,
      title: 'Sản phẩm tuyệt vời',
      comment: 'Phase 5 test. Chất lượng rất tốt, giao hàng nhanh.',
    }, userToken);
    reviewId = revRes.data?.data?._id;
    ok('Create review (201)', revRes.status === 201 && !!reviewId);
    ok('isVerifiedPurchase = true', revRes.data?.data?.isVerifiedPurchase === true);
    ok('Rating = 5', revRes.data?.data?.rating === 5);
    if (!reviewId) console.log('    DEBUG revRes:', JSON.stringify(revRes.data).slice(0, 300));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 6: Duplicate review blocked
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 6: Duplicate blocked ──');
  if (productId) {
    const dup = await api('POST', '/reviews', {
      productId, rating: 4, title: 'Dup', comment: 'Should fail',
    }, userToken);
    ok('Duplicate blocked (409)', dup.status === 409);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 7: Get product reviews
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 7: Get product reviews ──');
  if (productId) {
    await sleep(300); // Wait for post-save hook
    const pr = await api('GET', `/reviews/product/${productId}?page=1&limit=10`);
    ok('Get reviews (200)', pr.status === 200);
    ok('Has reviews[]', pr.data?.data?.reviews?.length >= 1);
    ok('Has distribution', pr.data?.data?.distribution != null);
    ok('avgRating = 5', pr.data?.data?.avgRating === 5);
    ok('reviewCount = 1', pr.data?.data?.reviewCount === 1);
    ok('Has pagination', pr.data?.pagination?.total >= 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 8: Get my reviews
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 8: Get my reviews ──');
  const my = await api('GET', '/reviews/my', null, userToken);
  ok('Get my reviews (200)', my.status === 200);
  ok('Has data', my.data?.data?.length >= 1);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 9: Update review
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 9: Update review ──');
  if (reviewId) {
    const upd = await api('PUT', `/reviews/${reviewId}`, {
      rating: 4,
      comment: 'Giảm 1 sao vì pin hơi yếu.',
    }, userToken);
    ok('Update (200)', upd.status === 200);
    ok('Rating → 4', upd.data?.data?.rating === 4);

    await sleep(300);
    const after = await api('GET', `/reviews/product/${productId}`);
    ok('avgRating recomputed → 4', after.data?.data?.avgRating === 4);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 10: Helpful vote
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 10: Helpful vote ──');
  if (reviewId) {
    const h1 = await api('POST', `/reviews/${reviewId}/helpful`, null, user2Token);
    ok('User2 helpful (200)', h1.status === 200);
    ok('helpfulCount >= 1', h1.data?.data?.helpfulCount >= 1);

    const self = await api('POST', `/reviews/${reviewId}/helpful`, null, userToken);
    ok('Self-vote blocked (403)', self.status === 403);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 11: Admin hide
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 11: Admin hide ──');
  if (reviewId) {
    const hide = await api('PATCH', `/reviews/${reviewId}/hide`, { isHidden: true }, adminToken);
    ok('Admin hide (200)', hide.status === 200);
    ok('isHidden = true', hide.data?.data?.isHidden === true);

    await sleep(300);
    const after = await api('GET', `/reviews/product/${productId}`);
    ok('Hidden excluded', after.data?.data?.reviews?.length === 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 12: Admin unhide
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 12: Admin unhide ──');
  if (reviewId) {
    const unhide = await api('PATCH', `/reviews/${reviewId}/hide`, { isHidden: false }, adminToken);
    ok('Admin unhide (200)', unhide.status === 200);
    ok('isHidden = false', unhide.data?.data?.isHidden === false);

    await sleep(300);
    const after = await api('GET', `/reviews/product/${productId}`);
    ok('Review visible again', after.data?.data?.reviews?.length === 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 13: Homepage recommendations
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 13: Homepage recommendations ──');
  const homeAuth = await api('GET', '/recommendations/homepage', null, userToken);
  ok('Homepage auth (200)', homeAuth.status === 200);
  ok('Has trending[]', Array.isArray(homeAuth.data?.data?.trending));
  ok('Has personalised[]', Array.isArray(homeAuth.data?.data?.personalised));
  ok('Has bestSellers[]', Array.isArray(homeAuth.data?.data?.bestSellers));

  const homeGuest = await api('GET', '/recommendations/homepage');
  ok('Homepage guest (200)', homeGuest.status === 200);
  ok('Guest personalised empty', homeGuest.data?.data?.personalised?.length === 0);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 14: Related products
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 14: Related products ──');
  if (productId) {
    const rel = await api('GET', `/recommendations/product/${productId}`);
    ok('Related (200)', rel.status === 200);
    ok('Returns array', Array.isArray(rel.data?.data));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 15: Cart suggestions
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 15: Cart suggestions ──');
  if (productId) {
    const cs = await api('GET', `/recommendations/cart?productIds=${productId}`);
    ok('Cart suggestions (200)', cs.status === 200);
    ok('Returns array', Array.isArray(cs.data?.data));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 16: Delete review + verify recompute
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 16: Delete review ──');
  if (reviewId) {
    const del = await api('DELETE', `/reviews/${reviewId}`, null, userToken);
    ok('Delete (204)', del.status === 204);

    await sleep(500);
    const after = await api('GET', `/reviews/product/${productId}`);
    ok('No reviews left', after.data?.data?.reviews?.length === 0);
    ok('avgRating → 0', after.data?.data?.avgRating === 0);
    ok('reviewCount → 0', after.data?.data?.reviewCount === 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 17: Cleanup
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 17: Cleanup ──');
  if (productId) {
    const dp = await api('DELETE', `/products/${productId}`, null, adminToken);
    ok('Delete test product', dp.status === 204 || dp.status === 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  Phase 5 Results: ${passed} PASSED, ${failed} FAILED (${passed + failed} total)`);
  console.log(`${'═'.repeat(55)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
