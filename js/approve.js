var ApprovePage = {
  state: { tab: 'pr' },

  render: function (container) {
    var self = this;
    container.innerHTML =
      '<div class="page-head"><div><h1>' + UI.esc(PAGE_TITLES.approve) + '</h1><p>อนุมัติคำสั่งซื้อ (PR) และราคาขายที่เกินวงเงินหรือรอความเห็นชอบ</p></div></div>' +
      '<div class="tabs" id="apTabs">' +
      '<button type="button" class="tab" data-tab="pr">คำสั่งซื้อ (PR)</button>' +
      '<button type="button" class="tab" data-tab="price">ราคาขาย</button>' +
      '</div>' +
      '<div id="apContent"></div>';

    UI.on('#apTabs', 'click', function (e) {
      var b = e.target.closest('.tab');
      if (!b) return;
      self.state.tab = b.dataset.tab;
      UI.qsa('.tab', UI.qs('#apTabs')).forEach(function (t) { t.classList.toggle('active', t === b); });
      self.renderTab();
    });
    this.renderTab();
  },

  renderTab: function () {
    var content = UI.qs('#apContent');
    if (!content) return;
    if (this.state.tab === 'pr') renderApprovePr(content);
    else renderApprovePrice(content);
  }
};

function renderApprovePr(content) {
  var prs = DB.all('prs');
  var pending = prs.filter(function (p) { return p.status === 'pending'; });
  var done = prs.filter(function (p) { return p.status !== 'pending'; });
  var pendingHtml = pending.length ? pending.map(function (pr) {
    return prRowHtml(pr, true);
  }).join('') : '<div class="empty-state"><div class="empty-ic">' + UI.icon('check') + '</div><div class="empty-title">ไม่มีคำสั่งซื้อรออนุมัติ</div></div>';
  var doneHtml = done.slice(0, 20).map(function (pr) {
    return prRowHtml(pr, false);
  }).join('') || '<div class="muted">ยังไม่มีประวัติ</div>';

  content.innerHTML =
    '<div class="card"><div class="card-head"><h2>รอการอนุมัติ (' + pending.length + ')</h2></div><div class="card-body">' + pendingHtml + '</div></div>' +
    '<div class="card"><div class="card-head"><h2>ประวัติล่าสุด</h2></div><div class="card-body">' + doneHtml + '</div></div>';

  UI.qsa('[data-ap-pr]', content).forEach(function (b) {
    b.addEventListener('click', function () {
      var pr = pending.find(function (p) { return p.id === b.dataset.apPr; });
      if (!pr) return;
      approvePr(pr, true);
    });
  });
  UI.qsa('[data-rj-pr]', content).forEach(function (b) {
    b.addEventListener('click', function () {
      var pr = pending.find(function (p) { return p.id === b.dataset.rjPr; });
      if (!pr) return;
      rejectPr(pr);
    });
  });
}

function prRowHtml(pr, actionable) {
  var stType = pr.status === 'approved' ? 'success' : pr.status === 'pending' ? 'warning' : pr.status === 'rejected' ? 'danger' : 'gray';
  var btns = '';
  if (actionable) {
    btns = '<div class="pr-btns">' +
      '<button type="button" class="btn btn-success btn-sm" data-ap-pr="' + UI.esc(pr.id) + '">' + UI.icon('check', 'ic-inline') + ' อนุมัติ</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-rj-pr="' + UI.esc(pr.id) + '">' + UI.icon('x', 'ic-inline') + ' ไม่อนุมัติ</button></div>';
  }
  var extra = pr.status === 'rejected' && pr.reason ? '<span class="muted"> · เหตุผล: ' + UI.esc(pr.reason) + '</span>' : '';
  return '<div class="pr-row">' +
    '<div class="pr-info"><div class="pr-title">' + UI.esc(pr.id) + ' · ' + UI.esc(pr.supplier) + '</div>' +
    '<div class="pr-sub">' + UI.esc(pr.date) + ' · สาขา ' + UI.esc(pr.branch) + ' · ' + UI.fmtNum(pr.items.length) + ' รายการ · ' + UI.money(pr.total) + ' · โดย ' + UI.esc(pr.createdBy || '-') + extra + '</div>' +
    '<div class="pr-items">' + pr.items.slice(0, 5).map(function (it) { return '<span class="chip chip-sm">' + UI.esc(it.code) + ' × ' + UI.fmtNum(it.qty) + '</span>'; }).join('') + (pr.items.length > 5 ? '<span class="chip chip-sm">+' + (pr.items.length - 5) + '</span>' : '') + '</div></div>' +
    UI.badge(PR_STATUS[pr.status] || pr.status, stType) +
    btns +
    '</div>';
}

