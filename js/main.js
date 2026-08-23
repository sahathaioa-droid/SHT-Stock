var App = {
  current: 'dashboard',

  init: function () {
    var user = Auth.current();
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    DB.seedDemoData(false);
    if (!user.name) {
      var u = DB.all('users').find(function (x) { return x.username === user.username; });
      if (u) DB.set('session', { username: u.username, name: u.name, role: u.role });
    }
    this.buildShell();
    this.show(this.current);
  },

  buildShell: function () {
    var user = Auth.current();
    var body = document.getElementById('appShell');
    if (!body) return;

    var items = NAV.filter(function (n) { return canAccess(user.role, n.key); });
    var navHtml = items.map(function (n) {
      return '<a href="#" class="nav-item" data-nav="' + n.key + '">' + UI.icon(n.iconKey || navIcon(n.key), 'nav-ic') + '<span>' + UI.esc(n.label) + '</span>' + badgeCount(n.key) + '</a>';
    }).join('');

    body.innerHTML =
      '<div class="sidebar-overlay" id="sidebarOverlay"></div>' +
      '<aside class="sidebar" id="sidebar">' +
      '<div class="brand"><div class="brand-logo">' + UI.icon('box') + '</div><div><div class="brand-name">' + UI.esc(APP.name) + '</div><div class="brand-sub">' + UI.esc(APP.tagline) + '</div></div></div>' +
      '<nav class="nav-list">' + navHtml + '</nav>' +
      '<div class="sidebar-user">' +
      '<div class="avatar">' + UI.esc(Auth.userAvatar(user.name)) + '</div>' +
      '<div class="u-info"><div class="u-name">' + UI.esc(user.name) + '</div><div class="u-role">' + UI.esc(Auth.roleLabel(user.role)) + '</div></div>' +
      '<button type="button" class="icon-btn" id="btnLogout" title="ออกจากระบบ">' + UI.icon('logout') + '</button>' +
      '</div></aside>' +
      '<div class="main">' +
      '<header class="topbar">' +
      '<button type="button" class="icon-btn" id="btnMenu">' + UI.icon('menu') + '</button>' +
      '<h1 id="pageTitle"></h1>' +
      '<div class="topbar-right"><span class="topbar-date" id="topDate"></span>' +
      '<div class="avatar avatar-sm">' + UI.esc(Auth.userAvatar(user.name)) + '</div>' +
      '<span class="topbar-user">' + UI.esc(user.name) + '</span>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="btnLogout2">' + UI.icon('logout', 'ic-inline') + ' ออกจากระบบ</button>' +
      '</div></header>' +
      '<main class="content" id="view"></main>' +
      '</div>';

    UI.qs('#btnLogout').addEventListener('click', function () { Auth.logout(); });
    UI.qs('#btnLogout2').addEventListener('click', function () { Auth.logout(); });
    UI.qs('#btnMenu').addEventListener('click', function () { document.body.classList.add('sidebar-open'); });
    UI.qs('#sidebarOverlay').addEventListener('click', function () { document.body.classList.remove('sidebar-open'); });
    UI.qsa('.nav-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var key = el.dataset.nav;
        if (key) App.show(key);
        document.body.classList.remove('sidebar-open');
      });
    });
    var today = new Date();
    UI.qs('#topDate').textContent = today.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  },

  show: function (key) {
    var user = Auth.current();
    if (!user) return;
    if (!canAccess(user.role, key)) {
      this.render('dashboard');
      return;
    }
    this.current = key;
    var titleEl = UI.qs('#pageTitle');
    if (titleEl) titleEl.textContent = PAGE_TITLES[key] || '';
    UI.qsa('.nav-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.nav === key);
    });
    UI.loading(true);
    var self = this;
    setTimeout(function () {
      self.render(key);
      UI.loading(false);
    }, 30);
  },

  render: function (key) {
    var view = UI.qs('#view');
    if (!view) return;
    view.innerHTML = '';
    switch (key) {
      case 'import_stock': ImportStockPage.render(view); break;
      case 'import_price': ImportPricePage.render(view); break;
      case 'recommend': RecommendPage.render(view); break;
      case 'pricing': PricingPage.render(view); break;
      case 'approve': ApprovePage.render(view); break;
      case 'reports': ReportsPage.render(view); break;
      case 'settings': SettingsPage.render(view); break;
      default: this.renderDashboard(view); break;
    }
  },

  renderDashboard: function (view) {
    var user = Auth.current();
    var settings = DB.getSettings();
    var stockRows = DB.getStockRows();
    var products = DB.all('products');
    var prs = DB.all('prs');
    var priceBatches = DB.all('price_batches');
    var stockImports = DB.all('stock_imports');
    var priceImports = DB.all('price_imports');

    var reportList = ReportsPage.data.call({ state: { branch: '' } });
    var totalValue = reportList.reduce(function (s, it) { return s + it.value; }, 0);
    var lowCount = reportList.filter(function (it) { return (it.daily > 0 && it.stock <= it.min) || (it.daily > 0 && it.doh <= (settings.lowStockDOH || 7)); }).length;
    var outCount = reportList.filter(function (it) { return it.stock <= 0; }).length;
    var deadCount = reportList.filter(function (it) { return it.w30 === 0 && it.stock > 0; }).length;

    var rec = [];
    var branches = DB.stockBranches();
    branches.forEach(function (b) {
      buildRecommendations(b).forEach(function (r) {
        if (r.recommend > 0) {
          var existing = rec.find(function (x) { return x.code === r.code && x.supplierName === r.supplierName; });
          if (existing) existing.recommend += r.recommend;
          else rec.push(r);
        }
      });
    });
    var recCount = rec.length;
    var recValue = rec.reduce(function (s, it) { return s + it.recommend * it.cost; }, 0);

    var prPending = prs.filter(function (p) { return p.status === 'pending'; }).length;
    var pricePending = priceBatches.filter(function (b) { return b.status === 'pending'; }).length;

    view.innerHTML =
      '<div class="page-head"><div><h1>ภาพรวมระบบ</h1><p>ยินดีต้อนรับ ' + UI.esc(user.name) + ' · สรุปสถานะสต๊อก ณ วันที่ ' + UI.esc(DB.today()) + '</p></div>' +
      '<button type="button" class="btn btn-primary" id="btnGoRec" ' + (canAccess(user.role, 'recommend') ? '' : 'disabled') + '>' + UI.icon('cart', 'ic-inline') + ' ไปที่รายการแนะนำสั่งซื้อ</button></div>' +
      '<div class="kpi-grid">' +
      kpiCard('มูลค่าสต๊อกทั้งหมด', UI.money(totalValue, 0), 'wallet', '') +
      kpiCard('สินค้าทั้งหมด (SKU)', UI.fmtNum(products.length), 'box', '') +
      kpiCard('สินค้าใกล้หมด', UI.fmtNum(lowCount), 'alert', 'danger') +
      kpiCard('สินค้าหมดสต๊อก', UI.fmtNum(outCount), 'alert', 'danger') +
      kpiCard('สินค้าค้างสต๊อก', UI.fmtNum(deadCount), 'box', 'warning') +
      kpiCard('ยอดแนะนำสั่งซื้อ', UI.fmtNum(recCount) + ' รายการ', 'cart', '') +
      kpiCard('มูลค่าแนะนำซื้อ', UI.money(recValue, 0), 'wallet', '') +
      kpiCard('รออนุมัติ PR / ราคา', UI.fmtNum(prPending) + ' / ' + UI.fmtNum(pricePending), 'check', prPending + pricePending > 0 ? 'warning' : '') +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="card"><div class="card-head"><h2>' + UI.icon('chart', 'ic-inline') + ' สินค้าขายดี (ขาย 30 วัน)</h2></div><div class="card-body"><div id="dashTop"></div></div></div>' +
      '<div class="card"><div class="card-head"><h2>' + UI.icon('wallet', 'ic-inline') + ' มูลค่าสต๊อกตามหมวด</h2></div><div class="card-body"><div id="dashDonut"></div></div></div>' +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="card"><div class="card-head"><h2>' + UI.icon('file', 'ic-inline') + ' การนำเข้าล่าสุด</h2></div><div class="card-body"><div id="dashImports"></div></div></div>' +
      '<div class="card"><div class="card-head"><h2>' + UI.icon('file', 'ic-inline') + ' คำสั่งซื้อล่าสุด</h2></div><div class="card-body"><div id="dashPrs"></div></div></div>' +
      '</div>';

    UI.qs('#btnGoRec').addEventListener('click', function () { App.show('recommend'); });

    var top = reportList.slice().sort(function (a, b) { return b.w30 - a.w30; }).slice(0, 8).map(function (it) {
      return { label: it.code, value: it.w30, title: it.name };
    });
    var topEl = UI.qs('#dashTop');
    if (topEl) Charts.bars(topEl, top, {});

    var catMap = {};
    reportList.forEach(function (it) {
      if (!catMap[it.category]) catMap[it.category] = 0;
      catMap[it.category] += it.value;
    });
    var catArr = Object.keys(catMap).map(function (k) { return { label: k, value: catMap[k] }; }).sort(function (a, b) { return b.value - a.value; });
    var donutEl = UI.qs('#dashDonut');
    if (donutEl) Charts.donut(donutEl, catArr, { center: UI.money(totalValue, 0) });

    var impEl = UI.qs('#dashImports');
    if (impEl) {
      var impRows = [];
      stockImports.slice(0, 5).forEach(function (it) { impRows.push(['นำเข้าสต๊อก', it.date, it.filename, it.rows]); });
      priceImports.slice(0, 5).forEach(function (it) { impRows.push(['นำเข้าราคาซื้อ', it.date, it.filename, it.rows]); });
      if (!impRows.length) {
        UI.emptyState(impEl, 'ยังไม่มีการนำเข้า', 'อัปโหลดข้อมูลจากหน้า นำเข้าสต๊อก / นำเข้าราคาซื้อ');
      } else {
        impRows.sort(function (a, b) { return a[1] < b[1] ? 1 : -1; });
        impEl.innerHTML = '<div class="mini-list">' + impRows.slice(0, 8).map(function (r) {
          return '<div class="mini-row"><span class="mini-label">' + UI.esc(r[0]) + '</span><span class="mini-sub">' + UI.esc(r[2]) + '</span><span class="mini-meta">' + UI.esc(r[1]) + ' · ' + UI.fmtNum(r[3]) + ' รายการ</span></div>';
        }).join('') + '</div>';
      }
    }

    var prEl = UI.qs('#dashPrs');
    if (prEl) {
      if (!prs.length) {
        UI.emptyState(prEl, 'ยังไม่มีคำสั่งซื้อ', 'สร้าง PR จากหน้าแนะนำสั่งซื้อ');
      } else {
        prEl.innerHTML = '<div class="mini-list">' + prs.slice(0, 8).map(function (p) {
          var stType = p.status === 'approved' ? 'success' : p.status === 'pending' ? 'warning' : p.status === 'rejected' ? 'danger' : 'gray';
          return '<div class="mini-row"><span class="mini-label">' + UI.esc(p.id) + ' · ' + UI.esc(p.supplier) + '</span><span class="mini-sub">' + UI.esc(p.date) + '</span><span class="mini-meta">' + UI.money(p.total, 0) + ' ' + UI.badge(PR_STATUS[p.status] || p.status, stType) + '</span></div>';
        }).join('') + '</div>';
      }
    }
  }
};

function navIcon(key) {
  return {
    dashboard: 'dashboard', import_stock: 'import', import_price: 'tag',
    recommend: 'cart', pricing: 'tag', approve: 'check', reports: 'chart', settings: 'gear'
  }[key] || 'box';
}

function badgeCount(key) {
  var n = 0;
  if (key === 'approve') {
    n = DB.all('prs').filter(function (p) { return p.status === 'pending'; }).length +
      DB.all('price_batches').filter(function (b) { return b.status === 'pending'; }).length;
  }
  if (key === 'recommend') {
    n = buildRecommendations(DB.stockBranches()[0] || '').filter(function (r) { return r.recommend > 0; }).length;
  }
  return n > 0 ? '<span class="nav-badge">' + n + '</span>' : '';
}

function kpiCard(label, value, iconKey, tone) {
  return '<div class="kpi-card">' +
    '<div class="kpi-ic ' + (tone ? 'kpi-' + tone : '') + '">' + UI.icon(iconKey) + '</div>' +
    '<div><div class="kpi-label">' + UI.esc(label) + '</div><div class="kpi-value">' + value + '</div></div>' +
    '</div>';
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.body.contains(document.getElementById('appShell'))) {
    App.init();
  }
});
