var RecommendPage = {
  state: null,

  render: function (container) {
    var settings = DB.getSettings();
    var branches = DB.stockBranches();
    var stockRows = DB.getStockRows();
    this.state = {
      branch: branches[0] || '',
      qtyMap: {},
      viewOnly: Auth.current().role === 'viewer'
    };
    if (!branches.length) {
      container.innerHTML = '<div class="page-head"><div><h1>' + UI.esc(PAGE_TITLES.recommend) + '</h1></div></div><div class="card"><div class="card-body">' +
        '<div class="empty-state"><div class="empty-ic">' + UI.icon('alert') + '</div><div class="empty-title">ยังไม่มีข้อมูลสต๊อก</div>' +
        '<div class="empty-sub">กรุณานำเข้าข้อมูล stock snapshot ก่อนใช้งานหน้านี้</div></div></div></div>';
      return;
    }
    var rows = buildRecommendations(this.state.branch);
    this.state.allRows = rows;
    this.state.rows = rows;
    this.state.supplier = '';
    this.state.category = '';

    var supSeen = {}, catSeen = {};
    rows.forEach(function (r) {
      supSeen[r.supplierName || 'ซัพพลายเออร์อื่น'] = true;
      catSeen[r.category || 'อื่นๆ'] = true;
    });
    var allCats = DB.all('categories');
    allCats.forEach(function (c) { catSeen[c.name] = true; });
    var supOpts = Object.keys(supSeen).sort().map(function (n) { return '<option value="' + UI.esc(n) + '">' + UI.esc(n) + '</option>'; }).join('');
    var catOpts = Object.keys(catSeen).sort().map(function (n) {
      var cat = allCats.find(function (c) { return c.name === n; });
      var gpLabel = cat ? ' (GP ' + UI.fmtPct(cat.gp) + ')' : '';
      return '<option value="' + UI.esc(n) + '">' + UI.esc(n) + gpLabel + '</option>';
    }).join('');

    container.innerHTML =
      '<div class="page-head"><div><h1>' + UI.esc(PAGE_TITLES.recommend) + '</h1>' +
      '<p>ระบบคำนวณยอดสั่งซื้อจากจุด Min–Max ให้ตรวจและแก้ไขยอด "สั่งจริง" แล้วกดยืนยันเพื่อสร้างไฟล์ CSV' + (this.state.viewOnly ? ' <span class="text-danger">(โหมดอ่านอย่างเดียว)</span>' : '') + '</p></div></div>' +
      '<div class="toolbar">' +
      '<label class="field-label" style="margin-right:6px">สาขา</label>' +
      '<select class="input" id="recBranch" style="max-width:200px">' + branches.map(function (b) { return '<option value="' + UI.esc(b) + '">' + UI.esc(b) + '</option>'; }).join('') + '</select>' +
      '<label class="field-label" style="margin-right:6px">ค้นหาซัพพลายเออร์</label>' +
      '<select class="input" id="recSupplier" style="max-width:220px"><option value="">ทั้งหมด</option>' + supOpts + '</select>' +
      '<label class="field-label" style="margin-right:6px">ค้นหาหมวดหมู่สินค้า</label>' +
      '<select class="input" id="recCategory" style="max-width:180px"><option value="">ทั้งหมด</option>' + catOpts + '</select>' +
      '</div>' +
      '<div class="card"><div class="card-body">' +
      '<div class="rec-summary" id="recSummary"></div>' +
      '<div class="table-wrap"><table class="table rec-table" id="recTable"><thead><tr>' +
      '<th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>หมวด</th><th class="num">คงเหลือ</th><th class="num">กำลังเข้า</th><th class="num">ขาย/วัน</th>' +
      '<th class="num">Min</th><th class="num">Max</th><th class="num">แนะนำ</th><th class="num">สั่งจริง</th><th class="num">หน่วย</th>' +
      '<th class="num">ราคาซื้อ</th><th class="num">มูลค่า</th><th class="num">DOH หลัง</th><th>สถานะ</th>' +
      '</tr></thead><tbody></tbody></table></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-head"><h2>' + UI.icon('file', 'ic-inline') + ' ประวัติคำสั่งซื้อ (PR)</h2></div><div class="card-body" id="prHistory"></div></div>' +
      '<div class="sticky-action" id="recAction"></div>';

    var self = this;
    UI.qs('#recBranch').addEventListener('change', function (e) {
      self.state.branch = e.target.value;
      self.state.qtyMap = {};
      self.renderRows();
    });
    UI.qs('#recSupplier').addEventListener('change', function (e) {
      self.state.supplier = e.target.value;
      self.renderRows();
    });
    UI.qs('#recCategory').addEventListener('change', function (e) {
      self.state.category = e.target.value;
      self.renderRows();
    });
    UI.on('#recTable', 'input', function (e) {
      var t = e.target;
      if (t.classList.contains('qty-input')) {
        var code = t.dataset.code;
        var v = parseInt(t.value, 10);
        self.state.qtyMap[code] = isNaN(v) || v < 0 ? 0 : v;
        self.updateRow(code);
        self.updateSummary();
      }
    });

    this.renderRows();
    renderPrHistory();
    this.renderAction();
  },

  renderRows: function () {
    var self = this;
    var rows = this.state.allRows.filter(function (r) {
      if (self.state.supplier && (r.supplierName || 'ซัพพลายเออร์อื่น') !== self.state.supplier) return false;
      if (self.state.category && (r.category || 'อื่นๆ') !== self.state.category) return false;
      return true;
    });
    this.state.rows = rows;
    var tbody = UI.qs('#recTable tbody');
    if (!tbody) return;
    if (!this.state.allRows.length) {
      UI.emptyState(tbody.parentNode, 'ไม่มีข้อมูลสต๊อกสำหรับสาขานี้');
      return;
    }
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="15" class="muted">ไม่พบรายการที่ตรงกับเงื่อนไขค้นหา (ลองล้างช่องค้นหา)</td></tr>';
      this.updateSummary();
      return;
    }
    var html = rows.map(function (r) {
      return self.rowHTML(r);
    }).join('');
    tbody.innerHTML = html;
    this.updateSummary();
  },

  rowHTML: function (r) {
    var qty = (this.state.qtyMap[r.code] !== undefined ? this.state.qtyMap[r.code] : r.recommend);
    var amount = qty * r.cost;
    var dohAfter = r.daily > 0 ? (r.stock + r.incoming + qty) / r.daily : null;
    var status = '';
    if (qty > 0) status = UI.badge('ต้องสั่งซื้อ', 'danger');
    else if (r.recommend <= 0 && r.stock >= r.max) status = UI.badge('สต๊อกเกิน', 'success');
    else if (r.recommend <= 0) status = UI.badge('เพียงพอ', 'gray');
    var inputHtml = this.state.viewOnly
      ? '<span class="num qty-display">' + UI.fmtNum(qty) + '</span>'
      : '<input type="number" class="input qty-input" data-code="' + UI.esc(r.code) + '" min="0" step="' + (r.pack || 1) + '" value="' + qty + '">';
    return '<tr data-code="' + UI.esc(r.code) + '"' + (qty > 0 ? ' class="row-warn"' : '') + '>' +
      '<td class="mono">' + UI.esc(r.code) + '</td>' +
      '<td><div class="p-name">' + UI.esc(r.name) + '</div></td>' +
      '<td>' + UI.esc(r.category) + '</td>' +
      '<td class="num">' + UI.fmtNum(r.stock) + '</td>' +
      '<td class="num">' + UI.fmtNum(r.incoming) + '</td>' +
      '<td class="num">' + UI.fmtNum(r.daily, 1) + '</td>' +
      '<td class="num">' + UI.fmtNum(r.min) + '</td>' +
      '<td class="num">' + UI.fmtNum(r.max) + '</td>' +
      '<td class="num">' + UI.fmtNum(r.recommend) + '</td>' +
      '<td class="num">' + inputHtml + '</td>' +
      '<td>' + UI.esc(r.unit || '-') + '</td>' +
      '<td class="num">' + UI.fmtNum(r.cost, 2) + '</td>' +
      '<td class="num money-cell" data-amount="' + r.code + '">' + UI.fmtNum(amount) + '</td>' +
      '<td class="num">' + (dohAfter === null ? '-' : UI.fmtNum(dohAfter, 1)) + '</td>' +
      '<td>' + status + '</td>' +
      '</tr>';
  },

  updateRow: function (code) {
    var self = this;
    var tbody = UI.qs('#recTable tbody');
    var rows = this.state.allRows;
    var row = rows.find(function (r) { return r.code === code; });
    if (!row) return;
    var qty = this.state.qtyMap[code] || 0;
    var tr = tbody.querySelector('tr[data-code="' + code + '"]');
    if (!tr) return;
    tr.classList.toggle('row-warn', qty > 0);
    var dohAfter = row.daily > 0 ? (row.stock + row.incoming + qty) / row.daily : null;
    tr.querySelector('[data-amount="' + code + '"]').textContent = UI.fmtNum(qty * row.cost);
    var tds = tr.querySelectorAll('td');
    tds[tds.length - 2].textContent = dohAfter === null ? '-' : UI.fmtNum(dohAfter, 1);
    tds[tds.length - 1].innerHTML = qty > 0 ? UI.badge('ต้องสั่งซื้อ', 'danger') : (row.recommend <= 0 ? UI.badge('เพียงพอ', 'gray') : UI.badge('ยังไม่สั่ง', 'warning'));
  },

  updateSummary: function () {
    var box = UI.qs('#recSummary');
    if (!box) return;
    var totalQty = 0, totalAmt = 0, count = 0;
    var rows = this.state.rows || this.state.allRows || [];
    rows.forEach(function (r) {
      var q = (this.state.qtyMap[r.code] !== undefined ? this.state.qtyMap[r.code] : r.recommend);
      if (q > 0) { count++; totalQty += q; totalAmt += q * r.cost; }
    }, this);
    var need = rows.filter(function (r) { return r.recommend > 0; }).length;
    var belowMin = rows.filter(function (r) { return r.stock < r.min; }).length;
    box.innerHTML =
      '<div class="sum-item"><div class="sum-label">SKU ที่แนะนำสั่ง</div><div class="sum-value">' + UI.fmtNum(need) + '</div></div>' +
      '<div class="sum-item"><div class="sum-label">รายการต่ำกว่า Min</div><div class="sum-value">' + UI.fmtNum(belowMin) + '</div></div>' +
      '<div class="sum-item"><div class="sum-label">ยอดสั่งจริง (รายการ)</div><div class="sum-value">' + UI.fmtNum(count) + '</div></div>' +
      '<div class="sum-item"><div class="sum-label">รวมจำนวน</div><div class="sum-value">' + UI.fmtNum(totalQty) + '</div></div>' +
      '<div class="sum-item sum-highlight"><div class="sum-label">รวมมูลค่า</div><div class="sum-value">' + UI.money(totalAmt) + '</div></div>';
  },

  renderAction: function () {
    var box = UI.qs('#recAction');
    if (!box) return;
    var self = this;
    box.innerHTML = '<div class="action-bar"><span class="muted" id="actionInfo">กดยืนยันเพื่อสร้าง PR และดาวน์โหลด CSV สำหรับ BPlus</span>' +
      '<button type="button" class="btn btn-primary btn-lg" id="btnConfirmPR" ' + (this.state.viewOnly ? 'disabled' : '') + '>' + UI.icon('check', 'ic-inline') + ' ยืนยัน · สร้าง CSV (BPlus)</button></div>';
    UI.on('#btnConfirmPR', 'click', function (e) {
      self.confirmPR(e.currentTarget);
    });
  },

  confirmPR: function (btn) {
    var self = this;
    var settings = DB.getSettings();
    var rows = this.state.allRows;
    var ordered = [];
    rows.forEach(function (r) {
      var q = (self.state.qtyMap[r.code] !== undefined ? self.state.qtyMap[r.code] : r.recommend);
      if (q > 0) {
        ordered.push({
          code: r.code, name: r.name, category: r.category, unit: r.unit,
          qty: q, price: r.cost, amount: q * r.cost,
          supplier: r.supplierName || 'ซัพพลายเออร์อื่น'
        });
      }
    });
    if (!ordered.length) { UI.toast('กรุณาระบุยอดสั่งจริงอย่างน้อย 1 รายการ', 'error'); return; }

    var suppliers = {};
    ordered.forEach(function (it) { suppliers[it.supplier] = true; });
    var totalAll = ordered.reduce(function (s, it) { return s + it.amount; }, 0);

    UI.confirmDialog({
      title: 'ยืนยันคำสั่งซื้อ',
      message: 'สร้างคำสั่งซื้อ ' + ordered.length + ' รายการ รวมมูลค่า ' + UI.money(totalAll) + ' แยก ' + Object.keys(suppliers).length + ' ซัพพลายเออร์ และเตรียมไฟล์ CSV เพื่อนำเข้า BPlus ต้องการดำเนินการต่อหรือไม่?'
    }).then(function (ok) {
      if (!ok) return;
      UI.disableBtn(btn);
      UI.loading(true);
      setTimeout(function () {
        var prs = [];
        var seq = DB.get('pr_seq', 0);
        var dateStr = DB.today().replace(/-/g, '').slice(2);
        Object.keys(suppliers).forEach(function (supplierName) {
          seq++;
          var items = ordered.filter(function (it) { return it.supplier === supplierName; });
          var total = items.reduce(function (s, it) { return s + it.amount; }, 0);
          var id = 'PR-' + dateStr + '-' + String(seq).padStart(3, '0');
          var status = total <= (settings.approverLimit || 50000) ? 'approved' : 'pending';
          prs.push({
            id: id,
            branch: self.state.branch,
            supplier: supplierName,
            date: DB.now(),
            items: items,
            total: total,
            status: status,
            createdBy: Auth.current().username,
            fileName: id + '.csv'
          });
        });
        DB.set('pr_seq', seq);
        var all = DB.all('prs');
        all.unshift.apply(all, prs);
        DB.save('prs', all);
        DB.log('ยืนยันคำสั่งซื้อ', prs.length + ' ใบ มูลค่ารวม ' + UI.money(totalAll));
        UI.loading(false);
        UI.toast('สร้างคำสั่งซื้อ ' + prs.length + ' ใบแล้ว');
        self.showCsvModal(prs);
        renderPrHistory();
        self.renderAction();
      }, 60);
    });
  },

  showCsvModal: function (prs) {
    var settings = DB.getSettings();
    var self = this;
    var m = UI.openModal({
      title: 'ยืนยันคำสั่งซื้อ · ตรวจสอบไฟล์ CSV (BPlus)',
      size: 'lg',
      body: '<div class="csv-modal-body"></div>',
      footer: ''
    });
    var body = m.bodyEl.querySelector('.csv-modal-body');
    var html = '';
    prs.forEach(function (pr) {
      var csv = buildPrCsv(pr, settings);
      var rowsText = csv.split('\r\n').length - 1;
      var statusBadge = pr.status === 'approved' ? UI.badge('ผ่านวงเงิน · อนุมัติแล้ว', 'success') : UI.badge('เกินวงเงิน · รออนุมัติ', 'warning');
      html += '<div class="pr-card">' +
        '<div class="pr-card-head"><div><div class="pr-title">' + UI.esc(pr.id) + ' · ' + UI.esc(pr.supplier) + '</div>' +
        '<div class="pr-sub">สาขา ' + UI.esc(pr.branch) + ' · ' + UI.fmtNum(pr.items.length) + ' รายการ · รวม ' + UI.money(pr.total) + '</div></div>' + statusBadge + '</div>' +
        '<div class="pr-actions">' +
        '<button type="button" class="btn btn-primary" data-dl="' + UI.esc(pr.id) + '">' + UI.icon('download', 'ic-inline') + ' ดาวน์โหลด CSV</button>' +
        '<button type="button" class="btn btn-ghost" data-prev="' + UI.esc(pr.id) + '">' + UI.icon('eye', 'ic-inline') + ' ดูตัวอย่าง</button>' +
        '</div>' +
        '<div class="pr-preview" id="prprev-' + UI.esc(pr.id) + '" hidden><pre>' + UI.esc(csv) + '</pre></div>' +
        '</div>';
    });
    html += '<div class="pr-actions" style="justify-content:flex-end">' +
      '<button type="button" class="btn btn-ghost" id="btnDlCombined">' + UI.icon('download', 'ic-inline') + ' ดาวน์โหลดรวมทุกซัพพลายเออร์</button>' +
      '<button type="button" class="btn" data-close>ปิดหน้าต่าง</button></div>';
    body.innerHTML = html;

    body.querySelectorAll('[data-dl]').forEach(function (b) {
      b.addEventListener('click', function () {
        var pr = prs.find(function (p) { return p.id === b.dataset.dl; });
        UI.downloadCSV(pr.fileName, prCsvRows(pr, settings), ',');
        UI.toast('ดาวน์โหลดไฟล์ ' + pr.fileName);
      });
    });
    body.querySelectorAll('[data-prev]').forEach(function (b) {
      b.addEventListener('click', function () {
        var prev = body.querySelector('#prprev-' + b.dataset.prev);
        if (prev) prev.hidden = !prev.hidden;
      });
    });
    var combinedBtn = body.querySelector('#btnDlCombined');
    if (combinedBtn) {
      combinedBtn.addEventListener('click', function () {
        var rows = [];
        prs.forEach(function (pr) {
          var prRows = prCsvRows(pr, settings);
          prRows.forEach(function (r, i) {
            if (i === 0) return;
            rows.push(r);
          });
        });
        var header = settings.bpColumns;
        UI.downloadCSV('PR_รวม_' + DB.today().replace(/-/g, '') + '.csv', [header].concat(rows), ',');
        UI.toast('ดาวน์โหลดไฟล์รวมแล้ว');
      });
    }
  }
};

