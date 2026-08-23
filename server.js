'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_BODY = 20 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

let db = null;
let USE_FIREBASE = false;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SA_JSON || '{}');
  if (serviceAccount.project_id && process.env.FIREBASE_DB_URL) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DB_URL
    });
    db = admin.database();
    USE_FIREBASE = true;
    console.log('Firebase Realtime Database connected');
  }
} catch (e) {
  console.log('Firebase not configured, using local file storage');
}

const DB_PREFIX = 'stockpilot_';

function firebaseGet(key, cb) {
  if (!db) return cb(null, null);
  db.ref(DB_PREFIX + key).once('value')
    .then(function (snap) { cb(null, snap.val()); })
    .catch(function (err) { cb(err); });
}

function firebaseSet(key, value, cb) {
  if (!db) return cb(null);
  db.ref(DB_PREFIX + key).set(value)
    .then(function () { cb(null); })
    .catch(function (err) { cb(err); });
}

function firebaseDelete(key, cb) {
  if (!db) return cb(null);
  db.ref(DB_PREFIX + key).remove()
    .then(function () { cb(null); })
    .catch(function (err) { cb(err); });
}

function firebaseGetAll(cb) {
  if (!db) return cb(null, {});
  db.ref().once('value')
    .then(function (snap) {
      var data = snap.val() || {};
      var filtered = {};
      for (var k in data) {
        if (k.indexOf(DB_PREFIX) === 0) {
          filtered[k.substring(DB_PREFIX.length)] = data[k];
        }
      }
      cb(null, filtered);
    })
    .catch(function (err) { cb(err); });
}

function firebaseSetAll(obj, cb) {
  if (!db) return cb(null);
  var updates = {};
  for (var k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      updates[DB_PREFIX + k] = obj[k];
    }
  }
  db.ref().update(updates)
    .then(function () { cb(null); })
    .catch(function (err) { cb(err); });
}

function firebaseDeleteAll(cb) {
  if (!db) return cb(null);
  db.ref().once('value')
    .then(function (snap) {
      var data = snap.val() || {};
      var updates = {};
      for (var k in data) {
        if (k.indexOf(DB_PREFIX) === 0) {
          updates[k] = null;
        }
      }
      return db.ref().update(updates);
    })
    .then(function () { cb(null); })
    .catch(function (err) { cb(err); });
}

let store = {};
if (!USE_FIREBASE) {
  try {
    var df = path.join(ROOT, 'data', 'db.json');
    if (fs.existsSync(df)) store = JSON.parse(fs.readFileSync(df, 'utf8'));
  } catch (e) { store = {}; }
}

let writeQueue = Promise.resolve();
function persist() {
  if (USE_FIREBASE) return;
  var DATA_DIR = path.join(ROOT, 'data');
  var DATA_FILE = path.join(DATA_DIR, 'db.json');
  writeQueue = writeQueue.then(function () {
    return new Promise(function (resolve, reject) {
      fs.mkdir(DATA_DIR, { recursive: true }, function (err) {
        if (err) return reject(err);
        var tmp = DATA_FILE + '.tmp';
        fs.writeFile(tmp, JSON.stringify(store, null, 2), 'utf8', function (err2) {
          if (err2) return reject(err2);
          fs.rename(tmp, DATA_FILE, function (err3) { if (err3) reject(err3); else resolve(); });
        });
      });
    });
  }).catch(function (e) { console.error('Save failed:', e && e.message); });
}

function sendJSON(res, status, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, text, type) {
  var body = String(text == null ? '' : text);
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req, cb) {
  var chunks = [];
  var size = 0;
  req.on('data', function (c) {
    chunks.push(c);
    size += c.length;
    if (size > MAX_BODY) { req.destroy(); }
  });
  req.on('end', function () { cb(Buffer.concat(chunks).toString('utf8')); });
  req.on('error', function () { cb(''); });
}

