var SettingsPage = {
  state: { tab: 'categories' },

  render: function (container) {
    var self = this;
    this.state.container = container;
    container.innerHTML =
      '<div class="page-head"><div><h1>' + UI.esc(PAGE_TITLES.settings) + '</h1><p>ตั้งค่าระบบ, จัดการ master data และสิทธิ์ผู้ใช้</p></div></div>' +
      '<div class="tabs" id="setTabs">' +
      '<button type="button" class="tab" data-tab="categories">หมวดหมู่สินค้า &amp; GP</button>' +
      '<button type="button" class="tab" data-tab="suppliers">ซัพพลายเออร์</button>' +
      '<button type="button" class="tab" data-tab="products">สินค้า</button>' +
      '<button type="button" class="tab" data-tab="branches">สาขา</button>' +
      '<button type="button" class="tab" data-tab="users">ผู้ใช้</button>' +
      '<button type="button" class="tab" data-tab="calc">การคำนวณ</button>' +
      '<button type="button" class="tab" data-tab="bplus">BPlus Export</button>' +
      '<button type="button" class="tab" data-tab="system">ข้อมูล & ระบบ</button>' +
      '</div>' +
      '<div id="setContent"></div>';

    UI.on('#setTabs', 'click', function (e) {
      var b = e.target.closest('.tab');
      if (!b) return;
      self.state.tab = b.dataset.tab;
      UI.qsa('.tab', UI.qs('#setTabs')).forEach(function (t) { t.classList.toggle('active', t === b); });
      self.renderTab();
    });
    this.renderTab();
  },

  renderTab: function () {
    var content = UI.qs('#setContent');
    if (!content) return;
    switch (this.state.tab) {
      case 'categories': renderCategories(content); break;
      case 'suppliers': renderSuppliers(content); break;
      case 'products': renderProducts(content); break;
      case 'branches': renderBranches(content); break;
      case 'users': renderUsers(content); break;
      case 'calc': renderCalc(content); break;
      case 'bplus': renderBPlus(content); break;
      case 'system': renderSystem(content); break;
    }
  }
};

function renderCategories(content) {
  var cats = DB.all('categories');
  content.innerHTML =
    '<div class="card"><div class="card-head"><h2>หมวดหมู่สินค้า และ GP มาตรฐาน</h2>' +
    '<button type="button" class="btn btn-primary btn-sm" id="btnAddCat">' + UI.icon('plus', 'ic-inline') + ' เพิ่มหมวด</button></div>' +
    '<div class="card-body">' +
    '<div class="action-row"><button type="button" class="btn btn-primary" id="btnCatImport">' + UI.icon('import', 'ic-inline') + ' นำเข้าหมวดหมู่สินค้า</button>' +
    '<button type="button" class="btn btn-ghost" id="btnCatTemplate">' + UI.icon('download', 'ic-inline') + ' ดาวน์โหลด Template</button></div>' +
    '<input type="file" id="catFile" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>' +
    '<div class="note-box"><div class="note-title">' + UI.icon('info', 'ic-inline') + ' การนำเข้าจะแทนที่หมวดหมู่ทั้งหมดในระบบ</div>' +
    '<div class="note-text">รองรับไฟล์ .csv, .xls, .xlsx · คอลัมน์: ' + UI.esc(CATEGORY_HEADERS.join(' · ')) + ' · GP ระบุเป็นเปอร์เซ็นต์ เช่น 25 หมายถึง GP 25% · Min/Max (วัน) ปล่อยว่างได้ ระบบจะใช้ค่าเริ่มต้น</div></div>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>ชื่อหมวดหมู่</th><th class="num">GP มาตรฐาน</th><th class="num">Min (วัน)</th><th class="num">Max (วัน)</th><th>จัดการ</th></tr></thead><tbody>' +
    cats.map(function (c) {
      return '<tr><td>' + UI.esc(c.name) + '</td><td class="num">' + UI.fmtPct(c.gp) + '</td><td class="num">' + (c.minDays ? UI.fmtNum(c.minDays) : '<span class="muted">ตามระบบ</span>') + '</td><td class="num">' + (c.maxDays ? UI.fmtNum(c.maxDays) : '<span class="muted">ตามระบบ</span>') + '</td>' +
        '<td><div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-edit-cat="' + UI.esc(c.id) + '">' + UI.icon('edit', 'ic-inline') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" data-del-cat="' + UI.esc(c.id) + '">' + UI.icon('trash', 'ic-inline') + '</button></div></td></tr>';
    }).join('') +
    '</tbody></table></div></div></div>' +
    '<div class="card" id="catPreviewCard" hidden><div class="card-head"><h2>' + UI.icon('eye', 'ic-inline') + ' ตรวจสอบข้อมูลก่อนนำเข้า</h2></div><div class="card-body" id="catPreview"></div></div>';

  var fileInput = UI.qs('#catFile');

  UI.on('#btnCatImport', 'click', function () {
    fileInput.click();
  });
  UI.on('#btnCatTemplate', 'click', function () {
    downloadCategoryTemplate();
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length) handleCatFile(fileInput.files[0]);
    fileInput.value = '';
  });

  UI.on('#btnAddCat', 'click', function () { catForm(null); });
  UI.qsa('[data-edit-cat]', content).forEach(function (b) {
    b.addEventListener('click', function () { catForm(cats.find(function (c) { return c.id === b.dataset.editCat; })); });
  });
  UI.qsa('[data-del-cat]', content).forEach(function (b) {
    b.addEventListener('click', function () {
      var c = cats.find(function (x) { return x.id === b.dataset.delCat; });
      if (!c) return;
      UI.confirmDialog({ title: 'ลบหมวดหมู่', message: 'ต้องการลบหมวด "' + c.name + '" ใช่หรือไม่?', danger: true, confirmText: 'ลบ' }).then(function (ok) {
        if (!ok) return;
        DB.save('categories', DB.all('categories').filter(function (x) { return x.id !== c.id; }));
        DB.log('ลบหมวดหมู่', c.name);
        UI.toast('ลบหมวดหมู่แล้ว');
        renderCategories(UI.qs('#setContent'));
      });
    });
  });
}