function buildRecommendations(branch) {
  var settings = DB.getSettings();
  var stockRows = DB.getStockRows(branch);
  var suppliers = DB.all('suppliers');
  function supplierNameById(id) {
    var s = suppliers.find(function (x) { return x.id === id; });
    return s ? s.name : null;
  }
  return stockRows.map(function (r) {
    var product = DB.getProduct(r.code);
    var cost = DB.getCost(r.code);
    if (cost === null) cost = r.cost || 0;
    var daily = 0;
    if (r.w30 > 0) daily = r.w30 / 30;
    else if (r.w7 > 0) daily = r.w7 / 7;
    else if (r.y > 0) daily = r.y;
    var cat = DB.getCategory(r.category || (product ? product.category : null));
    var minDays = cat && cat.minDays ? cat.minDays : (settings.leadTimeDays + settings.safetyStockDays);
    var maxDays = cat && cat.maxDays ? cat.maxDays : (settings.leadTimeDays + settings.orderCycleDays);
    var min = Math.ceil(daily * minDays);
    var max = Math.ceil(daily * maxDays);
    if (max < min) max = min;
    var pack = (product && product.pack) || 1;
    var target = max - (r.stock + r.incoming);
    var recommend = target > 0 ? Math.ceil(target / pack) * pack : 0;
    var supplierName = product ? supplierNameById(product.supplier) : null;
    return {
      code: r.code, name: r.name || (product ? product.name : r.code),
      category: r.category || (product ? product.category : 'อื่นๆ'),
      unit: r.unit || (product ? product.unit : ''),
      branch: branch, stock: r.stock, incoming: r.incoming,
      daily: daily, min: min, max: max, recommend: recommend,
      pack: pack, cost: cost, supplierName: supplierName,
      snapshotDate: r.date || ''
    };
  });
}

