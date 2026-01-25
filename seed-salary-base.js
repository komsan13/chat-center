const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('Seeding salary base data...');

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS SalaryBase (
    id TEXT PRIMARY KEY,
    position TEXT NOT NULL UNIQUE,
    baseSalary REAL NOT NULL DEFAULT 0,
    positionAllowance REAL NOT NULL DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Check if data exists
const count = db.prepare('SELECT COUNT(*) as count FROM SalaryBase').get();
console.log(`Current salary base records: ${count.count}`);

if (count.count === 0) {
  const salaryData = [
    { position: 'ผู้จัดการ', baseSalary: 50000, positionAllowance: 15000 },
    { position: 'หัวหน้าทีม', baseSalary: 35000, positionAllowance: 8000 },
    { position: 'พนักงานอาวุโส', baseSalary: 28000, positionAllowance: 5000 },
    { position: 'พนักงานทั่วไป', baseSalary: 20000, positionAllowance: 2000 },
    { position: 'พนักงานใหม่', baseSalary: 15000, positionAllowance: 1000 },
    { position: 'นักศึกษาฝึกงาน', baseSalary: 10000, positionAllowance: 0 },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO SalaryBase (id, position, baseSalary, positionAllowance, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  
  for (const item of salaryData) {
    const id = `sb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    insertStmt.run(id, item.position, item.baseSalary, item.positionAllowance, now, now);
    console.log(`  Added: ${item.position} - Base: ฿${item.baseSalary.toLocaleString()}, Allowance: ฿${item.positionAllowance.toLocaleString()}`);
  }

  console.log(`\nAdded ${salaryData.length} salary base records`);
} else {
  console.log('Salary base table already has data');
}

// Show current data
const allData = db.prepare('SELECT * FROM SalaryBase ORDER BY baseSalary DESC').all();
console.log('\nSalary Base Records:');
allData.forEach(item => {
  const total = item.baseSalary + item.positionAllowance;
  console.log(`  - ${item.position}: Base ฿${item.baseSalary.toLocaleString()} + Allowance ฿${item.positionAllowance.toLocaleString()} = Total ฿${total.toLocaleString()}`);
});

db.close();
console.log('\nSeed completed!');
