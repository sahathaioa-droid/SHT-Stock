function renderProducts(content) {
  var products = DB.all('products');
  content.innerHTML =
    '<div class="card"><div class="card-head"><h2>สินค้า (Master Data)</h2>' +
    '<div class="head-actions"><input class="input search-input" id="prodSearch" placeholder="ค้นหารหัส/ชื่อ..."><button type="button" class="btn btn-primary btn-sm" id="btnAddProd">' + UI.icon('plus', 'ic-inline') + ' เพิ่มสินค้า</button></div></div>' +
    '<div class="card-body">' +
    '<div class="action-row"><button type="button" class="btn btn-primary" id="btnImportProd">' + UI.icon('import', 'ic-inline') + ' นำเข้าสินค้า</button>' +
    '<button type="button" class="btn btn-ghost" id="btnProdTemplate">' + UI.icon('download', 'ic-inline') + ' ดาวน์โหลด Template</button></div>' +
    '<input type="file" id="prodFile" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>' +
    '<div class="note-box"><div class="note-title">' + UI.icon('info', 'ic-inline') + ' การนำเข้าจะแทนที่สินค้าทั้งหมดในระบบ</div>' +
    '<div class="note-text">รองรับไฟล์ .csv, .xls, .xlsx · คอลัมน์: ' + UI.esc(PRODUCT_HEADERS.join(' · ')) + ' · ซัพพลายเออร์ระบุเป็นชื่อ ระบบจะจับคู่กับซัพพลายเออร์ในระบบให้อัตโนมัติ</div></div>' +
    '<div class="table-wrap"><table class="table" id="prodTable"><thead><tr><th>รหัส</th><th>ชื่อสินค้า</th><th>หมวด</th><th>หน่วย</th><th class="num">แพ็ก</th><th>ซัพพลายเออร์</th><th>จัดการ</th></tr></thead><tbody></tbody></table></div>' +
    '</div></div>' +
    '<div class="card" id="prodPreviewCard" hidden><div class="card-head"><h2>' + UI.icon('eye', 'ic-inline') + ' ตรวจสอบข้อมูลก่อนนำเข้า</h2></div><div class="card-body" id="prodPreview"></div></div>';
  var tbody = UI.qs('#prodTable tbody');
  function render(list) {
    var suppliers = DB.all('suppliers');
    function supName(id) {
      var s = suppliers.find(function (x) { return x.id === id; });
      return s ? s.name : '-';
    }
    tbody.innerHTML = list.map(function (p) {
      return '<tr><td class="mono">' + UI.esc(p.code) + '</td><td>' + UI.esc(p.name) + '</td><td>' + UI.esc(p.category) + '</td><td>' + UI.esc(p.unit || '-') + '</td><td class="num">' + UI.fmtNum(p.pack || 1) + '</td><td>' + UI.esc(supName(p.supplier)) + '</td>' +
        '<td><div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-edit-prod="' + UI.esc(p.code) + '">' + UI.icon('edit', 'ic-inline') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" data-del-prod="' + UI.esc(p.code) + '">' + UI.icon('trash', 'ic-inline') + '</button></div></td></tr>';
    }).join('') || '<tr><td colspan="7" class="muted">ไม่มีข้อมูลสินค้า</td></tr>';
    UI.qsa('[data-edit-prod]', tbody).forEach(function (b) {
      b.addEventListener('click', function () { prodForm(products.find(function (p) { return p.code === b.dataset.editProd; })); });
    });
    UI.qsa('[data-del-prod]', tbody).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = products.find(function (x) { return x.code === b.dataset.delProd; });
        if (!p) return;
        UI.confirmDialog({ title: 'ลบสินค้า', message: 'ต้องการลบสินค้า "' + p.name + '" (' + p.code + ') ใช่หรือไม่?', danger: true, confirmText: 'ลบ' }).then(function (ok) {
          if (!ok) return;
          DB.save('products', DB.all('products').filter(function (x) { return x.code !== p.code; }));
          DB.log('ลบสินค้า', p.code + ' ' + p.name);
          UI.toast('ลบสินค้าแล้ว');
          renderProducts(UI.qs('#setContent'));
        });
      });
    });
  }
  render(products);
  UI.qs('#prodSearch').addEventListener('input', UI.debounce(function (e) {
    var q = e.target.value.trim().toLowerCase();
    render(products.filter(function (p) { return p.code.toLowerCase().indexOf(q) >= 0 || p.name.toLowerCase().indexOf(q) >= 0; }));
  }, 200));
  UI.on('#btnAddProd', 'click', function () { prodForm(null); });

  var prodFileInput = UI.qs('#prodFile');
  UI.on('#btnImportProd', 'click', function () { prodFileInput.click(); });
  UI.on('#btnProdTemplate', 'click', function () { downloadProductTemplate(); });
  prodFileInput.addEventListener('change', function () {
    if (prodFileInput.files && prodFileInput.files.length) handleProductFile(prodFileInput.files[0]);
    prodFileInput.value = '';
  });
}
function prodForm(prod) {
  var isEdit = !!prod;
  var cats = DB.all('categories');
  var suppliers = DB.all('suppliers');
  var catOpts = cats.map(function (c) { return '<option value="' + UI.esc(c.name) + '"' + (prod && prod.category === c.name ? ' selected' : '') + '>' + UI.esc(c.name) + '</option>'; }).join('');
  var supOpts = suppliers.map(function (s) { return '<option value="' + UI.esc(s.id) + '"' + (prod && prod.supplier === s.id ? ' selected' : '') + '>' + UI.esc(s.name) + '</option>'; }).join('');
  var m = UI.openModal({
    title: isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า',
    size: 'md',
    body:
      '<div class="form-grid">' +
      '<div class="form-row"><label class="field-label">รหัสสินค้า <span class="req">*</span></label><input class="input" name="code" value="' + UI.esc(prod ? prod.code : '') + '"' + (isEdit ? ' readonly' : '') + '></div>' +
      '<div class="form-row"><label class="field-label">ชื่อสินค้า <span class="req">*</span></label><input class="input" name="name" value="' + UI.esc(prod ? prod.name : '') + '"></div>' +
      '<div class="form-row"><label class="field-label">หมวดหมู่</label><select class="input" name="category">' + catOpts + '</select></div>' +
      '<div class="form-row"><label class="field-label">ซัพพลายเออร์</label><select class="input" name="supplier"><option value="">- ไม่ระบุ -</option>' + supOpts + '</select></div>' +
      '<div class="form-row"><label class="field-label">หน่วยนับ</label><input class="input" name="unit" value="' + UI.esc(prod ? prod.unit || '' : '') + '"></div>' +
      '<div class="form-row"><label class="field-label">จำนวนต่อแพ็ก</label><input class="input" type="number" name="pack" min="1" value="' + (prod && prod.pack ? prod.pack : 1) + '"></div>' +
      '</div>',
    footer: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="button" class="btn btn-primary" id="prodSave">บันทึก</button>'
  });
  m.el.querySelector('#prodSave').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    var code = UI.qs('[name=code]', m.el).value.trim();
    var name = UI.qs('[name=name]', m.el).value.trim();
    var category = UI.qs('[name=category]', m.el).value;
    var supplier = UI.qs('[name=supplier]', m.el).value;
    var unit = UI.qs('[name=unit]', m.el).value.trim();
    var pack = parseInt(UI.qs('[name=pack]', m.el).value, 10);
    if (!code) { UI.toast('กรุณาระบุรหัสสินค้า', 'error'); return; }
    if (!name) { UI.toast('กรุณาระบุชื่อสินค้า', 'error'); return; }
    if (isNaN(pack) || pack < 1) pack = 1;
    var products = DB.all('products');
    if (!isEdit && DB.getProduct(code)) { UI.toast('มีรหัสสินค้านี้อยู่แล้ว', 'error'); return; }
    UI.disableBtn(btn);
    if (isEdit) {
      var p = products.find(function (x) { return x.code === prod.code; });
      if (p) { p.code = code; p.name = name; p.category = category; p.supplier = supplier; p.unit = unit; p.pack = pack; }
    } else {
      products.push({ code: code, name: name, category: category, supplier: supplier, unit: unit, pack: pack });
    }
    DB.save('products', products);
    DB.log(isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า', code + ' ' + name);
    m.close();
    UI.toast('บันทึกสินค้าแล้ว');
    renderProducts(UI.qs('#setContent'));
  });
}

