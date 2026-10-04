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
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['需求編號', '送出時間', '姓名', '電話', '電子郵件', '車牌', '日期', '時間', '車款明細', '預估金額', '備註']);
    }
    const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getDisplayValues().flat();
    if (ids.includes(payload.requestId)) return jsonResponse({ success: true, duplicate: true });

    const vehicleText = (payload.vehicles || []).map((vehicle) =>
      vehicle.name + '／' + vehicle.package + ' × ' + vehicle.quantity + ' 台（NT$ ' + vehicle.unitPrice + '／台）'
    ).join('；');
    sheet.appendRow([
      safeCell(payload.requestId), new Date(), safeCell(payload.name), safeCell(payload.phone),
      safeCell(payload.email), safeCell(payload.plate), safeCell(payload.date), safeCell(payload.time),
      safeCell(vehicleText), Number(payload.estimatedTotal) || 0, safeCell(payload.note),
    ]);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
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