function prCsvRows(pr, settings) {
  var cols = settings.bpColumns && settings.bpColumns.length ? settings.bpColumns : BPLUS_DEFAULT_COLUMNS;
  var rows = [cols.slice()];
  pr.items.forEach(function (it) {
    rows.push(cols.map(function (f) { return fieldValue(f, it, pr); }));
  });
  return rows;
}

function buildPrCsv(pr, settings) {
  return UI.toCSV(prCsvRows(pr, settings), settings.bpDelimiter || ',');
}

function fieldValue(field, item, pr) {
  var f = String(field).trim().toLowerCase().replace(/\s+/g, '');
  switch (f) {
    case 'รหัสสินค้า': case 'รหัส': case 'code': case 'itemcode': case 'sku': case 'barcode': return item.code;
    case 'ชื่อสินค้า': case 'ชื่อ': case 'name': case 'itemname': case 'productname': return item.name;
    case 'จำนวนสั่งซื้อ': case 'สั่งจริง': case 'จำนวน': case 'qty': case 'quantity': return item.qty;
    case 'ราคาซื้อ': case 'ราคา': case 'price': case 'cost': case 'unitprice': return item.price;
    case 'หน่วย': case 'หน่วยนับ': case 'unit': case 'uom': return item.unit || '';
    case 'สาขา': case 'branch': return pr.branch;
    case 'หมวดหมู่': case 'หมวด': case 'category': return item.category || '';
    default: return '';
  }
}

