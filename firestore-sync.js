

/***************
 * CONFIG
 ***************/
const CONFIG = {
  SERVICE_ACCOUNT_FILE_ID: 'SERVICE_ACCOUNT_JSON_FILE_ID',
  PROJECT_ID: 'FIRESTORE_PROJECT_ID',
  COLLECTION: 'COLLECTION_NAME',
  SOURCE_SHEET: 'Firestore_Staging',
  TRANSACTIONS_SHEET: 'Transactions',
  LIMIT: 500
};

/***************
 * MAIN SYNC
 ***************/
function syncFirestoreToSheets() {
  const sheet = getSheet(CONFIG.SOURCE_SHEET);
  sheet.clearContents();

  const token = getAccessToken();
  if (!token) throw new Error('Auth failed');

  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/databases/(default)/documents:runQuery?access_token=${token}`;

  const payload = {
    structuredQuery: {
      from: [{ collectionId: CONFIG.COLLECTION }],
      orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
      limit: CONFIG.LIMIT
    }
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });

  const docs = JSON.parse(res.getContentText())
    .map(r => r.document)
    .filter(Boolean);

  const rows = formatDocuments(docs);
  if (rows.length) {
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    appendNewTransactions();
  }
}

/***************
 * FORMAT DATA
 ***************/
function formatDocuments(docs) {
  return docs.map(d => {
    const f = d.fields || {};
    return [
      f.email?.stringValue || '',
      f.userId?.stringValue || '',
      f.sku?.stringValue || '',
      f.status?.stringValue || '',
      f.discount?.stringValue || '',
      f.date?.stringValue || ''
    ];
  });
}

/***************
 * APPEND NEW ROWS
 ***************/
function appendNewTransactions() {
  const source = getSheet(CONFIG.SOURCE_SHEET);
  const target = getSheet(CONFIG.TRANSACTIONS_SHEET);

  const sourceData = source.getDataRange().getValues();
  const targetLastId = target.getRange(target.getLastRow(), 2).getValue();

  let i = sourceData.length - 1;
  while (i > 0 && sourceData[i][1] !== targetLastId) i--;

  for (let r = i - 1; r > 0; r--) {
    target.appendRow(sourceData[r]);
    formatDate(target.getLastRow(), 6, target);
  }
}

/***************
 * DISCOUNT TRACKING (GENERIC)
 ***************/
function trackDiscount(campaignCode, outputSheetName) {
  const transactions = getSheet(CONFIG.TRANSACTIONS_SHEET).getDataRange().getValues();
  const output = getSheet(outputSheetName);

  const existingUsers = new Set(
    output.getRange(2, 2, output.getLastRow()).getValues().flat()
  );

  transactions.slice(1).forEach(row => {
    const discount = row[4];
    const userId = row[1];

    if (discount.includes(campaignCode) && !existingUsers.has(userId)) {
      output.appendRow(row);
      existingUsers.add(userId);
    }
  });
}

/***************
 * WEEKLY REPORTS
 ***************/
function weeklyReport(filterFn, outputSheet) {
  const data = getSheet(CONFIG.TRANSACTIONS_SHEET).getDataRange().getValues();
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 7);

  const results = data.filter((r, i) =>
    i > 0 && new Date(r[5]) >= start && filterFn(r)
  );

  const sheet = getSheet(outputSheet);
  sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).clearContent();
  if (results.length) {
    sheet.getRange(2, 1, results.length, results[0].length).setValues(results);
  }
}

/***************
 * AUTH
 ***************/
function getAccessToken() {
  const file = DriveApp.getFileById(CONFIG.SERVICE_ACCOUNT_FILE_ID);
  const sa = JSON.parse(file.getBlob().getDataAsString());

  const jwt = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' +
              Utilities.base64EncodeWebSafe(JSON.stringify({
                iss: sa.client_email,
                scope: 'https://www.googleapis.com/auth/datastore',
                aud: 'https://oauth2.googleapis.com/token',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600
              }));

  const signature = Utilities.computeRsaSha256Signature(jwt, sa.private_key);
  const tokenRes = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${jwt}.${Utilities.base64EncodeWebSafe(signature)}`
    }
  });

  return JSON.parse(tokenRes.getContentText()).access_token;
}

/***************
 * HELPERS
 ***************/
function getSheet(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error(`Sheet not found: ${name}`);
  return sheet;
}

function formatDate(row, col, sheet) {
  const value = sheet.getRange(row, col).getValue();
  const d = new Date(value);
  if (!isNaN(d)) {
    sheet.getRange(row, col).setValue(
      Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy')
    );
  }
}
