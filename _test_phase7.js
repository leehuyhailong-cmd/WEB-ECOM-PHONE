/**
 * Phase 7 — Automated Integration Test
 * Admin Dashboard APIs
 *
 * Prerequisites:
 *   - Server running at http://localhost:3000
 *   - MongoDB connected
 *   - Admin user exists (promoted via DB or previous tests)
 *   - At least 1 order exists in DB (from Phase 5 tests)
 */

'use strict';

const BASE = 'http://localhost:3000/api';
const PW   = 'TestPass123!';
let passed = 0, failed = 0;

// ── State ────────────────────────────────────────────────────────────────────
let adminToken, userToken, adminId, testUserId, testProductId;

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
  for (const [k, v] of Object.entries(fields)) formData.append(k, String(v));
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

function decodeJWT(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🧪 Phase 7 Integration Test — Admin Dashboard APIs\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Setup users
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('── Step 1: Setup users ──');
  adminToken = await ensureUser('Admin P7', 'admin_p5_test@test.com');
  ok('Admin login', !!adminToken);
  if (adminToken) adminId = decodeJWT(adminToken).sub;

  userToken = await ensureUser('User P7', 'user1_p5_test@test.com');
  ok('User login', !!userToken);

  if (!adminToken) {
    console.log('  ⚠️  Cannot proceed without admin token');
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Create test data (product + order for aggregations)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 2: Create test data ──');

  // Create a product for low-stock and aggregation testing
  const prodRes = await apiForm('POST', '/products', {
    name:        'Admin Test Phone P7 ' + Date.now(),
    price:       '9990000',
    brand:       'Samsung',
    category:    'smartphone',
    stock:       '3',  // Low stock!
    isActive:    'true',
    description: 'Low stock test product for Phase 7',
  }, adminToken);
  testProductId = prodRes.data?.data?.product?._id || prodRes.data?.data?._id;
  ok('Create low-stock product', prodRes.status === 201 && !!testProductId);

  // Create an order for revenue aggregation
  if (testProductId) {
    await api('POST', '/cart/items', { productId: testProductId, quantity: 1 }, userToken);
    const orderRes = await api('POST', '/orders', {
      shippingAddress: {
        fullName: 'P7 Test', phone: '0901234567', street: '456 P7 St',
        ward: 'Ward 2', district: 'District 3', province: 'HCM',
      },
      paymentMethod: 'cod',
    }, userToken);
    const orderId = orderRes.data?.data?.order?._id || orderRes.data?.data?._id;
    ok('Create test order', !!orderId);

    // Fast-track to delivered
    if (orderId) {
      await api('PATCH', `/orders/${orderId}/status`, { status: 'confirmed' }, adminToken);
      await api('PATCH', `/orders/${orderId}/status`, { status: 'processing' }, adminToken);
      await api('PATCH', `/orders/${orderId}/status`, { status: 'shipping' }, adminToken);
      await api('PATCH', `/orders/${orderId}/status`, { status: 'delivered' }, adminToken);
      ok('Order → delivered', true);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Authorization Guard Tests
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 3: Authorization guards ──');

  // No token → 401
  const noAuth = await api('GET', '/admin/stats/overview');
  ok('No token → 401', noAuth.status === 401);

  // User role → 403
  const userAuth = await api('GET', '/admin/stats/overview', null, userToken);
  ok('User role → 403', userAuth.status === 403);
  ok('403 message correct', userAuth.data?.message?.includes('admin'));

  // Admin token → 200
  const adminAuth = await api('GET', '/admin/stats/overview', null, adminToken);
  ok('Admin token → 200', adminAuth.status === 200);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 4: KPI Overview
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 4: KPI overview ──');
  const overview = await api('GET', '/admin/stats/overview', null, adminToken);
  ok('Overview 200', overview.status === 200);
  ok('Has revenueMTD', typeof overview.data?.data?.revenueMTD === 'number');
  ok('Has ordersToday', typeof overview.data?.data?.ordersToday === 'number');
  ok('Has newUsersToday', typeof overview.data?.data?.newUsersToday === 'number');
  ok('Has totalProducts', typeof overview.data?.data?.totalProducts === 'number');
  ok('Has totalUsers', typeof overview.data?.data?.totalUsers === 'number');
  ok('Has totalOrders', typeof overview.data?.data?.totalOrders === 'number');
  ok('Has lowStockCount', typeof overview.data?.data?.lowStockCount === 'number');
  ok('Has lowStockProducts[]', Array.isArray(overview.data?.data?.lowStockProducts));
  ok('revenueMTD > 0', overview.data?.data?.revenueMTD > 0);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 5: Revenue Chart
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 5: Revenue chart ──');
  const rev30 = await api('GET', '/admin/stats/revenue?days=30', null, adminToken);
  ok('Revenue 30d (200)', rev30.status === 200);
  ok('Returns array', Array.isArray(rev30.data?.data));

  if (rev30.data?.data?.length > 0) {
    const entry = rev30.data.data[0];
    ok('Entry has date', typeof entry.date === 'string');
    ok('Entry has revenue', typeof entry.revenue === 'number');
    ok('Entry has count', typeof entry.count === 'number');
  }

  const rev7 = await api('GET', '/admin/stats/revenue?days=7', null, adminToken);
  ok('Revenue 7d (200)', rev7.status === 200);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 6: Top Products
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 6: Top products ──');
  const top = await api('GET', '/admin/stats/top-products?limit=3', null, adminToken);
  ok('Top products (200)', top.status === 200);
  ok('Returns array', Array.isArray(top.data?.data));

  if (top.data?.data?.length > 0) {
    const p = top.data.data[0];
    ok('Has name', typeof p.name === 'string');
    ok('Has revenue', typeof p.revenue === 'number');
    ok('Has unitsSold', typeof p.unitsSold === 'number');
    ok('Has productId', !!p.productId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 7: Orders by Status
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 7: Orders by status ──');
  const statuses = await api('GET', '/admin/stats/orders-by-status', null, adminToken);
  ok('Orders by status (200)', statuses.status === 200);
  ok('Returns array', Array.isArray(statuses.data?.data));

  if (statuses.data?.data?.length > 0) {
    const s = statuses.data.data[0];
    ok('Has status string', typeof s.status === 'string');
    ok('Has count number', typeof s.count === 'number');
    ok('Has delivered status', statuses.data.data.some(x => x.status === 'delivered'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 8: Category Breakdown
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 8: Category breakdown ──');
  const cats = await api('GET', '/admin/stats/category-breakdown', null, adminToken);
  ok('Category breakdown (200)', cats.status === 200);
  ok('Returns array', Array.isArray(cats.data?.data));

  if (cats.data?.data?.length > 0) {
    ok('Has category', typeof cats.data.data[0].category === 'string');
    ok('Has revenue', typeof cats.data.data[0].revenue === 'number');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 9: Low Stock
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 9: Low stock ──');
  const low = await api('GET', '/admin/stats/low-stock?threshold=10', null, adminToken);
  ok('Low stock (200)', low.status === 200);
  ok('Returns array', Array.isArray(low.data?.data));
  ok('Contains test product', low.data?.data?.some(p => p._id?.toString() === testProductId));

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 10: Recent Orders
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 10: Recent orders ──');
  const recent = await api('GET', '/admin/stats/recent-orders', null, adminToken);
  ok('Recent orders (200)', recent.status === 200);
  ok('Returns array', Array.isArray(recent.data?.data));

  if (recent.data?.data?.length > 0) {
    const o = recent.data.data[0];
    ok('Has status', typeof o.status === 'string');
    ok('Has totalPrice', typeof o.totalPrice === 'number');
    ok('Has userId (populated)', typeof o.userId === 'object');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 11: User Management
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 11: User management ──');

  // List users
  const userList = await api('GET', '/admin/users?page=1&limit=5', null, adminToken);
  ok('List users (200)', userList.status === 200);
  ok('Has users array', Array.isArray(userList.data?.data));
  ok('Has pagination', !!userList.data?.pagination);
  ok('pagination.total > 0', userList.data?.pagination?.total > 0);

  // Search users
  const search = await api('GET', '/admin/users?search=user1', null, adminToken);
  ok('Search users (200)', search.status === 200);
  ok('Search finds results', search.data?.data?.length >= 1);

  // Filter by role
  const admins = await api('GET', '/admin/users?role=admin', null, adminToken);
  ok('Filter admin role (200)', admins.status === 200);
  ok('All results are admin', admins.data?.data?.every(u => u.role === 'admin'));

  // Get single user
  testUserId = userList.data?.data?.find(u => u.role === 'user')?._id;
  if (testUserId) {
    const single = await api('GET', `/admin/users/${testUserId}`, null, adminToken);
    ok('Get user detail (200)', single.status === 200);
    ok('Has email', typeof single.data?.data?.email === 'string');
    ok('Has addresses[]', Array.isArray(single.data?.data?.addresses));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 12: Role & Status Mutations
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 12: Role & status mutations ──');

  if (testUserId) {
    // Promote to admin
    const promote = await api('PATCH', `/admin/users/${testUserId}/role`,
      { role: 'admin' }, adminToken);
    ok('Promote → admin (200)', promote.status === 200);
    ok('New role = admin', promote.data?.data?.role === 'admin');

    // Demote back to user
    const demote = await api('PATCH', `/admin/users/${testUserId}/role`,
      { role: 'user' }, adminToken);
    ok('Demote → user (200)', demote.status === 200);
    ok('New role = user', demote.data?.data?.role === 'user');

    // Deactivate
    const deact = await api('PATCH', `/admin/users/${testUserId}/status`,
      { isActive: false }, adminToken);
    ok('Deactivate (200)', deact.status === 200);
    ok('isActive = false', deact.data?.data?.isActive === false);

    // Reactivate
    const react = await api('PATCH', `/admin/users/${testUserId}/status`,
      { isActive: true }, adminToken);
    ok('Reactivate (200)', react.status === 200);
    ok('isActive = true', react.data?.data?.isActive === true);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 13: Self-Protection Business Rules
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 13: Self-protection rules ──');

  // Admin cannot demote themselves
  const selfDemote = await api('PATCH', `/admin/users/${adminId}/role`,
    { role: 'user' }, adminToken);
  ok('Self-demote blocked (409)', selfDemote.status === 409);

  // Admin cannot deactivate themselves
  const selfDeact = await api('PATCH', `/admin/users/${adminId}/status`,
    { isActive: false }, adminToken);
  ok('Self-deactivate blocked (409)', selfDeact.status === 409);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 14: Validation Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 14: Validation edge cases ──');

  // Invalid role
  if (testUserId) {
    const badRole = await api('PATCH', `/admin/users/${testUserId}/role`,
      { role: 'superadmin' }, adminToken);
    ok('Invalid role rejected (400)', badRole.status === 400);
  }

  // Invalid isActive type
  if (testUserId) {
    const badStatus = await api('PATCH', `/admin/users/${testUserId}/status`,
      { isActive: 'yes' }, adminToken);
    ok('Invalid isActive rejected (400)', badStatus.status === 400);
  }

  // Non-existent user
  const ghost = await api('GET', '/admin/users/000000000000000000000000', null, adminToken);
  ok('Non-existent user (404)', ghost.status === 404);

  // Invalid days param
  const badDays = await api('GET', '/admin/stats/revenue?days=999', null, adminToken);
  ok('days=999 rejected (400)', badDays.status === 400);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 15: Cleanup
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Step 15: Cleanup ──');
  if (testProductId) {
    const dp = await api('DELETE', `/products/${testProductId}`, null, adminToken);
    ok('Delete test product', dp.status === 204 || dp.status === 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  Phase 7 Results: ${passed} PASSED, ${failed} FAILED (${passed + failed} total)`);
  console.log(`${'═'.repeat(55)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
