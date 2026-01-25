const db = require('better-sqlite3')('./dev.db');
const bcrypt = require('bcryptjs');

const hashedPassword = bcrypt.hashSync('test123', 12);
const id = 'user_test_' + Date.now();

try {
  db.prepare(`
    INSERT INTO User (id, email, password, name, avatar, role, createdAt, updatedAt) 
    VALUES (?, ?, ?, ?, NULL, ?, datetime('now'), datetime('now'))
  `).run(id, 'test@aurix.com', hashedPassword, 'TEST', 'user');
  
  console.log('User test@aurix.com created with password: test123');
} catch (error) {
  if (error.message.includes('UNIQUE constraint')) {
    console.log('User test@aurix.com already exists');
  } else {
    console.error('Error:', error.message);
  }
}

db.close();
