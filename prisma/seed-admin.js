// Node.js script สำหรับ seed admin user ด้วย better-sqlite3 โดยตรง
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath);

function generateId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function seedAdmin() {
  try {
    // Check if admin already exists
    const existing = db.prepare('SELECT * FROM User WHERE email = ?').get('admin@aurix.com');
    
    if (existing) {
      console.log('Admin user already exists');
      console.log('Email: admin@aurix.com');
      db.close();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const now = new Date().toISOString();
    const id = generateId();

    // Create admin user
    db.prepare(`
      INSERT INTO User (id, email, password, name, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, 'admin@aurix.com', hashedPassword, 'Admin Aurix', 'admin', now, now);

    console.log('Admin user created successfully!');
    console.log('Email: admin@aurix.com');
    console.log('Password: admin123');
    
    db.close();
  } catch (error) {
    console.error('Seed error:', error);
    db.close();
    process.exit(1);
  }
}

seedAdmin();