function renderBranches(content) {
  var branches = DB.all('branches');
  content.innerHTML =
    '<div class="card"><div class="card-head"><h2>สาขา</h2>' +
    '<button type="button" class="btn btn-primary btn-sm" id="btnAddBranch">' + UI.icon('plus', 'ic-inline') + ' เพิ่มสาขา</button></div>' +
    '<div class="card-body"><div class="table-wrap"><table class="table"><thead><tr><th>ชื่อสาขา</th><th>จัดการ</th></tr></thead><tbody>' +
    branches.map(function (b) {
      return '<tr><td>' + UI.esc(b.name) + '</td><td><button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" data-del-branch="' + UI.esc(b.id) + '">' + UI.icon('trash', 'ic-inline') + '</button></td></tr>';
    }).join('') +
    '</tbody></table></div></div></div>';
  UI.on('#btnAddBranch', 'click', function () {
    var m = UI.openModal({
      title: 'เพิ่มสาขา', size: 'sm',
      body: '<div class="form-row"><label class="field-label">ชื่อสาขา <span class="req">*</span></label><input class="input" name="branchName"></div>',
      footer: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="button" class="btn btn-primary" id="branchSave">บันทึก</button>'
    });
    m.el.querySelector('#branchSave').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      var name = UI.qs('[name=branchName]', m.el).value.trim();
      if (!name) { UI.toast('กรุณาระบุชื่อสาขา', 'error'); return; }
      var branches = DB.all('branches');
      if (branches.some(function (b) { return b.name === name; })) { UI.toast('มีชื่อสาขานี้อยู่แล้ว', 'error'); return; }
      UI.disableBtn(btn);
      branches.push({ id: DB.uuid(), name: name });
      DB.save('branches', branches);
      DB.log('เพิ่มสาขา', name);
      m.close();
      UI.toast('เพิ่มสาขาแล้ว');
      renderBranches(UI.qs('#setContent'));
    });
  });
  UI.qsa('[data-del-branch]', content).forEach(function (b) {
    b.addEventListener('click', function () {
      var br = branches.find(function (x) { return x.id === b.dataset.delBranch; });
      if (!br) return;
      UI.confirmDialog({ title: 'ลบสาขา', message: 'ต้องการลบสาขา "' + br.name + '" ใช่หรือไม่?', danger: true, confirmText: 'ลบ' }).then(function (ok) {
        if (!ok) return;
        DB.save('branches', DB.all('branches').filter(function (x) { return x.id !== br.id; }));
        DB.log('ลบสาขา', br.name);
        UI.toast('ลบสาขาแล้ว');
        renderBranches(UI.qs('#setContent'));
      });
    });
  });
}

