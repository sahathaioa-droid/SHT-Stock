var UI = (function () {

  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    import: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4z"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
  };

  function icon(name, cls) {
    return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  function esc(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtNum(n, d) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    if (d === undefined) d = (Math.round(n * 100) / 100) % 1 === 0 ? 0 : 2;
    var neg = n < 0;
    var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (neg ? '-' : '') + s;
  }

  function money(n, d) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    return fmtNum(n, d) + ' บาท';
  }

  function fmtPct(n) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    return fmtNum(n, 1) + '%';
  }

  function ensureToasts() {
    var c = document.getElementById('toastContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toastContainer';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function toast(msg, type) {
    type = type || 'success';
    var container = ensureToasts();
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    var ic = type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info';
    el.innerHTML = '<span class="toast-ic">' + icon(ic) + '</span><span class="toast-msg">' + esc(msg) + '</span><span class="toast-x">' + icon('x') + '</span>';
    container.appendChild(el);
    function remove() {
      el.classList.add('toast-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }
    el.querySelector('.toast-x').addEventListener('click', remove);
    setTimeout(remove, 4500);
  }

  function loading(show) {
    var el = document.getElementById('loadingOverlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loadingOverlay';
      el.className = 'loading-overlay';
      el.innerHTML = '<div class="loading-box"><div class="spinner"></div><div class="loading-text">กำลังโหลดข้อมูล...</div></div>';
      document.body.appendChild(el);
    }
    el.classList.toggle('show', !!show);
  }

  function withLoading(fn) {
    return function () {
      var args = arguments;
      var self = this;
      loading(true);
      try {
        var out = fn.apply(self, args);
        if (out && typeof out.then === 'function') {
          return out.finally(function () { loading(false); });
        }
        loading(false);
        return out;
      } catch (e) {
        loading(false);
        throw e;
      }
    };
  }

  function modalClose(overlay) {
    overlay.classList.remove('show');
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  }

  function openModal(opts) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    var size = opts.size || 'md';
    var footerHTML = opts.footer || '';
    overlay.innerHTML =
      '<div class="modal ' + size + '">' +
      '<div class="modal-head"><div class="modal-title">' + esc(opts.title || '') + '</div>' +
      '<button type="button" class="modal-x" data-close aria-label="ปิด">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (footerHTML ? '<div class="modal-foot">' + footerHTML + '</div>' : '') +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    var closes = overlay.querySelectorAll('[data-close]');
    for (var i = 0; i < closes.length; i++) {
      closes[i].addEventListener('click', function () { modalClose(overlay); });
    }
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) modalClose(overlay);
    });
    return {
      el: overlay,
      bodyEl: overlay.querySelector('.modal-body'),
      close: function () { modalClose(overlay); }
    };
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var okText = opts.confirmText || 'ยืนยัน';
      var cancelText = opts.cancelText || 'ยกเลิก';
      var m = openModal({
        title: opts.title || 'ยืนยันการทำงาน',
        body: '<div class="confirm-body"><div class="confirm-ic ' + (opts.danger ? 'danger' : '') + '">' + icon(opts.danger ? 'alert' : 'info') + '</div><div class="confirm-msg">' + (opts.message || '') + '</div></div>',
        footer: '<button type="button" class="btn" data-cancel>' + esc(cancelText) + '</button><button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + esc(okText) + '</button>',
        size: 'sm'
      });
      var done = false;
      function finish(val) {
        if (done) return;
        done = true;
        m.close();
        resolve(val);
      }
      m.el.querySelector('[data-cancel]').addEventListener('click', function () { finish(false); });
      var okBtn = m.el.querySelector('[data-ok]');
      okBtn.addEventListener('click', function () {
        okBtn.disabled = true;
        okBtn.classList.add('is-loading');
        finish(true);
      });
    });
  }

  function disableBtn(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add('is-loading');
  }

  function enableBtn(btn, label) {
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('is-loading');
    if (label) btn.dataset.label = label;
  }

  function downloadFile(filename, content, mime) {
    mime = mime || 'text/plain;charset=utf-8';
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function toCSV(rows, delimiter) {
    delimiter = delimiter || ',';
    return rows.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell == null ? '' : cell);
        if (s.indexOf(delimiter) >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0) {
          s = '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(delimiter);
    }).join('\r\n');
  }

  function downloadCSV(filename, rows, delimiter) {
    var content = '\uFEFF' + toCSV(rows, delimiter);
    downloadFile(filename, content, 'text/csv;charset=utf-8;');
  }

  function parseCSV(text) {
    text = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else inQuotes = false;
        } else cell += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n') {
          row.push(cell); rows.push(row); row = []; cell = '';
        } else cell += ch;
      }
    }
    if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  function mapHeaders(headerRow, aliasMap) {
    var map = {};
    headerRow.forEach(function (h, idx) {
      var key = String(h).trim();
      for (var field in aliasMap) {
        if (Object.prototype.hasOwnProperty.call(aliasMap, field)) {
          var aliases = aliasMap[field];
          for (var j = 0; j < aliases.length; j++) {
            var a = String(aliases[j]).trim();
            var norm = a.toLowerCase().replace(/\s+/g, '');
            var keyNorm = key.toLowerCase().replace(/\s+/g, '');
            if (keyNorm === norm) {
              map[field] = idx;
              return;
            }
          }
        }
      }
    });
    return map;
  }

  function numOrNull(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).replace(/[^\d.-]/g, '');
    if (s === '' || s === '-' || s === '.') return null;
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function on(sel, evt, fn, root) {
    var list = qsa(sel, root);
    list.forEach(function (el) { el.addEventListener(evt, fn); });
    return list;
  }

  function emptyState(container, title, sub) {
    container.innerHTML = '<div class="empty-state"><div class="empty-ic">' + icon('box') + '</div><div class="empty-title">' + esc(title || 'ไม่มีข้อมูล') + '</div><div class="empty-sub">' + esc(sub || '') + '</div></div>';
  }

  function badge(text, type) {
    return '<span class="badge badge-' + (type || 'gray') + '">' + esc(text) + '</span>';
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  return {
    icon: icon, esc: esc, fmtNum: fmtNum, money: money, fmtPct: fmtPct,
    toast: toast, loading: loading, withLoading: withLoading,
    openModal: openModal, confirmDialog: confirmDialog,
    disableBtn: disableBtn, enableBtn: enableBtn,
    downloadFile: downloadFile, downloadCSV: downloadCSV, toCSV: toCSV, parseCSV: parseCSV,
    mapHeaders: mapHeaders, numOrNull: numOrNull,
    qs: qs, qsa: qsa, on: on, emptyState: emptyState, badge: badge, debounce: debounce
  };

})();
