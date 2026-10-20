/**
 * ================================================================
 *  DASHBOARD DIVISI USAHA SYARIAH — BACKEND (Google Apps Script)
 * ================================================================
 *  Struktur file HTML (semua di-include dari Index.html):
 *    css.html          : stylesheet
 *    login.html        : halaman login
 *    home.html         : highlight kinerja utama (ringkasan)
 *    hlaset.html       : highlight Aset & Laba (+ rasio keuangan)
 *    hldpk.html        : highlight Dana Pihak Ketiga
 *    hlpembiayaan.html : highlight Pembiayaan
 *    aset.html         : detail satu indikator (dipakai menu sidebar)
 *    app.html          : logika inti (filter, navigasi, helper chart)
 *
 *  Sumber data: sheet berformat "<Indikator> 1" dari data mentah
 *  (kolom: Periode | Periode Date | Unit Kerja | <Nilai> | Target |
 *  Kelompok Unit Kerja | YoY | Ytd | Mtm | RBB/C).
 */

var CONFIG = {
  // Kosongkan bila script terikat (container-bound) ke Spreadsheet data.
  // Isi dengan ID Spreadsheet bila script berdiri sendiri (standalone).
  SPREADSHEET_ID: '',

  // Lama cache data sheet di server (detik). Tombol "Sinkronkan Data" melewati cache.
  CACHE_SECONDS: 120,

  // Lama sesi login (detik).
  SESSION_SECONDS: 3600,

};

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Dashboard Divisi Usaha Syariah')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper modular untuk memanggil file HTML terpisah.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ======================= AUTENTIKASI ======================= */

/**
 * Autentikasi Login. Mengembalikan token sesi yang wajib dikirim
 * pada setiap permintaan data.
 */
/**
 * Autentikasi Login langsung dari tab "Users" di Spreadsheet.
 * Mengembalikan token sesi yang wajib dikirim pada setiap permintaan data.
 */
function checkLogin(username, password) {
  var uname = (username || '').toString().trim().toLowerCase();
  var pass = (password || '').toString();

  // 1. Buka Spreadsheet
  var ss = getSpreadsheet_();
  if (!ss) {
    return { success: false, message: 'Spreadsheet tidak ditemukan. Cek konfigurasi ID.' };
  }

  // 2. Akses sheet "Users"
  var sheetUsers = ss.getSheetByName('Users');
  if (!sheetUsers) {
    return { success: false, message: 'Sheet "Users" belum dibuat di Spreadsheet!' };
  }

  // 3. Ambil semua data akun
  var data = sheetUsers.getDataRange().getValues();
  var userData = null;

  // 4. Looping untuk mencocokkan username dan password
  // Kita mulai dari i = 1 karena baris ke-0 (baris 1 di sheet) adalah header
  for (var i = 1; i < data.length; i++) {
    var dbUser = (data[i][0] || '').toString().trim().toLowerCase();
    var dbPass = (data[i][1] || '').toString();
    
    // Jika ada yang cocok
    if (uname === dbUser && pass === dbPass) {
      userData = {
        nama: (data[i][2] || '').toString().trim() || dbUser, // Ambil Kolom C (Nama)
        role: (data[i][3] || '').toString().trim() || 'User'  // Ambil Kolom D (Role)
      };
      break; // Hentikan pencarian karena user sudah ketemu
    }
  }

  // 5. Jika tidak ada yang cocok, tolak login
  if (!userData) {
    return { success: false, message: 'Username atau Password yang Anda masukkan salah!' };
  }

  // 6. Jika sukses, buat token sesi seperti biasa
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('sess_' + token, uname, CONFIG.SESSION_SECONDS);
  
  return {
    success: true,
    token: token,
    expiresIn: CONFIG.SESSION_SECONDS,
    nama: userData.nama,
    role: userData.role,
    inisial: userData.nama.charAt(0).toUpperCase()
  };
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove('sess_' + token);
  return { success: true };
}

function isValidSession_(token) {
  return !!(token && CacheService.getScriptCache().get('sess_' + token));
}

/* ======================= AKSES SPREADSHEET ======================= */

function getSpreadsheet_() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function normName_(name) {
  return (name || '').toString().toLowerCase().replace(/[\s_]+/g, '');
}

/**
 * Pencari Sheet yang mengabaikan spasi/underscore/huruf besar-kecil.
 * Hanya mencocokkan nama yang identik setelah dinormalisasi, supaya
 * "NOA DPK 1" tidak tertukar dengan "DPK 1".
 */
function findSheetByFuzzyName(ss, targetName) {
  if (!ss || !targetName) return null;
  var cleanTarget = targetName.toString().trim();
  var sheet = ss.getSheetByName(cleanTarget);
  if (sheet) return sheet;

  var normTarget = normName_(cleanTarget);
  var allSheets = ss.getSheets();
  for (var s = 0; s < allSheets.length; s++) {
    if (normName_(allSheets[s].getName()) === normTarget) return allSheets[s];
  }
  return null;
}

/* ======================= NORMALISASI DATA ======================= */

var BULAN_KEY_ = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7,
  agt: 8, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12
};

