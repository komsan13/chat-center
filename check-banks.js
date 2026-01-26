// ตรวจสอบข้อมูล Bank ที่เป็น payment type
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(__dirname, 'prisma', 'dev.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

const banks = db.prepare('SELECT id, type, bankName, accountName, accountNumber FROM Bank').all();
console.log('\n=== All Banks ===');
banks.forEach(b => {
  console.log(`- ${b.bankName} | type: ${b.type} | accountName: ${b.accountName} | accountNumber: ${b.accountNumber}`);
});

// ตรวจสอบว่าพร้อมเพย์มี type เป็น payment หรือไม่
const promptpay = banks.filter(b => b.bankName && b.bankName.includes('พร้อมเพย์'));
console.log('\n=== PromptPay Banks ===');
promptpay.forEach(b => {
  console.log(`- ${b.bankName} | type: ${b.type} | accountName: ${b.accountName}`);
});

db.close();
