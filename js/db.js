var DB = (function () {

  var P = APP.storagePrefix;
  var REMOTE = !!window.APP_REMOTE;
  var API = (window.APP_API_BASE || '') + '/';
  var TTL = 800;
  var cache = {};

  function isLocalKey(key) {
    return key === 'session';
  }

  function remoteURL(key) {
    return API + 'api/db' + (key ? '/' + encodeURIComponent(P + key) : '');
  }

  function httpSync(method, url, body) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, false);
      if (body !== undefined && body !== null) xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body === undefined || body === null ? null : body);
      if (xhr.status >= 200 && xhr.status < 300) return xhr.responseText;
    } catch (e) { /* ignore */ }
    return null;
  }

  function httpJSON(method, url, body) {
    var text = httpSync(method, url, body);
    if (text === null) return null;
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  function get(key, fallback) {
    var raw = null;
    if (REMOTE && !isLocalKey(key)) {
      var c = cache[key];
      if (c && (Date.now() - c.t) < TTL) {
        raw = c.v;
      } else {
        var res = httpJSON('GET', remoteURL(key), null);
        raw = (res && typeof res.value === 'string') ? res.value : null;
        cache[key] = { t: Date.now(), v: raw };
      }
    } else {
      try { raw = localStorage.getItem(P + key); } catch (e) { raw = null; }
    }
    if (raw === null) return fallback === undefined ? null : fallback;
    try { return JSON.parse(raw); } catch (e) {
      return fallback === undefined ? null : fallback;
    }
  }

  function set(key, value) {
    var raw = JSON.stringify(value);
    if (REMOTE && !isLocalKey(key)) {
      httpSync('PUT', remoteURL(key), raw);
      cache[key] = { t: Date.now(), v: raw };
    } else {
      try { localStorage.setItem(P + key, raw); } catch (e) { /* ignore */ }
    }
  }

  function remove(key) {
    if (REMOTE && !isLocalKey(key)) {
      httpJSON('DELETE', remoteURL(key), null);
      delete cache[key];
    } else {
      try { localStorage.removeItem(P + key); } catch (e) { /* ignore */ }
    }
  }

  function uuid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function now() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function today() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function currentUser() {
    return get('session', null);
  }

  function getSettings() {
    var s = get('settings', null);
    if (!s) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    var base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    for (var k in s) { if (Object.prototype.hasOwnProperty.call(s, k)) base[k] = s[k]; }
    return base;
  }

  function log(action, detail) {
    var logs = get('logs', []);
    var user = currentUser();
    logs.unshift({ id: uuid(), time: now(), user: user ? user.username : '-', role: user ? user.role : '-', action: action, detail: detail || '' });
    if (logs.length > 500) logs.length = 500;
    set('logs', logs);
  }

  function all(key, fallback) {
    return get(key, fallback === undefined ? [] : fallback);
  }

  function save(key, value) {
    set(key, value);
  }

  function getProduct(code) {
    if (!code) return null;
    var c = String(code).trim().toUpperCase();
    var list = all('products');
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].code).trim().toUpperCase() === c) return list[i];
    }
    return null;
  }

  function getCategory(name) {
    var list = all('categories');
    var n = String(name || '').trim();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].name).trim() === n) return list[i];
    }
    return null;
  }

  function categoryGP(name) {
    var c = getCategory(name);
    if (c && typeof c.gp === 'number') return c.gp;
    var other = getCategory('อื่นๆ');
    return other && typeof other.gp === 'number' ? other.gp : 20;
  }

  function getCost(code) {
    var costs = get('costs', {});
    var c = String(code || '').trim().toUpperCase();
    if (costs[c] && typeof costs[c].cost === 'number') return costs[c].cost;
    return null;
  }

  function getCostSource(code) {
    var costs = get('costs', {});
    var c = String(code || '').trim().toUpperCase();
    if (costs[c]) return { supplier: costs[c].supplier, date: costs[c].date };
    return null;
  }

  function upsertCost(code, name, cost, compare, unit, supplierId, supplierName) {
    var costs = get('costs', {});
    var c = String(code).trim().toUpperCase();
    if (!costs[c]) costs[c] = {};
    costs[c].code = c;
    costs[c].name = name;
    costs[c].cost = cost;
    if (typeof compare === 'number') costs[c].compare = compare;
    if (unit) costs[c].unit = unit;
    costs[c].supplier = supplierName || null;
    costs[c].supplierId = supplierId || null;
    costs[c].date = now();
    set('costs', costs);
  }

  function getStockRows(branch) {
    var rows = all('stock');
    if (branch) return rows.filter(function (r) { return String(r.branch) === String(branch); });
    return rows;
  }

  function stockBranches() {
    var rows = all('stock');
    var seen = {};
    var out = [];
    rows.forEach(function (r) {
      if (!seen[r.branch]) { seen[r.branch] = true; out.push(r.branch); }
    });
    return out;
  }

  function replaceStockRows(branch, rows) {
    var current = all('stock').filter(function (r) { return String(r.branch) !== String(branch); });
    var merged = current.concat(rows);
    set('stock', merged);
  }

  function getActivePrice(code) {
    var prices = get('active_prices', {});
    var c = String(code || '').trim().toUpperCase();
    return prices[c] || null;
  }

  function publishPrices(list, batchId) {
    var prices = get('active_prices', {});
    list.forEach(function (it) {
      var c = String(it.code).trim().toUpperCase();
      prices[c] = {
        code: c,
        name: it.name,
        cost: it.cost,
        price: it.price,
        gp: it.gp,
        category: it.category,
        batchId: batchId,
        date: now()
      };
    });
    set('active_prices', prices);
  }

  function seedUsers() {
    var users = [
      { username: 'admin', password: 'admin123', name: 'ผู้ดูแลระบบ', role: 'admin' },
      { username: 'buyer', password: 'buyer123', name: 'ปุณณวิชย์', role: 'buyer' },
      { username: 'pricing', password: 'pricing123', name: 'ภัสสร', role: 'pricing' },
      { username: 'approver', password: 'approver123', name: 'วิภาวดี', role: 'approver' },
      { username: 'uploader', password: 'uploader123', name: 'ธนกฤต', role: 'uploader' },
      { username: 'viewer', password: 'viewer123', name: 'ชยพล', role: 'viewer' }
    ];
    set('users', users);
  }

  function seedDemoData(force) {
    var seeded = get('seeded', '');
    if (!force && seeded === '7') return;
    if (force || (seeded !== '2' && seeded !== '3' && seeded !== '4' && seeded !== '5' && seeded !== '6')) {
      seedUsers();
    } else {
      if (seeded === '2') migrateV2ToV3();
      if (seeded === '2' || seeded === '3') migrateV3ToV4();
      if (seeded === '2' || seeded === '3' || seeded === '4') migrateV4ToV5();
      migrateV5ToV6();
      migrateV6ToV7();
      set('seeded', '7');
      return;
    }

    set('categories', [
      { id: 'c-food', name: 'อาหาร', gp: 18, minDays: null, maxDays: null },
      { id: 'c-drink', name: 'เครื่องดื่ม', gp: 25, minDays: null, maxDays: null },
      { id: 'c-care', name: 'ของใช้ส่วนตัว', gp: 30, minDays: null, maxDays: null },
      { id: 'c-office', name: 'ของใช้สำนักงาน', gp: 35, minDays: null, maxDays: null },
      { id: 'c-elec', name: 'ไฟฟ้า', gp: 28, minDays: null, maxDays: null },
      { id: 'c-other', name: 'อื่นๆ', gp: 20, minDays: null, maxDays: null }
    ]);

    set('suppliers', [
      { id: 's-01', creditorCode: 'S2500269', name: 'บ. สยามพลาซ่าค้าปลีก', paymentMethod: 'เครดิต', creditTerm: 30 },
      { id: 's-02', creditorCode: 'S2500270', name: 'ดริงค์มิกซ์ จำกัด', paymentMethod: 'เครดิต', creditTerm: 45 },
      { id: 's-03', creditorCode: 'S2500271', name: 'ไฮโฮมแคร์', paymentMethod: 'เงินสด', creditTerm: 0 },
      { id: 's-04', creditorCode: 'S2500272', name: 'ออฟฟิศไดเรกต์', paymentMethod: 'เช็ค', creditTerm: 60 },
      { id: 's-05', creditorCode: 'S2500273', name: 'ไลท์ติ้งเทค', paymentMethod: 'เครดิต', creditTerm: 30 },
      { id: 's-06', creditorCode: 'S2500274', name: 'สุราษฎร์ธานีดีเวลลอปเม้นท์', paymentMethod: 'เครดิต', creditTerm: 30 },
      { id: 's-07', creditorCode: 'S2500275', name: 'สหไทย ซูเปอร์', paymentMethod: 'เครดิต', creditTerm: 30 },
      { id: 's-08', creditorCode: 'Dev', name: 'Dev', paymentMethod: 'เงินสด', creditTerm: 0 },
      { id: 's-09', creditorCode: 'Supper', name: 'Supper', paymentMethod: 'เงินสด', creditTerm: 0 }
    ]);

    set('branches', [
      { id: 'b-srt', name: 'สุราษฎร์ธานีดีเวลลอปเม้นท์' },
      { id: 'b-sahathai-hq', name: 'สหไทย ซูเปอร์ สำนักงานใหญ่' },
      { id: 'b-sahathai-th', name: 'สหไทย ซูเปอร์ สาขาท่าทอง' }
    ]);

    var products = [
      { code: 'P-001', name: 'ข้าวหอมมะลิ 100% 5 กก.', category: 'อาหาร', unit: 'กระสอบ', pack: 1, supplier: 's-01' },
      { code: 'P-002', name: 'ข้าวขาว 5 กก.', category: 'อาหาร', unit: 'กระสอบ', pack: 1, supplier: 's-01' },
      { code: 'P-003', name: 'น้ำมันปาล์ม 1 ลิตร', category: 'อาหาร', unit: 'ขวด', pack: 12, supplier: 's-01' },
      { code: 'P-004', name: 'น้ำตาลทรายขาว 1 กก.', category: 'อาหาร', unit: 'กก.', pack: 20, supplier: 's-01' },
      { code: 'P-005', name: 'ปลากระป๋องในซอสมะเขือเทศ 155 ก.', category: 'อาหาร', unit: 'กระป๋อง', pack: 48, supplier: 's-01' },
      { code: 'P-006', name: 'บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง', category: 'อาหาร', unit: 'ซอง', pack: 30, supplier: 's-01' },
      { code: 'P-007', name: 'ซอสปรุงรส 700 มล.', category: 'อาหาร', unit: 'ขวด', pack: 12, supplier: 's-01' },
      { code: 'P-008', name: 'ผงชูรส 1 กก.', category: 'อาหาร', unit: 'กก.', pack: 12, supplier: 's-01' },
      { code: 'P-009', name: 'น้ำดื่ม 600 มล. (แพ็ก 24 ขวด)', category: 'เครื่องดื่ม', unit: 'แพ็ก', pack: 1, supplier: 's-02' },
      { code: 'P-010', name: 'น้ำอัดลม 325 มล.', category: 'เครื่องดื่ม', unit: 'ขวด', pack: 24, supplier: 's-02' },
      { code: 'P-011', name: 'ชาเขียวพร้อมดื่ม 550 มล.', category: 'เครื่องดื่ม', unit: 'ขวด', pack: 24, supplier: 's-02' },
      { code: 'P-012', name: 'กาแฟสำเร็จรูป กระปุก (100 ซอง)', category: 'เครื่องดื่ม', unit: 'กระปุก', pack: 1, supplier: 's-02' },
      { code: 'P-013', name: 'นมยูเอชที 200 มล.', category: 'เครื่องดื่ม', unit: 'กล่อง', pack: 24, supplier: 's-02' },
      { code: 'P-014', name: 'กระดาษชำระ (6 ม้วน)', category: 'ของใช้ส่วนตัว', unit: 'แพ็ก', pack: 12, supplier: 's-03' },
      { code: 'P-015', name: 'ผงซักฟอก 3 กก.', category: 'ของใช้ส่วนตัว', unit: 'ถุง', pack: 6, supplier: 's-03' },
      { code: 'P-016', name: 'แชมพู 400 มล.', category: 'ของใช้ส่วนตัว', unit: 'ขวด', pack: 12, supplier: 's-03' },
      { code: 'P-017', name: 'สบู่เหลว 450 มล.', category: 'ของใช้ส่วนตัว', unit: 'ขวด', pack: 12, supplier: 's-03' },
      { code: 'P-018', name: 'ยาสีฟัน 150 ก.', category: 'ของใช้ส่วนตัว', unit: 'หลอด', pack: 24, supplier: 's-03' },
      { code: 'P-019', name: 'ไม้กวาดทางมะพร้าว', category: 'ของใช้สำนักงาน', unit: 'อัน', pack: 10, supplier: 's-04' },
      { code: 'P-020', name: 'กระดาษ A4 80 แกรม', category: 'ของใช้สำนักงาน', unit: 'รีม', pack: 10, supplier: 's-04' },
      { code: 'P-021', name: 'ปากกาลูกลื่น สีน้ำเงิน', category: 'ของใช้สำนักงาน', unit: 'โหล', pack: 12, supplier: 's-04' },
      { code: 'P-022', name: 'หลอดไฟ LED 12W', category: 'ไฟฟ้า', unit: 'หลอด', pack: 20, supplier: 's-05' },
      { code: 'P-023', name: 'ถ่านอัลคาไลน์ AA (4 ก้อน)', category: 'ไฟฟ้า', unit: 'แพ็ก', pack: 24, supplier: 's-05' },
      { code: 'P-024', name: 'น้ำยาล้างจาน 800 มล.', category: 'ของใช้ส่วนตัว', unit: 'ขวด', pack: 12, supplier: 's-03' },
      { code: 'P-025', name: 'ไม้กวาดพลาสติก', category: 'ของใช้สำนักงาน', unit: 'อัน', pack: 10, supplier: 's-04' },
      { code: 'P-026', name: 'พัดลมไอเย็น 16 นิ้ว', category: 'ไฟฟ้า', unit: 'เครื่อง', pack: 1, supplier: 's-05' }
    ];
    set('products', products);

    var raw = [
      ['P-001', 135, 90, 12, 0], ['P-002', 125, 60, 40, 0], ['P-003', 52, 300, 160, 0],
      ['P-004', 24, 200, 90, 0], ['P-005', 13.5, 500, 720, 240], ['P-006', 6.2, 800, 350, 0],
      ['P-007', 28, 90, 45, 0], ['P-008', 86, 40, 8, 0], ['P-009', 52, 150, 30, 0],
      ['P-010', 10.5, 1200, 520, 0], ['P-011', 16, 900, 80, 0], ['P-012', 98, 30, 5, 0],
      ['P-013', 8.5, 700, 300, 0], ['P-014', 34, 250, 60, 0], ['P-015', 95, 40, 4, 0],
      ['P-016', 62, 80, 35, 0], ['P-017', 24, 120, 90, 0], ['P-018', 32, 45, 15, 0],
      ['P-019', 55, 8, 12, 0], ['P-020', 88, 60, 3, 0], ['P-021', 60, 35, 20, 0],
      ['P-022', 29, 70, 6, 0], ['P-023', 42, 55, 110, 0], ['P-024', 38, 150, 5, 0],
      ['P-025', 48, 5, 25, 0], ['P-026', 3200, 0, 14, 0]
    ];

    var stockRows = [];
    var date = today();
    var branchNames = ['สุราษฎร์ธานีดีเวลลอปเม้นท์', 'สหไทย ซูเปอร์ สำนักงานใหญ่', 'สหไทย ซูเปอร์ สาขาท่าทอง'];
    branchNames.forEach(function (branch, bi) {
      raw.forEach(function (r, idx) {
        var code = r[0], cost = r[1], s30 = r[2], st = r[3], inc = r[4];
        if (bi > 0) {
          st = Math.max(0, st - ((idx + bi) % 3));
          s30 = s30 + ((idx + bi) % 2);
        }
        var daily = s30 / 30;
        var p = products[idx];
        stockRows.push({
          code: code, name: p.name, category: p.category, unit: p.unit,
          branch: branch, stock: st, incoming: inc,
          y: Math.round(daily), w7: Math.round(daily * 7), w30: s30,
          cost: cost, date: date
        });
      });
    });
    set('stock', stockRows);

    var costs = {};
    products.forEach(function (p, idx) {
      costs[p.code] = {
        code: p.code, name: p.name, cost: raw[idx][1],
        supplier: 'บ. สยามพลาซ่าค้าปลีก', supplierId: 's-01', date: now()
      };
    });
    set('costs', costs);

    set('stock_imports', []);
    set('price_imports', []);
    set('price_batches', []);
    set('prs', []);
    set('active_prices', {});
    set('logs', []);
    set('seeded', '7');
  }

  function migrateV2ToV3() {
    var suppliers = all('suppliers');
    var changed = false;
    suppliers.forEach(function (s) {
      if (s.creditorCode === undefined) { s.creditorCode = ''; changed = true; }
    });
    if (!suppliers.some(function (s) { return s.name === 'สุราษฎร์ธานีดีเวลลอปเม้นท์'; })) {
      suppliers.push({ id: 's-06', name: 'สุราษฎร์ธานีดีเวลลอปเม้นท์', category: '', tel: '', contact: '', creditorCode: '' });
      changed = true;
    }
    if (!suppliers.some(function (s) { return s.name === 'สหไทย ซูเปอร์'; })) {
      suppliers.push({ id: 's-07', name: 'สหไทย ซูเปอร์', category: '', tel: '', contact: '', creditorCode: '' });
      changed = true;
    }
    if (changed) set('suppliers', suppliers);
  }

  function migrateV3ToV4() {
    var suppliers = all('suppliers');
    var changed = false;
    if (!suppliers.some(function (s) { return s.name === 'Dev'; })) {
      suppliers.push({ id: 's-08', name: 'Dev', category: '', tel: '', contact: '', creditorCode: '' });
      changed = true;
    }
    if (!suppliers.some(function (s) { return s.name === 'Supper'; })) {
      suppliers.push({ id: 's-09', name: 'Supper', category: '', tel: '', contact: '', creditorCode: '' });
      changed = true;
    }
    if (changed) set('suppliers', suppliers);
  }

  function migrateV4ToV5() {
    var suppliers = all('suppliers');
    var changed = false;
    suppliers.forEach(function (s) {
      if (s.name === 'Dev' && s.creditorCode !== 'Dev') { s.creditorCode = 'Dev'; changed = true; }
      if (s.name === 'Supper' && s.creditorCode !== 'Supper') { s.creditorCode = 'Supper'; changed = true; }
    });
    if (changed) set('suppliers', suppliers);
  }

  function migrateV5ToV6() {
    var suppliers = all('suppliers');
    var changed = false;
    suppliers.forEach(function (s) {
      if (s.creditorCodeDev === undefined || s.creditorCodeSupper === undefined) {
        if (s.name === 'Dev') {
          s.creditorCodeDev = s.creditorCode || 'Dev';
          s.creditorCodeSupper = '';
        } else if (s.name === 'Supper') {
          s.creditorCodeDev = '';
          s.creditorCodeSupper = s.creditorCode || 'Supper';
        } else {
          s.creditorCodeDev = s.creditorCode || '';
          s.creditorCodeSupper = '';
        }
        delete s.creditorCode;
        changed = true;
      }
    });
    if (changed) set('suppliers', suppliers);
  }

  function migrateV6ToV7() {
    var suppliers = all('suppliers');
    var changed = false;
    suppliers.forEach(function (s) {
      var outdated = s.creditorCode === undefined || s.paymentMethod === undefined || s.creditTerm === undefined ||
        s.creditorCodeDev !== undefined || s.creditorCodeSupper !== undefined ||
        s.category !== undefined || s.contact !== undefined || s.tel !== undefined;
      if (!outdated) return;
      var code = s.creditorCodeDev || s.creditorCodeSupper || s.creditorCode || '';
      s.creditorCode = code;
      if (s.paymentMethod === undefined) s.paymentMethod = '';
      if (s.creditTerm === undefined) s.creditTerm = 0;
      delete s.creditorCodeDev;
      delete s.creditorCodeSupper;
      delete s.category;
      delete s.contact;
      delete s.tel;
      changed = true;
    });
    if (changed) set('suppliers', suppliers);
  }

  function resetAll() {
    if (REMOTE) {
      httpJSON('DELETE', remoteURL(), null);
      cache = {};
      try { localStorage.removeItem(P + 'session'); } catch (e) { /* ignore */ }
      return;
    }
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(P) === 0) keys.push(k);
    }
    keys.forEach(function (k) { localStorage.removeItem(k); });
  }

  function backup() {
    var data = {};
    if (REMOTE) {
      var all = httpJSON('GET', remoteURL(), null);
      if (all) data = all;
    } else {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(P) === 0) keys.push(k);
      }
      keys.forEach(function (k) { data[k] = localStorage.getItem(k); });
    }
    return { app: APP.name, version: APP.version, exported: now(), data: data };
  }

  function restore(json) {
    var obj = json;
    if (typeof obj === 'string') obj = JSON.parse(obj);
    if (!obj || !obj.data) throw new Error('ไฟล์ข้อมูลไม่ถูกต้อง');
    var count = 0;
    if (REMOTE) {
      var clean = {};
      for (var k in obj.data) {
        if (Object.prototype.hasOwnProperty.call(obj.data, k)) {
          clean[k] = String(obj.data[k]);
          count++;
        }
      }
      httpJSON('POST', remoteURL(), JSON.stringify(clean));
      cache = {};
      return count;
    }
    for (var kk in obj.data) {
      if (Object.prototype.hasOwnProperty.call(obj.data, kk)) {
        localStorage.setItem(kk, obj.data[kk]);
        count++;
      }
    }
    return count;
  }

  function storageInfo() {
    var count = 0, size = 0;
    if (REMOTE) {
      var all = httpJSON('GET', remoteURL(), null);
      if (all) {
        for (var k in all) {
          if (Object.prototype.hasOwnProperty.call(all, k)) {
            count++;
            size += String(all[k]).length * 2;
          }
        }
      }
    } else {
      for (var i = 0; i < localStorage.length; i++) {
        var kk = localStorage.key(i);
        if (kk && kk.indexOf(P) === 0) {
          count++;
          size += (localStorage.getItem(kk) || '').length * 2;
        }
      }
    }
    return { count: count, size: size };
  }

  return {
    get: get, set: set, remove: remove, uuid: uuid, now: now, today: today,
    currentUser: currentUser, getSettings: getSettings, log: log,
    all: all, save: save,
    getProduct: getProduct, getCategory: getCategory, categoryGP: categoryGP,
    getCost: getCost, getCostSource: getCostSource, upsertCost: upsertCost,
    getStockRows: getStockRows, stockBranches: stockBranches, replaceStockRows: replaceStockRows,
    getActivePrice: getActivePrice, publishPrices: publishPrices,
    seedDemoData: seedDemoData, resetAll: resetAll, backup: backup, restore: restore,
    storageInfo: storageInfo
  };

})();