function serveStatic(req, res, urlPath) {
  var p = urlPath;
  if (p === '/' || p === '') p = '/index.html';
  var full = path.normalize(path.join(ROOT, p));
  if (full !== ROOT && full.indexOf(ROOT + path.sep) !== 0) {
    return sendText(res, 403, 'Forbidden');
  }
  fs.stat(full, function (err, st) {
    if (err || !st.isFile()) return sendText(res, 404, 'Not Found');
    var ext = path.extname(full).toLowerCase();
    var type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Content-Length': st.size });
    var stream = fs.createReadStream(full);
    stream.pipe(res);
    stream.on('error', function () { try { res.end(); } catch (e) { /* noop */ } });
  });
}

const server = http.createServer(function (req, res) {
  var pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (e) {
    return sendText(res, 400, 'Bad Request');
  }
  var method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (pathname === '/api/ping') { return sendJSON(res, 200, { ok: true, storage: USE_FIREBASE ? 'firebase' : 'file' }); }

  if (pathname.indexOf('/api/') === 0) {
    var mKey = pathname.match(/^\/api\/db\/([^/]+)$/);

    if (method === 'GET' && pathname === '/api/db') {
      if (USE_FIREBASE) {
        return firebaseGetAll(function (err, obj) {
          if (err) return sendJSON(res, 500, { error: 'firebase read failed' });
          sendJSON(res, 200, obj);
        });
      }
      return sendJSON(res, 200, store);
    }

    if (method === 'POST' && pathname === '/api/db') {
      return readBody(req, function (body) {
        try {
          var obj = JSON.parse(body || '{}');
          if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('bad');
          var next = {};
          for (var k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) next[k] = String(obj[k]);
          }
          if (USE_FIREBASE) {
            return firebaseSetAll(next, function (err) {
              if (err) return sendJSON(res, 500, { error: 'firebase write failed' });
              sendJSON(res, 200, { ok: true, count: Object.keys(next).length });
            });
          }
          store = next;
          persist();
          sendJSON(res, 200, { ok: true, count: Object.keys(next).length });
        } catch (e2) {
          sendJSON(res, 400, { error: 'invalid body' });
        }
      });
    }

    if (method === 'DELETE' && pathname === '/api/db') {
      if (USE_FIREBASE) {
        return firebaseDeleteAll(function (err) {
          if (err) return sendJSON(res, 500, { error: 'firebase delete failed' });
          sendJSON(res, 200, { ok: true });
        });
      }
      store = {};
      persist();
      return sendJSON(res, 200, { ok: true });
    }

    if (method === 'GET' && mKey) {
      var k1 = mKey[1];
      if (USE_FIREBASE) {
        return firebaseGet(k1, function (err, val) {
          if (err) return sendJSON(res, 500, { error: 'firebase read failed' });
          sendJSON(res, 200, { value: val });
        });
      }
      return sendJSON(res, 200, { value: Object.prototype.hasOwnProperty.call(store, k1) ? store[k1] : null });
    }

    if (method === 'PUT' && mKey) {
      var k2 = mKey[1];
      return readBody(req, function (body) {
        if (USE_FIREBASE) {
          return firebaseSet(k2, body, function (err) {
            if (err) return sendJSON(res, 500, { error: 'firebase write failed' });
            sendJSON(res, 200, { ok: true });
          });
        }
        store[k2] = body;
        persist();
        sendJSON(res, 200, { ok: true });
      });
    }

    if (method === 'DELETE' && mKey) {
      var k3 = mKey[1];
      if (USE_FIREBASE) {
        return firebaseDelete(k3, function (err) {
          if (err) return sendJSON(res, 500, { error: 'firebase delete failed' });
          sendJSON(res, 200, { ok: true });
        });
      }
      delete store[k3];
      persist();
      return sendJSON(res, 200, { ok: true });
    }

    return sendJSON(res, 404, { error: 'not found' });
  }

  if (method !== 'GET') { return sendText(res, 405, 'Method Not Allowed'); }
  serveStatic(req, res, pathname);
});

server.listen(PORT, function () {
  console.log('StockPilot server running at http://0.0.0.0:' + PORT);
  console.log('Storage: ' + (USE_FIREBASE ? 'Firebase Realtime Database' : 'local file'));
});