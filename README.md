# Firestore → Google Sheets Sync & Discount Tracking

Google Apps Script to synchronize Firestore collections with Google Sheets and automate transaction analysis, weekly reporting, and discount tracking.

## Features

- Secure authentication to Firestore using a Service Account (JWT)
- Sync Firestore documents into Google Sheets
- Append only new records (no duplicates)
- Weekly tracking for coupons and recharges
- Automated discount detection by SKU and campaign code
- Date normalization and formatting
- Fully spreadsheet-driven logic

## Architecture

- **Firestore** → Source of truth
- **Google Apps Script** → Data sync + processing
- **Google Sheets** → Reporting & tracking

## Requirements

- Google Spreadsheet
- Apps Script project bound to the spreadsheet
- Firestore project
- Service Account JSON stored in Google Drive
- Advanced Google APIs enabled:
  - Google Drive API

## Configuration

Edit the constants at the top of the script:

```js
const CONFIG = {
  SERVICE_ACCOUNT_FILE_ID: 'SERVICE_ACCOUNT_JSON_FILE_ID',
  PROJECT_ID: 'FIRESTORE_PROJECT_ID',
  COLLECTION: 'COLLECTION_NAME',
  SOURCE_SHEET: 'SOURCE_SHEET_NAME',
  TRANSACTIONS_SHEET: 'TRANSACTIONS'
};