function downloadCategoryTemplate() {
  var rows = [CATEGORY_HEADERS];
  rows.push(['อาหาร', '18', '', '']);
  rows.push(['เครื่องดื่ม', '25', '2', '14']);
  rows.push(['ของใช้ส่วนตัว', '30', '', '']);
  UI.downloadCSV('template_categories_gp.csv', rows, ',');
  UI.toast('ดาวน์โหลด Template หมวดหมู่แล้ว');
}

function handleCatFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { UI.toast('ไฟล์มีขนาดเกิน 5 MB', 'error'); return; }
  UI.loading(true);
  if (isExcelFile(file.name)) {
    ensureXLSX().then(function (XLSXlib) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = XLSXlib.read(new Uint8Array(e.target.result), { type: 'array' });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var parsed = XLSXlib.utils.sheet_to_json(ws, { header: 1, defval: '' });
          processCatParsed(parsed, file.name);
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
        processCatParsed(parsed, file.name);
      } catch (err) {
        UI.loading(false);
        UI.toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
      }
    };
    reader.onerror = function () { UI.loading(false); UI.toast('ไม่สามารถอ่านไฟล์ได้', 'error'); };
    reader.readAsText(file, 'UTF-8');
  }
}

function processCatParsed(parsed, filename) {
  try {
    if (!parsed.length) { UI.toast('ไฟล์ไม่มีข้อมูล', 'error'); UI.loading(false); return; }
    var headers = parsed[0].map(function (h) { return String(h).trim(); });
    var map = UI.mapHeaders(headers, CATEGORY_ALIASES);
    var missing = [];
    if (map['หมวดหมู่'] === undefined) missing.push('หมวดหมู่');
    if (map['GP'] === undefined) missing.push('GP');
    if (missing.length) {
      showCatPreview({ error: 'ไฟล์ไม่ถูกต้อง ขาดคอลัมน์ที่จำเป็น: ' + missing.join(', ') });
      UI.toast('ขาดคอลัมน์ที่จำเป็น: ' + missing.join(', '), 'error');
      UI.loading(false);
      return;
    }
    var rows = [];
    var skips = 0;
    var seen = {};
    for (var i = 1; i < parsed.length; i++) {
      var r = parsed[i];
      var get = function (f) { return map[f] !== undefined ? String(r[map[f]] == null ? '' : r[map[f]]).trim() : ''; };
      var name = get('หมวดหมู่');
      var gp = parseFloat(get('GP'));
      if (!name || isNaN(gp)) { skips++; continue; }
      if (seen[name]) { skips++; continue; }
      seen[name] = true;
      rows.push({
        name: name,
        gp: gp,
        minDays: (function () { var n = parseFloat(get('Min (วัน)')); return isNaN(n) ? null : n; })(),
        maxDays: (function () { var n = parseFloat(get('Max (วัน)')); return isNaN(n) ? null : n; })()
      });
    }
    showCatPreview({ rows: rows, skips: skips, filename: filename });
  } catch (err) {
    UI.toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    UI.loading(false);
  }
}

