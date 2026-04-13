// ============================================
// BACKEND SUNUCU (server.js) — GÜNCEL
// ============================================

const express = require('express');
const userStore = require('./users');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ============================================
// MSSQL BAĞLANTI AYARLARI
// ============================================
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  authentication: {
    type: 'ntlm',
    options: {
      domain: process.env.DB_DOMAIN,
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 60000, // 60 saniye (300000 çok fazlaydı)
  },
  pool: {
    max: 10,        // maksimum bağlantı
    min: 2,         // hazırda bekleyen bağlantı
    idleTimeoutMillis: 30000,
  }
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(dbConfig);
    console.log('MSSQL bağlantısı başarılı!');
  }
  return pool;
}

// ============================================
// TEST
// ============================================
app.get('/api/test', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 as test');
    res.json({ success: true, message: 'Veritabanı bağlantısı başarılı!', data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Bağlantı hatası', error: err.message });
  }
});

// ============================================
// GENEL BAKIŞ: KPI Verileri
// ============================================
app.get('/api/dashboard/kpis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getPool();

    const salesResult = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          ISNULL(SUM(il.Qty1 * il.Price), 0) as toplamCiro,
          CASE WHEN COUNT(DISTINCT ih.InvoiceHeaderID) > 0 
            THEN ISNULL(SUM(il.Qty1 * il.Price), 0) / COUNT(DISTINCT ih.InvoiceHeaderID) 
            ELSE 0 END as ortSepet,
          COUNT(DISTINCT ih.InvoiceHeaderID) as faturaSayisi
        FROM trInvoiceHeader ih
        JOIN trInvoiceLine il ON ih.InvoiceHeaderID = il.InvoiceHeaderID
        WHERE ih.InvoiceDate BETWEEN @startDate AND @endDate
          AND il.Qty1 > 0
          AND ih.TransTypeCode = 2
          AND ih.IsReturn = 0
      `);

    const visitorResult = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)

      .query(`
        SELECT ISNULL(SUM(InVisitorCount), 0) as ziyaretci
        FROM trStoreVisitors
        WHERE CurrentDate BETWEEN @startDate AND @endDate
      `);

    const stockResult = await pool.request()
      .query(`
        SELECT COUNT(*) as kritikStok
        FROM (
          SELECT ItemCode, SUM(In_Qty1) - SUM(Out_Qty1) as StokMiktari
          FROM trStock
          GROUP BY ItemCode
          HAVING SUM(In_Qty1) - SUM(Out_Qty1) > 0 AND SUM(In_Qty1) - SUM(Out_Qty1) < 5
        ) t
      `);

    res.json({
      toplamCiro: Math.round(salesResult.recordset[0].toplamCiro),
      ortSepet: Math.round(salesResult.recordset[0].ortSepet),
      ziyaretci: visitorResult.recordset[0].ziyaretci,
      kritikStok: stockResult.recordset[0].kritikStok,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GENEL BAKIŞ: Satış Trendi
// ============================================
app.get('/api/dashboard/sales-trend', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          CONVERT(varchar, ih.InvoiceDate, 103) as date,
          ISNULL(SUM(il.Qty1 * il.Price), 0) as amount
        FROM trInvoiceHeader ih
        JOIN trInvoiceLine il ON ih.InvoiceHeaderID = il.InvoiceHeaderID
        WHERE ih.InvoiceDate BETWEEN @startDate AND @endDate
          AND il.Qty1 > 0
          AND ih.TransTypeCode = 2
          AND ih.IsReturn = 0
        GROUP BY ih.InvoiceDate
        ORDER BY ih.InvoiceDate
      `);

    const data = result.recordset;

// TOPLAM KPI
const total = {
  toplamSatis: data.reduce((sum, x) => sum + (x.SATISVH || 0), 0),
  toplamMiktar: data.reduce((sum, x) => sum + (x.Qty1 || 0), 0),
  toplamFatura: data.reduce((sum, x) => sum + (x["Fatura Sayısı"] || 0), 0),
  toplamZiyaretci: data.reduce((sum, x) => sum + (x["Giren Kişi Sayısı"] || 0), 0),
  toplamKar: data.reduce((sum, x) => sum + (x.Kar || 0), 0),
};

