// อัปเดต type ของธนาคาร "พร้อมเพย์" เป็น payment
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(__dirname, 'prisma', 'dev.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// อัปเดต type เป็น payment สำหรับธนาคารที่ชื่อ พร้อมเพย์, PromptPay หรือคล้ายกัน
const result = db.prepare(`
  UPDATE Bank 
  SET type = 'payment' 
  WHERE bankName LIKE '%พร้อมเพย์%' 
     OR bankName LIKE '%PromptPay%' 
     OR bankName LIKE '%TrueMoney%'
     OR bankName LIKE '%ทรูมันนี่%'
`).run();

console.log(`Updated ${result.changes} banks to type='payment'`);

// แสดงผลหลังอัปเดต
const banks = db.prepare('SELECT id, type, bankName, accountName, accountNumber FROM Bank').all();
console.log('\n=== All Banks After Update ===');
banks.forEach(b => {
  console.log(`- ${b.bankName} | type: ${b.type} | accountName: ${b.accountName} | accountNumber: ${b.accountNumber}`);
});

db.close();
