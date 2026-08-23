var PricingPage = {
  state: null,

  render: function (container) {
    var self = this;
    var role = Auth.current().role;
    this.state = {
      container: container,
      priceMap: {},
      viewOnly: role === 'viewer',
      category: '',
      query: ''
    };

    var items = this.buildItems();
    this.state.items = items;

    container.innerHTML =
      '<div class="page-head"><div><h1>' + UI.esc(PAGE_TITLES.pricing) + '</h1>' +
      '<p>คำนวณราคาขายจากต้นทุน + GP มาตรฐานรายหมวด แก้ไขราคาได้ก่อนเผยแพร่ และดู GP จริงที่ได้' + (this.state.viewOnly ? ' <span class="text-danger">(โหมดอ่านอย่างเดียว)</span>' : '') + '</p></div></div>' +
      '<div class="toolbar" id="priceToolbar"></div>' +
      '<div class="card"><div class="card-body">' +
      '<div class="table-wrap"><table class="table pricing-table" id="priceTable"><thead><tr>' +
      '<th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>หมวด</th><th class="num">GP หมวด</th><th class="num">ต้นทุน</th>' +
      '<th class="num">ราคาขาย</th><th class="num">GP จริง</th><th class="num">ราคาเผยแพร่</th><th>สถานะ</th>' +
      '</tr></thead><tbody></tbody></table></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-head"><h2>' + UI.icon('file', 'ic-inline') + ' ประวัติการเผยแพร่ราคา</h2></div><div class="card-body" id="priceBatchHistory"></div></div>';

    this.renderToolbar();
    this.renderRows();
    renderPriceBatchHistory();

    UI.on('#priceTable', 'input', function (e) {
      var t = e.target;
      if (t.classList.contains('price-input')) {
        var code = t.dataset.code;
        var v = parseFloat(t.value);
        self.state.priceMap[code] = { price: isNaN(v) || v < 0 ? 0 : v };
        self.updateRow(code);
      }
    });
  },

  buildItems: function () {
    var settings = DB.getSettings();
    var products = DB.all('products');
    var stockRows = DB.getStockRows();
    var items = [];
    products.forEach(function (p) {
      var cost = DB.getCost(p.code);
      if (cost === null || cost === undefined) {
        var sr = stockRows.find(function (r) { return r.code === p.code; });
        if (sr && sr.cost) cost = sr.cost;
      }
      var gp = DB.categoryGP(p.category);
      var coin = settings.roundingCoin || 1;
      var base = cost > 0 ? roundUpPrice(cost, gp, coin) : 0;
      var active = DB.getActivePrice(p.code);
      items.push({
        code: p.code, name: p.name, category: p.category, gp: gp, cost: cost || 0,
        basePrice: base, activePrice: active ? active.price : null, activeGp: active ? active.gp : null
      });
    });
    return items;
  },

  renderToolbar: function () {
    var box = UI.qs('#priceToolbar');
    if (!box) return;
    var self = this;
    var coin = DB.getSettings().roundingCoin || 1;
    var catSeen = {};
    this.state.items.forEach(function (it) { catSeen[it.category] = true; });
    var catOpts = Object.keys(catSeen).sort().map(function (n) { return '<option value="' + UI.esc(n) + '">' + UI.esc(n) + '</option>'; }).join('');
    box.innerHTML =
      '<label class="field-label" style="margin-right:6px">ค้นหาหมวดหมู่</label>' +
      '<select class="input" id="priceCategory" style="max-width:180px"><option value="">ทั้งหมด</option>' + catOpts + '</select>' +
      '<label class="field-label" style="margin-left:10px;margin-right:6px">ค้นหารหัสสินค้า</label>' +
      '<input type="text" class="input" id="priceSearch" style="max-width:180px" placeholder="พิมพ์รหัสสินค้า...">' +
      '<span class="spacer"></span>' +
      '<span class="muted">ปัดเศษราคา: ' + UI.esc(String(coin)) + ' บาท</span>' +
      '<button type="button" class="btn btn-ghost" id="btnRecalc" ' + (this.state.viewOnly ? 'disabled' : '') + '>' + UI.icon('refresh', 'ic-inline') + ' คำนวณใหม่จาก GP หมวด</button>' +
      '<button type="button" class="btn btn-primary" id="btnPublish" ' + (this.state.viewOnly ? 'disabled' : '') + '>' + UI.icon('check', 'ic-inline') + (Auth.current().role === 'admin' ? ' เผยแพร่ราคาทันที' : ' ส่งเผยแพร่ราคา (ขออนุมัติ)') + '</button>';
    UI.on('#btnRecalc', 'click', function () {
      self.state.priceMap = {};
      self.renderRows();
    });
    UI.on('#btnPublish', 'click', function (e) {
      self.publish(e.currentTarget);
    });
    UI.on('#priceCategory', 'change', function (e) {
      self.state.category = e.target.value;
      self.renderRows();
    });
    UI.on('#priceSearch', 'input', function (e) {
      self.state.query = e.target.value.trim();
      self.renderRows();
    });
  },

  rowHTML: function (it) {
    var mapVal = this.state.priceMap[it.code];
    var price = mapVal !== undefined ? mapVal.price : it.basePrice;
    var gpReal = price > 0 && it.cost > 0 ? ((price - it.cost) / price) * 100 : null;
    var status = '';
    var diff = '';
    if (it.activePrice !== null && it.activePrice !== undefined) {
      var d = price - it.activePrice;
      if (Math.abs(d) < 0.001) {
        status = UI.badge('เท่าเดิม', 'gray');
      } else {
        status = UI.badge(d > 0 ? 'ราคาเพิ่ม' : 'ราคาลด', d > 0 ? 'danger' : 'success');
        diff = '<span class="diff ' + (d > 0 ? 'up' : 'down') + '">(' + (d > 0 ? '+' : '') + UI.fmtNum(d) + ')</span>';
      }
    } else if (it.cost > 0) {
      status = UI.badge('ราคาใหม่', 'info');
    }
    var editable = this.state.viewOnly
      ? '<span class="num">' + UI.fmtNum(price, 2) + '</span>'
      : '<input type="number" class="input price-input" data-code="' + UI.esc(it.code) + '" min="0" step="0.25" value="' + price + '">';
    var gpRealHtml = gpReal === null ? '<span class="muted">-</span>' : '<span class="gp-real ' + (gpReal < it.gp ? 'is-low' : '') + '">' + UI.fmtPct(gpReal) + '</span>';
    return '<tr>' +
      '<td class="mono">' + UI.esc(it.code) + '</td>' +
      '<td><div class="p-name">' + UI.esc(it.name) + '</div></td>' +
      '<td>' + UI.esc(it.category) + '</td>' +
      '<td class="num">' + UI.fmtPct(it.gp) + '</td>' +
      '<td class="num">' + UI.fmtNum(it.cost, 2) + '</td>' +
      '<td class="num">' + editable + '</td>' +
      '<td class="num" data-gp="' + it.code + '">' + gpRealHtml + '</td>' +
      '<td class="num">' + (it.activePrice !== null ? UI.fmtNum(it.activePrice, 2) + diff : '<span class="muted">ยังไม่เผยแพร่</span>') + '</td>' +
      '<td>' + status + '</td>' +
      '</tr>';
  },

  renderRows: function () {
    var self = this;
    var tbody = UI.qs('#priceTable tbody');
    if (!tbody) return;
    var items = this.state.items;
    if (!items.length) {
      UI.emptyState(tbody.parentNode, 'ไม่มีข้อมูลสินค้า', 'เพิ่มสินค้าในตั้งค่าระบบก่อนใช้งาน');
      return;
    }
    var filtered = items.filter(function (it) {
      if (self.state.category && it.category !== self.state.category) return false;
      if (self.state.query && it.code.toLowerCase().indexOf(self.state.query.toLowerCase()) === -1) return false;
      return true;
    });
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="muted">ไม่พบรายการที่ตรงกับเงื่อนไขค้นหา (ลองล้างช่องค้นหา)</td></tr>';
      return;
    }
    var html = filtered.map(function (it) { return self.rowHTML(it); }).join('');
    tbody.innerHTML = html;
  },

  updateRow: function (code) {
    var self = this;
    var it = this.state.items.find(function (x) { return x.code === code; });
    if (!it) return;
    var mapVal = this.state.priceMap[code];
    var price = mapVal !== undefined ? mapVal.price : it.basePrice;
    var gpReal = price > 0 && it.cost > 0 ? ((price - it.cost) / price) * 100 : null;
    var cell = UI.qs('#priceTable [data-gp="' + code + '"]');
    if (cell) {
      cell.innerHTML = gpReal === null ? '<span class="muted">-</span>' : '<span class="gp-real ' + (gpReal < it.gp ? 'is-low' : '') + '">' + UI.fmtPct(gpReal) + '</span>';
    }
  },

  publish: function (btn) {
    var self = this;
    var items = this.state.items;
    var changes = [];
    items.forEach(function (it) {
      var mapVal = self.state.priceMap[it.code];
      var price = mapVal !== undefined ? mapVal.price : it.basePrice;
      if (it.cost <= 0 || price <= 0) return;
      var gpReal = ((price - it.cost) / price) * 100;
      var isNew = it.activePrice === null || it.activePrice === undefined;
      var changed = isNew || Math.abs(price - it.activePrice) >= 0.001;
      if (changed) {
        changes.push({ code: it.code, name: it.name, category: it.category, cost: it.cost, price: price, gp: gpReal, oldPrice: it.activePrice, basePrice: it.basePrice });
      }
    });
    if (!changes.length) { UI.toast('ไม่พบรายการราคาที่มีการเปลี่ยนแปลง', 'info'); return; }
    var totalItems = changes.length;
    var isAdmin = Auth.current().role === 'admin';
    UI.confirmDialog({
      title: isAdmin ? 'ยืนยันการเผยแพร่ราคา' : 'ยืนยันการส่งขออนุมัติราคา',
      message: 'ราคาที่จะ' + (isAdmin ? 'เผยแพร่' : 'ขออนุมัติ') + ' ' + UI.fmtNum(totalItems) + ' รายการ' + (isAdmin ? '' : ' และรอการอนุมัติจากผู้อนุมัติ') + ' ต้องการดำเนินการต่อหรือไม่?'
    }).then(function (ok) {
      if (!ok) return;
      UI.disableBtn(btn);
      UI.loading(true);
      setTimeout(function () {
        if (isAdmin) {
          DB.publishPrices(changes, null);
          DB.log('เผยแพร่ราคา', totalItems + ' รายการ');
          UI.toast('เผยแพร่ราคา ' + totalItems + ' รายการแล้ว');
        } else {
          var seq = DB.get('pb_seq', 0) + 1;
          DB.set('pb_seq', seq);
          var batch = {
            id: 'PB-' + DB.today().replace(/-/g, '').slice(2) + '-' + String(seq).padStart(3, '0'),
            date: DB.now(),
            createdBy: Auth.current().username,
            items: changes,
            totalItems: changes.length,
            status: 'pending',
            approvedBy: null,
            approvedAt: null,
            reason: ''
          };
          var batches = DB.all('price_batches');
          batches.unshift(batch);
          DB.save('price_batches', batches);
          DB.log('ส่งขออนุมัติราคา', batch.id + ' จำนวน ' + totalItems + ' รายการ');
          UI.toast('ส่งขออนุมัติราคา ' + batch.id + ' แล้ว');
        }
        UI.loading(false);
        self.render(self.state.container);
      }, 60);
    });
  }
};

