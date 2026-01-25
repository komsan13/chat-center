// Node.js script สำหรับสร้างตารางทั้งหมดใน dev.db ด้วย better-sqlite3
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath);

const sql = `
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  roleId TEXT,
  employeeId TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Product (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Order" (
  id TEXT PRIMARY KEY,
  orderNo TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES "User"(id)
);

CREATE TABLE IF NOT EXISTS OrderItem (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  productId TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (orderId) REFERENCES "Order"(id),
  FOREIGN KEY (productId) REFERENCES Product(id)
);

CREATE TABLE IF NOT EXISTS Revenue (
  id TEXT PRIMARY KEY,
  date DATETIME NOT NULL,
  revenue REAL NOT NULL,
  profit REAL NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS DailySales (
  id TEXT PRIMARY KEY,
  date DATETIME NOT NULL,
  dayName TEXT NOT NULL,
  sales REAL NOT NULL,
  orders INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Role (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#22c55e',
  permissions TEXT DEFAULT '{}',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Website (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Bank (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'deposit',
  bankName TEXT NOT NULL,
  accountName TEXT NOT NULL,
  accountNumber TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Employee (
  id TEXT PRIMARY KEY,
  fullName TEXT NOT NULL,
  websites TEXT NOT NULL,
  bankName TEXT NOT NULL,
  accountNumber TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS LineToken (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  channelId TEXT NOT NULL,
  channelSecret TEXT NOT NULL,
  accessToken TEXT NOT NULL,
  websiteId TEXT,
  websiteName TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  lastUsed DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS DailySummary (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  websiteId TEXT,
  websiteName TEXT,
  totalDeposit REAL DEFAULT 0,
  totalWithdrawal REAL DEFAULT 0,
  totalProfit REAL DEFAULT 0,
  transactionCount INTEGER DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS DailyBalance (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  websiteId TEXT,
  websiteName TEXT,
  bankId TEXT NOT NULL,
  bankName TEXT NOT NULL,
  accountNumber TEXT,
  openingBalance REAL DEFAULT 0,
  closingBalance REAL DEFAULT 0,
  totalIn REAL DEFAULT 0,
  totalOut REAL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, bankId)
);

CREATE TABLE IF NOT EXISTS CashWithdrawal (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  websiteId TEXT,
  websiteName TEXT,
  bankId TEXT NOT NULL,
  bankName TEXT NOT NULL,
  accountNumber TEXT NOT NULL,
  accountName TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  fee REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  note TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Transfer (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  websiteId TEXT,
  websiteName TEXT,
  fromBankId TEXT NOT NULL,
  fromBankName TEXT NOT NULL,
  fromAccountNumber TEXT,
  toBankId TEXT NOT NULL,
  toBankName TEXT NOT NULL,
  toAccountNumber TEXT,
  amount REAL NOT NULL DEFAULT 0,
  note TEXT,
  status TEXT DEFAULT 'pending',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  websiteId TEXT,
  websiteName TEXT,
  category TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL DEFAULT 0,
  requester TEXT,
  paymentType TEXT DEFAULT 'cash',
  bankId TEXT,
  bankName TEXT,
  accountNumber TEXT,
  status TEXT DEFAULT 'unpaid',
  note TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS SalaryBase (
  id TEXT PRIMARY KEY,
  position TEXT NOT NULL UNIQUE,
  baseSalary REAL NOT NULL DEFAULT 0,
  positionAllowance REAL NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Salaries (
  id TEXT PRIMARY KEY,
  employeeId TEXT NOT NULL,
  employeeName TEXT,
  employeeNickname TEXT,
  month TEXT NOT NULL,
  websiteId TEXT,
  websiteName TEXT,
  position TEXT,
  baseSalary REAL NOT NULL DEFAULT 0,
  positionAllowance REAL DEFAULT 0,
  commission REAL DEFAULT 0,
  diligenceAllowance REAL DEFAULT 0,
  shiftAllowance REAL DEFAULT 0,
  overtime REAL DEFAULT 0,
  bonus REAL DEFAULT 0,
  totalSalary REAL DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- LINE Chat Tables
CREATE TABLE IF NOT EXISTS LineChatRoom (
  id TEXT PRIMARY KEY,
  lineUserId TEXT NOT NULL UNIQUE,
  lineTokenId TEXT,
  displayName TEXT,
  pictureUrl TEXT,
  statusMessage TEXT,
  language TEXT,
  lastMessageAt DATETIME,
  unreadCount INTEGER DEFAULT 0,
  isPinned INTEGER DEFAULT 0,
  isMuted INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS LineChatMessage (
  id TEXT PRIMARY KEY,
  roomId TEXT NOT NULL,
  lineMessageId TEXT,
  messageType TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  mediaUrl TEXT,
  stickerId TEXT,
  packageId TEXT,
  sender TEXT NOT NULL DEFAULT 'user',
  senderName TEXT,
  status TEXT DEFAULT 'sent',
  replyToId TEXT,
  isDeleted INTEGER DEFAULT 0,
  readAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roomId) REFERENCES LineChatRoom(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_room_line_user ON LineChatRoom(lineUserId);
CREATE INDEX IF NOT EXISTS idx_chat_message_room ON LineChatMessage(roomId);
CREATE INDEX IF NOT EXISTS idx_chat_message_created ON LineChatMessage(createdAt);
`;

db.exec(sql);
db.close();

console.log('All tables created successfully!');
