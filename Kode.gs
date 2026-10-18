function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Dashboard Divisi Usaha Syariah')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fungsi helper modular untuk memanggil file HTML terpisah (Index.html, hlaset.html, aset.html)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Autentikasi Login
 */
function checkLogin(username, password) {
  if ((username === 'admin' && password === '123') || (username === 'syariah' && password === 'syariah')) {
    return {
      success: true,
      nama: 'DIVISI USAHA SYARIAH',
      role: 'User',
      inisial: 'D'
    };
  }
  return {
    success: false,
    message: 'Username atau Password yang Anda masukkan salah!'
  };
}

/**
 * Helper pencari Sheet secara fleksibel (mengabaikan spasi/underscore/huruf besar-kecil)
 */
function findSheetByFuzzyName(ss, targetName) {
  if (!ss || !targetName) return null;
  var cleanTarget = targetName.trim();
  var sheet = ss.getSheetByName(cleanTarget);
  if (sheet) return sheet;

  var allSheets = ss.getSheets();
  var normTarget = cleanTarget.toLowerCase().replace(/[\s_]+/g, '');
  for (var s = 0; s < allSheets.length; s++) {
    var sName = allSheets[s].getName().toLowerCase().replace(/[\s_]+/g, '');
    if (sName === normTarget || sName.indexOf(normTarget) !== -1) {
      return allSheets[s];
    }
  }
  return null;
}

/**
 * Mengambil data secara dinamis langsung dari Google Spreadsheet aktif (untuk aset.html & menu tunggal)
 */
function getSheetData(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { success: false, message: 'Spreadsheet tidak ditemukan.' };
    }
    
    var targetName = (sheetName || 'Aset 1').trim();
    var sheet = findSheetByFuzzyName(ss, targetName);

    if (!sheet) {
      return { success: false, message: 'Sheet "' + targetName + '" belum tersedia di Spreadsheet.' };
    }

    var displayValues = sheet.getDataRange().getDisplayValues();
    var rawValues = sheet.getDataRange().getValues();

    if (displayValues.length <= 1) {
      return { success: false, message: 'Sheet "' + sheet.getName() + '" masih kosong.' };
    }

    var headers = displayValues[0].map(function(h) { return h.toString().trim(); });
    var rows = [];

    for (var i = 1; i < displayValues.length; i++) {
      var dispRow = displayValues[i];
      var rawRow = rawValues[i];
      
      if (!dispRow[0] && !dispRow[2]) continue;

      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var colName = headers[j] || ('Col_' + j);
        var valDisp = dispRow[j] ? dispRow[j].toString().trim() : '';
        var valRaw = rawRow[j];

        if (colName.toLowerCase() === 'periode date' && valRaw instanceof Date) {
          var yyyy = valRaw.getFullYear();
          var mm = ('0' + (valRaw.getMonth() + 1)).slice(-2);
          var dd = ('0' + valRaw.getDate()).slice(-2);
          obj[colName] = yyyy + '-' + mm + '-' + dd;
        } else if (typeof valRaw === 'number' && ['yoy', 'ytd', 'mtm', 'rbb/c'].indexOf(colName.toLowerCase()) === -1) {
          obj[colName] = valRaw;
        } else {
          obj[colName] = valDisp;
        }
      }
      rows.push(obj);
    }

    return {
      success: true,
      sheetActualName: sheet.getName(),
      rowCount: rows.length,
      lastUpdated: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Makassar', 'HH:mm:ss'),
      rows: rows
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Mengambil data gabungan khusus untuk halaman hlaset.html (Membaca Aset 1 dan Laba 1 sekaligus)
 */
function getHlAsetLabaBundle() {
  return {
    aset: getSheetData('Aset 1'),
    laba: getSheetData('Laba 1')
  };
}