function roundUpPrice(cost, gp, coin) {
  var raw = cost / (1 - gp / 100);
  return Math.ceil(raw / coin) * coin;
}

function renderPriceBatchHistory() {
  var box = UI.qs('#priceBatchHistory');
  if (!box) return;
  var batches = DB.all('price_batches');
  if (!batches.length) {
    UI.emptyState(box, 'ยังไม่มีการเผยแพร่ราคา', 'ส่งเผยแพร่ราคาจากหน้าการตั้งราคา');
    return;
  }
  var html = batches.slice(0, 30).map(function (b) {
    var stType = b.status === 'approved' ? 'success' : b.status === 'pending' ? 'warning' : 'danger';
    var extra = '';
    if (b.status === 'approved') extra = ' · โดย ' + UI.esc(b.approvedBy || '-') + ' ' + UI.esc(b.approvedAt || '');
    if (b.status === 'rejected') extra = ' · โดย ' + UI.esc(b.approvedBy || '-') + (b.reason ? ' (' + UI.esc(b.reason) + ')' : '');
    return '<div class="pr-row">' +
      '<div class="pr-info"><div class="pr-title">' + UI.esc(b.id) + ' · จำนวน ' + UI.fmtNum(b.totalItems) + ' รายการ</div>' +
      '<div class="pr-sub">' + UI.esc(b.date) + ' · โดย ' + UI.esc(b.createdBy) + extra + '</div></div>' +
      UI.badge(PRICE_BATCH_STATUS[b.status] || b.status, stType) + '</div>';
  }).join('');
  box.innerHTML = html;
}
