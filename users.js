// ============================================
// KULLANICI LİSTESİ (users.js)
// ============================================
// Bu dosyada tüm kullanıcılar tutulur.
// role: 'admin' | 'super_user' | 'store'
// storeCodes: kullanıcının görebildiği mağaza kodları
//   - admin için: null (tümünü görür)
//   - super_user için: ['M001', 'M002', ...] (birkaç mağaza)
//   - store için: ['M001'] (tek mağaza)

const users = [
  // ===== ADMIN =====
  {
    email: 'admin@zsazsazsu.com.tr',
    password: 'Admin654321@',
    role: 'admin',
    name: 'Yönetici',
    storeCodes: null, // null = tüm mağazalar
  },

  // ===== MAĞAZA KULLANICILARI =====
  {
    email: 'bodrumavenue@zsazsazsu.com.tr',
    password: 'Bodrumavenue654321@',
    role: 'store',
    name: 'MUG BODRUM AVENUE AVM',
    storeCodes: ['M001'],
  },
  {
    email: 'cesme@zsazsazsu.com.tr',
    password: 'Cesme654321@',
    role: 'store',
    name: 'IZM CESME ILICA CAD',
    storeCodes: ['M002'],
  },
  {
    email: 'gordion@zsazsazsu.com.tr',
    password: 'Gordion654321@',
    role: 'store',
    name: 'ANK GORDION AVM',
    storeCodes: ['M003'],
  },
  {
    email: 'kucukyali@zsazsazsu.com.tr',
    password: 'Kucukyali654321@',
    role: 'store',
    name: 'IST AND KUCUKYALI CAD',
    storeCodes: ['M004'],
  },
  {
    email: 'mavibahce@zsazsazsu.com.tr',
    password: 'Mavibahce654321@',
    role: 'store',
    name: 'IZM MAVIBAHCE AVM',
    storeCodes: ['M005'],
  },
  {
    email: 'zekeriyakoy@zsazsazsu.com.tr',
    password: 'Zekeriyakoy654321@',
    role: 'store',
    name: 'IST AVR ZEKERIYAKOY CAD',
    storeCodes: ['M006'],
  },
  {
    email: 'mallofistanbul@zsazsazsu.com.tr',
    password: 'Mallofistanbul654321@',
    role: 'store',
    name: 'IST AVR MALL OF ISTANBUL AVM',
    storeCodes: ['M007'],
  },
  {
    email: 'marmaraforum@zsazsazsu.com.tr',
    password: 'Marmaraforum654321@',
    role: 'store',
    name: 'IST AVR MARMARA FORUM AVM',
    storeCodes: ['M008'],
  },
  {
    email: 'emaaravm@zsazsazsu.com.tr',
    password: 'Emaar654321@',
    role: 'store',
    name: 'IST AND EMAAR AVM',
    storeCodes: ['M009'],
  },
  {
    email: 'enntepe@zsazsazsu.com.tr',
    password: 'Enntepe654321@',
    role: 'store',
    name: 'KON ENNTEPE AVM',
    storeCodes: ['M010'],
  },
  {
    email: 'yomra@zsazsazsu.com.tr',
    password: 'Yomra654321@',
    role: 'store',
    name: 'TRA YOMRA CAD',
    storeCodes: ['M011'],
  },
  {
    email: 'yalikavak@zsazsazsu.com.tr',
    password: 'Yalikavak654321@',
    role: 'store',
    name: 'MUG BODRUM YALIKAVAK CAD',
    storeCodes: ['M012'],
  },
  {
    email: 'turgutozal@zsazsazsu.com.tr',
    password: 'Turgutozal654321@',
    role: 'store',
    name: 'ADN TURGUT OZAL CAD',
    storeCodes: ['M013'],
  },
  {
    email: 'cengelkoy@zsazsazsu.com.tr',
    password: 'Cengelkoy654321@',
    role: 'store',
    name: 'IST AND CENGELKOY CAD',
    storeCodes: ['M014'],
  },
  {
    email: 'istinyepark@zsazsazsu.com.tr',
    password: 'Istinyepark654321@',
    role: 'store',
    name: 'IZM ISTINYEPARK AVM',
    storeCodes: ['M015'],
  },
  {
    email: 'bahcesehir@zsazsazsu.com.tr',
    password: 'Bahcesehir654321@',
    role: 'store',
    name: 'IST AVR BAHCESEHIR CAD',
    storeCodes: ['M016'],
  },
  {
    email: 'nisantasicitys@zsazsazsu.com.tr',
    password: 'Nisantasicitys654321@',
    role: 'store',
    name: "IST AVRUPA NISANTASI CITY'S AVM",
    storeCodes: ['M017'],
  },

  // ===== BÖLGE MÜDÜRLERİ (Süper Kullanıcı) =====
  // İleride kullanıcı eklemek için örnek:
  // {
  //   email: 'istanbul.mudur@zsazsazsu.com.tr',
  //   password: 'IstMudur654321@',
  //   role: 'super_user',
  //   name: 'İstanbul Bölge Müdürü',
  //   storeCodes: ['M004', 'M006', 'M007', 'M008', 'M009', 'M014', 'M016', 'M017'],
  // },
];

module.exports = users;