function showCatPreview(data) {
  var card = UI.qs('#catPreviewCard');
  var box = UI.qs('#catPreview');
  if (!card || !box) return;
  card.hidden = false;
  if (data.error) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ' + UI.esc(data.error) + '</div>';
    return;
  }
  var rows = data.rows;
  if (!rows.length) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ไม่พบรายการที่นำเข้าได้ (กรุณาตรวจสอบชื่อหมวดหมู่ / GP)' + '</div>';
    return;
  }
  var preview = rows.slice(0, 20).map(function (r) {
    return '<tr><td>' + UI.esc(r.name) + '</td><td class="num">' + UI.fmtNum(r.gp) + ' %</td><td class="num">' + (r.minDays !== null ? UI.fmtNum(r.minDays) : '<span class="muted">ตามระบบ</span>') + '</td><td class="num">' + (r.maxDays !== null ? UI.fmtNum(r.maxDays) : '<span class="muted">ตามระบบ</span>') + '</td></tr>';
  }).join('');
  var more = rows.length > 20 ? '<tr><td colspan="4" class="muted">... แสดง 20 จาก ' + rows.length + ' รายการ</td></tr>' : '';
  box.innerHTML =
    '<div class="import-summary"><div><strong>' + UI.fmtNum(rows.length) + '</strong> รายการพร้อมนำเข้า</div><div><strong>' + UI.fmtNum(data.skips) + '</strong> รายการข้าม</div></div>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>ชื่อหมวดหมู่</th><th class="num">GP มาตรฐาน</th><th class="num">Min (วัน)</th><th class="num">Max (วัน)</th></tr></thead><tbody>' + preview + more + '</tbody></table></div>' +
    '<div class="action-row"><button type="button" class="btn btn-primary" id="btnCommitCat">' + UI.icon('check', 'ic-inline') + ' ยืนยันนำเข้าหมวดหมู่</button></div>';
  UI.qs('#btnCommitCat').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    commitCategories(btn, rows, data.filename);
  });
}

function commitCategories(btn, rows, filename) {
  UI.confirmDialog({
    title: 'ยืนยันการนำเข้าหมวดหมู่',
    message: 'จะแทนที่หมวดหมู่สินค้าทั้งหมด (รวม GP มาตรฐาน) ด้วยข้อมูล ' + UI.fmtNum(rows.length) + ' รายการ ต้องการดำเนินการต่อหรือไม่?'
  }).then(function (ok) {
    if (!ok) return;
    UI.disableBtn(btn);
    UI.loading(true);
    setTimeout(function () {
      var cats = rows.map(function (r) {
        return { id: DB.uuid(), name: r.name, gp: r.gp, minDays: r.minDays, maxDays: r.maxDays };
      });
      DB.save('categories', cats);
      DB.log('นำเข้าหมวดหมู่', filename + ' จำนวน ' + rows.length + ' รายการ');
      UI.loading(false);
      UI.toast('นำเข้าหมวดหมู่สำเร็จ ' + UI.fmtNum(rows.length) + ' รายการ');
      renderCategories(UI.qs('#setContent'));
    }, 50);
  });
}