/** Mengubah Periode Date / label "Sept 2026" menjadi kunci "2026-09". */
function toPeriodKey_(rawDate, label) {
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return rawDate.getFullYear() + '-' + ('0' + (rawDate.getMonth() + 1)).slice(-2);
  }
  var str = (rawDate || '').toString().trim();
  var m = str.match(/^(\d{4})-(\d{2})/);
  if (m) return m[1] + '-' + m[2];

  var parts = (label || '').toString().trim().split(/\s+/);
  if (parts.length >= 2) {
    var bln = BULAN_KEY_[parts[0].toLowerCase().substring(0, 3)];
    var thn = parts[1].replace(/[^0-9]/g, '');
    if (bln && thn.length === 4) return thn + '-' + ('0' + bln).slice(-2);
  }
  return '';
}

/** Mengubah isi sel menjadi angka; '-' / kosong / teks lain menjadi null. */
function toNumber_(val) {
  if (typeof val === 'number') return isFinite(val) ? val : null;
  if (val === null || val === undefined) return null;
  var str = val.toString().trim();
  if (!str || str === '-' || str.toLowerCase() === 'nan') return null;

  var isPct = str.indexOf('%') !== -1;
  str = str.replace(/[^0-9,.\-]/g, '');
  if (str.indexOf('.') !== -1 && str.indexOf(',') !== -1) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.indexOf(',') !== -1) {
    str = str.replace(',', '.');
  } else if (str.split('.').length > 2) {
    str = str.replace(/\./g, '');
  }
  var num = parseFloat(str);
  if (isNaN(num)) return null;
  return isPct ? num / 100 : num;
}

var STD_COLS_ = ['periode', 'periode date', 'unit kerja', 'target', 'kelompok unit kerja',
  'year before', 'date before', 'month before', 'yoy', 'ytd', 'mtm', 'rbb/c',
  'tahun', 'bulan', 'periode sort'];

/**
 * Membaca sheet "<Indikator> 1" dan mengubahnya menjadi baris ringkas:
 * { p: '2026-09', u: unit kerja, k: kelompok, v: nilai, t: target,
 *   yoy, ytd, mtm, rbb } — persentase dalam bentuk desimal (0,05 = 5%).
 */
function normalizeSheet_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0].map(function(h) { return h.toString().trim().toLowerCase(); });
  function col(name) { return headers.indexOf(name); }

  var cPer = col('periode'), cDate = col('periode date'), cUnit = col('unit kerja');
  var cTarget = col('target'), cKel = col('kelompok unit kerja');
  var cYoy = col('yoy'), cYtd = col('ytd'), cMtm = col('mtm'), cRbb = col('rbb/c');
  var cVal = -1;
  for (var h = 0; h < headers.length; h++) {
    if (headers[h] && STD_COLS_.indexOf(headers[h]) === -1) { cVal = h; break; }
  }
  if (cVal === -1) cVal = 3;

  function pick(row, idx) { return idx === -1 ? null : toNumber_(row[idx]); }

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var unit = cUnit === -1 ? '' : (r[cUnit] || '').toString().trim();
    var p = toPeriodKey_(cDate === -1 ? '' : r[cDate], cPer === -1 ? '' : r[cPer]);
    if (!unit || !p) continue;

    rows.push({
      p: p,
      u: unit,
      k: cKel === -1 ? '' : (r[cKel] || '').toString().trim(),
      v: pick(r, cVal),
      t: pick(r, cTarget),
      yoy: pick(r, cYoy),
      ytd: pick(r, cYtd),
      mtm: pick(r, cMtm),
      rbb: pick(r, cRbb)
    });
  }
  return rows;
}

/* ======================= API UNTUK FRONTEND ======================= */

/**
 * Mengambil beberapa sheet sekaligus dalam satu panggilan.
 * @param {string} token   token sesi dari checkLogin
 * @param {string[]} sheetNames  daftar nama sheet, mis. ['DPK 1', 'NOA DPK 1']
 * @param {boolean} force  true = abaikan cache server
 * @return {{success:boolean, sheets:Object, missing:string[], lastUpdated:string}}
 */
function getDataBundle(token, sheetNames, force) {
  if (!isValidSession_(token)) {
    return { success: false, expired: true, message: 'Sesi berakhir, silakan login kembali.' };
  }
  try {
    var ss = getSpreadsheet_();
    if (!ss) return { success: false, message: 'Spreadsheet tidak ditemukan.' };

    var cache = CacheService.getScriptCache();
    var sheets = {};
    var missing = [];

    (sheetNames || []).forEach(function(name) {
      var cacheKey = 'sh_' + normName_(name);
      if (!force) {
        var cached = cache.get(cacheKey);
        if (cached) { sheets[name] = JSON.parse(cached); return; }
      }

      var sheet = findSheetByFuzzyName(ss, name);
      if (!sheet) { missing.push(name); return; }

      var rows = normalizeSheet_(sheet);
      sheets[name] = rows;
      var json = JSON.stringify(rows);
      if (json.length < 95000) cache.put(cacheKey, json, CONFIG.CACHE_SECONDS);
    });

    return {
      success: true,
      sheets: sheets,
      missing: missing,
      lastUpdated: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Makassar', 'dd/MM/yyyy HH:mm:ss')
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}
