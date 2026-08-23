var ImportStockPage = {
  render: function (container) {
    container.innerHTML =
      '<div class="page-head"><div><h1>' + UI.esc(PAGE_TITLES.import_stock) + '</h1><p>อัปโหลด stock snapshot รายวันจาก POS แยกตามสาขา เพื่อใช้คำนวณรายการแนะนำสั่งซื้อ</p></div></div>' +
      '<div class="grid-2">' +
      '<div class="card">' +
      '<div class="card-head"><h2>' + UI.icon('import', 'ic-inline') + ' อัปโหลดไฟล์ CSV</h2>' +
      '<button type="button" class="btn btn-ghost" id="btnStockTemplate">' + UI.icon('download', 'ic-inline') + ' ดาวน์โหลด Template</button></div>' +
      '<div class="card-body">' +
      '<div class="drop-zone" id="stockDrop"><div class="drop-ic">' + UI.icon('import') + '</div>' +
      '<div class="drop-text">ลากไฟล์ CSV / Excel มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</div>' +
      '<div class="drop-hint">รองรับไฟล์ .csv, .xls, .xlsx ขนาดไม่เกิน 5 MB</div>' +
      '<input type="file" id="stockFile" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></div>' +
      '<div class="form-row" style="margin-top:14px"><label class="field-label">สาขา (ใช้เมื่อไฟล์ไม่มีคอลัมน์ "สาขา")</label>' +
      '<select id="stockBranchSel" class="input"></select></div>' +
      '<div class="form-row" style="margin-top:10px"><label class="field-label">วันที่ snapshot</label>' +
      '<input type="date" class="input" id="stockSnapshotDate"></div>' +
      '<div class="note-box"><div class="note-title">' + UI.icon('info', 'ic-inline') + ' คอลัมน์ที่รองรับ</div><div class="note-text">' + UI.esc(STOCK_HEADERS.join(' · ')) + '</div></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-head"><h2>' + UI.icon('file', 'ic-inline') + ' ประวัติการนำเข้า</h2></div><div class="card-body" id="stockHistory"></div></div>' +
      '</div>' +
      '<div class="card" id="stockPreviewCard" hidden><div class="card-head"><h2>' + UI.icon('eye', 'ic-inline') + ' ตรวจสอบข้อมูลก่อนนำเข้า</h2></div><div class="card-body" id="stockPreview"></div></div>';

    fillBranchSelect(UI.qs('#stockBranchSel'));
    renderStockHistory();
    var sdInput = UI.qs('#stockSnapshotDate');
    if (sdInput) sdInput.value = DB.today();

    var fileInput = UI.qs('#stockFile');
    var drop = UI.qs('#stockDrop');

    UI.on('#btnStockTemplate', 'click', function () {
      downloadStockTemplate();
    });

    drop.addEventListener('click', function () { fileInput.click(); });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('dragging'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('dragging'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      drop.classList.remove('dragging');
      if (e.dataTransfer.files && e.dataTransfer.files.length) handleStockFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length) handleStockFile(fileInput.files[0]);
      fileInput.value = '';
    });
  }
};

