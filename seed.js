const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

// Database is at root (created by Prisma)
const dbPath = path.join(__dirname, 'dev.db');
console.log('Looking for database at:', dbPath);

const db = new Database(dbPath);

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in database:', tables);

async function seed() {
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  // Check if user exists
  const existing = db.prepare('SELECT * FROM User WHERE email = ?').get('admin@aurix.com');
  
  if (existing) {
    console.log('Admin user already exists');
    console.log('Email: admin@aurix.com');
  } else {
    // Create user
    const id = 'admin_' + Date.now();
    const stmt = db.prepare(`
      INSERT INTO User (id, email, password, name, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    stmt.run(id, 'admin@aurix.com', hashedPassword, 'Admin Aurix', 'admin');
    
    console.log('Admin user created successfully!');
    console.log('Email: admin@aurix.com');
    console.log('Password: admin123');
  }

  // Seed Websites
  console.log('\n--- Seeding Websites ---');
  
  const websites = [
    { name: 'Data Center Main', url: 'https://datacenter.com', status: 'active' },
    { name: 'Data Center Shop', url: 'https://shop.datacenter.com', status: 'active' },
    { name: 'Data Center Blog', url: 'https://blog.datacenter.com', status: 'inactive' },
    { name: 'Data Center Support', url: 'https://support.datacenter.com', status: 'active' },
    { name: 'Data Center Partner', url: 'https://partner.datacenter.com', status: 'active' },
    { name: 'Data Center Dev', url: 'https://dev.datacenter.com', status: 'inactive' },
  ];

  for (const site of websites) {
    // Check if website exists
    const existingSite = db.prepare('SELECT * FROM Website WHERE url = ?').get(site.url);
    
    if (existingSite) {
      console.log(`Website "${site.name}" already exists`);
    } else {
      const siteId = 'site_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const siteStmt = db.prepare(`
        INSERT INTO Website (id, name, url, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      siteStmt.run(siteId, site.name, site.url, site.status);
      console.log(`Website "${site.name}" created successfully!`);
    }
  }

  console.log('\n--- Seed completed! ---');
}

seed().then(() => {
  db.close();
}).catch(err => {
  console.error(err);
  db.close();
});
