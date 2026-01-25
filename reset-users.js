const db = require('better-sqlite3')('./dev.db');
const bcrypt = require('bcryptjs');

// Delete all users
db.prepare('DELETE FROM User').run();
console.log('All users deleted');

// Create CEO user
const hashedPassword = bcrypt.hashSync('ceo123', 12);
const id = 'user_ceo_' + Date.now();

db.prepare(`
  INSERT INTO User (id, email, password, name, avatar, role, createdAt, updatedAt) 
  VALUES (?, ?, ?, ?, NULL, ?, datetime('now'), datetime('now'))
`).run(id, 'ceo@aurix.com', hashedPassword, 'CEO Aurix', 'admin');

console.log('Created ceo@aurix.com with password: ceo123');

// Verify
const users = db.prepare('SELECT email, name, role FROM User').all();
console.log('\nUsers in database:');
users.forEach(u => console.log('- ' + u.email + ' (' + u.name + ') - Role: ' + u.role));

db.close();