// ORTALAMA / ORANLAR
const oranlar = {
  donusum:
    total.toplamZiyaretci > 0
      ? (total.toplamFatura / total.toplamZiyaretci) * 100
      : 0,

  ortSepet:
    total.toplamFatura > 0
      ? total.toplamSatis / total.toplamFatura
      : 0,

  birimFiyat:
    total.toplamMiktar > 0
      ? total.toplamSatis / total.toplamMiktar
      : 0,

  brutKarYuzde:
    total.toplamSatis > 0
      ? (total.toplamKar / total.toplamSatis) * 100
      : 0,
};

res.json({
  total,
  oranlar,
  stores: data, // istersek mağaza listesi de gönderiyoruz
});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GENEL BAKIŞ: Saatlik Trafik
// ============================================
app.get('/api/dashboard/hourly-traffic', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          RIGHT('0' + CAST(CurrentHour AS VARCHAR), 2) + ':00' as hour,
          AVG(InVisitorCount) as count
        FROM trStoreVisitors
        WHERE CurrentDate BETWEEN @startDate AND @endDate
        GROUP BY CurrentHour
        ORDER BY CurrentHour
      `);

    const data = result.recordset;

// TOPLAM KPI
const total = {
  toplamSatis: data.reduce((sum, x) => sum + (x.SATISVH || 0), 0),
  toplamMiktar: data.reduce((sum, x) => sum + (x.Qty1 || 0), 0),
  toplamFatura: data.reduce((sum, x) => sum + (x["Fatura Sayısı"] || 0), 0),
  toplamZiyaretci: data.reduce((sum, x) => sum + (x["Giren Kişi Sayısı"] || 0), 0),
  toplamKar: data.reduce((sum, x) => sum + (x.Kar || 0), 0),
};

const oranlar = {
  donusum:
    total.toplamZiyaretci > 0
      ? (total.toplamFatura / total.toplamZiyaretci) * 100
      : 0,

  ortSepet:
    total.toplamFatura > 0
      ? total.toplamSatis / total.toplamFatura
      : 0,

  birimFiyat:
    total.toplamMiktar > 0
      ? total.toplamSatis / total.toplamMiktar
      : 0,

  brutKarYuzde:
    total.toplamSatis > 0
      ? (total.toplamKar / total.toplamSatis) * 100
      : 0,
};

res.json({
  total,
  oranlar,
  stores: data,
});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GENEL BAKIŞ: Kritik Stok Listesi
// ============================================
app.get('/api/dashboard/critical-stock', async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .query(`
        SELECT TOP 10
          s.ItemCode as name,
          CAST(s.StokMiktari as INT) as stock,
          CASE 
            WHEN s.StokMiktari <= 2 THEN 'critical'
            WHEN s.StokMiktari <= 5 THEN 'warning'
            ELSE 'normal'
          END as status
        FROM (
          SELECT ItemCode, SUM(In_Qty1) - SUM(Out_Qty1) as StokMiktari
          FROM trStock
          GROUP BY ItemCode
          HAVING SUM(In_Qty1) - SUM(Out_Qty1) > 0 AND SUM(In_Qty1) - SUM(Out_Qty1) < 10
        ) s
        ORDER BY s.StokMiktari ASC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GENEL BAKIŞ: Kategori Dağılımı
// ============================================
app.get('/api/dashboard/categories', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          ig.ItemGroupName as name,
          ISNULL(SUM(il.Qty1 * il.Price), 0) as value
        FROM trInvoiceHeader ih
        JOIN trInvoiceLine il ON ih.InvoiceHeaderID = il.InvoiceHeaderID
        JOIN cdItem i ON il.ItemCode = i.ItemCode
        JOIN cdItemGroup ig ON i.ItemGroupCode = ig.ItemGroupCode
        WHERE ih.InvoiceDate BETWEEN @startDate AND @endDate
          AND il.Qty1 > 0
          AND ih.TransTypeCode = 2
          AND ih.IsReturn = 0
        GROUP BY ig.ItemGroupName
        ORDER BY value DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GÜNLÜK SATIŞ
// ============================================
app.get('/api/reports/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          ISNULL(SUM(il.Qty1 * il.Price), 0) as toplamSatis,
          COUNT(DISTINCT ih.InvoiceHeaderID) as faturaSayisi,
          ISNULL(SUM(il.Qty1), 0) as toplamMiktar,
          CASE WHEN COUNT(DISTINCT ih.InvoiceHeaderID) > 0
            THEN ISNULL(SUM(il.Qty1 * il.Price), 0) / COUNT(DISTINCT ih.InvoiceHeaderID)
            ELSE 0 END as sepetTutar,
          CASE WHEN COUNT(DISTINCT ih.InvoiceHeaderID) > 0
            THEN ISNULL(SUM(il.Qty1), 0) / COUNT(DISTINCT ih.InvoiceHeaderID)
            ELSE 0 END as sepetAdet,
          CASE WHEN SUM(il.Qty1) > 0
            THEN ISNULL(SUM(il.Qty1 * il.Price), 0) / SUM(il.Qty1)
            ELSE 0 END as birimFiyat
        FROM trInvoiceHeader ih
        JOIN trInvoiceLine il ON ih.InvoiceHeaderID = il.InvoiceHeaderID
        WHERE ih.InvoiceDate BETWEEN @startDate AND @endDate
          AND il.Qty1 > 0
          AND ih.TransTypeCode = 2
          AND ih.IsReturn = 0
      `);

    const visitorResult = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT ISNULL(SUM(InVisitorCount), 0) as magazaGirenKisi
        FROM trStoreVisitors
        WHERE CurrentDate BETWEEN @startDate AND @endDate
      `);

    const yoyResult = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT ISNULL(SUM(il.Qty1 * il.Price), 0) as gecenYilSatis
        FROM trInvoiceHeader ih
        JOIN trInvoiceLine il ON ih.InvoiceHeaderID = il.InvoiceHeaderID
        WHERE ih.InvoiceDate BETWEEN DATEADD(YEAR, -1, @startDate) AND DATEADD(YEAR, -1, @endDate)
          AND il.Qty1 > 0
          AND ih.TransTypeCode = 2
          AND ih.IsReturn = 0
      `);

    const sales = result.recordset[0];
    const visitors = visitorResult.recordset[0].magazaGirenKisi;
    const gecenYil = yoyResult.recordset[0].gecenYilSatis;

    res.json({
      hedef: 80000,
      toplamSatis: Math.round(sales.toplamSatis),
      magazaGirenKisi: visitors,
      ortDonusum: visitors > 0 ? Math.round((sales.faturaSayisi / visitors) * 100) : 0,
      toplamMiktar: Math.round(sales.toplamMiktar),
      hedefGerclesme: Math.round((sales.toplamSatis / 80000) * 100),
      ortBrutKar: 72,
      birimFiyat: Math.round(sales.birimFiyat),
      sepetTutar: Math.round(sales.sepetTutar),
      sepetAdet: Math.round(sales.sepetAdet),
      gecenYilSatis: Math.round(gecenYil),
      yillikDegisim: gecenYil > 0 ? Math.round(((sales.toplamSatis - gecenYil) / gecenYil) * 100) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// AYLIK SATIŞ
// ============================================
app.get('/api/reports/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input('year', sql.Int, parseInt(year))
      .input('month', sql.Int, parseInt(month))
      .query(`
        SELECT 
          ISNULL(SUM(il.Qty1 * il.Price), 0) as toplamSatis,
          COUNT(DISTINCT ih.InvoiceHeaderID) as faturaSayisi,
          ISNULL(SUM(il.Qty1), 0) as toplamMiktar,
          CASE WHEN COUNT(DISTINCT ih.InvoiceHeaderID) > 0
            THEN ISNULL(SUM(il.Qty1 * il.Price), 0) / COUNT(DISTINCT ih.InvoiceHeaderID)
            ELSE 0 END as sepetTutar,
          CASE WHEN COUNT(DISTINCT ih.InvoiceHeaderID) > 0
            THEN ISNULL(SUM(il.Qty1), 0) / COUNT(DISTINCT ih.InvoiceHeaderID)
            ELSE 0 END as sepetAdet,
          CASE WHEN SUM(il.Qty1) > 0
            THEN ISNULL(SUM(il.Qty1 * il.Price), 0) / SUM(il.Qty1)
            ELSE 0 END as birimFiyat
        FROM trInvoiceHeader ih
        JOIN trInvoiceLine il ON ih.InvoiceHeaderID = il.InvoiceHeaderID
        WHERE YEAR(ih.InvoiceDate) = @year AND MONTH(ih.InvoiceDate) = @month
          AND il.Qty1 > 0
          AND ih.TransTypeCode = 2
          AND ih.IsReturn = 0
      `);

    const visitorResult = await pool.request()
      .input('year', sql.Int, parseInt(year))
      .input('month', sql.Int, parseInt(month))
      .query(`
        SELECT ISNULL(SUM(InVisitorCount), 0) as toplamKisi
        FROM trStoreVisitors
        WHERE YEAR(CurrentDate) = @year AND MONTH(CurrentDate) = @month
      `);

    const yoyResult = await pool.request()
      .input('year', sql.Int, parseInt(year) - 1)
      .input('month', sql.Int, parseInt(month))
      .query(`
        SELECT ISNULL(SUM(il.Qty1 * il.Price), 0) as gecenYilSatis
        FROM trInvoiceHeader ih
        JOIN trInvoiceLine il ON ih.InvoiceHeaderID = il.InvoiceHeaderID
        WHERE YEAR(ih.InvoiceDate) = @year AND MONTH(ih.InvoiceDate) = @month
          AND il.Qty1 > 0
          AND ih.TransTypeCode = 2
          AND ih.IsReturn = 0
      `);

    const sales = result.recordset[0];
    const toplamKisi = visitorResult.recordset[0].toplamKisi;
    const gecenYil = yoyResult.recordset[0].gecenYilSatis;

    res.json({
      hedef: 80000,
      toplamSatis: Math.round(sales.toplamSatis),
      hedefGerclesme: Math.round((sales.toplamSatis / 80000) * 100),
      ortBrutKar: 70,
      birimFiyat: Math.round(sales.birimFiyat),
      sepetTutar: Math.round(sales.sepetTutar),
      sepetAdet: Math.round(sales.sepetAdet),
      toplamKisi: toplamKisi,
      ortDonusum: toplamKisi > 0 ? Math.round((sales.faturaSayisi / toplamKisi) * 100) : 0,
      toplamMiktar: Math.round(sales.toplamMiktar),
      gecenYilSatis: Math.round(gecenYil),
      yillikDegisim: gecenYil > 0 ? Math.round(((sales.toplamSatis - gecenYil) / gecenYil) * 100) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SATIŞ DANIŞMANLARI
// ============================================
app.get('/api/consultants', async (req, res) => {
  try {
    const { startDate, endDate, storeCode } = req.query;
    const pool = await getPool();

    // Mağaza filtresi
    let storeFilter = '';
    if (storeCode) {
      const codes = storeCode.split(',').map((c) => `'${c.trim()}'`).join(',');
      storeFilter = `AND ih.StoreCode IN (${codes})`;
    }

    const result = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          il.SalespersonCode,
          LTRIM(RTRIM(sp.FirstName)) + ' ' + LTRIM(RTRIM(sp.LastName)) as name,

          -- SATIŞ (IsReturn = 0)
          ISNULL(SUM(CASE WHEN ih.IsReturn = 0 THEN il.Qty1 * il.Price ELSE 0 END), 0) as salesAmount,
          COUNT(DISTINCT CASE WHEN ih.IsReturn = 0 THEN ih.InvoiceHeaderID END) as invoiceCount,

          -- İADE (IsReturn = 1)
          ISNULL(SUM(CASE WHEN ih.IsReturn = 1 THEN il.Qty1 ELSE 0 END), 0) as returnQty,
          ISNULL(SUM(CASE WHEN ih.IsReturn = 1 THEN il.Qty1 * il.Price ELSE 0 END), 0) as returnAmount

        FROM trInvoiceLine il
        JOIN trInvoiceHeader ih ON il.InvoiceHeaderID = ih.InvoiceHeaderID
        JOIN cdSalesperson sp ON il.SalespersonCode = sp.SalespersonCode
        WHERE ih.InvoiceDate BETWEEN @startDate AND @endDate
          AND ih.TransTypeCode = 2
          AND ih.ProcessCode = 'R'
          AND ih.IsCompleted = 1
          AND il.ItemTypeCode = 1
          ${storeFilter}
        GROUP BY il.SalespersonCode, sp.FirstName, sp.LastName
        HAVING ISNULL(SUM(CASE WHEN ih.IsReturn = 0 THEN il.Qty1 * il.Price ELSE 0 END), 0) > 0
        ORDER BY salesAmount DESC
      `);

    const consultants = result.recordset.map((c, i) => ({
      rank: i + 1,
      name: c.name,
      salesAmount: Math.round(c.salesAmount),
      invoiceCount: c.invoiceCount,
      avgBasket: c.invoiceCount > 0 ? Math.round(c.salesAmount / c.invoiceCount) : 0,
      returnQty: Math.abs(Math.round(c.returnQty)),    // negatif olabilir, pozitif göster
      returnAmount: Math.abs(Math.round(c.returnAmount)),
    }));

    res.json(consultants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================
// NEBIM PROCEDURE - GÜNLÜK DASHBOARD
// ============================================

app.get('/api/dashboard/gunluk', async (req, res) => {
  try {
    const { startDate, endDate, storeCode } = req.query;
    const pool = await getPool();

    // storeCode yoksa → tek çağrı, NULL gönder (tüm mağazalar)
    if (!storeCode) {
      const result = await pool.request()
        .input('StartDate', sql.Date, startDate)
        .input('EndDate', sql.Date, endDate)
        .input('StoreCode', sql.NVarChar(20), null)
        .execute('sp_solid_dashboard_gunluk');

      return res.json(result.recordset);
    }

    // storeCode varsa → virgülle ayrılmış olabilir
    const storeCodes = storeCode.split(',').map(s => s.trim()).filter(Boolean);

    // Tek mağaza için tek çağrı
    if (storeCodes.length === 1) {
      const result = await pool.request()
        .input('StartDate', sql.Date, startDate)
        .input('EndDate', sql.Date, endDate)
        .input('StoreCode', sql.NVarChar(20), storeCodes[0])
        .execute('sp_solid_dashboard_gunluk');

      return res.json(result.recordset);
    }

    // Birden fazla mağaza için paralel çağrı yap, sonuçları birleştir
    const promises = storeCodes.map(code =>
      pool.request()
        .input('StartDate', sql.Date, startDate)
        .input('EndDate', sql.Date, endDate)
        .input('StoreCode', sql.NVarChar(20), code)
        .execute('sp_solid_dashboard_gunluk')
    );

    const results = await Promise.all(promises);
    const combined = results.flatMap(r => r.recordset);

    res.json(combined);
  } catch (err) {
    console.error('Procedure hata:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GÜNLÜK MAĞAZA HEDEFLERİ
// ============================================
// ztGunlukMagazaHedef tablosundan tarih aralığındaki hedefleri çeker
// Mağaza bazında toplam hedef döner
// storeCode opsiyonel — boşsa tümü, virgülle ayrılmış birden fazla olabilir
app.get('/api/dashboard/hedefler', async (req, res) => {
  try {
    const { startDate, endDate, storeCode } = req.query;
    const pool = await getPool();

    let storeFilter = "AND StoreCode LIKE 'M%'";
    if (storeCode) {
      const codes = storeCode.split(',').map((c) => `'${c.trim()}'`).join(',');
      storeFilter = `AND StoreCode IN (${codes})`;
    }

    const result = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT 
          StoreCode,
          SUM(TurnoverTarget) AS GunlukHedef
        FROM ztGunlukMagazaHedef WITH (NOLOCK)
        WHERE Tarih BETWEEN @startDate AND @endDate
          ${storeFilter}
        GROUP BY StoreCode
        ORDER BY StoreCode
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Hedef sorgu hatası:', err);
    res.status(500).json({ error: err.message });
  }
});



// ============================================
// AYLIK DASHBOARD PROCEDURE
// ============================================
// sp_solid_dashboard_aylik(@AyYil) — örn: '2025-09'
// Procedure tüm mağazaları döner, hedef ve LFL verileri içinde
app.get('/api/dashboard/aylik', async (req, res) => {
  try {
    const { ayYil } = req.query; // '2025-09' formatında

    if (!ayYil) {
      return res.status(400).json({ error: 'ayYil parametresi zorunlu (örn: 2025-09)' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('AyYil', sql.NVarChar, ayYil)
      .execute('sp_solid_dashboard_aylik');

    // Procedure birden fazla recordset dönebilir
    // Hepsini döndürelim, frontend seçsin
    res.json({
      recordsets: result.recordsets,
      recordset: result.recordset, // ilk set
    });
  } catch (err) {
    console.error('Aylık procedure hata:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// LOGIN — Kullanıcı girişi
// ============================================
// POST /api/login
// Body: { email, password }
// Dönüş: { success, user: {email, name, role, storeCodes} } veya { success: false, error }
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, error: 'Email ve şifre zorunlu' });
  }

  const user = userStore.findUser(email, password);

  if (!user) {
    return res.json({ success: false, error: 'Email veya şifre hatalı' });
  }

  // Şifreyi dönüş objesinden çıkar
  const { password: _, ...userWithoutPassword } = user;

  res.json({ success: true, user: userWithoutPassword });
});


// ============================================
// ADMIN PANELİ — KULLANICI YÖNETİMİ
// ============================================
// Bu endpoint'lerin hepsi admin kontrolü yapar
// Frontend, admin olmayan kullanıcıların bu sayfaya girmesini zaten engelliyor
// ama yine de backend'de de güvenlik için kontrol ediyoruz

// Admin yetki kontrol middleware'i
function requireAdmin(req, res, next) {
  const adminEmail = req.headers['x-admin-email'];
  if (!adminEmail) {
    return res.status(401).json({ success: false, error: 'Yetkisiz erişim' });
  }

  const user = userStore.findUserByEmail(adminEmail);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Bu işlem için admin yetkisi gerekli' });
  }

  next();
}

// ---------- TÜM KULLANICILARI LİSTELE ----------

app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = userStore.getUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- YENİ KULLANICI EKLE ----------
app.post('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const { email, password, name, role, storeCodes, allowedPages } = req.body;

    if (!email || !password || !name || !role) {
      return res.json({ success: false, error: 'Email, şifre, ad ve rol zorunlu' });
    }
const result = userStore.addUser({
  email,
  password,
  name,
  role,
  storeCodes: storeCodes || [],
  allowedPages: allowedPages || ['dashboard', 'daily', 'monthly', 'consultants'],
});

    if (!result.success) {
      return res.json(result);
    }

    // Eklenen kullanıcıyı şifresiz dön
    const { password: _, ...safeUser } = result.user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- KULLANICI GÜNCELLE ----------
app.put('/api/admin/users/:email', requireAdmin, (req, res) => {
  try {
    const { email } = req.params;
    const { password, name, role, storeCodes, allowedPages } = req.body;

    const updateData = {};
    if (password !== undefined) updateData.password = password;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (storeCodes !== undefined) updateData.storeCodes = storeCodes;
    if (allowedPages !== undefined) updateData.allowedPages = allowedPages;

    const result = userStore.updateUser(email, updateData);

    if (!result.success) {
      return res.json(result);
    }

    const { password: _, ...safeUser } = result.user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- KULLANICI SİL ----------
app.delete('/api/admin/users/:email', requireAdmin, (req, res) => {
  try {
    const { email } = req.params;
    const result = userStore.deleteUser(email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- MAĞAZA LİSTESİ (Modal dropdown için) ----------
// sp_solid_dashboard_gunluk'tan bugünün verisini çeker, sadece StoreCode ve StoreDescription döner
// ---------- MAĞAZA LİSTESİ (Modal dropdown için) ----------
// Statik mağaza listesi - users.json'daki mevcut mağaza kodlarına dayalı
// ---------- MAĞAZA LİSTESİ (sp_Akinon_SalesPerson'dan DISTINCT) ----------
app.get('/api/admin/stores', requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().execute('sp_Akinon_SalesPerson');

    // DISTINCT mağaza listesi (StoreCode + StoreDescription)
    // ET, TEST, Havuz gibi gerçek olmayan kayıtları filtrele
    const seen = new Set();
    const stores = [];

    for (const row of result.recordset) {
      const code = row.StoreCode;
      const desc = row.OfficeDescription || '';

      // Filtreler
      if (!code) continue;
      if (code === 'ET001') continue;            // E-ticaret
      if (code === 'TEST') continue;             // Test mağazası
      if (seen.has(code)) continue;              // Tekrarları atla

      seen.add(code);
      stores.push({ StoreCode: code, StoreDescription: desc });
    }

    // Kod sırasına göre sırala
    stores.sort((a, b) => a.StoreCode.localeCompare(b.StoreCode));

    res.json({ success: true, stores });
  } catch (err) {
    console.error('Mağaza listesi hatası:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- DANIŞMAN LİSTESİ (sp_Akinon_SalesPerson) ----------
// Tüm danışmanlar veya belirli mağazaların danışmanları
// Query: ?storeCode=M009 veya ?storeCode=M001,M002
app.get('/api/admin/salespersons', requireAdmin, async (req, res) => {
  try {
    const { storeCode } = req.query;
    const pool = await getPool();
    const result = await pool.request().execute('sp_Akinon_SalesPerson');

    let salespersons = result.recordset
      .filter(row => row.StoreCode && row.SalespersonCode && row.FirstLastName)
      .map(row => ({
        StoreCode: row.StoreCode,
        StoreDescription: row.OfficeDescription || '',
        SalespersonCode: row.SalespersonCode,
        Name: row.FirstLastName.trim(),
      }))
      // Havuz satışı, test ve e-ticaret kayıtlarını filtrele
      .filter(p => 
        !p.Name.toLowerCase().includes('havuz') &&
        !p.Name.toLowerCase().includes('test') &&
        p.StoreCode !== 'ET001' &&
        p.StoreCode !== 'TEST'
      );

    // Mağaza filtresi (opsiyonel)
    if (storeCode) {
      const codes = storeCode.split(',').map(c => c.trim());
      salespersons = salespersons.filter(p => codes.includes(p.StoreCode));
    }

    // İsme göre sırala
    salespersons.sort((a, b) => a.Name.localeCompare(b.Name, 'tr'));

    res.json({ success: true, salespersons });
  } catch (err) {
    console.error('Danışman listesi hatası:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// SUNUCUYU BAŞLAT
// ============================================
app.listen(PORT, () => {
  console.log(`Backend çalışıyor: http://localhost:${PORT}`);
  console.log('Veritabanına bağlanılıyor...');
  getPool().catch(err => console.error('Bağlantı hatası:', err.message));
});