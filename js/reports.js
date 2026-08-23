var ReportsPage = {
  state: { tab: 'top', branch: '' },

  render: function (container) {
    var self = this;
    var branches = ['ทั้งหมด'].concat(DB.stockBranches());
    this.state.container = container;

    container.innerHTML =
      '<div class="page-head"><div><h1>' + UI.esc(PAGE_TITLES.reports) + '</h1><p>รายงานบริหารสต๊อกสำหรับการตัดสินใจ: สินค้าขายดี สินค้าใกล้หมด สินค้าค้างสต๊อก และมูลค่าสต๊อก</p></div></div>' +
      '<div class="toolbar">' +
      '<label class="field-label" style="margin-right:6px">สาขา</label>' +
      '<select class="input" id="repBranch" style="max-width:200px">' + branches.map(function (b) { return '<option value="' + UI.esc(b) + '"' + (b === self.state.branch ? ' selected' : '') + '>' + UI.esc(b) + '</option>'; }).join('') + '</select>' +
      '<span class="spacer"></span>' +
      '<div class="tabs" id="repTabs">' +
      '<button type="button" class="tab" data-tab="top">' + UI.icon('chart', 'ic-inline') + ' ขายดี</button>' +
      '<button type="button" class="tab" data-tab="low">' + UI.icon('alert', 'ic-inline') + ' ใกล้หมด</button>' +
      '<button type="button" class="tab" data-tab="dead">' + UI.icon('box', 'ic-inline') + ' ค้างสต๊อก</button>' +
      '<button type="button" class="tab" data-tab="value">' + UI.icon('wallet', 'ic-inline') + ' มูลค่าสต๊อก</button>' +
      '</div></div>' +
      '<div id="repContent"></div>';

    UI.qs('#repBranch').addEventListener('change', function (e) {
      self.state.branch = e.target.value;
      self.renderTab();
    });
    UI.on('#repTabs', 'click', function (e) {
      var b = e.target.closest('.tab');
      if (!b) return;
      self.state.tab = b.dataset.tab;
      UI.qsa('.tab', UI.qs('#repTabs')).forEach(function (t) { t.classList.toggle('active', t === b); });
      self.renderTab();
    });
    this.renderTab();
  },

  data: function () {
    var branch = this.state.branch || '';
    var rows = DB.getStockRows(!branch || branch === 'ทั้งหมด' ? null : branch);
    var map = {};
    var settings = DB.getSettings();
    rows.forEach(function (r) {
      if (!map[r.code]) {
        map[r.code] = { code: r.code, name: r.name, category: r.category, unit: r.unit, stock: 0, incoming: 0, y: 0, w7: 0, w30: 0, cost: 0, branch: branch };
      }
      var m = map[r.code];
      m.stock += r.stock; m.incoming += r.incoming; m.y += r.y; m.w7 += r.w7; m.w30 += r.w30;
      if (r.cost) m.cost = r.cost;
    });
    var list = Object.keys(map).map(function (k) { return map[k]; });
    list.forEach(function (it) {
      var product = DB.getProduct(it.code);
      var cost = DB.getCost(it.code);
      if (cost === null || cost === undefined) cost = it.cost || 0;
      it.cost = cost;
      it.daily = it.w30 > 0 ? it.w30 / 30 : (it.w7 > 0 ? it.w7 / 7 : (it.y > 0 ? it.y : 0));
      it.value = it.stock * cost;
      var cat = DB.getCategory(it.category || (product ? product.category : null));
      var minDays = cat && cat.minDays ? cat.minDays : (settings.leadTimeDays + settings.safetyStockDays);
      var maxDays = cat && cat.maxDays ? cat.maxDays : (settings.leadTimeDays + settings.orderCycleDays);
      it.min = Math.ceil(it.daily * minDays);
      it.max = Math.ceil(it.daily * maxDays);
      if (it.max < it.min) it.max = it.min;
      it.doh = it.daily > 0 ? it.stock / it.daily : null;
    });
    return list;
  },

  renderTab: function () {
    var content = UI.qs('#repContent');
    if (!content) return;
    var self = this;
    var list = this.data();
    var settings = DB.getSettings();

    if (this.state.tab === 'top') {
      var top = list.slice().sort(function (a, b) { return b.w30 - a.w30; }).slice(0, 20);
      var topCharts = top.slice(0, 10).map(function (it) { return { label: it.code + ' ' + it.name, value: it.w30 }; });
      content.innerHTML = '<div class="grid-2">' +
        '<div class="card"><div class="card-head"><h2>' + UI.icon('chart', 'ic-inline') + ' สินค้าขายดี (ยอดขาย 30 วัน)</h2></div><div class="card-body"><div id="topChart"></div></div></div>' +
        '<div class="card"><div class="card-head"><h2>' + UI.icon('file', 'ic-inline') + ' ตารางขายดี</h2>' + exportBtn('btnExpTop', 'top.csv') + '</div><div class="card-body" id="topTable"></div></div></div>';
      Charts.bars(UI.qs('#topChart'), topCharts, {});
      var rows = top.map(function (it, i) {
        return '<tr><td>' + (i + 1) + '</td><td class="mono">' + UI.esc(it.code) + '</td><td>' + UI.esc(it.name) + '</td><td>' + UI.esc(it.category) + '</td><td class="num">' + UI.fmtNum(it.w30) + '</td><td class="num">' + UI.fmtNum(it.daily, 1) + '</td></tr>';
      }).join('');
      UI.qs('#topTable').innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>รหัส</th><th>สินค้า</th><th>หมวด</th><th class="num">ขาย30วัน</th><th class="num">ขาย/วัน</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      wireExport('#btnExpTop', 'reports_top_sellers', [
        ['#', 'รหัสสินค้า', 'ชื่อสินค้า', 'หมวดหมู่', 'ขาย30วัน', 'ขาย/วัน']
      ].concat(top.map(function (it, i) { return [i + 1, it.code, it.name, it.category, it.w30, it.daily.toFixed(1)]; })));
    }

    if (this.state.tab === 'low') {
      var lowThreshold = settings.lowStockDOH || 7;
      var low = list.filter(function (it) {
        return (it.daily > 0 && it.stock <= it.min) || (it.daily > 0 && it.doh <= lowThreshold);
      });
      content.innerHTML = '<div class="card"><div class="card-head"><h2>' + UI.icon('alert', 'ic-inline') + ' สินค้าใกล้หมด / ต่ำกว่าจุดสั่งซื้อ</h2>' +
        '<span class="muted">เกณฑ์ DOH ≤ ' + UI.fmtNum(lowThreshold) + ' วัน หรือ คงเหลือ ≤ Min</span>' + exportBtn('btnExpLow', 'low.csv') + '</div><div class="card-body">' + tableFor(low, 'low') + '</div></div>';
      wireExport('#btnExpLow', 'reports_low_stock', [
        ['รหัสสินค้า', 'ชื่อสินค้า', 'หมวดหมู่', 'คงเหลือ', 'กำลังเข้า', 'ขาย/วัน', 'Min', 'Max', 'DOH']
      ].concat(low.map(function (it) { return [it.code, it.name, it.category, it.stock, it.incoming, it.daily.toFixed(2), it.min, it.max, it.doh === null ? '' : it.doh.toFixed(1)]; })));
    }

    if (this.state.tab === 'dead') {
      var dead = list.filter(function (it) { return it.w30 === 0 && it.stock > 0; });
      var over = list.filter(function (it) { return it.max > 0 && it.stock > it.max && it.w30 > 0; });
      content.innerHTML = '<div class="grid-2">' +
        '<div class="card"><div class="card-head"><h2>' + UI.icon('box', 'ic-inline') + ' สินค้าค้างสต๊อก (ไม่ขาย 30 วัน)</h2>' + exportBtn('btnExpDead', 'dead.csv') + '</div><div class="card-body">' + tableFor(dead, 'dead') + '</div></div>' +
        '<div class="card"><div class="card-head"><h2>' + UI.icon('box', 'ic-inline') + ' สินค้าสต๊อกเกิน Max</h2>' + exportBtn('btnExpOver', 'over.csv') + '</div><div class="card-body">' + tableFor(over, 'over') + '</div></div></div>';
      wireExport('#btnExpDead', 'reports_dead_stock', [
        ['รหัสสินค้า', 'ชื่อสินค้า', 'หมวดหมู่', 'คงเหลือ', 'มูลค่า']
      ].concat(dead.map(function (it) { return [it.code, it.name, it.category, it.stock, it.value.toFixed(2)]; })));
      wireExport('#btnExpOver', 'reports_overstock', [
        ['รหัสสินค้า', 'ชื่อสินค้า', 'หมวดหมู่', 'คงเหลือ', 'Max', 'เกิน', 'มูลค่า']
      ].concat(over.map(function (it) { return [it.code, it.name, it.category, it.stock, it.max, it.stock - it.max, it.value.toFixed(2)]; })));
    }

    if (this.state.tab === 'value') {
      var byCat = {};
      var totalVal = 0;
      list.forEach(function (it) {
        if (!byCat[it.category]) byCat[it.category] = 0;
        byCat[it.category] += it.value;
        totalVal += it.value;
      });
      var catArr = Object.keys(byCat).map(function (k) { return { label: k, value: byCat[k] }; }).sort(function (a, b) { return b.value - a.value; });
      var byBranch = {};
      DB.getStockRows(!this.state.branch || this.state.branch === 'ทั้งหมด' ? null : this.state.branch).forEach(function (r) {
        var cost = DB.getCost(r.code);
        if (cost === null || cost === undefined) cost = r.cost || 0;
        if (!byBranch[r.branch]) byBranch[r.branch] = 0;
        byBranch[r.branch] += r.stock * cost;
      });
      var branchArr = Object.keys(byBranch).map(function (k) { return { label: k, value: byBranch[k] }; });
      content.innerHTML = '<div class="grid-2">' +
        '<div class="card"><div class="card-head"><h2>' + UI.icon('wallet', 'ic-inline') + ' มูลค่าสต๊อกตามหมวด</h2></div><div class="card-body"><div id="valDonut"></div></div></div>' +
        '<div class="card"><div class="card-head"><h2>' + UI.icon('file', 'ic-inline') + ' รายละเอียด</h2>' + exportBtn('btnExpVal', 'value.csv') + '</div><div class="card-body">' +
        '<div class="sum-item sum-highlight"><div class="sum-label">มูลค่าสต๊อกทั้งหมด</div><div class="sum-value">' + UI.money(totalVal) + '</div></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>หมวดหมู่</th><th class="num">มูลค่า</th></tr></thead><tbody>' +
        catArr.map(function (c) { return '<tr><td>' + UI.esc(c.label) + '</td><td class="num">' + UI.money(c.value) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div></div></div>';
      Charts.donut(UI.qs('#valDonut'), catArr, { center: UI.money(totalVal, 0) });
      wireExport('#btnExpVal', 'reports_stock_value', [
        ['หมวดหมู่', 'มูลค่า']
      ].concat(catArr.map(function (c) { return [c.label, c.value.toFixed(2)]; })));
    }
  }
};

function tableFor(list, kind) {
  if (!list.length) return '<div class="empty-state"><div class="empty-ic">' + UI.icon('check') + '</div><div class="empty-title">ไม่พบรายการในหมวดนี้</div></div>';
  var head = '<thead><tr><th>รหัส</th><th>สินค้า</th><th>หมวด</th><th class="num">คงเหลือ</th><th class="num">กำลังเข้า</th><th class="num">ขาย/วัน</th>' +
    (kind === 'low' ? '<th class="num">Min</th><th class="num">Max</th><th class="num">DOH</th>' : '') +
    (kind === 'dead' ? '<th class="num">มูลค่า</th>' : '') +
    (kind === 'over' ? '<th class="num">Max</th><th class="num">เกิน</th><th class="num">มูลค่า</th>' : '') +
    '</tr></thead>';
  var body = list.map(function (it) {
    var st = it.stock <= it.min ? '<span class="badge badge-danger">ต่ำกว่า Min</span>' : '<span class="badge badge-warning">ใกล้หมด</span>';
    return '<tr><td class="mono">' + UI.esc(it.code) + '</td><td>' + UI.esc(it.name) + '</td><td>' + UI.esc(it.category) + '</td><td class="num">' + UI.fmtNum(it.stock) + '</td><td class="num">' + UI.fmtNum(it.incoming) + '</td><td class="num">' + UI.fmtNum(it.daily, 1) + '</td>' +
      (kind === 'low' ? '<td class="num">' + UI.fmtNum(it.min) + '</td><td class="num">' + UI.fmtNum(it.max) + '</td><td class="num">' + (it.doh === null ? '-' : UI.fmtNum(it.doh, 1)) + '</td><td>' + st + '</td>' : '') +
      (kind === 'dead' ? '<td class="num">' + UI.money(it.value) + '</td>' : '') +
      (kind === 'over' ? '<td class="num">' + UI.fmtNum(it.max) + '</td><td class="num">' + UI.fmtNum(it.stock - it.max) + '</td><td class="num">' + UI.money(it.value) + '</td>' : '') +
      '</tr>';
  }).join('');
  return '<div class="table-wrap"><table class="table">' + head + '<tbody>' + body + '</tbody></table></div>';
}

function exportBtn(id, label) {
  return '<button type="button" class="btn btn-ghost btn-sm" id="' + id + '">' + UI.icon('download', 'ic-inline') + ' CSV</button>';
}

function wireExport(sel, filename, rows) {
  var btn = UI.qs(sel);
  if (btn) btn.addEventListener('click', function () {
    UI.downloadCSV(filename + '_' + DB.today().replace(/-/g, '') + '.csv', rows, ',');
    UI.toast('ดาวน์โหลดรายงานแล้ว');
  });
}
