function doPost(e) {
  const properties = PropertiesService.getScriptProperties();
  const expectedToken = properties.getProperty('BOOKING_SHEETS_TOKEN');
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (error) {
    return jsonResponse({ success: false, message: 'Invalid JSON' });
  }
  if (!expectedToken || payload.token !== expectedToken) {
    return jsonResponse({ success: false, message: 'Unauthorized' });
  }
  if (!spreadsheetId) {
    return jsonResponse({ success: false, message: 'Missing spreadsheet configuration' });
  }
  if (payload.type === 'review') return saveReview(spreadsheetId, payload);
  if (!payload.requestId || !payload.date || !payload.time) {
    return jsonResponse({ success: false, message: 'Missing configuration or booking fields' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheets()[0];
    const columns = ensureBookingColumns(sheet);
    const idColumn = columns['預約編號'];
    const ids = sheet.getLastRow() > 1
      ? sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getDisplayValues().flat()
      : [];
    if (ids.includes(payload.requestId)) return jsonResponse({ success: true, duplicate: true });

    const vehicles = payload.vehicles || [];
    const vehicleText = vehicles.map((vehicle) =>
      vehicle.name + '／' + vehicle.package + ' × ' + vehicle.quantity + ' 台（NT$ ' + vehicle.unitPrice + '／台）'
    ).join('；');
    const quantities = vehicles.map((vehicle) => vehicle.name + ' × ' + vehicle.quantity + ' 台').join('；');
    const values = {
      '預約編號': safeCell(payload.requestId), '姓名': safeCell(payload.name),
      '電話': safeCell(payload.phone), 'Email': safeCell(payload.email),
      '預約日期': safeCell(payload.date), '預約時間': safeCell(payload.time),
      '車種': safeCell(vehicleText), '數量': safeCell(quantities),
      '備註': safeCell(payload.note), '車牌號碼': safeCell(payload.plate),
      '系統建立時間': new Date(), '預約狀態': '待確認',
      '車款明細': safeCell(vehicleText), '預估金額': Number(payload.estimatedTotal) || 0,
    };
    const row = Array(sheet.getLastColumn()).fill('');
    Object.keys(values).forEach((key) => { row[columns[key] - 1] = values[key]; });
    sheet.appendRow(row);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function ensureBookingColumns(sheet) {
  const aliases = {
    '預約編號': ['預約編號', '需求編號'], '姓名': ['姓名'], '電話': ['電話'],
    'Email': ['Email', '電子郵件'], '預約日期': ['預約日期', '日期'],
    '預約時間': ['預約時間', '時間'], '車種': ['車種'], '數量': ['數量'],
    '備註': ['備註'], '車牌號碼': ['車牌號碼', '車牌'],
    '系統建立時間': ['系統建立時間', '送出時間'], '預約狀態': ['預約狀態'],
    '車款明細': ['車款明細'], '預估金額': ['預估金額'],
  };
  const keys = Object.keys(aliases);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(keys);
    return Object.fromEntries(keys.map((key, index) => [key, index + 1]));
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const columns = {};
  keys.forEach((key) => {
    let index = headers.findIndex((header) => aliases[key].includes(header));
    if (index < 0) {
      headers.push(key);
      index = headers.length - 1;
      sheet.getRange(1, headers.length).setValue(key);
    }
    columns[key] = index + 1;
  });
  return columns;
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.action !== 'reviews') {
    return jsonResponse({ success: false, message: 'Unknown action' });
  }
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) return jsonResponse({ reviews: [] });
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('顧客評論');
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ reviews: [] });

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getDisplayValues();
  const reviews = rows
    .filter((row) => row[5] === '公開')
    .map((row) => ({ id: row[0], date: row[1], name: row[2], rating: Number(row[3]), comment: row[4] }));
  return jsonResponse({ reviews });
}

function saveReview(spreadsheetId, payload) {
  if (!payload.reviewId || !payload.rating || !payload.comment) {
    return jsonResponse({ success: false, message: 'Missing review fields' });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const book = SpreadsheetApp.openById(spreadsheetId);
    const sheet = book.getSheetByName('顧客評論') || book.insertSheet('顧客評論');
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['評論編號', '送出時間', '暱稱', '星等', '留言', '狀態']);
    }
    sheet.appendRow([
      safeCell(payload.reviewId), new Date(), safeCell(payload.name || '匿名旅人'),
      Number(payload.rating), safeCell(payload.comment), '公開',
    ]);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function safeCell(value) {
  const text = String(value || '');
  return /^[=+@\-]/.test(text) ? "'" + text : text;
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