function catForm(cat) {
  var isEdit = !!cat;
  var m = UI.openModal({
    title: isEdit ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่',
    size: 'sm',
    body:
      '<div class="form-grid">' +
      '<div class="form-row full"><label class="field-label">ชื่อหมวดหมู่ <span class="req">*</span></label><input class="input" name="name" value="' + UI.esc(cat ? cat.name : '') + '" placeholder="เช่น อาหาร"></div>' +
      '<div class="form-row full"><label class="field-label">GP มาตรฐาน (%) <span class="req">*</span></label><input class="input" type="number" name="gp" min="0" max="99" step="0.1" value="' + (cat ? cat.gp : 20) + '"></div>' +
      '<div class="form-row"><label class="field-label">Min (วัน) - ปล่อยว่างใช้ตามระบบ</label><input class="input" type="number" name="minDays" min="0" value="' + (cat && cat.minDays ? cat.minDays : '') + '"></div>' +
      '<div class="form-row"><label class="field-label">Max (วัน) - ปล่อยว่างใช้ตามระบบ</label><input class="input" type="number" name="maxDays" min="0" value="' + (cat && cat.maxDays ? cat.maxDays : '') + '"></div>' +
      '</div>',
    footer: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="button" class="btn btn-primary" id="catSave">บันทึก</button>'
  });
  m.el.querySelector('#catSave').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    var name = UI.qs('[name=name]', m.el).value.trim();
    var gp = parseFloat(UI.qs('[name=gp]', m.el).value);
    var minDays = parseFloat(UI.qs('[name=minDays]', m.el).value);
    var maxDays = parseFloat(UI.qs('[name=maxDays]', m.el).value);
    if (!name) { UI.toast('กรุณาระบุชื่อหมวดหมู่', 'error'); return; }
    if (isNaN(gp) || gp < 0 || gp > 99) { UI.toast('GP ต้องอยู่ระหว่าง 0-99%', 'error'); return; }
    var cats = DB.all('categories');
    if (!isEdit && cats.some(function (c) { return c.name === name; })) { UI.toast('มีชื่อหมวดนี้อยู่แล้ว', 'error'); return; }
    UI.disableBtn(btn);
    if (isEdit) {
      var c = cats.find(function (x) { return x.id === cat.id; });
      c.name = name; c.gp = gp; c.minDays = isNaN(minDays) ? null : minDays; c.maxDays = isNaN(maxDays) ? null : maxDays;
    } else {
      cats.push({ id: DB.uuid(), name: name, gp: gp, minDays: isNaN(minDays) ? null : minDays, maxDays: isNaN(maxDays) ? null : maxDays });
    }
    DB.save('categories', cats);
    DB.log(isEdit ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่', name + ' GP ' + gp + '%');
    m.close();
    UI.toast('บันทึกหมวดหมู่แล้ว');
    renderCategories(UI.qs('#setContent'));
  });
}

