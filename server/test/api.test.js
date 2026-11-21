// API integration tests. They need a MongoDB server (default: mongodb://127.0.0.1:27017) and use a throwaway database.
// Run with: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.JWT_SECRET ||= 'test-secret-test-secret-test-secret-123';
process.env.REFRESH_GRACE_MS = '0';
const app = require('../src/app');

let server; let base;
const LONG = 'word '.repeat(60).trim();

// Tiny HTTP client with a cookie jar, so each "browser" keeps its own refresh cookie.
function client() {
  let cookie = '';
  async function call(method, path, body, token) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
    const set = res.headers.getSetCookie().find((c) => c.startsWith('ink_rt='));
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => ({})), setCookie: set };
  }
  return { call, get cookie() { return cookie; }, set cookie(v) { cookie = v; } };
}
const signup = async (name, email) => {
  const c = client();
  const r = await c.call('POST', '/api/auth/register', { name, email, password: 'secret123' });
  return { c, token: r.data.token, user: r.data.user, res: r };
};

before(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/inkwell_test');
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes())); // recreate indexes after the drop
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

test('health check reports the database is up', async () => {
  const r = await client().call('GET', '/api/health');
  assert.equal(r.status, 200); assert.equal(r.data.db, 'up');
});

test('register: sets an httpOnly refresh cookie, rejects duplicates and weak passwords', async () => {
  const { res } = await signup('Ada Lovelace', 'ada@example.com');
  assert.equal(res.status, 201);
  assert.match(res.setCookie, /HttpOnly/);
  assert.match(res.setCookie, /Path=\/api\/auth/);
  assert.equal(res.data.user.password, undefined);
  const dup = await client().call('POST', '/api/auth/register', { name: 'Ada Again', email: 'ada@example.com', password: 'secret123' });
  assert.equal(dup.status, 409);
  const weak = await client().call('POST', '/api/auth/register', { name: 'Bob Smith', email: 'bob@example.com', password: 'short' });
  assert.equal(weak.status, 422); assert.ok(weak.data.errors.password);
});

test('login: wrong password is 401, right password is 200', async () => {
  assert.equal((await client().call('POST', '/api/auth/login', { email: 'ada@example.com', password: 'wrongpass1' })).status, 401);
  assert.equal((await client().call('POST', '/api/auth/login', { email: 'ada@example.com', password: 'secret123' })).status, 200);
});

test('private routes need a valid access token', async () => {
  const c = client();
  assert.equal((await c.call('GET', '/api/posts/mine')).status, 401);
  assert.equal((await c.call('GET', '/api/auth/profile', null, 'not-a-token')).status, 401);
});

test('refresh rotates the cookie, an old cookie is rejected, logout ends the session', async () => {
  const { c } = await signup('Rita Rotate', 'rita@example.com');
  const first = c.cookie;
  const r1 = await c.call('POST', '/api/auth/refresh');
  assert.equal(r1.status, 200); assert.ok(r1.data.token); assert.notEqual(c.cookie, first);
  const stolen = client(); stolen.cookie = first;                     // replay of the rotated-out token
  assert.equal((await stolen.call('POST', '/api/auth/refresh')).status, 401);
  assert.equal((await c.call('POST', '/api/auth/refresh')).status, 401); // that replay revoked the whole session
  const { c: c2 } = await signup('Lou Logout', 'lou@example.com');
  const saved = c2.cookie;
  await c2.call('POST', '/api/auth/logout');
  const replay = client(); replay.cookie = saved;                      // the cookie must be dead on the server, not just cleared in the browser
  assert.equal((await replay.call('POST', '/api/auth/refresh')).status, 401);
});

