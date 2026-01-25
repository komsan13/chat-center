const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('Adding position column to Employee table...');

try {
  db.exec('ALTER TABLE Employee ADD COLUMN position TEXT DEFAULT ""');
  console.log('Added position column successfully');
} catch (e) {
  console.log('Column may already exist:', e.message);
}

// Update existing employees with default positions
const salaryBases = db.prepare('SELECT position FROM SalaryBase ORDER BY baseSalary DESC').all();
if (salaryBases.length > 0) {
  const defaultPosition = salaryBases[salaryBases.length - 1].position; // Use lowest salary position as default
  const employees = db.prepare('SELECT id, position FROM Employee').all();
  
  employees.forEach((emp, index) => {
    if (!emp.position) {
      // Assign random position from available positions
      const randomPos = salaryBases[index % salaryBases.length].position;
      db.prepare('UPDATE Employee SET position = ? WHERE id = ?').run(randomPos, emp.id);
      console.log(`Updated employee ${emp.id} with position: ${randomPos}`);
    }
  });
}

console.log('\nCurrent employees:');
const allEmployees = db.prepare('SELECT id, fullName, position FROM Employee').all();
allEmployees.forEach(emp => {
  console.log(`  - ${emp.fullName}: ${emp.position || '(no position)'}`);
});

db.close();
console.log('\nDone!');