function renderSuppliers(content) {
  var suppliers = DB.all('suppliers');
  content.innerHTML =
    '<div class="card"><div class="card-head"><h2>ซัพพลายเออร์</h2>' +
    '<button type="button" class="btn btn-primary btn-sm" id="btnAddSup">' + UI.icon('plus', 'ic-inline') + ' เพิ่มซัพพลายเออร์</button></div>' +
    '<div class="card-body">' +
    '<div class="action-row"><button type="button" class="btn btn-primary" id="btnSupImport">' + UI.icon('import', 'ic-inline') + ' นำเข้าซัพพลายเออร์</button>' +
    '<button type="button" class="btn btn-ghost" id="btnSupTemplate">' + UI.icon('download', 'ic-inline') + ' ดาวน์โหลด Template</button></div>' +
    '<input type="file" id="supFile" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>' +
    '<div class="note-box"><div class="note-title">' + UI.icon('info', 'ic-inline') + ' การนำเข้าจะแทนที่ซัพพลายเออร์ทั้งหมดในระบบ</div>' +
    '<div class="note-text">รองรับไฟล์ .csv, .xls, .xlsx · คอลัมน์: ' + UI.esc(SUPPLIER_HEADERS.join(' · ')) + ' · รหัสเจ้าหนี้ต้องไม่ซ้ำกัน · credit term ระบุจำนวนวันเป็นตัวเลข (เช่น 30) ถ้าเป็นเงินสดให้เว้นว่างหรือใส่ 0</div></div>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>รหัสเจ้าหนี้</th><th>ชื่อเจ้าหนี้</th><th>วิธีการชำระเงิน</th><th class="num">Credit Term (วัน)</th><th>จัดการ</th></tr></thead><tbody>' +
    suppliers.map(function (s) {
      return '<tr>' +
        '<td>' + UI.esc(s.creditorCode || '-') + '</td>' +
        '<td>' + UI.esc(s.name) + '</td><td>' + (s.paymentMethod ? UI.esc(s.paymentMethod) : '<span class="muted">-</span>') + '</td><td class="num">' + (s.creditTerm ? UI.fmtNum(s.creditTerm) + ' วัน' : '<span class="muted">-</span>') + '</td>' +
        '<td><div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-edit-sup="' + UI.esc(s.id) + '">' + UI.icon('edit', 'ic-inline') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" data-del-sup="' + UI.esc(s.id) + '">' + UI.icon('trash', 'ic-inline') + '</button></div></td></tr>';
    }).join('') +
    '</tbody></table></div></div></div>' +
    '<div class="card" id="supPreviewCard" hidden><div class="card-head"><h2>' + UI.icon('eye', 'ic-inline') + ' ตรวจสอบข้อมูลก่อนนำเข้า</h2></div><div class="card-body" id="supPreview"></div></div>';

  var supFileInput = UI.qs('#supFile');

  UI.on('#btnSupImport', 'click', function () {
    supFileInput.click();
  });
  UI.on('#btnSupTemplate', 'click', function () {
    downloadSupplierTemplate();
  });
  supFileInput.addEventListener('change', function () {
    if (supFileInput.files && supFileInput.files.length) handleSupplierFile(supFileInput.files[0]);
    supFileInput.value = '';
  });

  UI.on('#btnAddSup', 'click', function () { supForm(null); });
  UI.qsa('[data-edit-sup]', content).forEach(function (b) {
    b.addEventListener('click', function () { supForm(suppliers.find(function (s) { return s.id === b.dataset.editSup; })); });
  });
  UI.qsa('[data-del-sup]', content).forEach(function (b) {
    b.addEventListener('click', function () {
      var s = suppliers.find(function (x) { return x.id === b.dataset.delSup; });
      if (!s) return;
      UI.confirmDialog({ title: 'ลบซัพพลายเออร์', message: 'ต้องการลบ "' + s.name + '" ใช่หรือไม่?', danger: true, confirmText: 'ลบ' }).then(function (ok) {
        if (!ok) return;
        DB.save('suppliers', DB.all('suppliers').filter(function (x) { return x.id !== s.id; }));
        DB.log('ลบซัพพลายเออร์', s.name);
        UI.toast('ลบซัพพลายเออร์แล้ว');
        renderSuppliers(UI.qs('#setContent'));
      });
    });
  });
}

function downloadSupplierTemplate() {
  var rows = [SUPPLIER_HEADERS];
  rows.push(['S2500269', 'บ. สยามพลาซ่าค้าปลีก', 'เครดิต', '30']);
  rows.push(['S2500270', 'ดริงค์มิกซ์ จำกัด', 'เครดิต', '45']);
  rows.push(['S2500271', 'ไฮโฮมแคร์', 'เงินสด', '']);
  UI.downloadCSV('template_suppliers.csv', rows, ',');
  UI.toast('ดาวน์โหลด Template ซัพพลายเออร์แล้ว');
}

function handleSupplierFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { UI.toast('ไฟล์มีขนาดเกิน 5 MB', 'error'); return; }
  UI.loading(true);
  if (isExcelFile(file.name)) {
    ensureXLSX().then(function (XLSXlib) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = XLSXlib.read(new Uint8Array(e.target.result), { type: 'array' });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var parsed = XLSXlib.utils.sheet_to_json(ws, { header: 1, defval: '' });
          processSupplierParsed(parsed, file.name);
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
        processSupplierParsed(parsed, file.name);
      } catch (err) {
        UI.loading(false);
        UI.toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
      }
    };
    reader.onerror = function () { UI.loading(false); UI.toast('ไม่สามารถอ่านไฟล์ได้', 'error'); };
    reader.readAsText(file, 'UTF-8');
  }
}