function renderUsers(content) {
  var users = DB.all('users');
  content.innerHTML =
    '<div class="card"><div class="card-head"><h2>ผู้ใช้ระบบ</h2>' +
    '<button type="button" class="btn btn-primary btn-sm" id="btnAddUser">' + UI.icon('plus', 'ic-inline') + ' เพิ่มผู้ใช้</button></div>' +
    '<div class="card-body"><div class="table-wrap"><table class="table"><thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ-นามสกุล</th><th>บทบาท</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>' +
    users.map(function (u) {
      return '<tr><td class="mono">' + UI.esc(u.username) + '</td><td>' + UI.esc(u.name) + '</td><td>' + UI.esc(Auth.roleLabel(u.role)) + '</td><td>' + (u.active === false ? UI.badge('ระงับ', 'danger') : UI.badge('ใช้งาน', 'success')) + '</td>' +
        '<td><div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-edit-user="' + UI.esc(u.username) + '">' + UI.icon('edit', 'ic-inline') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" data-del-user="' + UI.esc(u.username) + '">' + UI.icon('trash', 'ic-inline') + '</button></div></td></tr>';
    }).join('') +
    '</tbody></table></div></div></div>';
  UI.on('#btnAddUser', 'click', function () { userForm(null); });
  UI.qsa('[data-edit-user]', content).forEach(function (b) {
    b.addEventListener('click', function () { userForm(users.find(function (u) { return u.username === b.dataset.editUser; })); });
  });
  UI.qsa('[data-del-user]', content).forEach(function (b) {
    b.addEventListener('click', function () {
      var u = users.find(function (x) { return x.username === b.dataset.delUser; });
      if (!u) return;
      if (u.username === Auth.current().username) { UI.toast('ไม่สามารถลบบัญชีของตัวเองได้', 'error'); return; }
      UI.confirmDialog({ title: 'ลบผู้ใช้', message: 'ต้องการลบผู้ใช้ "' + u.username + '" ใช่หรือไม่?', danger: true, confirmText: 'ลบ' }).then(function (ok) {
        if (!ok) return;
        DB.save('users', DB.all('users').filter(function (x) { return x.username !== u.username; }));
        DB.log('ลบผู้ใช้', u.username);
        UI.toast('ลบผู้ใช้แล้ว');
        renderUsers(UI.qs('#setContent'));
      });
    });
  });
}

