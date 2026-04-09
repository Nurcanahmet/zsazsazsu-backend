// ============================================
// KULLANICI LİSTESİ (users.js)
// ============================================
// Her kullanıcı 4 alan içerir:
// - role: 'admin' | 'super_user' | 'store'
// - storeCodes: kullanıcının görebildiği mağaza kodları
//     null = tüm mağazalar (admin için)
//     ['M001', ...] = belirtilen mağazalar
// - allowedPages: erişebildiği sayfalar
//     ['dashboard', 'daily', 'monthly', 'consultants']
//     İleride kısıtlama için kullanılacak.

const ALL_PAGES = ['dashboard', 'daily', 'monthly', 'consultants'];

const users = [
  // ============================================
  // 1) DIRECTOR (Yönetici — Her şeyi görür)
  // ============================================
  {
    email: 'director@zsazsazsu.com.tr',
    password: 'Director654321@',
    role: 'admin',
    name: 'Director of Retail Sales & Operations',
    storeCodes: null, // null = tüm mağazalar
    allowedPages: ALL_PAGES,
  },

  // ============================================
  // 2) SATIŞ OPERASYONLARI MÜDÜRÜ
  // Tüm mağazaları görür ama sınırlandırılabilir
  // ============================================
  {
    email: 'satisoperasyon@zsazsazsu.com.tr',
    password: 'Satis654321@',
    role: 'super_user',
    name: 'Satış Operasyonları Müdürü',
    storeCodes: null, // şimdilik tüm mağazalar
    allowedPages: ALL_PAGES, // ileride kısıtlanabilir
  },

  // ============================================
  // 3) İSTANBUL BÖLGE MÜDÜRÜ
  // Sadece 4 mağaza: Emaar, Küçükyalı, Zekeriyaköy, Bahçeşehir
  // ============================================
  {
    email: 'istanbulbolge@zsazsazsu.com.tr',
    password: 'Istanbul654321@',
    role: 'super_user',
    name: 'İstanbul Bölge Müdürü',
    storeCodes: ['M009', 'M004', 'M006', 'M016'],
    allowedPages: ALL_PAGES,
  },

  // ============================================
  // 4) MAĞAZA ÇALIŞANLARI (17 mağaza)
  // Her biri sadece kendi mağazasını görür
  // ============================================
  {
    email: 'bodrumavenue@zsazsazsu.com.tr',
    password: 'Bodrumavenue654321@',
    role: 'store',
    name: 'MUG BODRUM AVENUE AVM',
    storeCodes: ['M001'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'cesme@zsazsazsu.com.tr',
    password: 'Cesme654321@',
    role: 'store',
    name: 'IZM CESME ILICA CAD',
    storeCodes: ['M002'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'gordion@zsazsazsu.com.tr',
    password: 'Gordion654321@',
    role: 'store',
    name: 'ANK GORDION AVM',
    storeCodes: ['M003'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'kucukyali@zsazsazsu.com.tr',
    password: 'Kucukyali654321@',
    role: 'store',
    name: 'IST AND KUCUKYALI CAD',
    storeCodes: ['M004'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'mavibahce@zsazsazsu.com.tr',
    password: 'Mavibahce654321@',
    role: 'store',
    name: 'IZM MAVIBAHCE AVM',
    storeCodes: ['M005'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'zekeriyakoy@zsazsazsu.com.tr',
    password: 'Zekeriyakoy654321@',
    role: 'store',
    name: 'IST AVR ZEKERIYAKOY CAD',
    storeCodes: ['M006'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'mallofistanbul@zsazsazsu.com.tr',
    password: 'Mallofistanbul654321@',
    role: 'store',
    name: 'IST AVR MALL OF ISTANBUL AVM',
    storeCodes: ['M007'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'marmaraforum@zsazsazsu.com.tr',
    password: 'Marmaraforum654321@',
    role: 'store',
    name: 'IST AVR MARMARA FORUM AVM',
    storeCodes: ['M008'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'emaaravm@zsazsazsu.com.tr',
    password: 'Emaar654321@',
    role: 'store',
    name: 'IST AND EMAAR AVM',
    storeCodes: ['M009'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'enntepe@zsazsazsu.com.tr',
    password: 'Enntepe654321@',
    role: 'store',
    name: 'KON ENNTEPE AVM',
    storeCodes: ['M010'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'yomra@zsazsazsu.com.tr',
    password: 'Yomra654321@',
    role: 'store',
    name: 'TRA YOMRA CAD',
    storeCodes: ['M011'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'yalikavak@zsazsazsu.com.tr',
    password: 'Yalikavak654321@',
    role: 'store',
    name: 'MUG BODRUM YALIKAVAK CAD',
    storeCodes: ['M012'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'turgutozal@zsazsazsu.com.tr',
    password: 'Turgutozal654321@',
    role: 'store',
    name: 'ADN TURGUT OZAL CAD',
    storeCodes: ['M013'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'cengelkoy@zsazsazsu.com.tr',
    password: 'Cengelkoy654321@',
    role: 'store',
    name: 'IST AND CENGELKOY CAD',
    storeCodes: ['M014'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'istinyepark@zsazsazsu.com.tr',
    password: 'Istinyepark654321@',
    role: 'store',
    name: 'IZM ISTINYEPARK AVM',
    storeCodes: ['M015'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'bahcesehir@zsazsazsu.com.tr',
    password: 'Bahcesehir654321@',
    role: 'store',
    name: 'IST AVR BAHCESEHIR CAD',
    storeCodes: ['M016'],
    allowedPages: ALL_PAGES,
  },
  {
    email: 'nisantasicitys@zsazsazsu.com.tr',
    password: 'Nisantasicitys654321@',
    role: 'store',
    name: "IST AVRUPA NISANTASI CITY'S AVM",
    storeCodes: ['M017'],
    allowedPages: ALL_PAGES,
  },
];

module.exports = users;