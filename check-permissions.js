const db = require('better-sqlite3')('./prisma/dev.db');

console.log('User test:');
const testUser = db.prepare("SELECT * FROM User WHERE email LIKE '%test%'").get();
console.log(testUser);

console.log('\nAll Roles:');
const roles = db.prepare('SELECT * FROM Role').all();
roles.forEach(r => {
  console.log(r.name, '-', r.permissions);
});

db.close();
