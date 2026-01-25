const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

// Get current Operator role permissions
const operator = db.prepare("SELECT * FROM Role WHERE name = 'Operator'").get();
console.log('Current Operator role:', operator);

if (operator) {
  const permissions = JSON.parse(operator.permissions);
  console.log('Current permissions:', permissions);
  
  // Set viewDashboard to false for testing
  permissions.viewDashboard = false;
  
  // Update the role
  db.prepare("UPDATE Role SET permissions = ? WHERE name = 'Operator'").run(JSON.stringify(permissions));
  
  // Verify update
  const updated = db.prepare("SELECT * FROM Role WHERE name = 'Operator'").get();
  console.log('Updated Operator role:', JSON.parse(updated.permissions));
}

db.close();
console.log('Done!');