var ImportPricePage = {
  render: function (container) {
    container.innerHTML =
      '<div class="page-head"><div><h1>' + UI.esc(PAGE_TITLES.import_price) + '</h1><p>อัปโหลดราคาซื้อจากผู้แทนขาย (ผ่าน mapping template ต่อ supplier) เพื่อใช้คำนวณราคาขายจาก GP</p></div></div>' +
      '<div class="grid-2">' +
      '<div class="card">' +
      '<div class="card-head"><h2>' + UI.icon('import', 'ic-inline') + ' อัปโหลดไฟล์ CSV</h2>' +
      '<button type="button" class="btn btn-ghost" id="btnPriceTemplate">' + UI.icon('download', 'ic-inline') + ' ดาวน์โหลด Template</button></div>' +
      '<div class="card-body">' +
      '<div class="form-row"><label class="field-label">ซัพพลายเออร์ <span class="req">*</span></label>' +
      '<select id="priceSupplierSel" class="input"></select></div>' +
      '<div class="drop-zone" id="priceDrop" style="margin-top:12px"><div class="drop-ic">' + UI.icon('import') + '</div>' +
      '<div class="drop-text">ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</div>' +
      '<div class="drop-hint">รองรับไฟล์ .csv ขนาดไม่เกิน 5 MB</div>' +
      '<input type="file" id="priceFile" accept=".csv,text/csv" hidden></div>' +
      '<div class="note-box"><div class="note-title">' + UI.icon('info', 'ic-inline') + ' คอลัมน์ที่รองรับ</div><div class="note-text">' + UI.esc(PRICE_HEADERS.join(' · ')) + '</div></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-head"><h2>' + UI.icon('file', 'ic-inline') + ' ประวัติการนำเข้า</h2></div><div class="card-body" id="priceHistory"></div></div>' +
      '</div>' +
      '<div class="card" id="pricePreviewCard" hidden><div class="card-head"><h2>' + UI.icon('eye', 'ic-inline') + ' ตรวจสอบข้อมูลก่อนนำเข้า</h2></div><div class="card-body" id="pricePreview"></div></div>';

    fillSupplierSelect(UI.qs('#priceSupplierSel'));
    renderPriceHistory();

    var fileInput = UI.qs('#priceFile');
    var drop = UI.qs('#priceDrop');

    UI.on('#btnPriceTemplate', 'click', function () {
      downloadPriceTemplate();
    });

    drop.addEventListener('click', function () { fileInput.click(); });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('dragging'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('dragging'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      drop.classList.remove('dragging');
      if (e.dataTransfer.files && e.dataTransfer.files.length) handlePriceFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length) handlePriceFile(fileInput.files[0]);
      fileInput.value = '';
    });
  }
};

function fillBranchSelect(sel) {
  var branches = DB.all('branches');
  var html = branches.map(function (b) { return '<option value="' + UI.esc(b.name) + '">' + UI.esc(b.name) + '</option>'; }).join('');
  sel.innerHTML = html || '<option value="">- เลือกสาขา -</option>';
}

function fillSupplierSelect(sel) {
  var suppliers = DB.all('suppliers');
  var html = suppliers.map(function (s) { return '<option value="' + UI.esc(s.id) + '">' + UI.esc(s.name) + '</option>'; }).join('');
  sel.innerHTML = html || '<option value="">- ไม่มีซัพพลายเออร์ -</option>';
}

function downloadStockTemplate() {
  var rows = [STOCK_HEADERS];
  rows.push(['P-001', 'ข้าวหอมมะลิ 100% 5 กก.', 'อาหาร', 'กระสอบ', 'สุราษฎร์ธานีดีเวลลอปเม้นท์', '12', '0', '3', '21', '90', '135.00']);
  rows.push(['P-010', 'น้ำอัดลม 325 มล.', 'เครื่องดื่ม', 'ขวด', 'สหไทย ซูเปอร์ สำนักงานใหญ่', '520', '0', '40', '280', '1200', '10.50']);
  UI.downloadCSV('template_stock_snapshot.csv', rows, ',');
  UI.toast('ดาวน์โหลด Template สต๊อกแล้ว');
}

function downloadPriceTemplate() {
  var rows = [PRICE_HEADERS];
  rows.push(['P-001', 'ข้าวหอมมะลิ 100% 5 กก.', '135.00', '136.00', 'กระสอบ']);
  rows.push(['P-010', 'น้ำอัดลม 325 มล.', '10.50', '10.80', 'ขวด']);
  UI.downloadCSV('template_supplier_price.csv', rows, ',');
  UI.toast('ดาวน์โหลด Template ราคาซื้อแล้ว');
}