function renderPrHistory() {
  var box = UI.qs('#prHistory');
  if (!box) return;
  var prs = DB.all('prs');
  if (!prs.length) {
    UI.emptyState(box, 'ยังไม่มีคำสั่งซื้อ', 'ยืนยันคำสั่งซื้อเพื่อสร้าง PR');
    return;
  }
  var html = prs.slice(0, 30).map(function (pr) {
    var status = PR_STATUS[pr.status] || pr.status;
    var stType = pr.status === 'approved' ? 'success' : pr.status === 'pending' ? 'warning' : pr.status === 'rejected' ? 'danger' : 'gray';
    var canDelete = (Auth.current().role === 'admin' || Auth.current().role === 'buyer') && pr.status !== 'approved';
    return '<div class="pr-row">' +
      '<div class="pr-info"><div class="pr-title">' + UI.esc(pr.id) + ' · ' + UI.esc(pr.supplier) + '</div>' +
      '<div class="pr-sub">' + UI.esc(pr.date) + ' · สาขา ' + UI.esc(pr.branch) + ' · ' + UI.fmtNum(pr.items.length) + ' รายการ · ' + UI.money(pr.total) + ' · โดย ' + UI.esc(pr.createdBy || '-') + '</div></div>' +
      UI.badge(status, stType) +
      '<div class="pr-btns">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-re-dl="' + UI.esc(pr.id) + '">' + UI.icon('download', 'ic-inline') + ' CSV</button>' +
      (canDelete ? '<button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" data-del-pr="' + UI.esc(pr.id) + '">' + UI.icon('trash', 'ic-inline') + '</button>' : '') +
      '</div></div>';
  }).join('');
  box.innerHTML = html;

  UI.qsa('[data-re-dl]', box).forEach(function (b) {
    b.addEventListener('click', function () {
      var pr = DB.all('prs').find(function (p) { return p.id === b.dataset.reDl; });
      if (!pr) return;
      UI.downloadCSV(pr.fileName, prCsvRows(pr, DB.getSettings()), ',');
      UI.toast('ดาวน์โหลดไฟล์ ' + pr.fileName);
    });
  });
  UI.qsa('[data-del-pr]', box).forEach(function (b) {
    b.addEventListener('click', function () {
      var pr = DB.all('prs').find(function (p) { return p.id === b.dataset.delPr; });
      if (!pr) return;
      UI.confirmDialog({
        title: 'ลบคำสั่งซื้อ',
        message: 'ต้องการลบ PR ' + pr.id + ' (' + pr.supplier + ') ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
        danger: true,
        confirmText: 'ลบ'
      }).then(function (ok) {
        if (!ok) return;
        var all = DB.all('prs').filter(function (p) { return p.id !== pr.id; });
        DB.save('prs', all);
        DB.log('ลบคำสั่งซื้อ', pr.id + ' ' + pr.supplier);
        UI.toast('ลบคำสั่งซื้อ ' + pr.id + ' แล้ว');
        renderPrHistory();
      });
    });
  });
}
