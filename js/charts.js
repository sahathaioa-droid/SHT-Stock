var Charts = (function () {

  function bars(container, items, opts) {
    opts = opts || {};
    var max = opts.maxValue;
    if (!max) {
      max = 0;
      items.forEach(function (it) { if (it.value > max) max = it.value; });
    }
    if (max <= 0) max = 1;
    var html = items.map(function (it) {
      var pct = Math.max(2, Math.round((it.value / max) * 100));
      var val = opts.money ? UI.money(it.value) : UI.fmtNum(it.value);
      return '<div class="hbar-row">' +
        '<div class="hbar-label">' + UI.esc(it.label) + '</div>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + pct + '%" title="' + UI.esc(val) + '"></div></div>' +
        '<div class="hbar-value">' + val + '</div>' +
        '</div>';
    }).join('');
    container.innerHTML = html;
  }

  var PALETTE = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#0ea5e9', '#38bdf8', '#7dd3fc', '#0284c7', '#22d3ee', '#a5f3fc', '#64748b', '#94a3b8'];

  function donut(container, items, opts) {
    opts = opts || {};
    var total = 0;
    items.forEach(function (it) { total += it.value; });
    var size = opts.size || 180;
    var r = 70;
    var cx = size / 2, cy = size / 2;
    var circ = 2 * Math.PI * r;
    var offset = 0;
    var segments = '';
    var colors = [];
    items.forEach(function (it, i) {
      var c = PALETTE[i % PALETTE.length];
      colors.push(c);
      if (total <= 0 || it.value <= 0) return;
      var frac = it.value / total;
      var len = frac * circ;
      segments += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + c + '" stroke-width="26" stroke-dasharray="' + len + ' ' + (circ - len) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" stroke-linecap="butt"></circle>';
      offset += len;
    });
    var legend = items.map(function (it, i) {
      var pct = total > 0 ? Math.round((it.value / total) * 100) : 0;
      return '<div class="donut-legend"><span class="dot" style="background:' + colors[i] + '"></span><span class="lbl">' + UI.esc(it.label) + '</span><span class="val">' + UI.fmtNum(it.value) + ' (' + pct + '%)</span></div>';
    }).join('');
    var center = opts.center || '';
    container.innerHTML = '<div class="donut-wrap">' +
      '<svg class="donut" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + segments +
      '<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" class="donut-center">' + UI.esc(center) + '</text></svg>' +
      '<div class="donut-legend-wrap">' + legend + '</div></div>';
  }

  return { bars: bars, donut: donut };

})();