function renderStockHistory() {
  var box = UI.qs('#stockHistory');
  if (!box) return;
  var list = DB.all('stock_imports');
  if (!list.length) {
    UI.emptyState(box, 'ยังไม่มีการนำเข้า', 'อัปโหลด stock snapshot รายวันจาก POS');
    return;
  }
  var rows = list.slice(0, 20).map(function (it) {
    return '<tr><td>' + UI.esc(it.date) + '</td><td>' + UI.esc(it.filename) + '</td><td>' + UI.esc(it.branch || '-') + '</td><td>' + UI.fmtNum(it.rows) + '</td><td>' + UI.fmtNum(it.skips) + '</td></tr>';
  }).join('');
  box.innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th>วันที่นำเข้า</th><th>ไฟล์</th><th>สาขา</th><th>รายการ</th><th>ข้าม</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function renderPriceHistory() {
  var box = UI.qs('#priceHistory');
  if (!box) return;
  var list = DB.all('price_imports');
  if (!list.length) {
    UI.emptyState(box, 'ยังไม่มีการนำเข้า', 'อัปโหลดราคาซื้อจากผู้แทนขาย');
    return;
  }
  var rows = list.slice(0, 20).map(function (it) {
    return '<tr><td>' + UI.esc(it.date) + '</td><td>' + UI.esc(it.filename) + '</td><td>' + UI.esc(it.supplier) + '</td><td>' + UI.fmtNum(it.rows) + '</td></tr>';
  }).join('');
  box.innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th>วันที่นำเข้า</th><th>ไฟล์</th><th>ซัพพลายเออร์</th><th>รายการ</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function handleStockFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { UI.toast('ไฟล์มีขนาดเกิน 5 MB', 'error'); return; }
  var snapshotDate = (UI.qs('#stockSnapshotDate') && UI.qs('#stockSnapshotDate').value) || DB.today();
  UI.loading(true);
  if (isExcelFile(file.name)) {
    ensureXLSX().then(function (XLSXlib) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = XLSXlib.read(new Uint8Array(e.target.result), { type: 'array' });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var parsed = XLSXlib.utils.sheet_to_json(ws, { header: 1, defval: '' });
          processStockParsed(parsed, file.name, snapshotDate);
        } catch (err) {
          UI.loading(false);
          UI.toast('อ่านไฟล์ Excel ไม่สำเร็จ: ' + err.message, 'error');
        }
      };
      reader.onerror = function () { UI.loading(false); UI.toast('ไม่สามารถอ่านไฟล์ได้', 'error'); };
      reader.readAsArrayBuffer(file);
    }).catch(function (err) {
      UI.loading(false);
      UI.toast(err.message || 'ไม่สามารถโหลดไลบรารีอ่าน Excel ได้', 'error');
    });
  } else {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var parsed = UI.parseCSV(String(e.target.result));
        processStockParsed(parsed, file.name, snapshotDate);
      } catch (err) {
        UI.loading(false);
        UI.toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
      }
    };
    reader.onerror = function () { UI.loading(false); UI.toast('ไม่สามารถอ่านไฟล์ได้', 'error'); };
    reader.readAsText(file, 'UTF-8');
  }
}

function isExcelFile(name) {
  var n = String(name || '').toLowerCase();
  return n.indexOf('.xlsx') >= 0 || n.indexOf('.xls') >= 0;
}

function ensureXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (ensureXLSX._p) return ensureXLSX._p;
  ensureXLSX._p = new Promise(function (resolve, reject) {
    var tried = 0;
    var srcs = [
      'js/vendor/xlsx.full.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    ];
    function load() {
      if (tried >= srcs.length) {
        ensureXLSX._p = null;
        reject(new Error('ดาวน์โหลดไลบรารีอ่าน Excel ไม่สำเร็จ (ต้องเชื่อมต่ออินเทอร์เน็ต)'));
        return;
      }
      var s = document.createElement('script');
      s.src = srcs[tried++];
      s.onload = function () {
        if (window.XLSX) resolve(window.XLSX);
        else { s.parentNode.removeChild(s); load(); }
      };
      s.onerror = function () { s.parentNode.removeChild(s); load(); };
      document.head.appendChild(s);
    }
    load();
  });
  return ensureXLSX._p;
}

