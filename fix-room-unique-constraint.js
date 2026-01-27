// Fix LineChatRoom UNIQUE constraint
// Change from UNIQUE(lineUserId) to UNIQUE(lineUserId, lineTokenId)
// This allows the same LINE user to have rooms in different channels

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('Fixing LineChatRoom UNIQUE constraint...');

try {
  // Start transaction
  db.exec('BEGIN TRANSACTION');

  // Check current indexes
  const indexes = db.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='index' AND tbl_name='LineChatRoom'
  `).all();
  
  console.log('Current indexes:', indexes);

  // SQLite doesn't support dropping constraints directly
  // We need to recreate the table
  
  // 1. Create new table with correct constraints
  db.exec(`
    CREATE TABLE IF NOT EXISTS LineChatRoom_new (
      id TEXT PRIMARY KEY,
      lineUserId TEXT NOT NULL,
      lineTokenId TEXT,
      displayName TEXT NOT NULL,
      pictureUrl TEXT,
      statusMessage TEXT,
      lastMessageAt TEXT,
      unreadCount INTEGER DEFAULT 0,
      isPinned INTEGER DEFAULT 0,
      isMuted INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      assignedTo TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lineUserId, lineTokenId)
    )
  `);
  
  // 2. Copy data from old table
  db.exec(`
    INSERT OR IGNORE INTO LineChatRoom_new 
    SELECT id, lineUserId, lineTokenId, displayName, pictureUrl, statusMessage, 
           lastMessageAt, unreadCount, isPinned, isMuted, tags, status, 
           assignedTo, createdAt, updatedAt
    FROM LineChatRoom
  `);
  
  // 3. Check how many rows were copied
  const oldCount = db.prepare('SELECT COUNT(*) as count FROM LineChatRoom').get();
  const newCount = db.prepare('SELECT COUNT(*) as count FROM LineChatRoom_new').get();
  
  console.log(`Old table has ${oldCount.count} rows`);
  console.log(`New table has ${newCount.count} rows`);
  
  // 4. Drop old table
  db.exec('DROP TABLE LineChatRoom');
  
  // 5. Rename new table
  db.exec('ALTER TABLE LineChatRoom_new RENAME TO LineChatRoom');
  
  // 6. Recreate indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_linechatroom_status ON LineChatRoom(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_linechatroom_lineUserId ON LineChatRoom(lineUserId)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_linechatroom_lineTokenId ON LineChatRoom(lineTokenId)');
  
  // Commit transaction
  db.exec('COMMIT');
  
  console.log('✅ Successfully fixed LineChatRoom UNIQUE constraint!');
  console.log('   Now UNIQUE on (lineUserId, lineTokenId) combination');
  
  // Verify
  const newIndexes = db.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='index' AND tbl_name='LineChatRoom'
  `).all();
  console.log('New indexes:', newIndexes);
  
  // Show table info
  const tableInfo = db.prepare(`
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='LineChatRoom'
  `).get();
  console.log('Table schema:', tableInfo.sql);

} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
