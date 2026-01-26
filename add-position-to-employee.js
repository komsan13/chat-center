// Script เพิ่ม column position ใน Employee table
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(__dirname, 'prisma', 'dev.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Check if column exists
  const columns = db.pragma('table_info(Employee)');
  const hasPosition = columns.some(col => col.name === 'position');
  
  if (hasPosition) {
    console.log('Column "position" already exists in Employee table');
  } else {
    console.log('Adding "position" column to Employee table...');
    db.exec('ALTER TABLE Employee ADD COLUMN position TEXT DEFAULT ""');
    console.log('Column "position" added successfully!');
  }
  
  // Show current schema
  console.log('\nCurrent Employee table schema:');
  console.log(db.pragma('table_info(Employee)'));
  
} catch (error) {
  console.error('Error:', error.message);
}

db.close();
