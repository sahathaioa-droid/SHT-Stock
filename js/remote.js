(function () {
  var base = (window.APP && APP.apiBase) ? String(APP.apiBase).replace(/\/+$/, '') : '';
  var remote = false;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', base + '/api/ping', false);
    xhr.send(null);
    remote = xhr.status === 200;
  } catch (e) {
    remote = false;
  }
  window.APP_REMOTE = remote;
  window.APP_API_BASE = base;
})();
