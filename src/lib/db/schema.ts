// Drizzle ORM Schema - PostgreSQL
// Migrated from Prisma schema

import { pgTable, text, timestamp, integer, real, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

// Helper for generating IDs
export function generateId(prefix?: string) {
  const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${id}` : id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER & AUTH
// ═══════════════════════════════════════════════════════════════════════════════

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(generateId),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  role: text('role').notNull().default('user'),
  roleId: text('role_id'),
  employeeId: text('employee_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const roles = pgTable('roles', {
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull().unique(),
  description: text('description'),
  color: text('color').notNull().default('#22c55e'),
  permissions: text('permissions').notNull().default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const websites = pgTable('websites', {
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull(),
  url: text('url').notNull().unique(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const banks = pgTable('banks', {
  id: text('id').primaryKey().$defaultFn(generateId),
  type: text('type').notNull().default('deposit'),
  bankName: text('bank_name').notNull(),
  accountName: text('account_name').notNull(),
  accountNumber: text('account_number').notNull().unique(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const employees = pgTable('employees', {
  id: text('id').primaryKey().$defaultFn(generateId),
  fullName: text('full_name').notNull(),
  position: text('position').notNull().default(''),
  websites: text('websites').notNull(),
  bankName: text('bank_name').notNull(),
  accountNumber: text('account_number').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// LINE BOT
// ═══════════════════════════════════════════════════════════════════════════════

export const lineTokens = pgTable('line_tokens', {
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull(),
  channelId: text('channel_id').notNull(),
  channelSecret: text('channel_secret').notNull(),
  accessToken: text('access_token').notNull(),
  websiteId: text('website_id'),
  websiteName: text('website_name'),
  status: text('status').notNull().default('active'),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const quickReplies = pgTable('quick_replies', {
  id: text('id').primaryKey().$defaultFn(generateId),
  lineTokenId: text('line_token_id').notNull(),
  title: text('title').notNull(),
  label: text('label').notNull(),
  icon: text('icon').notNull().default('💬'),
  emojis: text('emojis'),
  isFavorite: boolean('is_favorite').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL
// ═══════════════════════════════════════════════════════════════════════════════

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey().$defaultFn(generateId),
  date: text('date').notNull(),
  websiteId: text('website_id'),
  websiteName: text('website_name'),
  category: text('category').notNull(),
  description: text('description'),
  amount: real('amount').notNull(),
  note: text('note'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const salaries = pgTable('salaries', {
  id: text('id').primaryKey().$defaultFn(generateId),
  employeeId: text('employee_id').notNull(),
  employeeName: text('employee_name').notNull(),
  employeeNickname: text('employee_nickname'),
  position: text('position'),
  websites: text('websites'),
  websiteId: text('website_id'),
  websiteName: text('website_name'),
  month: text('month'),
  baseSalary: real('base_salary').notNull().default(0),
  positionAllowance: real('position_allowance').default(0),
  commission: real('commission').default(0),
  diligenceAllowance: real('diligence_allowance').default(0),
  shiftAllowance: real('shift_allowance').default(0),
  overtime: real('overtime').default(0),
  bonus: real('bonus').notNull().default(0),
  deductions: real('deductions').notNull().default(0),
  totalSalary: real('total_salary').default(0),
  netSalary: real('net_salary').notNull().default(0),
  paymentDate: text('payment_date'),
  status: text('status').notNull().default('pending'),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const salaryBase = pgTable('salary_base', {
  id: text('id').primaryKey().$defaultFn(generateId),
  position: text('position').notNull().unique(),
  baseSalary: real('base_salary').notNull().default(0),
  positionAllowance: real('position_allowance').default(0),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transfers = pgTable('transfers', {
  id: text('id').primaryKey().$defaultFn(generateId),
  date: text('date').notNull(),
  websiteId: text('website_id'),
  websiteName: text('website_name'),
  fromBankId: text('from_bank_id'),
  fromBankName: text('from_bank_name'),
  fromAccountNumber: text('from_account_number'),
  toBankId: text('to_bank_id'),
  toBankName: text('to_bank_name'),
  toAccountNumber: text('to_account_number'),
  amount: real('amount').notNull(),
  fee: real('fee').notNull().default(0),
  note: text('note'),
  status: text('status').default('pending'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cashWithdrawals = pgTable('cash_withdrawals', {
  id: text('id').primaryKey().$defaultFn(generateId),
  date: text('date').notNull(),
  websiteId: text('website_id'),
  websiteName: text('website_name'),
  bankId: text('bank_id'),
  bankName: text('bank_name'),
  amount: real('amount').notNull(),
  fee: real('fee').notNull().default(0),
  note: text('note'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dailyBalances = pgTable('daily_balances', {
  id: text('id').primaryKey().$defaultFn(generateId),
  date: text('date').notNull(),
  bankId: text('bank_id').notNull(),
  bankName: text('bank_name').notNull(),
  openingBalance: real('opening_balance').notNull().default(0),
  closingBalance: real('closing_balance').notNull().default(0),
  deposits: real('deposits').notNull().default(0),
  withdrawals: real('withdrawals').notNull().default(0),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dailySummaries = pgTable('daily_summaries', {
  id: text('id').primaryKey().$defaultFn(generateId),
  date: text('date').notNull(),
  websiteId: text('website_id'),
  websiteName: text('website_name'),
  totalDeposit: real('total_deposit').notNull().default(0),
  totalWithdrawal: real('total_withdrawal').notNull().default(0),
  totalProfit: real('total_profit').notNull().default(0),
  memberCount: integer('member_count').notNull().default(0),
  newMemberCount: integer('new_member_count').notNull().default(0),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// LINE CHAT
// ═══════════════════════════════════════════════════════════════════════════════

export const lineChatRooms = pgTable('line_chat_rooms', {
  id: text('id').primaryKey().$defaultFn(generateId),
  lineUserId: text('line_user_id').notNull(),
  lineTokenId: text('line_token_id'),
  displayName: text('display_name').notNull(),
  pictureUrl: text('picture_url'),
  statusMessage: text('status_message'),
  lastMessage: text('last_message'),
  lastMessageAt: timestamp('last_message_at'),
  unreadCount: integer('unread_count').notNull().default(0),
  isPinned: boolean('is_pinned').notNull().default(false),
  isMuted: boolean('is_muted').notNull().default(false),
  tags: text('tags').notNull().default('[]'),
  status: text('status').notNull().default('active'),
  assignedTo: text('assigned_to'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const lineChatMessages = pgTable('line_chat_messages', {
  id: text('id').primaryKey().$defaultFn(generateId),
  roomId: text('room_id').notNull(),
  lineMessageId: text('line_message_id'),
  messageType: text('message_type').notNull().default('text'),
  content: text('content'),
  mediaUrl: text('media_url'),
  stickerId: text('sticker_id'),
  packageId: text('package_id'),
  stickerPackageId: text('sticker_package_id'),
  emojis: text('emojis'),
  sender: text('sender').notNull().default('user'),
  senderName: text('sender_name'),
  status: text('status').notNull().default('sent'),
  replyToId: text('reply_to_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const chatNotes = pgTable('chat_notes', {
  id: text('id').primaryKey().$defaultFn(generateId),
  roomId: text('room_id').notNull(),
  content: text('content').notNull(),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Website = typeof websites.$inferSelect;
export type NewWebsite = typeof websites.$inferInsert;

export type Bank = typeof banks.$inferSelect;
export type NewBank = typeof banks.$inferInsert;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export type LineToken = typeof lineTokens.$inferSelect;
export type NewLineToken = typeof lineTokens.$inferInsert;

export type QuickReply = typeof quickReplies.$inferSelect;
export type NewQuickReply = typeof quickReplies.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type Salary = typeof salaries.$inferSelect;
export type NewSalary = typeof salaries.$inferInsert;

export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;

export type CashWithdrawal = typeof cashWithdrawals.$inferSelect;
export type NewCashWithdrawal = typeof cashWithdrawals.$inferInsert;

export type DailyBalance = typeof dailyBalances.$inferSelect;
export type NewDailyBalance = typeof dailyBalances.$inferInsert;

export type DailySummary = typeof dailySummaries.$inferSelect;
export type NewDailySummary = typeof dailySummaries.$inferInsert;

export type LineChatRoom = typeof lineChatRooms.$inferSelect;
export type NewLineChatRoom = typeof lineChatRooms.$inferInsert;

export type LineChatMessage = typeof lineChatMessages.$inferSelect;
export type NewLineChatMessage = typeof lineChatMessages.$inferInsert;

export type ChatNote = typeof chatNotes.$inferSelect;
export type NewChatNote = typeof chatNotes.$inferInsert;