function processSupplierParsed(parsed, filename) {
  try {
    if (!parsed.length) { UI.toast('ไฟล์ไม่มีข้อมูล', 'error'); UI.loading(false); return; }
    var headers = parsed[0].map(function (h) { return String(h).trim(); });
    var map = UI.mapHeaders(headers, SUPPLIER_ALIASES);
    if (map['ชื่อเจ้าหนี้'] === undefined) {
      showSupplierPreview({ error: 'ไฟล์ไม่ถูกต้อง ขาดคอลัมน์ที่จำเป็น: ชื่อเจ้าหนี้' });
      UI.toast('ขาดคอลัมน์ที่จำเป็น: ชื่อเจ้าหนี้', 'error');
      UI.loading(false);
      return;
    }
    var rows = [];
    var skips = 0;
    var seenCode = {};
    for (var i = 1; i < parsed.length; i++) {
      var r = parsed[i];
      var get = function (f) { return map[f] !== undefined ? String(r[map[f]] == null ? '' : r[map[f]]).trim() : ''; };
      var name = get('ชื่อเจ้าหนี้');
      var code = get('รหัสเจ้าหนี้');
      if (!name || !code) { skips++; continue; }
      if (seenCode[code]) { skips++; continue; }
      seenCode[code] = true;
      var termRaw = get('credit term (วัน)').replace(/[^\d-]/g, '');
      var term = parseInt(termRaw, 10);
      rows.push({
        creditorCode: code,
        name: name,
        paymentMethod: get('วิธีการชำระเงิน') || '',
        creditTerm: isNaN(term) || term < 0 ? 0 : term
      });
    }
    showSupplierPreview({ rows: rows, skips: skips, filename: filename });
  } catch (err) {
    UI.toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    UI.loading(false);
  }
}

function showSupplierPreview(data) {
  var card = UI.qs('#supPreviewCard');
  var box = UI.qs('#supPreview');
  if (!card || !box) return;
  card.hidden = false;
  if (data.error) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ' + UI.esc(data.error) + '</div>';
    return;
  }
  var rows = data.rows;
  if (!rows.length) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ไม่พบรายการที่นำเข้าได้ (กรุณาตรวจสอบชื่อเจ้าหนี้)' + '</div>';
    return;
  }
  var preview = rows.slice(0, 20).map(function (r) {
    return '<tr><td>' + UI.esc(r.creditorCode || '-') + '</td><td>' + UI.esc(r.name) + '</td><td>' + (r.paymentMethod ? UI.esc(r.paymentMethod) : '<span class="muted">-</span>') + '</td><td class="num">' + (r.creditTerm ? UI.fmtNum(r.creditTerm) + ' วัน' : '<span class="muted">-</span>') + '</td></tr>';
  }).join('');
  var more = rows.length > 20 ? '<tr><td colspan="4" class="muted">... แสดง 20 จาก ' + rows.length + ' รายการ</td></tr>' : '';
  box.innerHTML =
    '<div class="import-summary"><div><strong>' + UI.fmtNum(rows.length) + '</strong> รายการพร้อมนำเข้า</div><div><strong>' + UI.fmtNum(data.skips) + '</strong> รายการข้าม</div></div>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>รหัสเจ้าหนี้</th><th>ชื่อเจ้าหนี้</th><th>วิธีการชำระเงิน</th><th class="num">Credit Term (วัน)</th></tr></thead><tbody>' + preview + more + '</tbody></table></div>' +
    '<div class="action-row"><button type="button" class="btn btn-primary" id="btnCommitSup">' + UI.icon('check', 'ic-inline') + ' ยืนยันนำเข้าซัพพลายเออร์</button></div>';
  UI.qs('#btnCommitSup').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    commitSuppliers(btn, rows, data.filename);
  });
}

