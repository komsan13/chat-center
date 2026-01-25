const db = require('better-sqlite3')('./prisma/dev.db');

// Add viewDashboard to all roles
const roles = db.prepare('SELECT * FROM Role').all();
roles.forEach(r => {
  const perms = JSON.parse(r.permissions);
  perms.viewDashboard = true; // Give all existing roles dashboard access by default
  db.prepare('UPDATE Role SET permissions = ?  WHERE id = ?').run(JSON.stringify(perms), r.id);
  console.log(`Updated ${r.name}: viewDashboard = true`);
});

console.log('\nUpdated permissions:');
db.prepare('SELECT name, permissions FROM Role').all().forEach(r => {
  console.log(r.name + ':', r.permissions);
});

db.close();
