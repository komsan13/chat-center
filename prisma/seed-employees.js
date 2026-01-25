const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'dev.db'));

// Create Employee table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS Employee (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    websites TEXT NOT NULL DEFAULT '[]',
    bankName TEXT NOT NULL,
    accountNumber TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Check if Employee table has data
const employeeCount = db.prepare('SELECT COUNT(*) as count FROM Employee').get();

if (employeeCount.count === 0) {
  console.log('Seeding Employee data...');
  
  const employees = [
    { id: 'emp_001', fullName: 'สมชาย ใจดี', websites: JSON.stringify(['Aurix Main', 'Aurix Shop']), bankName: 'กสิกรไทย', accountNumber: '123-4-56789-0', status: 'active' },
    { id: 'emp_002', fullName: 'สมหญิง รักสงบ', websites: JSON.stringify(['Aurix Shop']), bankName: 'กรุงเทพ', accountNumber: '234-5-67890-1', status: 'active' },
    { id: 'emp_003', fullName: 'วิชัย มั่นคง', websites: JSON.stringify(['Aurix Main', 'Aurix Partner', 'Aurix Dev']), bankName: 'ไทยพาณิชย์', accountNumber: '345-6-78901-2', status: 'active' },
    { id: 'emp_004', fullName: 'พรทิพย์ สุขใส', websites: JSON.stringify(['Aurix Support']), bankName: 'กรุงไทย', accountNumber: '456-7-89012-3', status: 'inactive' },
    { id: 'emp_005', fullName: 'อนันต์ เก่งงาน', websites: JSON.stringify(['Aurix Partner', 'Aurix Main']), bankName: 'กสิกรไทย', accountNumber: '567-8-90123-4', status: 'active' },
    { id: 'emp_006', fullName: 'นิดา สดใส', websites: JSON.stringify(['Aurix Shop', 'Aurix Support']), bankName: 'กรุงเทพ', accountNumber: '678-9-01234-5', status: 'inactive' },
    { id: 'emp_007', fullName: 'ธีระ พัฒนา', websites: JSON.stringify(['Aurix Dev']), bankName: 'ไทยพาณิชย์', accountNumber: '789-0-12345-6', status: 'active' },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO Employee (id, fullName, websites, bankName, accountNumber, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  for (const emp of employees) {
    insertStmt.run(emp.id, emp.fullName, emp.websites, emp.bankName, emp.accountNumber, emp.status);
  }

  console.log(`Inserted ${employees.length} employees`);
} else {
  console.log(`Employee table already has ${employeeCount.count} records`);
}

// Verify
const allEmployees = db.prepare('SELECT * FROM Employee').all();
console.log('Employees in database:', allEmployees.length);
allEmployees.forEach(emp => {
  const websites = JSON.parse(emp.websites);
  console.log(`  - ${emp.fullName}: ${websites.join(', ')} (${emp.status})`);
});

db.close();
console.log('Seed completed!');
