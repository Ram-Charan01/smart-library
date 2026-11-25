import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { branches } from './shared/branches.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use('/api', express.json({ limit: '1.5mb' }), (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'GET' && (!req.is('application/json') || req.get('Sec-Fetch-Site') === 'cross-site')) {
    return res.status(415).json({ error: 'Send a same-site JSON request.' });
  }
  next();
});

const dbPath = resolve(process.env.DATA_DIR || resolve(root, 'backend', '.library-data'));
let localMongo;
let mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  process.env.MONGOMS_DOWNLOAD_DIR ||= resolve(root, 'node_modules', '.cache', 'mongodb-binaries');
  const { MongoMemoryServer } = await import('mongodb-memory-server-core');
  await mkdir(dbPath, { recursive: true });
  localMongo = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger' } });
  mongoUri = localMongo.getUri();
}
const client = await new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 }).connect();
const db = client.db(process.env.MONGODB_DB || 'smart_library');
const users = db.collection('users');
const books = db.collection('books');
const sessions = db.collection('sessions');
await users.createIndex({ username: 1 }, { unique: true });
await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
await books.createIndex({ 'requests.userId': 1 });
await books.createIndex({ 'requests.id': 1 });

function passwordHash(password, salt) {
  return scryptSync(password, salt, 64);
}

for (const account of [
  { username: 'admin', name: 'Admin', role: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' },
  { username: 'user', name: 'Student', role: 'user', password: process.env.STUDENT_PASSWORD || 'user123' }
]) {
  const { password, ...user } = account;
  const salt = randomBytes(16).toString('hex');
  await users.updateOne({ username: user.username }, {
    $setOnInsert: { ...user, salt, passwordHash: passwordHash(password, salt).toString('hex') }
  }, { upsert: true });
}
for (const [title, author, category, stock] of [
  ['Data Structures', 'Seymour Lipschutz', 'CSE', 5],
  ['Operating Systems', 'Galvin', 'CSE', 3],
  ['Computer Networks', 'Andrew Tanenbaum', 'CSE', 4],
  ['Digital Electronics', 'Morris Mano', 'ECE', 2]
]) {
  await books.updateOne({ seedTitle: title }, {
    $setOnInsert: { seedTitle: title, title, author, category, stock, available: stock, image: '', requests: [] }
  }, { upsert: true });
}

const cookieName = 'library_session';
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.SECURE_COOKIE === 'true' };
const sessionDuration = 12 * 60 * 60 * 1000;
const digest = token => createHash('sha256').update(token).digest('hex');
const sessionToken = req => req.headers.cookie?.match(/(?:^|;\s*)library_session=([a-f0-9]{64})(?:;|$)/)?.[1];
const publicUser = user => ({ id: user._id, name: user.name, role: user.role });
const fail = (res, status, error) => res.status(status).json({ error });
const asId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value) ? new ObjectId(value) : null;
const bookFields = { requests: 0, seedTitle: 0 };

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || password.length > 200) {
    return fail(res, 400, 'Enter a valid username and password.');
  }
  const user = await users.findOne({ username: username.trim().toLowerCase() });
  const supplied = passwordHash(password, user?.salt || 'smart-library-demo');
  if (!user || !timingSafeEqual(supplied, Buffer.from(user.passwordHash, 'hex'))) {
    return fail(res, 401, 'Invalid username or password.');
  }
  const oldToken = sessionToken(req);
  if (oldToken) await sessions.deleteOne({ _id: digest(oldToken) });
  const token = randomBytes(32).toString('hex');
  await sessions.insertOne({ _id: digest(token), userId: user._id, expiresAt: new Date(Date.now() + sessionDuration) });
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionDuration }).json(publicUser(user));
});

app.post('/api/auth/logout', async (req, res) => {
  const token = sessionToken(req);
  if (token) await sessions.deleteOne({ _id: digest(token) });
  res.clearCookie(cookieName, cookieOptions).json({ ok: true });
});

app.use('/api', async (req, res, next) => {
  const token = sessionToken(req);
  const session = token && await sessions.findOne({ _id: digest(token), expiresAt: { $gt: new Date() } });
  const user = session && await users.findOne({ _id: session.userId });
  if (!user) return fail(res, 401, 'Please log in to continue.');
  req.user = user;
  next();
});
app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));
app.use('/api/admin', (req, res, next) => {
  if (req.user.role !== 'admin') return fail(res, 403, 'Admin access is required.');
  next();
});

app.get('/api/books', async (req, res) => {
  res.json(await books.find({}, { projection: bookFields }).sort({ title: 1 }).toArray());
});
app.get('/api/books/:id', async (req, res) => {
  const book = await books.findOne({ _id: asId(req.params.id) }, { projection: bookFields });
  if (!book) return fail(res, 404, 'Book not found.');
  res.json(book);
});

function validCover(image) {
  if (typeof image !== 'string' || image.length > 1_400_000) return false;
  return image === '' || /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-M\.jpg\?default=false$/.test(image)
    || /^data:image\/(?:png|jpeg);base64,[a-z0-9+/]+={0,2}$/i.test(image);
}

app.post('/api/admin/books', async (req, res) => {
  const { title, author, category, stock, image = '' } = req.body || {};
  if ([title, author].some(value => typeof value !== 'string' || !value.trim() || value.length > 300)
      || !branches.includes(category) || !Number.isSafeInteger(stock) || stock < 0 || stock > 100000 || !validCover(image)) {
    return fail(res, 400, 'Provide a valid title, author, branch, stock count, and cover.');
  }
  const result = await books.insertOne({ title: title.trim(), author: author.trim(), category, stock, available: stock, image, requests: [] });
  res.status(201).json({ id: result.insertedId });
});

