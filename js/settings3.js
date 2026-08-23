function renderCalc(content) {
  var s = DB.getSettings();
  content.innerHTML =
    '<div class="card"><div class="card-head"><h2>พารามิเตอร์การคำนวณ</h2></div><div class="card-body">' +
    '<div class="form-grid">' +
    '<div class="form-row"><label class="field-label">Lead Time (วัน) - ระยะเวลารอสินค้า</label><input class="input" type="number" name="leadTimeDays" min="0" value="' + s.leadTimeDays + '"></div>' +
    '<div class="form-row"><label class="field-label">Safety Stock (วัน)</label><input class="input" type="number" name="safetyStockDays" min="0" value="' + s.safetyStockDays + '"></div>' +
    '<div class="form-row"><label class="field-label">รอบสั่งซื้อ (วัน) - ช่วงเวลาระหว่างรอบสั่ง</label><input class="input" type="number" name="orderCycleDays" min="0" value="' + s.orderCycleDays + '"></div>' +
    '<div class="form-row"><label class="field-label">การปัดเศษราคาขาย (บาท)</label><input class="input" type="number" name="roundingCoin" min="0.01" step="0.25" value="' + s.roundingCoin + '"></div>' +
    '<div class="form-row"><label class="field-label">วงเงิน PR ที่ต้องขออนุมัติ (บาท) - เกินนี้รออนุมัติ</label><input class="input" type="number" name="approverLimit" min="0" value="' + s.approverLimit + '"></div>' +
    '<div class="form-row"><label class="field-label">เกณฑ์สินค้าใกล้หมด (DOH ≤ กี่วัน)</label><input class="input" type="number" name="lowStockDOH" min="0" value="' + s.lowStockDOH + '"></div>' +
    '<div class="form-row"><label class="field-label">เกณฑ์สินค้าค้างสต๊อก (ไม่ขาย ≥ กี่วัน)</label><input class="input" type="number" name="deadStockDays" min="0" value="' + s.deadStockDays + '"></div>' +
    '<div class="form-row"><label class="field-label">สกุลเงิน</label><input class="input" name="currency" value="' + UI.esc(s.currency) + '" maxlength="5"></div>' +
    '</div>' +
    '<div class="note-box"><div class="note-title">' + UI.icon('info', 'ic-inline') + ' สูตรการคำนวณ</div>' +
    '<div class="note-text">Min (ROP) = ขาย/วัน × (Lead Time + Safety Stock) · Max = ขาย/วัน × (Lead Time + รอบสั่งซื้อ) · ยอดแนะนำ = ปัดขึ้นตามแพ็กของ (Max - คงเหลือ - กำลังเข้า)</div></div>' +
    '<div class="action-row"><button type="button" class="btn btn-primary" id="btnSaveCalc">' + UI.icon('check', 'ic-inline') + ' บันทึกการตั้งค่า</button></div>' +
    '</div></div>';

  UI.on('#btnSaveCalc', 'click', function (e) {
    var btn = e.currentTarget;
    var fields = ['leadTimeDays', 'safetyStockDays', 'orderCycleDays', 'roundingCoin', 'approverLimit', 'lowStockDOH', 'deadStockDays'];
    var val = {};
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var n = parseFloat(UI.qs('[name=' + f + ']', content).value);
      if (isNaN(n) || n < 0) { UI.toast('กรุณากรอกค่าให้ถูกต้อง (ต้องมากกว่าหรือเท่ากับ 0)', 'error'); return; }
      val[f] = n;
    }
    var currency = UI.qs('[name=currency]', content).value.trim();
    if (!currency) { UI.toast('กรุณาระบุสกุลเงิน', 'error'); return; }
    val.currency = currency;
    UI.disableBtn(btn);
    DB.set('settings', val);
    DB.log('บันทึกพารามิเตอร์การคำนวณ', JSON.stringify(val));
    UI.toast('บันทึกการตั้งค่าแล้ว');
    renderCalc(UI.qs('#setContent'));
  });
}

