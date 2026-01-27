// Fix LineChatMessage columns
// Add missing columns: type, senderType, mediaUrl, etc.

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('Fixing LineChatMessage columns...');

try {
  // Check current columns
  const columns = db.prepare(`PRAGMA table_info(LineChatMessage)`).all();
  const columnNames = columns.map(c => c.name);
  
  console.log('Current columns:', columnNames);

  // Add missing columns
  const migrations = [
    { column: 'type', sql: "ALTER TABLE LineChatMessage ADD COLUMN type TEXT DEFAULT 'text'" },
    { column: 'senderType', sql: "ALTER TABLE LineChatMessage ADD COLUMN senderType TEXT DEFAULT 'user'" },
    { column: 'mediaUrl', sql: 'ALTER TABLE LineChatMessage ADD COLUMN mediaUrl TEXT' },
    { column: 'stickerId', sql: 'ALTER TABLE LineChatMessage ADD COLUMN stickerId TEXT' },
    { column: 'stickerPackageId', sql: 'ALTER TABLE LineChatMessage ADD COLUMN stickerPackageId TEXT' },
    { column: 'emojis', sql: 'ALTER TABLE LineChatMessage ADD COLUMN emojis TEXT' },
    { column: 'lastMessage', sql: 'ALTER TABLE LineChatRoom ADD COLUMN lastMessage TEXT', table: 'LineChatRoom' },
  ];

  for (const m of migrations) {
    const table = m.table || 'LineChatMessage';
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    const colNames = cols.map(c => c.name);
    
    if (!colNames.includes(m.column)) {
      try {
        db.exec(m.sql);
        console.log(`✅ Added column: ${m.column} to ${table}`);
      } catch (e) {
        console.log(`⚠️ Could not add ${m.column}: ${e.message}`);
      }
    } else {
      console.log(`✓ Column ${m.column} already exists in ${table}`);
    }
  }

  // Verify final columns
  const finalColumns = db.prepare(`PRAGMA table_info(LineChatMessage)`).all();
  console.log('\nFinal LineChatMessage columns:', finalColumns.map(c => c.name));

  const roomColumns = db.prepare(`PRAGMA table_info(LineChatRoom)`).all();
  console.log('Final LineChatRoom columns:', roomColumns.map(c => c.name));

  console.log('\n✅ Done!');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
