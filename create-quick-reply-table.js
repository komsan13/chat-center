const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('Creating QuickReply table...');

try {
  // Check if QuickReply table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='QuickReply'
  `).get();
  
  if (!tableExists) {
    db.exec(`
      CREATE TABLE QuickReply (
        id TEXT PRIMARY KEY,
        lineTokenId TEXT NOT NULL,
        title TEXT NOT NULL,
        label TEXT NOT NULL,
        icon TEXT DEFAULT '💬',
        emojis TEXT,
        isFavorite INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ QuickReply table created successfully!');
  } else {
    console.log('✅ QuickReply table already exists.');
  }
  
  // Verify table structure
  const tableInfo = db.prepare("PRAGMA table_info(QuickReply)").all();
  console.log('\nQuickReply table structure:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
