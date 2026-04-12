// ============================================
// KULLANICI YÖNETİMİ (users.js)
// ============================================
// Kullanıcılar artık users.json dosyasında tutuluyor.
// Bu dosya JSON'u okuyan/yazan yardımcı fonksiyonlar içerir.

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

// ---------- TÜM KULLANICILARI OKU ----------
function getUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('users.json okuma hatası:', err);
    return [];
  }
}

// ---------- JSON DOSYASINA YAZ ----------
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('users.json yazma hatası:', err);
    return false;
  }
}

// ---------- EMAIL + ŞİFRE İLE KULLANICI BUL (login için) ----------
function findUser(email, password) {
  const users = getUsers();
  return users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
}

// ---------- EMAIL İLE KULLANICI BUL ----------
function findUserByEmail(email) {
  const users = getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

// ---------- YENİ KULLANICI EKLE ----------
function addUser(userData) {
  const users = getUsers();

  // Email zaten var mı kontrol et
  if (users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
    return { success: false, error: 'Bu email ile kayıtlı bir kullanıcı zaten var.' };
  }

  // Yeni kullanıcıyı ekle
  const newUser = {
    email: userData.email,
    password: userData.password,
    role: userData.role || 'store',
    name: userData.name || '',
    storeCodes: userData.storeCodes || [],
    allowedPages: userData.allowedPages || ['dashboard', 'daily', 'monthly', 'consultants'],
  };

  users.push(newUser);

  if (saveUsers(users)) {
    return { success: true, user: newUser };
  }
  return { success: false, error: 'Kullanıcı kaydedilemedi.' };
}

// ---------- KULLANICI GÜNCELLE ----------
function updateUser(email, updatedData) {
  const users = getUsers();
  const index = users.findIndex(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (index === -1) {
    return { success: false, error: 'Kullanıcı bulunamadı.' };
  }

  // Sadece gönderilen alanları güncelle (password boşsa eski kalsın)
  const updated = { ...users[index], ...updatedData };
  if (!updatedData.password || updatedData.password.trim() === '') {
    updated.password = users[index].password; // eski şifreyi koru
  }

  users[index] = updated;

  if (saveUsers(users)) {
    return { success: true, user: updated };
  }
  return { success: false, error: 'Kullanıcı güncellenemedi.' };
}

// ---------- KULLANICI SİL ----------
function deleteUser(email) {
  const users = getUsers();
  const index = users.findIndex(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (index === -1) {
    return { success: false, error: 'Kullanıcı bulunamadı.' };
  }

  // Admin kendini silemesin
  if (users[index].role === 'admin') {
    const adminCount = users.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      return { success: false, error: 'Son admin kullanıcı silinemez.' };
    }
  }

  users.splice(index, 1);

  if (saveUsers(users)) {
    return { success: true };
  }
  return { success: false, error: 'Kullanıcı silinemedi.' };
}

// ---------- DIŞA AKTAR ----------
module.exports = {
  getUsers,
  findUser,
  findUserByEmail,
  addUser,
  updateUser,
  deleteUser,
};