import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100';
for (const path of ['/profile', '/members']) {
  const response = await fetch(base + path, { redirect: 'manual' });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), '/login');
  console.log(path + ': signed-out redirect verified');
}
for (const path of ['/auth/callback', '/auth/callback?error=access_denied', '/auth/callback?next=https://example.com']) {
  const response = await fetch(base + path, { redirect: 'manual' });
  assert.equal(response.status, 303);
  assert.equal(new URL(response.headers.get('location'), base).pathname, '/login');
  assert.equal(new URL(response.headers.get('location'), base).origin, new URL(base).origin);
  assert.match(response.headers.get('cache-control'), /no-store/);
  console.log('Callback failure stays on the app: ' + path);
}
const legacyPost = await fetch(base + '/auth/callback', { method: 'POST', body: 'credential=fake' });
assert.equal(legacyPost.status, 405);
console.log('Removed ID-token POST flow rejected');
const login = await fetch(base + '/login');
assert.equal(login.status, 200);
assert.match(await login.text(), /Join the/);
console.log('Login page verified');
