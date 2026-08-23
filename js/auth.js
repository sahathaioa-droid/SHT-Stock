var Auth = (function () {

  function attemptLogin(username, password) {
    var users = DB.all('users', []);
    var u = String(username || '').trim();
    var p = String(password || '');
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].username).trim().toLowerCase() === u.toLowerCase()) {
        if (String(users[i].password) === p) {
          if (users[i].active === false) return { ok: false, error: 'บัญชีนี้ถูกระงับการใช้งาน' };
          DB.set('session', { username: users[i].username, name: users[i].name, role: users[i].role });
          DB.log('เข้าสู่ระบบ', 'ผู้ใช้ ' + users[i].username + ' (' + (ROLES[users[i].role] || users[i].role) + ')');
          return { ok: true, user: users[i] };
        }
        return { ok: false, error: 'รหัสผ่านไม่ถูกต้อง' };
      }
    }
    return { ok: false, error: 'ไม่พบชื่อผู้ใช้ในระบบ' };
  }

  function logout() {
    var u = DB.currentUser();
    if (u) DB.log('ออกจากระบบ', 'ผู้ใช้ ' + u.username);
    DB.set('session', null);
    window.location.href = 'index.html';
  }

  function current() {
    return DB.currentUser();
  }

  function roleLabel(role) {
    return ROLES[role] || role || '-';
  }

  function can(pageKey) {
    return canAccess(current().role, pageKey);
  }

  function userAvatar(name) {
    var s = String(name || '?').trim().charAt(0);
    return s.toUpperCase();
  }

  return { attemptLogin: attemptLogin, logout: logout, current: current, roleLabel: roleLabel, can: can, userAvatar: userAvatar };

})();
