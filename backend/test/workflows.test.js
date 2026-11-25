import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('MERN library workflow and concurrent checkout', { timeout: 300000 }, async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'smart-library-test-'));
  const child = spawn(process.execPath, ['index.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, DATA_DIR: dataDir, MONGODB_URI: '', PORT: '0', HOST: '127.0.0.1', SECURE_COOKIE: 'false',
      ADMIN_PASSWORD: 'admin123', STUDENT_PASSWORD: 'user123' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });
  let output = '';
  const exited = once(child, 'exit');
  t.after(async () => {
    if (child.connected) child.disconnect();
    await exited;
    await rm(dataDir, { recursive: true, force: true, maxRetries: 5 });
  });

  const base = await new Promise((resolve, reject) => {
    child.stderr.on('data', chunk => { output += chunk; });
    child.stdout.on('data', chunk => {
      output += chunk;
      const url = output.match(/running at (http:\/\/127\.0\.0\.1:\d+)/)?.[1];
      if (url) resolve(url);
    });
    exited.then(() => reject(new Error(output)), reject);
  });

  async function request(path, { method = 'GET', body, cookie, status = 200 } = {}) {
    const response = await fetch(base + '/api' + path, {
      method,
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  const post = (path, cookie, body = {}, status) => request(path, { method: 'POST', cookie, body, status });
  for (const page of ['login', 'index', 'book', 'mybooks', 'admin', 'inventory', 'requests']) {
    const response = await fetch(`${base}/${page}.html`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<div id="root">/);
  }
  await request('/books', { status: 401 });
  await post('/auth/login', null, { username: 'admin', password: 'wrong' }, 401);
  const admin = await post('/auth/login', null, { username: 'admin', password: 'admin123' });
  const student = await post('/auth/login', null, { username: 'user', password: 'user123' });
  const adminCookie = admin.cookie;
  const studentCookie = student.cookie;
  assert.equal((await request('/auth/me', { cookie: studentCookie })).data.id, student.data.id);
  await request('/admin/dashboard', { cookie: studentCookie, status: 403 });
  await post('/admin/books', studentCookie, {}, 403);
  await post('/admin/books', adminCookie, { title: 'Test', author: 'Test', category: 'OTHER', stock: 1 }, 400);
  const cover = 'https://covers.openlibrary.org/b/id/14627509-M.jpg?default=false';
  const { data: book } = await post('/admin/books', adminCookie, {
    title: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'CSD', stock: 1, image: cover
  }, 201);
  const getBook = () => request(`/books/${book.id}`, { cookie: studentCookie }).then(result => result.data);
  assert.equal((await getBook()).image, cover);
  const studentRequest = (await post('/requests', studentCookie, { bookId: book.id }, 201)).data.id;
  await post('/requests', studentCookie, { bookId: book.id }, 409);
  const adminRequest = (await post('/requests', adminCookie, { bookId: book.id }, 201)).data.id;
  const mine = (await request('/requests/me', { cookie: studentCookie })).data;
  assert.deepEqual(mine.map(item => item.id), [studentRequest]);
  assert.equal((await getBook()).available, 1);

  const action = (id, command) => fetch(`${base}/api/admin/requests/${id}/${command}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie }, body: '{}'
  }).then(response => response.status);
  const approvals = await Promise.all([action(studentRequest, 'approve'), action(adminRequest, 'approve')]);
  assert.deepEqual(approvals.toSorted(), [200, 409]);
  const [approved, pending] = approvals[0] === 200 ? [studentRequest, adminRequest] : [adminRequest, studentRequest];
  assert.equal((await getBook()).available, 0);
  const queue = (await request('/admin/requests', { cookie: adminCookie })).data;
  assert.deepEqual(queue.map(item => item.id), [pending, approved]);
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 7);
  assert.equal(queue[1].dueDate, due.toISOString().slice(0, 10));
  assert.equal(await action(pending, 'reject'), 200);
  assert.equal(await action(approved, 'return'), 200);
  assert.equal(await action(approved, 'return'), 409);
  assert.equal((await getBook()).available, 1);
  await post('/requests', studentCookie, { bookId: book.id }, 201);
  await request(`/admin/books/${book.id}`, { method: 'PATCH', cookie: adminCookie, body: { stockDelta: 2 } });
  const updated = await getBook();
  assert.equal(updated.stock, 3);
  assert.equal(updated.available, 3);
  assert.deepEqual((await request('/admin/dashboard', { cookie: adminCookie })).data,
    { totalBooks: 5, totalRequests: 3, pendingRequests: 1, approvedRequests: 1 });
  await post('/auth/logout', adminCookie);
  await request('/auth/me', { cookie: adminCookie, status: 401 });
});