function renderBPlus(content) {
  var s = DB.getSettings();
  var fieldOptions = ['รหัสสินค้า', 'ชื่อสินค้า', 'จำนวนสั่งซื้อ', 'ราคาซื้อ', 'หน่วย', 'สาขา', 'หมวดหมู่'];
  var cols = s.bpColumns && s.bpColumns.length ? s.bpColumns.slice() : BPLUS_DEFAULT_COLUMNS.slice();
  content.innerHTML =
    '<div class="card"><div class="card-head"><h2>คอลัมน์ไฟล์ CSV สำหรับนำเข้า BPlus</h2></div><div class="card-body">' +
    '<p class="muted">กำหนดลำดับและคอลัมน์ของไฟล์ CSV ที่จะดาวน์โหลดเพื่ออัปโหลดเข้าระบบ BPlus ของท่าน</p>' +
    '<div id="bpCols"></div>' +
    '<div class="action-row"><button type="button" class="btn btn-ghost" id="btnAddCol">' + UI.icon('plus', 'ic-inline') + ' เพิ่มคอลัมน์</button>' +
    '<span class="spacer"></span><button type="button" class="btn btn-primary" id="btnSaveBp">' + UI.icon('check', 'ic-inline') + ' บันทึก</button></div>' +
    '<div class="note-box"><div class="note-title">' + UI.icon('file', 'ic-inline') + ' ตัวอย่างบรรทัดหัวตาราง</div><div class="note-text mono-note" id="bpPreview"></div></div>' +
    '</div></div>';

  function currentCols() {
    var arr = [];
    UI.qsa('.bp-field', content).forEach(function (sel) { arr.push(sel.value); });
    return arr;
  }

  function updatePreview() {
    var box = UI.qs('#bpPreview');
    if (box) box.textContent = currentCols().join(s.bpDelimiter || ',') + ' ...';
  }

  function renderCols() {
    var box = UI.qs('#bpCols');
    box.innerHTML = cols.map(function (c, i) {
      return '<div class="bp-col"><span class="bp-order">' + (i + 1) + '</span>' +
        '<select class="input bp-field" data-idx="' + i + '">' +
        fieldOptions.map(function (f) { return '<option value="' + UI.esc(f) + '"' + (f === c ? ' selected' : '') + '>' + UI.esc(f) + '</option>'; }).join('') +
        '</select>' +
        '<button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" data-del-col="' + i + '">' + UI.icon('x', 'ic-inline') + '</button></div>';
    }).join('') || '<div class="muted">ยังไม่มีคอลัมน์</div>';
    UI.qsa('[data-del-col]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        cols.splice(parseInt(b.dataset.delCol, 10), 1);
        renderCols();
      });
    });
    updatePreview();
  }

  renderCols();
  UI.on('#bpCols', 'change', function () { updatePreview(); });
  UI.on('#btnAddCol', 'click', function () {
    var used = currentCols();
    var unused = fieldOptions.filter(function (f) { return used.indexOf(f) < 0; });
    var next = unused.length ? unused[0] : fieldOptions[0];
    cols = currentCols();
    cols.push(next);
    renderCols();
  });
  UI.on('#btnSaveBp', 'click', function (e) {
    var btn = e.currentTarget;
    var arr = currentCols();
    if (!arr.length) { UI.toast('กรุณาเพิ่มคอลัมน์อย่างน้อย 1 คอลัมน์', 'error'); return; }
    UI.disableBtn(btn);
    s.bpColumns = arr;
    DB.set('settings', s);
    DB.log('บันทึกการตั้งค่า BPlus', arr.join(', '));
    UI.toast('บันทึกการตั้งค่า BPlus แล้ว');
    renderBPlus(UI.qs('#setContent'));
  });
}