app.patch('/api/admin/books/:id', async (req, res) => {
  const { stockDelta, image } = req.body || {};
  if (!Number.isSafeInteger(stockDelta) || stockDelta < 0 || stockDelta > 100000 || (image !== undefined && !validCover(image))) {
    return fail(res, 400, 'Provide a valid stock increase and cover.');
  }
  const update = { $inc: { stock: stockDelta, available: stockDelta } };
  if (image !== undefined) update.$set = { image };
  const id = asId(req.params.id);
  const result = await books.updateOne({ _id: id, stock: { $lte: 100000 - stockDelta } }, update);
  if (!result.matchedCount) {
    if (!await books.findOne({ _id: id }, { projection: { _id: 1 } })) return fail(res, 404, 'Book not found.');
    return fail(res, 409, 'Total stock cannot exceed 100,000.');
  }
  res.json({ ok: true });
});

const outstanding = { status: 'approved', returnedAt: null };
const activeRequest = { $or: [{ status: 'pending' }, outstanding] };
const day = date => date.toISOString().slice(0, 10);

// Keep loans and availability in the same book document so each transition is atomic.
app.post('/api/requests', async (req, res) => {
  const bookId = asId(req.body?.bookId);
  const userId = req.user._id;
  const request = { id: new ObjectId(), userId, status: 'pending', requestedAt: new Date(), dueDate: null, returnedAt: null };
  const result = await books.updateOne({
    _id: bookId, available: { $gt: 0 },
    requests: { $not: { $elemMatch: { userId, ...activeRequest } } }
  }, { $push: { requests: request } });
  if (!result.matchedCount) {
    const book = await books.findOne({ _id: bookId }, { projection: { available: 1 } });
    if (!book) return fail(res, 404, 'Book not found.');
    return fail(res, 409, book.available > 0 ? 'You already have an active request or loan for this book.' : 'No copies are available.');
  }
  res.status(201).json({ id: request.id });
});

async function listRequests(userId) {
  const match = userId ? [{ $match: { 'requests.userId': userId } }] : [];
  const pipeline = [
    ...match,
    { $project: { title: 1, requests: 1 } },
    { $unwind: '$requests' },
    ...match,
    { $replaceWith: { $mergeObjects: ['$requests', { bookId: '$_id', title: '$title' }] } },
    { $sort: { requestedAt: -1, id: -1 } }
  ];
  return books.aggregate(pipeline).toArray();
}
app.get('/api/requests/me', async (req, res) => res.json(await listRequests(req.user._id)));
app.get('/api/admin/requests', async (req, res) => {
  const priority = request => request.status === 'pending' ? 0 : request.status === 'rejected' ? 3 : request.returnedAt ? 2 : 1;
  res.json((await listRequests()).sort((a, b) => priority(a) - priority(b)));
});

app.post('/api/admin/requests/:id/:action', async (req, res) => {
  const id = asId(req.params.id);
  const { action } = req.params;
  if (!id || !['approve', 'reject', 'return'].includes(action)) return fail(res, 404, 'Request action not found.');
  const filter = { requests: { $elemMatch: { id, ...(action === 'return' ? outstanding : { status: 'pending' }) } } };
  const update = { $set: {} };
  if (action === 'approve') {
    filter.available = { $gt: 0 };
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 7);
    update.$set = { 'requests.$.status': 'approved', 'requests.$.dueDate': day(due) };
    update.$inc = { available: -1 };
  } else if (action === 'reject') {
    update.$set['requests.$.status'] = 'rejected';
  } else {
    update.$set['requests.$.returnedAt'] = new Date();
    update.$inc = { available: 1 };
  }
  if ((await books.updateOne(filter, update)).matchedCount) return res.json({ ok: true });
  const book = await books.findOne({ 'requests.id': id }, { projection: { available: 1, requests: { $elemMatch: { id } } } });
  if (!book) return fail(res, 404, 'Request not found.');
  const request = book.requests[0];
  if (action === 'approve' && request.status === 'pending') return fail(res, 409, 'No copies are available to approve this request.');
  return fail(res, 409, 'This request has already been processed or cannot be changed.');
});

app.get('/api/admin/dashboard', async (req, res) => {
  const counts = await books.aggregate([
    { $project: { requests: 1 } },
    { $group: {
      _id: null,
      totalBooks: { $sum: 1 },
      totalRequests: { $sum: { $size: '$requests' } },
      pendingRequests: { $sum: { $size: { $filter: { input: '$requests', cond: { $eq: ['$$this.status', 'pending'] } } } } },
      approvedRequests: { $sum: { $size: { $filter: { input: '$requests', cond: { $eq: ['$$this.status', 'approved'] } } } } }
    } },
    { $unset: '_id' }
  ]).next();
  res.json(counts || { totalBooks: 0, totalRequests: 0, pendingRequests: 0, approvedRequests: 0 });
});

app.use('/api', (req, res) => fail(res, 404, 'API route not found.'));
const dist = resolve(root, 'frontend', 'dist');
app.use(express.static(dist));
app.get(['/', '/login.html', '/admin.html', '/inventory.html', '/requests.html', '/mybooks.html', '/book.html'], (req, res) => {
  res.sendFile(resolve(dist, 'index.html'));
});
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status === 400 || error.status === 413) return fail(res, error.status, 'Invalid request or upload is too large.');
  console.error(error);
  fail(res, 500, 'Something went wrong on the server.');
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () => console.log(`Smart Library is running at http://${host}:${server.address().port}/login.html`));
async function stop() {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await client.close();
  await localMongo?.stop({ doCleanup: false });
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
if (process.connected) process.once('disconnect', stop);