function processStockParsed(parsed, filename, snapshotDate) {
  try {
    if (parsed.length < 2) { UI.toast('ไฟล์ไม่มีข้อมูล', 'error'); UI.loading(false); return; }
    var headers = parsed[0].map(function (h) { return String(h).trim(); });
    var map = UI.mapHeaders(headers, STOCK_ALIASES);
    var missing = [];
    if (map['รหัสสินค้า'] === undefined) missing.push('รหัสสินค้า');
    if (map['คงเหลือ'] === undefined) missing.push('คงเหลือ');
    if (missing.length) {
      showStockPreview({ error: 'ไฟล์ไม่ถูกต้อง ขาดคอลัมน์ที่จำเป็น: ' + missing.join(', ') });
      UI.toast('ขาดคอลัมน์ที่จำเป็น: ' + missing.join(', '), 'error');
      UI.loading(false);
      return;
    }
    var sel = UI.qs('#stockBranchSel');
    var defaultBranch = sel ? sel.value : '';
    var rows = [];
    var skips = 0;
    var dupCheck = {};
    for (var i = 1; i < parsed.length; i++) {
      var r = parsed[i];
      var get = function (f) { return map[f] !== undefined ? String(r[map[f]] == null ? '' : r[map[f]]).trim() : ''; };
      var code = get('รหัสสินค้า');
      var stock = UI.numOrNull(get('คงเหลือ'));
      if (!code || stock === null) { skips++; continue; }
      var branch = map['สาขา'] !== undefined ? get('สาขา') : defaultBranch;
      if (!branch) { skips++; continue; }
      var key = code + '|' + branch;
      if (dupCheck[key]) { skips++; continue; }
      dupCheck[key] = true;
      rows.push({
        code: code,
        name: get('ชื่อสินค้า') || DB.getProduct(code)?.name || code,
        category: get('หมวดหมู่') || (DB.getProduct(code)?.category || 'อื่นๆ'),
        unit: get('หน่วย') || (DB.getProduct(code)?.unit || ''),
        branch: branch,
        stock: stock,
        incoming: UI.numOrNull(get('กำลังเข้า')) || 0,
        y: UI.numOrNull(get('ขายเมื่อวาน')) || 0,
        w7: UI.numOrNull(get('ขาย7วัน')) || 0,
        w30: UI.numOrNull(get('ขาย30วัน')) || 0,
        cost: UI.numOrNull(get('ต้นทุนล่าสุด')) || 0,
        date: snapshotDate || DB.today()
      });
    }
    showStockPreview({ rows: rows, skips: skips, headers: headers, filename: filename });
  } catch (err) {
    UI.toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    UI.loading(false);
  }
}

function showStockPreview(data) {
  var card = UI.qs('#stockPreviewCard');
  var box = UI.qs('#stockPreview');
  if (!card || !box) return;
  card.hidden = false;
  if (data.error) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ' + UI.esc(data.error) + '</div>';
    return;
  }
  var rows = data.rows;
  if (!rows.length) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ไม่พบรายการที่นำเข้าได้ (กรุณาตรวจสอบรหัสสินค้า / คงเหลือ / สาขา)' + '</div>';
    return;
  }
  var preview = rows.slice(0, 20).map(function (r) {
    return '<tr><td>' + UI.esc(r.code) + '</td><td>' + UI.esc(r.name) + '</td><td>' + UI.esc(r.branch) + '</td><td class="num">' + UI.fmtNum(r.stock) + '</td><td class="num">' + UI.fmtNum(r.incoming) + '</td><td class="num">' + UI.fmtNum(r.w30) + '</td><td class="num">' + UI.fmtNum(r.cost) + '</td></tr>';
  }).join('');
  var more = rows.length > 20 ? '<tr><td colspan="7" class="muted">... แสดง 20 จาก ' + rows.length + ' รายการ</td></tr>' : '';
  box.innerHTML =
    '<div class="import-summary"><div><strong>' + UI.fmtNum(rows.length) + '</strong> รายการพร้อมนำเข้า</div><div><strong>' + UI.fmtNum(data.skips) + '</strong> รายการข้าม</div></div>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>สาขา</th><th>คงเหลือ</th><th>กำลังเข้า</th><th>ขาย30วัน</th><th>ต้นทุน</th></tr></thead><tbody>' + preview + more + '</tbody></table></div>' +
    '<div class="action-row"><button type="button" class="btn btn-primary" id="btnCommitStock">' + UI.icon('check', 'ic-inline') + ' ยืนยันนำเข้าสต๊อก</button></div>';
  UI.qs('#btnCommitStock').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    commitStock(btn, rows, data.filename);
  });
}