test('posts: full CRUD with draft privacy and ownership rules', async () => {
  const owner = await signup('Olive Owner', 'olive@example.com');
  const other = await signup('Otto Other', 'otto@example.com');
  const T = owner.token;
  const draft = (await owner.c.call('POST', '/api/posts', { title: 'My private draft', category: 'Design', status: 'draft', body: 'short' }, T)).data.post;
  const pub = (await owner.c.call('POST', '/api/posts', { title: 'A published post', category: 'Design', status: 'published', body: LONG }, T)).data.post;
  assert.equal((await owner.c.call('POST', '/api/posts', { title: 'Too short', category: 'Design', status: 'published', body: 'no' }, T)).status, 422);

  const list = (await client().call('GET', '/api/posts')).data;
  assert.ok(list.posts.some((p) => p._id === pub._id)); assert.ok(!list.posts.some((p) => p._id === draft._id));
  assert.equal((await client().call('GET', `/api/posts/${draft._id}`)).status, 404);
  assert.equal((await other.c.call('GET', `/api/posts/${draft._id}`, null, other.token)).status, 404);
  assert.equal((await owner.c.call('GET', `/api/posts/${draft._id}`, null, T)).status, 200);

  const edit = { title: 'A published post (edited)', category: 'Product', status: 'published', body: LONG };
  assert.equal((await other.c.call('PUT', `/api/posts/${pub._id}`, edit, other.token)).status, 404);
  assert.equal((await owner.c.call('PUT', `/api/posts/${pub._id}`, edit, T)).data.post.title, 'A published post (edited)');
  assert.equal((await owner.c.call('PATCH', `/api/posts/${draft._id}/status`, { status: 'published' }, T)).status, 422); // under 50 words
  assert.equal((await owner.c.call('PATCH', `/api/posts/${pub._id}/status`, { status: 'draft' }, T)).data.post.status, 'draft');

  assert.equal((await other.c.call('DELETE', `/api/posts/${pub._id}`, null, other.token)).status, 404);
  assert.equal((await owner.c.call('DELETE', `/api/posts/${pub._id}`, null, T)).status, 200);
  assert.equal((await owner.c.call('GET', `/api/posts/${pub._id}`, null, T)).status, 404);
});

test('dashboard data: /posts/mine returns only the caller\'s posts', async () => {
  const a = await signup('Ann Author', 'ann@example.com');
  const b = await signup('Ben Writer', 'ben@example.com');
  await a.c.call('POST', '/api/posts', { title: 'Ann writes this', category: 'Career', status: 'published', body: LONG }, a.token);
  await b.c.call('POST', '/api/posts', { title: 'Ben writes this', category: 'Career', status: 'published', body: LONG }, b.token);
  const mine = (await a.c.call('GET', '/api/posts/mine', null, a.token)).data.posts;
  assert.equal(mine.length, 1); assert.equal(mine[0].author.name, 'Ann Author');
});

test('feed: pagination, category filter, content search and sorting', async () => {
  const w = await signup('Wes Writer', 'wes@example.com');
  for (const [i, cat] of ['Design', 'Design', 'Career'].entries())
    await w.c.call('POST', '/api/posts', { title: `Feed post number ${i}`, category: cat, status: 'published', body: `${LONG} uniqueneedle${i}` }, w.token);
  const page1 = (await client().call('GET', '/api/posts?limit=2&page=1')).data;
  assert.equal(page1.posts.length, 2); assert.ok(page1.pages >= 2);
  assert.equal((await client().call('GET', '/api/posts?category=Career&q=Feed%20post')).data.total, 1);
  assert.equal((await client().call('GET', '/api/posts?q=uniqueneedle1')).data.total, 1);   // matches text inside the body
  const oldest = (await client().call('GET', '/api/posts?sort=oldest&limit=1')).data.posts[0];
  const newest = (await client().call('GET', '/api/posts?sort=newest&limit=1')).data.posts[0];
  assert.ok(new Date(oldest.createdAt) <= new Date(newest.createdAt));
});

test('profile: update, password change ends other sessions and old tokens', async () => {
  const { c, token } = await signup('Pat Profile', 'pat@example.com');
  const second = client(); await second.call('POST', '/api/auth/login', { email: 'pat@example.com', password: 'secret123' });
  assert.equal((await c.call('PATCH', '/api/auth/profile', { name: 'Pat Renamed', bio: 'Hello' }, token)).data.user.name, 'Pat Renamed');
  assert.equal((await c.call('PATCH', '/api/auth/password', { currentPassword: 'nope12345', newPassword: 'newsecret456' }, token)).status, 400);
  const changed = await c.call('PATCH', '/api/auth/password', { currentPassword: 'secret123', newPassword: 'newsecret456' }, token);
  assert.equal(changed.status, 200);
  assert.equal((await c.call('GET', '/api/auth/me', null, token)).status, 401);               // old access token
  assert.equal((await c.call('GET', '/api/auth/me', null, changed.data.token)).status, 200);  // new one
  assert.equal((await second.call('POST', '/api/auth/refresh')).status, 401);                // other device signed out
  assert.equal((await client().call('POST', '/api/auth/login', { email: 'pat@example.com', password: 'newsecret456' })).status, 200);
  await c.call('POST', '/api/auth/logout-all', null, changed.data.token);
  assert.equal((await c.call('GET', '/api/auth/me', null, changed.data.token)).status, 401);      // sign out everywhere also revokes live access tokens
});