function approvePr(pr, isApprove) {
  var verb = isApprove ? 'อนุมัติ' : 'ไม่อนุมัติ';
  UI.confirmDialog({
    title: 'ยืนยันการ' + verb,
    message: 'ต้องการ' + verb + ' PR ' + pr.id + ' (' + pr.supplier + ') มูลค่า ' + UI.money(pr.total) + ' ใช่หรือไม่?'
  }).then(function (ok) {
    if (!ok) return;
    UI.loading(true);
    setTimeout(function () {
      var all = DB.all('prs');
      var p = all.find(function (x) { return x.id === pr.id; });
      if (p) {
        p.status = isApprove ? 'approved' : 'rejected';
        p.approvedBy = Auth.current().username;
        p.approvedAt = DB.now();
      }
      DB.save('prs', all);
      DB.log(isApprove ? 'อนุมัติ PR' : 'ไม่อนุมัติ PR', pr.id + ' ' + pr.supplier);
      UI.loading(false);
      UI.toast(isApprove ? 'อนุมัติ PR ' + pr.id + ' แล้ว' : 'ไม่อนุมัติ PR ' + pr.id);
      renderApprovePr(UI.qs('#apContent'));
    }, 60);
  });
}

function rejectPr(pr) {
  var m = UI.openModal({
    title: 'ไม่อนุมัติ PR',
    size: 'sm',
    body: '<div class="form-row"><label class="field-label">เหตุผลที่ไม่อนุมัติ (ไม่บังคับ)</label><textarea class="input" name="reason" rows="3"></textarea></div>',
    footer: '<button type="button" class="btn" data-close>ยกเลิก</button><button type="button" class="btn btn-danger" id="rjSave">ยืนยันไม่อนุมัติ</button>'
  });
  m.el.querySelector('#rjSave').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    var reason = UI.qs('[name=reason]', m.el).value.trim();
    UI.disableBtn(btn);
    setTimeout(function () {
      var all = DB.all('prs');
      var p = all.find(function (x) { return x.id === pr.id; });
      if (p) {
        p.status = 'rejected';
        p.approvedBy = Auth.current().username;
        p.approvedAt = DB.now();
        p.reason = reason;
      }
      DB.save('prs', all);
      DB.log('ไม่อนุมัติ PR', pr.id + ' เหตุผล: ' + (reason || '-'));
      m.close();
      UI.toast('ไม่อนุมัติ PR ' + pr.id);
      renderApprovePr(UI.qs('#apContent'));
    }, 60);
  });
}

function renderApprovePrice(content) {
  var batches = DB.all('price_batches');
  var pending = batches.filter(function (b) { return b.status === 'pending'; });
  var done = batches.filter(function (b) { return b.status !== 'pending'; });
  var pendingHtml = pending.length ? pending.map(function (b) {
    return priceBatchRowHtml(b, true);
  }).join('') : '<div class="empty-state"><div class="empty-ic">' + UI.icon('check') + '</div><div class="empty-title">ไม่มีรายการราคารออนุมัติ</div></div>';
  var doneHtml = done.slice(0, 20).map(function (b) {
    return priceBatchRowHtml(b, false);
  }).join('') || '<div class="muted">ยังไม่มีประวัติ</div>';

  content.innerHTML =
    '<div class="card"><div class="card-head"><h2>ราคารออนุมัติ (' + pending.length + ')</h2></div><div class="card-body">' + pendingHtml + '</div></div>' +
    '<div class="card"><div class="card-head"><h2>ประวัติล่าสุด</h2></div><div class="card-body">' + doneHtml + '</div></div>';

  UI.qsa('[data-ap-pb]', content).forEach(function (b) {
    b.addEventListener('click', function () {
      var batch = pending.find(function (x) { return x.id === b.dataset.apPb; });
      if (!batch) return;
      approvePriceBatch(batch, true);
    });
  });
  UI.qsa('[data-rj-pb]', content).forEach(function (b) {
    b.addEventListener('click', function () {
      var batch = pending.find(function (x) { return x.id === b.dataset.rjPb; });
      if (!batch) return;
      approvePriceBatch(batch, false);
    });
  });
  UI.qsa('[data-view-pb]', content).forEach(function (b) {
    b.addEventListener('click', function () {
      var batch = batches.find(function (x) { return x.id === b.dataset.viewPb; });
      if (!batch) return;
      viewPriceBatch(batch);
    });
  });
}