function commitSuppliers(btn, rows, filename) {
  UI.confirmDialog({
    title: 'ยืนยันการนำเข้าซัพพลายเออร์',
    message: 'จะแทนที่ซัพพลายเออร์ทั้งหมดด้วยข้อมูล ' + UI.fmtNum(rows.length) + ' รายการ ต้องการดำเนินการต่อหรือไม่?'
  }).then(function (ok) {
    if (!ok) return;
    UI.disableBtn(btn);
    UI.loading(true);
    setTimeout(function () {
      var current = DB.all('suppliers');
      var suppliers = rows.map(function (r) {
        var match = current.find(function (s) { return s.creditorCode && s.creditorCode === r.creditorCode; });
        return {
          id: match ? match.id : (r.creditorCode || DB.uuid()),
          creditorCode: r.creditorCode || '',
          name: r.name,
          paymentMethod: r.paymentMethod || '',
          creditTerm: r.creditTerm || 0
        };
      });
      DB.save('suppliers', suppliers);
      DB.log('นำเข้าซัพพลายเออร์', filename + ' จำนวน ' + rows.length + ' รายการ');
      UI.loading(false);
      UI.toast('นำเข้าซัพพลายเออร์สำเร็จ ' + UI.fmtNum(rows.length) + ' รายการ');
      renderSuppliers(UI.qs('#setContent'));
    }, 50);
  });
}

function supForm(sup) {
  var isEdit = !!sup;
  var m = UI.openModal({
    title: isEdit ? 'แก้ไขซัพพลายเออร์' : 'เพิ่มซัพพลายเออร์',
    size: 'md',
    body:
      '<div class="form-grid">' +
      '<div class="form-row full"><label class="field-label">รหัสเจ้าหนี้ <span class="req">*</span></label><input class="input" name="creditorCode" placeholder="เช่น S2500269" value="' + UI.esc(sup ? sup.creditorCode || '' : '') + '"></div>' +
      '<div class="form-row full"><label class="field-label">ชื่อเจ้าหนี้ <span class="req">*</span></label><input class="input" name="name" value="' + UI.esc(sup ? sup.name : '') + '"></div>' +
      '<div class="form-row"><label class="field-label">วิธีการชำระเงิน</label><select class="input" name="paymentMethod"><option value="">- ไม่ระบุ -</option>' + PAYMENT_METHODS.map(function (pm) { return '<option value="' + UI.esc(pm) + '"' + (sup && sup.paymentMethod === pm ? ' selected' : '') + '>' + UI.esc(pm) + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-row"><label class="field-label">Credit Term (วัน)</label><input class="input" type="number" min="0" name="creditTerm" value="' + (sup && sup.creditTerm ? sup.creditTerm : '') + '"></div>' +
      '</div>',
    footer: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="button" class="btn btn-primary" id="supSave">บันทึก</button>'
  });
  m.el.querySelector('#supSave').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    var creditorCode = UI.qs('[name=creditorCode]', m.el).value.trim();
    var name = UI.qs('[name=name]', m.el).value.trim();
    var paymentMethod = UI.qs('[name=paymentMethod]', m.el).value;
    var creditTerm = parseInt(UI.qs('[name=creditTerm]', m.el).value, 10);
    if (isNaN(creditTerm) || creditTerm < 0) creditTerm = 0;
    if (!creditorCode) { UI.toast('กรุณาระบุรหัสเจ้าหนี้', 'error'); return; }
    if (!name) { UI.toast('กรุณาระบุชื่อเจ้าหนี้', 'error'); return; }
    var suppliers = DB.all('suppliers');
    if (!isEdit && suppliers.some(function (s) { return s.creditorCode === creditorCode; })) { UI.toast('มีรหัสเจ้าหนี้ซ้ำกับรายการอื่นแล้ว', 'error'); return; }
    UI.disableBtn(btn);
    if (isEdit) {
      var s = suppliers.find(function (x) { return x.id === sup.id; });
      s.creditorCode = creditorCode; s.name = name; s.paymentMethod = paymentMethod; s.creditTerm = creditTerm;
    } else {
      suppliers.push({ id: DB.uuid(), creditorCode: creditorCode, name: name, paymentMethod: paymentMethod, creditTerm: creditTerm });
    }
    DB.save('suppliers', suppliers);
    DB.log(isEdit ? 'แก้ไขซัพพลายเออร์' : 'เพิ่มซัพพลายเออร์', name);
    m.close();
    UI.toast('บันทึกซัพพลายเออร์แล้ว');
    renderSuppliers(UI.qs('#setContent'));
  });
}
