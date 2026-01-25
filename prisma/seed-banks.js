const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'dev.db'));

// Create Bank table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS Bank (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'deposit',
    bankName TEXT NOT NULL,
    accountName TEXT NOT NULL,
    accountNumber TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Check if Bank table has data
const bankCount = db.prepare('SELECT COUNT(*) as count FROM Bank').get();

if (bankCount.count === 0) {
  console.log('Seeding Bank data...');
  
  const banks = [
    { id: 'bank_001', type: 'deposit', bankName: 'กสิกรไทย', accountName: 'บริษัท ออริกซ์ จำกัด', accountNumber: '123-4-56789-0', status: 'active' },
    { id: 'bank_002', type: 'withdrawal', bankName: 'กรุงเทพ', accountName: 'บริษัท ออริกซ์ จำกัด', accountNumber: '234-5-67890-1', status: 'active' },
    { id: 'bank_003', type: 'payment', bankName: 'ไทยพาณิชย์', accountName: 'บริษัท ออริกซ์ จำกัด', accountNumber: '345-6-78901-2', status: 'active' },
    { id: 'bank_004', type: 'deposit', bankName: 'กรุงไทย', accountName: 'บริษัท ออริกซ์ จำกัด', accountNumber: '456-7-89012-3', status: 'inactive' },
    { id: 'bank_005', type: 'withdrawal', bankName: 'กรุงศรี', accountName: 'บริษัท ออริกซ์ จำกัด', accountNumber: '567-8-90123-4', status: 'active' },
    { id: 'bank_006', type: 'payment', bankName: 'ทหารไทยธนชาต', accountName: 'บริษัท ออริกซ์ จำกัด', accountNumber: '678-9-01234-5', status: 'inactive' },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO Bank (id, type, bankName, accountName, accountNumber, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  for (const bank of banks) {
    insertStmt.run(bank.id, bank.type, bank.bankName, bank.accountName, bank.accountNumber, bank.status);
  }

  console.log(`Inserted ${banks.length} bank accounts`);
} else {
  console.log(`Bank table already has ${bankCount.count} records`);
}

// Verify
const allBanks = db.prepare('SELECT * FROM Bank').all();
console.log('Banks in database:', allBanks.length);
allBanks.forEach(bank => {
  console.log(`  - ${bank.bankName}: ${bank.accountNumber} (${bank.type})`);
});

db.close();
console.log('Seed completed!');