function priceBatchRowHtml(b, actionable) {
  var stType = b.status === 'approved' ? 'success' : b.status === 'pending' ? 'warning' : 'danger';
  var btns = '';
  if (actionable) {
    btns = '<div class="pr-btns">' +
      '<button type="button" class="btn btn-success btn-sm" data-ap-pb="' + UI.esc(b.id) + '">' + UI.icon('check', 'ic-inline') + ' อนุมัติ</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-rj-pb="' + UI.esc(b.id) + '">' + UI.icon('x', 'ic-inline') + ' ไม่อนุมัติ</button></div>';
  }
  var extra = '';
  if (b.status === 'approved') extra = ' · โดย ' + UI.esc(b.approvedBy || '-') + ' ' + UI.esc(b.approvedAt || '');
  if (b.status === 'rejected') extra = ' · โดย ' + UI.esc(b.approvedBy || '-') + (b.reason ? ' (' + UI.esc(b.reason) + ')' : '');
  return '<div class="pr-row">' +
    '<div class="pr-info"><div class="pr-title">' + UI.esc(b.id) + ' · จำนวน ' + UI.fmtNum(b.totalItems) + ' รายการ</div>' +
    '<div class="pr-sub">' + UI.esc(b.date) + ' · โดย ' + UI.esc(b.createdBy) + extra + '</div></div>' +
    UI.badge(PRICE_BATCH_STATUS[b.status] || b.status, stType) +
    '<div class="pr-btns"><button type="button" class="btn btn-ghost btn-sm" data-view-pb="' + UI.esc(b.id) + '">' + UI.icon('eye', 'ic-inline') + ' ดูรายละเอียด</button>' + btns + '</div></div>';
}

function approvePriceBatch(batch, isApprove) {
  UI.confirmDialog({
    title: isApprove ? 'อนุมัติราคา' : 'ไม่อนุมัติราคา',
    message: 'ต้องการ' + (isApprove ? 'อนุมัติ' : 'ไม่อนุมัติ') + ' ราคา ' + batch.id + ' จำนวน ' + UI.fmtNum(batch.totalItems) + ' รายการ ใช่หรือไม่?' + (isApprove ? '' : ' (ราคาจะไม่ถูกเผยแพร่)')
  }).then(function (ok) {
    if (!ok) return;
    UI.loading(true);
    setTimeout(function () {
      var batches = DB.all('price_batches');
      var b = batches.find(function (x) { return x.id === batch.id; });
      if (b) {
        b.status = isApprove ? 'approved' : 'rejected';
        b.approvedBy = Auth.current().username;
        b.approvedAt = DB.now();
        if (isApprove) {
          DB.publishPrices(b.items, b.id);
        }
      }
      DB.save('price_batches', batches);
      DB.log(isApprove ? 'อนุมัติราคา' : 'ไม่อนุมัติราคา', batch.id + ' จำนวน ' + batch.totalItems + ' รายการ');
      UI.loading(false);
      UI.toast(isApprove ? 'อนุมัติราคา ' + batch.id + ' แล้ว (ราคาเผยแพร่แล้ว)' : 'ไม่อนุมัติราคา ' + batch.id);
      renderApprovePrice(UI.qs('#apContent'));
    }, 60);
  });
}

function viewPriceBatch(batch) {
  var rows = batch.items.map(function (it) {
    return '<tr><td class="mono">' + UI.esc(it.code) + '</td><td>' + UI.esc(it.name) + '</td><td>' + UI.esc(it.category) + '</td><td class="num">' + UI.fmtNum(it.cost, 2) + '</td><td class="num">' + UI.fmtNum(it.oldPrice, 2) + '</td><td class="num"><strong>' + UI.fmtNum(it.price, 2) + '</strong></td><td class="num">' + UI.fmtPct(it.gp) + '</td></tr>';
  }).join('');
  UI.openModal({
    title: 'รายละเอียดราคา ' + batch.id,
    size: 'lg',
    body: '<div class="table-wrap"><table class="table"><thead><tr><th>รหัส</th><th>สินค้า</th><th>หมวด</th><th class="num">ต้นทุน</th><th class="num">ราคาเดิม</th><th class="num">ราคาใหม่</th><th class="num">GP จริง</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
  });
}
