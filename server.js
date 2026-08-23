'use strict';
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_BODY = 20 * 1024 * 1024;

let SA_EMAIL = '';
let SA_KEY = '';
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || '';
try {
  const saJson = JSON.parse(process.env.GOOGLE_SA_JSON || '{}');
  SA_EMAIL = saJson.client_email || '';
  SA_KEY = saJson.private_key || '';
} catch (e) { /* ignore */ }
const USE_SHEETS = !!(SHEETS_ID && SA_EMAIL && SA_KEY);

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

let store = {};
if (!USE_SHEETS) {
  try {
    var df = path.join(ROOT, 'data', 'db.json');
    if (fs.existsSync(df)) store = JSON.parse(fs.readFileSync(df, 'utf8'));
  } catch (e) { store = {}; }
}

let writeQueue = Promise.resolve();
function persist() {
  if (USE_SHEETS) return;
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

function b64url(data) { return Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)).toString('base64url'); }

let cachedToken = null;
let tokenExpiry = 0;

function getAccessToken(cb) {
  var now = Date.now();
  if (cachedToken && now < tokenExpiry - 60000) return cb(null, cachedToken);

  var header = b64url({ alg: 'RS256', typ: 'JWT' });
  var payload = b64url({
    iss: SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: Math.floor(now / 1000) + 3600,
    iat: Math.floor(now / 1000)
  });
  var unsigned = header + '.' + payload;
  var sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  var sig = sign.sign(SA_KEY, 'base64url');
  var jwt = unsigned + '.' + sig;

  var body = 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt);
  var opts = {
    hostname: 'oauth2.googleapis.com', port: 443, path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
  };
  var req = https.request(opts, function (res) {
    var chunks = [];
    res.on('data', function (c) { chunks.push(c); });
    res.on('end', function () {
      try {
        var data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (data.access_token) {
          cachedToken = data.access_token;
          tokenExpiry = now + (data.expires_in || 3600) * 1000;
          cb(null, cachedToken);
        } else {
          cb(new Error('Token error: ' + JSON.stringify(data)));
        }
      } catch (e) { cb(e); }
    });
  });
  req.on('error', cb);
  req.write(body);
  req.end();
}

function sheetsRequest(method, apiPath, body, cb) {
  getAccessToken(function (err, token) {
    if (err) return cb(err);
    var opts = {
      hostname: 'sheets.googleapis.com', port: 443,
      path: '/v4/spreadsheets/' + SHEETS_ID + apiPath, method: method,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    };
    var req = https.request(opts, function (res) {
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        var text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return cb(new Error('Sheets ' + res.statusCode + ': ' + text));
        }
        try { cb(null, JSON.parse(text)); } catch (e) { cb(null, text); }
      });
    });
    req.on('error', cb);
    if (body != null) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function sheetsGetAll(cb) {
  sheetsRequest('GET', '/values/store!A:B?majorDimension=ROWS', null, function (err, data) {
    if (err) return cb(err);
    var obj = {};
    var rows = (data && data.values) ? data.values : [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].length >= 2 && rows[i][0]) {
        obj[rows[i][0]] = rows[i][1] || '';
      }
    }
    cb(null, obj);
  });
}

function sheetsGet(key, cb) {
  sheetsGetAll(function (err, obj) {
    if (err) return cb(err);
    cb(null, Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null);
  });
}

function sheetsSet(key, value, cb) {
  sheetsGetAll(function (err, obj) {
    if (err) return cb(err);
    obj[key] = String(value);
    sheetsWriteAll(obj, cb);
  });
}

function sheetsDelete(key, cb) {
  sheetsGetAll(function (err, obj) {
    if (err) return cb(err);
    delete obj[key];
    sheetsWriteAll(obj, cb);
  });
}

function sheetsWriteAll(obj, cb) {
  var rows = [];
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    rows.push([keys[i], String(obj[keys[i]])]);
  }
  sheetsRequest('PUT', '/values/store!A:B?valueInputOption=USER_ENTERED', { values: rows }, function (err) {
    if (cb) cb(err);
  });
}

function sheetsDeleteAll(cb) {
  sheetsRequest('PUT', '/values/store!A:B?valueInputOption=USER_ENTERED', { values: [] }, function (err) {
    if (cb) cb(err);
  });
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

  if (pathname === '/api/ping') { return sendJSON(res, 200, { ok: true, storage: USE_SHEETS ? 'google-sheets' : 'file' }); }

  if (pathname.indexOf('/api/') === 0) {
    var mKey = pathname.match(/^\/api\/db\/([^/]+)$/);

    if (method === 'GET' && pathname === '/api/db') {
      if (USE_SHEETS) {
        return sheetsGetAll(function (err, obj) {
          if (err) return sendJSON(res, 500, { error: 'sheets read failed' });
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
          if (USE_SHEETS) {
            return sheetsWriteAll(next, function (err) {
              if (err) return sendJSON(res, 500, { error: 'sheets write failed' });
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
      if (USE_SHEETS) {
        return sheetsDeleteAll(function (err) {
          if (err) return sendJSON(res, 500, { error: 'sheets delete failed' });
          sendJSON(res, 200, { ok: true });
        });
      }
      store = {};
      persist();
      return sendJSON(res, 200, { ok: true });
    }

    if (method === 'GET' && mKey) {
      var k1 = mKey[1];
      if (USE_SHEETS) {
        return sheetsGet(k1, function (err, val) {
          if (err) return sendJSON(res, 500, { error: 'sheets read failed' });
          sendJSON(res, 200, { value: val });
        });
      }
      return sendJSON(res, 200, { value: Object.prototype.hasOwnProperty.call(store, k1) ? store[k1] : null });
    }

    if (method === 'PUT' && mKey) {
      var k2 = mKey[1];
      return readBody(req, function (body) {
        if (USE_SHEETS) {
          return sheetsSet(k2, body, function (err) {
            if (err) return sendJSON(res, 500, { error: 'sheets write failed' });
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
      if (USE_SHEETS) {
        return sheetsDelete(k3, function (err) {
          if (err) return sendJSON(res, 500, { error: 'sheets delete failed' });
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
  console.log('Storage: ' + (USE_SHEETS ? 'Google Sheets (' + SHEETS_ID + ')' : 'local file'));
});
