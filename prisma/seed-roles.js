// Node.js script สำหรับ seed roles และ permissions
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath);

function generateId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Default permissions สำหรับ admin
const adminPermissions = JSON.stringify({
  viewDashboard: true,
  viewReports: true,
  viewDailySummary: true,
  viewDailyBalance: true,
  viewCashWithdrawal: true,
  viewTransfer: true,
  viewExpenses: true,
  viewDataManagement: true,
  viewWebsites: true,
  viewBanks: true,
  viewEmployees: true,
  viewSalaryBase: true,
  viewLineTokens: true,
  viewFinance: true,
  viewSalaryPayment: true,
  viewPermissions: true,
  viewRoles: true,
  viewUsers: true,
  viewDataChat: true,
  manageUsers: true,
  manageRoles: true,
  managePermissions: true,
  manageData: true,
  manageFinance: true,
  manageReports: true,
});

const now = new Date().toISOString();

try {
  // สร้าง Admin Role
  const adminRoleId = generateId();
  db.prepare(`
    INSERT OR IGNORE INTO Role (id, name, description, color, permissions, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(adminRoleId, 'Admin', 'ผู้ดูแลระบบ - สิทธิ์เต็มรูปแบบ', '#ef4444', adminPermissions, now, now);

  // สร้าง Manager Role
  const managerRoleId = generateId();
  const managerPermissions = JSON.stringify({
    viewDashboard: true,
    viewReports: true,
    viewDailySummary: true,
    viewDailyBalance: true,
    viewCashWithdrawal: true,
    viewTransfer: true,
    viewExpenses: true,
    viewDataManagement: true,
    viewWebsites: true,
    viewBanks: true,
    viewEmployees: true,
    viewSalaryBase: true,
    viewLineTokens: true,
    viewFinance: true,
    viewSalaryPayment: true,
    viewDataChat: true,
    manageData: true,
    manageFinance: true,
    manageReports: true,
  });
  db.prepare(`
    INSERT OR IGNORE INTO Role (id, name, description, color, permissions, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(managerRoleId, 'Manager', 'ผู้จัดการ - จัดการข้อมูลและรายงาน', '#f59e0b', managerPermissions, now, now);

  // สร้าง User Role
  const userRoleId = generateId();
  const userPermissions = JSON.stringify({
    viewDashboard: true,
    viewReports: true,
    viewDailySummary: true,
    viewDailyBalance: true,
    viewDataChat: true,
  });
  db.prepare(`
    INSERT OR IGNORE INTO Role (id, name, description, color, permissions, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userRoleId, 'User', 'ผู้ใช้งานทั่วไป - ดูข้อมูลเท่านั้น', '#22c55e', userPermissions, now, now);

  // อัพเดท Admin User ให้มี roleId
  db.prepare(`
    UPDATE User SET role = 'admin' WHERE email = 'admin@aurix.com'
  `).run();

  console.log('Roles seeded successfully!');
  console.log('- Admin Role');
  console.log('- Manager Role');
  console.log('- User Role');

  db.close();
} catch (error) {
  console.error('Seed roles error:', error);
  db.close();
  process.exit(1);
}
