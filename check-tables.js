const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('=== Tables in database ===');
tables.forEach(t => console.log('-', t.name));

// Check each important table schema
const importantTables = ['User', 'Role', 'Website', 'Bank', 'Employee', 'LineToken', 'SalaryBase', 'CashWithdrawal', 'DailyBalance', 'Transfer', 'Expenses', 'DailySummary', 'Salaries'];

console.log('\n=== Table Schemas ===');
importantTables.forEach(tableName => {
  try {
    const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (info.length > 0) {
      console.log(`\n${tableName}:`);
      info.forEach(col => console.log(`  - ${col.name} (${col.type})`));
    }
  } catch (e) {
    // Table doesn't exist
  }
});

db.close();