function commitStock(btn, rows, filename) {
  UI.confirmDialog({
    title: 'ยืนยันการนำเข้าสต๊อก',
    message: 'จะนำข้อมูล ' + UI.fmtNum(rows.length) + ' รายการเข้าสู่ระบบ โดยแทนที่ข้อมูลสต๊อกเดิมของสาขาที่เกี่ยวข้อง ต้องการดำเนินการต่อหรือไม่?'
  }).then(function (ok) {
    if (!ok) return;
    UI.disableBtn(btn);
    UI.loading(true);
    setTimeout(function () {
      var byBranch = {};
      rows.forEach(function (r) {
        if (!byBranch[r.branch]) byBranch[r.branch] = [];
        byBranch[r.branch].push(r);
      });
      for (var b in byBranch) {
        DB.replaceStockRows(b, byBranch[b]);
      }
      var imports = DB.all('stock_imports');
      imports.unshift({ id: DB.uuid(), date: DB.now(), filename: filename, branch: Object.keys(byBranch).join(', '), rows: rows.length, skips: 0 });
      if (imports.length > 100) imports.length = 100;
      DB.save('stock_imports', imports);
      DB.log('นำเข้าสต๊อก', filename + ' จำนวน ' + rows.length + ' รายการ');
      UI.loading(false);
      UI.toast('นำเข้าสต๊อกสำเร็จ ' + UI.fmtNum(rows.length) + ' รายการ');
      renderStockHistory();
      var card = UI.qs('#stockPreviewCard');
      if (card) card.hidden = true;
    }, 50);
  });
}

function handlePriceFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { UI.toast('ไฟล์มีขนาดเกิน 5 MB', 'error'); return; }
  UI.loading(true);
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var parsed = UI.parseCSV(String(e.target.result));
      if (parsed.length < 2) { UI.toast('ไฟล์ CSV ไม่มีข้อมูล', 'error'); UI.loading(false); return; }
      var headers = parsed[0].map(function (h) { return String(h).trim(); });
      var map = UI.mapHeaders(headers, PRICE_ALIASES);
      var missing = [];
      if (map['รหัสสินค้า'] === undefined) missing.push('รหัสสินค้า');
      if (map['ราคาซื้อ'] === undefined) missing.push('ราคาซื้อ');
      if (missing.length) {
        showPricePreview({ error: 'ไฟล์ไม่ถูกต้อง ขาดคอลัมน์ที่จำเป็น: ' + missing.join(', ') });
        UI.toast('ขาดคอลัมน์ที่จำเป็น: ' + missing.join(', '), 'error');
        UI.loading(false);
        return;
      }
      var rows = [];
      var skips = 0;
      var dupCheck = {};
      for (var i = 1; i < parsed.length; i++) {
        var r = parsed[i];
        var get = function (f) { return map[f] !== undefined ? String(r[map[f]] == null ? '' : r[map[f]]).trim() : ''; };
        var code = get('รหัสสินค้า');
        var price = UI.numOrNull(get('ราคาซื้อ'));
        if (!code || price === null) { skips++; continue; }
        if (dupCheck[code]) { skips++; continue; }
        dupCheck[code] = true;
        rows.push({
          code: code,
          name: get('ชื่อสินค้า') || DB.getProduct(code)?.name || code,
          price: price,
          compare: UI.numOrNull(get('ราคาเปรียบเทียบ')),
          unit: get('หน่วย') || (DB.getProduct(code)?.unit || '')
        });
      }
      showPricePreview({ rows: rows, skips: skips, filename: file.name });
    } catch (err) {
      UI.toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      UI.loading(false);
    }
  };
  reader.onerror = function () { UI.loading(false); UI.toast('ไม่สามารถอ่านไฟล์ได้', 'error'); };
  reader.readAsText(file, 'UTF-8');
}