function renderSystem(content) {
  var logs = DB.all('logs');
  var info = DB.storageInfo();
  var size = info.size;
  content.innerHTML =
    '<div class="grid-2">' +
    '<div class="card"><div class="card-head"><h2>ข้อมูลระบบ</h2></div><div class="card-body">' +
    '<div class="info-list">' +
    '<div class="info-row"><span>ระบบ</span><span>' + UI.esc(APP.name) + ' v' + UI.esc(APP.version) + '</span></div>' +
    '<div class="info-row"><span>ผู้ใช้ปัจจุบัน</span><span>' + UI.esc(Auth.current().name) + ' (' + UI.esc(Auth.roleLabel(Auth.current().role)) + ')</span></div>' +
    '<div class="info-row"><span>สาขาในระบบ</span><span>' + UI.fmtNum(DB.all('branches').length) + '</span></div>' +
    '<div class="info-row"><span>สินค้าในระบบ</span><span>' + UI.fmtNum(DB.all('products').length) + '</span></div>' +
    '<div class="info-row"><span>คำสั่งซื้อ (PR)</span><span>' + UI.fmtNum(DB.all('prs').length) + '</span></div>' +
    '<div class="info-row"><span>ขนาดข้อมูลที่ใช้</span><span>' + UI.fmtNum(size / 1024, 1) + ' KB</span></div>' +
    '</div></div></div>' +
    '<div class="card"><div class="card-head"><h2>จัดการข้อมูล</h2></div><div class="card-body">' +
    '<div class="action-stack">' +
    '<div class="action-line"><button type="button" class="btn btn-ghost" id="btnSeed">' + UI.icon('refresh', 'ic-inline') + ' โหลดข้อมูลตัวอย่าง</button><span class="muted">แทนที่ข้อมูลทั้งหมดด้วยข้อมูลตัวอย่าง</span></div>' +
    '<div class="action-line"><button type="button" class="btn btn-ghost" id="btnBackup">' + UI.icon('download', 'ic-inline') + ' สำรองข้อมูล (ดาวน์โหลด)</button><span class="muted">บันทึกข้อมูลทั้งหมดเป็นไฟล์ JSON</span></div>' +
    '<div class="action-line"><button type="button" class="btn btn-ghost" id="btnRestore">' + UI.icon('import', 'ic-inline') + ' กู้คืนข้อมูล</button><span class="muted">นำเข้าไฟล์สำรองข้อมูล</span><input type="file" id="restoreFile" accept=".json,application/json" hidden></div>' +
    '<div class="action-line danger"><button type="button" class="btn btn-danger" id="btnReset">' + UI.icon('trash', 'ic-inline') + ' ล้างข้อมูลทั้งหมด</button><span class="muted">ลบข้อมูลทั้งหมดและกลับสู่หน้าเข้าสู่ระบบ</span></div>' +
    '</div></div></div></div>' +
    '<div class="card"><div class="card-head"><h2>บันทึกการใช้งาน (Activity Log)</h2></div><div class="card-body"><div class="table-wrap"><table class="table"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>บทบาท</th><th>การกระทำ</th><th>รายละเอียด</th></tr></thead><tbody>' +
    (logs.length ? logs.slice(0, 50).map(function (l) {
      return '<tr><td class="mono">' + UI.esc(l.time) + '</td><td>' + UI.esc(l.user) + '</td><td>' + UI.esc(Auth.roleLabel(l.role)) + '</td><td>' + UI.esc(l.action) + '</td><td>' + UI.esc(l.detail) + '</td></tr>';
    }).join('') : '<tr><td colspan="5" class="muted">ยังไม่มีบันทึก</td></tr>') +
    '</tbody></table></div></div></div>';

  UI.on('#btnSeed', 'click', function () {
    UI.confirmDialog({ title: 'โหลดข้อมูลตัวอย่าง', message: 'ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่ด้วยข้อมูลตัวอย่าง ต้องการดำเนินการต่อหรือไม่?', danger: true, confirmText: 'โหลดข้อมูล' }).then(function (ok) {
      if (!ok) return;
      UI.loading(true);
      setTimeout(function () {
        DB.seedDemoData(true);
        DB.log('โหลดข้อมูลตัวอย่าง', '');
        UI.loading(false);
        UI.toast('โหลดข้อมูลตัวอย่างแล้ว');
        renderSystem(UI.qs('#setContent'));
      }, 60);
    });
  });

  UI.on('#btnBackup', 'click', function () {
    var backup = DB.backup();
    UI.downloadFile('stockpilot_backup_' + DB.today().replace(/-/g, '') + '.json', JSON.stringify(backup, null, 2), 'application/json;charset=utf-8;');
    UI.toast('ดาวน์โหลดไฟล์สำรองข้อมูลแล้ว');
  });

  UI.on('#btnRestore', 'click', function () {
    UI.qs('#restoreFile').click();
  });

  UI.qs('#restoreFile').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    UI.loading(true);
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var obj = JSON.parse(String(ev.target.result));
        var count = DB.restore(obj);
        UI.loading(false);
        UI.toast('กู้คืนข้อมูลสำเร็จ ' + count + ' รายการ');
        window.location.reload();
      } catch (err) {
        UI.loading(false);
        UI.toast('ไฟล์สำรองข้อมูลไม่ถูกต้อง: ' + err.message, 'error');
      }
    };
    reader.onerror = function () { UI.loading(false); UI.toast('อ่านไฟล์ไม่สำเร็จ', 'error'); };
    reader.readAsText(file, 'UTF-8');
  });

  UI.on('#btnReset', 'click', function () {
    UI.confirmDialog({ title: 'ล้างข้อมูลทั้งหมด', message: 'ข้อมูลทั้งหมดในระบบจะถูกลบอย่างถาวร ต้องการดำเนินการต่อหรือไม่?', danger: true, confirmText: 'ล้างทั้งหมด' }).then(function (ok) {
      if (!ok) return;
      DB.resetAll();
      window.location.href = 'index.html';
    });
  });
}
