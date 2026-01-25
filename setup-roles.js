const db = require('better-sqlite3')('./prisma/dev.db');

// Check tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Existing tables:', tables.map(t => t.name).join(', '));

// Create Role table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS Role (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#22c55e',
    permissions TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('Role table created/exists');

// Check if Role table has data
const roles = db.prepare("SELECT * FROM Role").all();
console.log('Existing roles:', roles.length);

// Insert default roles if empty
if (roles.length === 0) {
  const insertRole = db.prepare(`
    INSERT INTO Role (id, name, description, color, permissions)
    VALUES (?, ?, ?, ?, ?)
  `);

  const defaultRoles = [
    {
      id: 'role_admin',
      name: 'Admin',
      description: 'สิทธิ์เต็มรูปแบบในการจัดการระบบทั้งหมด',
      color: '#ef4444',
      permissions: JSON.stringify({
        manageUsers: true,
        managePermissions: true,
        viewReports: true,
        manageData: true,
        manageChat: true,
        manageSettings: true
      })
    },
    {
      id: 'role_operator',
      name: 'Operator',
      description: 'สิทธิ์สำหรับพนักงานทั่วไป',
      color: '#22c55e',
      permissions: JSON.stringify({
        manageUsers: false,
        managePermissions: false,
        viewReports: true,
        manageData: true,
        manageChat: true,
        manageSettings: false
      })
    },
    {
      id: 'role_viewer',
      name: 'Viewer',
      description: 'สิทธิ์ดูข้อมูลอย่างเดียว',
      color: '#3b82f6',
      permissions: JSON.stringify({
        manageUsers: false,
        managePermissions: false,
        viewReports: true,
        manageData: false,
        manageChat: false,
        manageSettings: false
      })
    }
  ];

  for (const role of defaultRoles) {
    insertRole.run(role.id, role.name, role.description, role.color, role.permissions);
  }
  console.log('Default roles inserted');
}

// Check User table structure
const userCols = db.prepare("PRAGMA table_info(User)").all();
console.log('User columns:', userCols.map(c => c.name).join(', '));

// Add roleId column to User if not exists
const hasRoleId = userCols.find(c => c.name === 'roleId');
if (!hasRoleId) {
  db.exec("ALTER TABLE User ADD COLUMN roleId TEXT DEFAULT 'role_operator'");
  console.log('Added roleId column to User table');
}

db.close();
console.log('Done!');