function showPricePreview(data) {
  var card = UI.qs('#pricePreviewCard');
  var box = UI.qs('#pricePreview');
  if (!card || !box) return;
  card.hidden = false;
  if (data.error) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ' + UI.esc(data.error) + '</div>';
    return;
  }
  var rows = data.rows;
  if (!rows.length) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ไม่พบรายการที่นำเข้าได้ (กรุณาตรวจสอบรหัสสินค้า / ราคาซื้อ)' + '</div>';
    return;
  }
  var preview = rows.slice(0, 20).map(function (r) {
    var diff = '';
    if (r.compare !== null && r.compare !== undefined && r.compare > 0 && r.price !== r.compare) {
      diff = ' <span class="diff ' + (r.price > r.compare ? 'up' : 'down') + '">(' + (r.price > r.compare ? '+' : '') + UI.fmtNum(r.price - r.compare) + ')</span>';
    }
    return '<tr><td>' + UI.esc(r.code) + '</td><td>' + UI.esc(r.name) + '</td><td class="num">' + UI.fmtNum(r.price) + diff + '</td><td>' + UI.esc(r.unit || '-') + '</td></tr>';
  }).join('');
  var more = rows.length > 20 ? '<tr><td colspan="4" class="muted">... แสดง 20 จาก ' + rows.length + ' รายการ</td></tr>' : '';
  box.innerHTML =
    '<div class="import-summary"><div><strong>' + UI.fmtNum(rows.length) + '</strong> รายการพร้อมนำเข้า</div><div><strong>' + UI.fmtNum(data.skips) + '</strong> รายการข้าม</div></div>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>ราคาซื้อ</th><th>หน่วย</th></tr></thead><tbody>' + preview + more + '</tbody></table></div>' +
    '<div class="action-row"><button type="button" class="btn btn-primary" id="btnCommitPrice">' + UI.icon('check', 'ic-inline') + ' ยืนยันนำเข้าราคาซื้อ</button></div>';
  UI.qs('#btnCommitPrice').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    commitPrice(btn, rows, data.filename);
  });
}

function commitPrice(btn, rows, filename) {
  var sel = UI.qs('#priceSupplierSel');
  var supplierId = sel ? sel.value : '';
  var suppliers = DB.all('suppliers');
  var supplier = suppliers.find(function (s) { return s.id === supplierId; });
  if (!supplier) { UI.toast('กรุณาเลือกซัพพลายเออร์', 'error'); return; }
  UI.confirmDialog({
    title: 'ยืนยันการนำเข้าราคาซื้อ',
    message: 'จะนำราคาซื้อ ' + UI.fmtNum(rows.length) + ' รายการของ ' + supplier.name + ' เข้าสู่ระบบ ต้องการดำเนินการต่อหรือไม่?'
  }).then(function (ok) {
    if (!ok) return;
    UI.disableBtn(btn);
    UI.loading(true);
    setTimeout(function () {
      rows.forEach(function (r) {
        DB.upsertCost(r.code, r.name, r.price, r.compare, r.unit, supplier.id, supplier.name);
      });
      var imports = DB.all('price_imports');
      imports.unshift({ id: DB.uuid(), date: DB.now(), filename: filename, supplier: supplier.name, rows: rows.length });
      if (imports.length > 100) imports.length = 100;
      DB.save('price_imports', imports);
      DB.log('นำเข้าราคาซื้อ', filename + ' ซัพพลายเออร์ ' + supplier.name + ' จำนวน ' + rows.length + ' รายการ');
      UI.loading(false);
      UI.toast('นำเข้าราคาซื้อสำเร็จ ' + UI.fmtNum(rows.length) + ' รายการ');
      renderPriceHistory();
      var card = UI.qs('#pricePreviewCard');
      if (card) card.hidden = true;
    }, 50);
  });
}