function userForm(user) {
  var isEdit = !!user;
  var roleOpts = Object.keys(ROLES).map(function (r) {
    return '<option value="' + r + '"' + (user && user.role === r ? ' selected' : '') + '>' + UI.esc(ROLES[r]) + '</option>';
  }).join('');
  var m = UI.openModal({
    title: isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้',
    size: 'md',
    body:
      '<div class="form-grid">' +
      '<div class="form-row"><label class="field-label">ชื่อผู้ใช้ <span class="req">*</span></label><input class="input" name="username" value="' + UI.esc(user ? user.username : '') + '"' + (isEdit ? ' readonly' : '') + '></div>' +
      '<div class="form-row"><label class="field-label">ชื่อ-นามสกุล <span class="req">*</span></label><input class="input" name="name" value="' + UI.esc(user ? user.name : '') + '"></div>' +
      '<div class="form-row"><label class="field-label">บทบาท <span class="req">*</span></label><select class="input" name="role">' + roleOpts + '</select></div>' +
      '<div class="form-row"><label class="field-label">รหัสผ่าน' + (isEdit ? ' (เว้นว่าง = คงเดิม)' : ' <span class="req">*</span>') + '</label><input class="input" type="password" name="password" autocomplete="new-password"></div>' +
      '<div class="form-row full"><label class="field-label">สถานะ</label><label class="check-label"><input type="checkbox" name="active"' + (user && user.active === false ? '' : ' checked') + '> ใช้งานบัญชีนี้</label></div>' +
      '</div>',
    footer: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="button" class="btn btn-primary" id="userSave">บันทึก</button>'
  });
  m.el.querySelector('#userSave').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    var username = UI.qs('[name=username]', m.el).value.trim();
    var name = UI.qs('[name=name]', m.el).value.trim();
    var role = UI.qs('[name=role]', m.el).value;
    var password = UI.qs('[name=password]', m.el).value;
    var active = UI.qs('[name=active]', m.el).checked;
    if (!username || !name || !role) { UI.toast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error'); return; }
    var users = DB.all('users');
    if (!isEdit) {
      if (users.some(function (u) { return u.username.toLowerCase() === username.toLowerCase(); })) { UI.toast('มีชื่อผู้ใช้นี้อยู่แล้ว', 'error'); return; }
      if (!password) { UI.toast('กรุณาระบุรหัสผ่าน', 'error'); return; }
    }
    UI.disableBtn(btn);
    if (isEdit) {
      var u = users.find(function (x) { return x.username === user.username; });
      if (u) { u.name = name; u.role = role; u.active = active; if (password) u.password = password; }
    } else {
      users.push({ username: username, name: name, role: role, password: password, active: true });
    }
    DB.save('users', users);
    DB.log(isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้', username);
    m.close();
    UI.toast('บันทึกผู้ใช้แล้ว');
    renderUsers(UI.qs('#setContent'));
  });
}

function downloadProductTemplate() {
  var rows = [PRODUCT_HEADERS];
  rows.push(['P-001', 'ข้าวหอมมะลิ 100% 5 กก.', 'อาหาร', 'กระสอบ', '1', 'เซ็นทรัลฟู้ด ซัพพลาย']);
  rows.push(['P-010', 'น้ำอัดลม 325 มล.', 'เครื่องดื่ม', 'ขวด', '24', 'ดริงค์มิกซ์ จำกัด']);
  UI.downloadCSV('template_products.csv', rows, ',');
  UI.toast('ดาวน์โหลด Template สินค้าแล้ว');
}

function handleProductFile(file) {
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
          processProductParsed(parsed, file.name);
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
        processProductParsed(parsed, file.name);
      } catch (err) {
        UI.loading(false);
        UI.toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
      }
    };
    reader.onerror = function () { UI.loading(false); UI.toast('ไม่สามารถอ่านไฟล์ได้', 'error'); };
    reader.readAsText(file, 'UTF-8');
  }
}

