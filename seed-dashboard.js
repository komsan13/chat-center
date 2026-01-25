const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

// Helper to generate unique IDs
function generateId(prefix = '') {
  return prefix + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Create tables if not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS Product (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    image TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "Order" (
    id TEXT PRIMARY KEY,
    orderNo TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS OrderItem (
    id TEXT PRIMARY KEY,
    orderId TEXT NOT NULL,
    productId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Revenue (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    revenue REAL NOT NULL,
    profit REAL NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS DailySales (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    dayName TEXT NOT NULL,
    sales REAL NOT NULL,
    orders INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Clear existing data
db.exec(`DELETE FROM Product`);
db.exec(`DELETE FROM "Order"`);
db.exec(`DELETE FROM OrderItem`);
db.exec(`DELETE FROM Revenue`);
db.exec(`DELETE FROM DailySales`);

console.log('Tables created, existing data cleared');

// Insert Products
const products = [
  { id: generateId('prod_'), name: 'MacBook Pro 16"', category: 'Electronics', price: 2499, stock: 45 },
  { id: generateId('prod_'), name: 'iPhone 15 Pro', category: 'Electronics', price: 999, stock: 120 },
  { id: generateId('prod_'), name: 'AirPods Pro', category: 'Audio', price: 249, stock: 200 },
  { id: generateId('prod_'), name: 'iPad Air', category: 'Electronics', price: 599, stock: 78 },
  { id: generateId('prod_'), name: 'Apple Watch Ultra', category: 'Wearables', price: 799, stock: 56 },
  { id: generateId('prod_'), name: 'Magic Keyboard', category: 'Accessories', price: 299, stock: 89 },
  { id: generateId('prod_'), name: 'Studio Display', category: 'Electronics', price: 1599, stock: 23 },
  { id: generateId('prod_'), name: 'HomePod Mini', category: 'Audio', price: 99, stock: 150 },
];

const insertProduct = db.prepare(`
  INSERT INTO Product (id, name, category, price, stock, createdAt, updatedAt) 
  VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

for (const p of products) {
  insertProduct.run(p.id, p.name, p.category, p.price, p.stock);
}
console.log('Products inserted:', products.length);

// Get existing users
const users = db.prepare(`SELECT id, name, email FROM User`).all();
console.log('Found users:', users.length);

// Create test user if not exists
if (users.length === 0) {
  const hashedPassword = bcrypt.hashSync('password123', 10);
  db.prepare(`INSERT INTO User (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)`).run(
    generateId('user_'), 'customer@test.com', hashedPassword, 'Test Customer', 'customer'
  );
  users.push({ id: generateId('user_'), name: 'Test Customer', email: 'customer@test.com' });
}

// Create customer users for orders
const customerNames = [
  { name: 'John Smith', email: 'john@example.com' },
  { name: 'Sarah Johnson', email: 'sarah@example.com' },
  { name: 'Mike Wilson', email: 'mike@example.com' },
  { name: 'Emily Davis', email: 'emily@example.com' },
  { name: 'Chris Brown', email: 'chris@example.com' },
  { name: 'Lisa Anderson', email: 'lisa@example.com' },
  { name: 'David Martinez', email: 'david@example.com' },
  { name: 'Amanda Taylor', email: 'amanda@example.com' },
  { name: 'James Thomas', email: 'james@example.com' },
  { name: 'Jennifer White', email: 'jennifer@example.com' },
];

const customerIds = [];
const hashedPassword = bcrypt.hashSync('customer123', 10);

for (const c of customerNames) {
  const existingUser = db.prepare(`SELECT id FROM User WHERE email = ?`).get(c.email);
  if (existingUser) {
    customerIds.push(existingUser.id);
  } else {
    const id = generateId('user_');
    db.prepare(`INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
      id, c.email, hashedPassword, c.name, 'customer'
    );
    customerIds.push(id);
  }
}
console.log('Customers ready:', customerIds.length);

// Insert Orders
const statuses = ['Completed', 'Processing', 'Pending', 'Cancelled'];
const orders = [];
const baseDate = new Date('2026-01-25');

for (let i = 0; i < 20; i++) {
  const orderDate = new Date(baseDate);
  orderDate.setDate(orderDate.getDate() - Math.floor(i / 3)); // Multiple orders per day
  
  const orderId = generateId('ord_');
  const orderNo = `#ORD-${7900 - i}`;
  const userId = customerIds[i % customerIds.length];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const amount = Math.floor(Math.random() * 3000) + 200;
  
  orders.push({ id: orderId, orderNo, userId, amount, status, createdAt: orderDate.toISOString() });
}

const insertOrder = db.prepare(`
  INSERT INTO "Order" (id, orderNo, userId, amount, status, createdAt, updatedAt) 
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
`);

for (const o of orders) {
  insertOrder.run(o.id, o.orderNo, o.userId, o.amount, o.status, o.createdAt);
}
console.log('Orders inserted:', orders.length);

// Insert OrderItems (2-4 items per order)
const insertOrderItem = db.prepare(`
  INSERT INTO OrderItem (id, orderId, productId, quantity, price) VALUES (?, ?, ?, ?, ?)
`);

for (const order of orders) {
  const itemCount = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < itemCount; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    insertOrderItem.run(generateId('item_'), order.id, product.id, quantity, product.price);
  }
}
console.log('Order items inserted');

// Insert Revenue data (last 12 months)
const insertRevenue = db.prepare(`
  INSERT INTO Revenue (id, date, revenue, profit, createdAt) VALUES (?, ?, ?, ?, datetime('now'))
`);

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const revenueData = [
  { revenue: 42000, profit: 24000 },
  { revenue: 38000, profit: 19800 },
  { revenue: 55000, profit: 38000 },
  { revenue: 47800, profit: 29080 },
  { revenue: 58900, profit: 38000 },
  { revenue: 63900, profit: 43000 },
  { revenue: 74900, profit: 51000 },
  { revenue: 68000, profit: 44000 },
  { revenue: 72000, profit: 48000 },
  { revenue: 81000, profit: 55000 },
  { revenue: 89000, profit: 62000 },
  { revenue: 98000, profit: 70000 },
];

for (let i = 0; i < 12; i++) {
  const date = new Date(2025, i, 1);
  insertRevenue.run(generateId('rev_'), date.toISOString(), revenueData[i].revenue, revenueData[i].profit);
}
console.log('Revenue data inserted: 12 months');

// Insert DailySales (last 7 days)
const insertDailySales = db.prepare(`
  INSERT INTO DailySales (id, date, dayName, sales, orders, createdAt) VALUES (?, ?, ?, ?, ?, datetime('now'))
`);

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dailySalesData = [
  { sales: 34900, orders: 45 },  // Sat (yesterday if today is Sun)
  { sales: 63900, orders: 78 },  // Fri
  { sales: 58900, orders: 72 },  // Thu
  { sales: 47800, orders: 58 },  // Wed
  { sales: 50000, orders: 61 },  // Tue
  { sales: 30000, orders: 38 },  // Mon
  { sales: 40000, orders: 52 },  // Sun (a week ago)
];

for (let i = 0; i < 7; i++) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() - i);
  const dayName = dayNames[date.getDay()];
  insertDailySales.run(generateId('ds_'), date.toISOString(), dayName, dailySalesData[i].sales, dailySalesData[i].orders);
}
console.log('Daily sales data inserted: 7 days');

// Print summary
const productCount = db.prepare(`SELECT COUNT(*) as count FROM Product`).get();
const orderCount = db.prepare(`SELECT COUNT(*) as count FROM "Order"`).get();
const revenueCount = db.prepare(`SELECT COUNT(*) as count FROM Revenue`).get();
const salesCount = db.prepare(`SELECT COUNT(*) as count FROM DailySales`).get();

console.log('\n=== Summary ===');
console.log('Products:', productCount.count);
console.log('Orders:', orderCount.count);
console.log('Revenue records:', revenueCount.count);
console.log('Daily sales records:', salesCount.count);

db.close();
console.log('\nDashboard data seeded successfully!');