function processProductParsed(parsed, filename) {
  try {
    if (parsed.length < 2) { UI.toast('ไฟล์ไม่มีข้อมูล', 'error'); UI.loading(false); return; }
    var headers = parsed[0].map(function (h) { return String(h).trim(); });
    var map = UI.mapHeaders(headers, PRODUCT_ALIASES);
    var missing = [];
    if (map['รหัสสินค้า'] === undefined) missing.push('รหัสสินค้า');
    if (map['ชื่อสินค้า'] === undefined) missing.push('ชื่อสินค้า');
    if (missing.length) {
      showProductPreview({ error: 'ไฟล์ไม่ถูกต้อง ขาดคอลัมน์ที่จำเป็น: ' + missing.join(', ') });
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
      var name = get('ชื่อสินค้า');
      if (!code || !name) { skips++; continue; }
      var key = code.toLowerCase();
      if (dupCheck[key]) { skips++; continue; }
      dupCheck[key] = true;
      rows.push({
        code: code,
        name: name,
        category: get('หมวดหมู่'),
        unit: get('หน่วย'),
        pack: UI.numOrNull(get('จำนวนต่อแพ็ก')),
        supplier: get('ซัพพลายเออร์')
      });
    }
    showProductPreview({ rows: rows, skips: skips, filename: filename });
  } catch (err) {
    UI.toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    UI.loading(false);
  }
}

function showProductPreview(data) {
  var card = UI.qs('#prodPreviewCard');
  var box = UI.qs('#prodPreview');
  if (!card || !box) return;
  card.hidden = false;
  if (data.error) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ' + UI.esc(data.error) + '</div>';
    return;
  }
  var rows = data.rows;
  if (!rows.length) {
    box.innerHTML = '<div class="error-box">' + UI.icon('alert', 'ic-inline') + ' ไม่พบรายการที่นำเข้าได้ (ต้องมีรหัสสินค้าและชื่อสินค้า)' + '</div>';
    return;
  }
  var preview = rows.slice(0, 20).map(function (r) {
    return '<tr><td class="mono">' + UI.esc(r.code) + '</td><td>' + UI.esc(r.name) + '</td><td>' + UI.esc(r.category || '-') + '</td><td>' + UI.esc(r.unit || '-') + '</td><td class="num">' + UI.fmtNum(r.pack || 1) + '</td><td>' + UI.esc(r.supplier || '-') + '</td></tr>';
  }).join('');
  var more = rows.length > 20 ? '<tr><td colspan="6" class="muted">... แสดง 20 จาก ' + rows.length + ' รายการ</td></tr>' : '';
  box.innerHTML =
    '<div class="import-summary"><div><strong>' + UI.fmtNum(rows.length) + '</strong> รายการพร้อมนำเข้า</div><div><strong>' + UI.fmtNum(data.skips) + '</strong> รายการข้าม</div></div>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>หมวด</th><th>หน่วย</th><th class="num">แพ็ก</th><th>ซัพพลายเออร์</th></tr></thead><tbody>' + preview + more + '</tbody></table></div>' +
    '<div class="action-row"><button type="button" class="btn btn-primary" id="btnCommitProducts">' + UI.icon('check', 'ic-inline') + ' ยืนยันนำเข้าสินค้า</button></div>';
  UI.qs('#btnCommitProducts').addEventListener('click', function (e) {
    commitProducts(e.currentTarget, rows, data.filename);
  });
}

function commitProducts(btn, rows, filename) {
  UI.confirmDialog({
    title: 'ยืนยันการนำเข้าสินค้า',
    message: 'จะแทนที่สินค้าทั้งหมดด้วยข้อมูล ' + UI.fmtNum(rows.length) + ' รายการ ต้องการดำเนินการต่อหรือไม่?'
  }).then(function (ok) {
    if (!ok) return;
    UI.disableBtn(btn);
    UI.loading(true);
    setTimeout(function () {
      var suppliers = DB.all('suppliers');
      var supMap = {};
      suppliers.forEach(function (s) { supMap[String(s.name).toLowerCase()] = s.id; });
      var products = rows.map(function (r) {
        return {
          code: r.code,
          name: r.name,
          category: r.category,
          supplier: supMap[String(r.supplier || '').toLowerCase()] || '',
          unit: r.unit,
          pack: (r.pack && r.pack > 0) ? Math.round(r.pack) : 1
        };
      });
      DB.save('products', products);
      DB.log('นำเข้าสินค้า (Master Data)', filename + ' จำนวน ' + rows.length + ' รายการ');
      UI.loading(false);
      UI.toast('นำเข้าสินค้าสำเร็จ ' + UI.fmtNum(rows.length) + ' รายการ');
      renderProducts(UI.qs('#setContent'));
    }, 50);
  });
}
