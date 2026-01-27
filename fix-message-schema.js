/**
 * Migration script to fix LineChatMessage table schema
 * Ensures correct column names: messageType, sender, packageId
 * Migrates data from old columns: type, senderType, stickerPackageId
 * 
 * Run: node fix-message-schema.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
console.log('📂 Database path:', dbPath);

const db = new Database(dbPath);

function migrateSchema() {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('🔧 LineChatMessage Schema Migration');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  try {
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='LineChatMessage'
    `).get();

    if (!tableExists) {
      console.log('⚠️  LineChatMessage table does not exist. Creating new table...');
      
      db.exec(`
        CREATE TABLE LineChatMessage (
          id TEXT PRIMARY KEY,
          roomId TEXT NOT NULL,
          lineMessageId TEXT,
          messageType TEXT NOT NULL DEFAULT 'text',
          content TEXT,
          mediaUrl TEXT,
          stickerId TEXT,
          packageId TEXT,
          stickerPackageId TEXT,
          emojis TEXT,
          sender TEXT NOT NULL DEFAULT 'user',
          senderName TEXT,
          status TEXT DEFAULT 'sent',
          replyToId TEXT,
          isDeleted INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (roomId) REFERENCES LineChatRoom(id)
        )
      `);
      
      console.log('✅ Created new LineChatMessage table with correct schema');
      return;
    }

    // Get existing columns
    const columns = db.prepare(`PRAGMA table_info(LineChatMessage)`).all();
    const columnNames = columns.map(c => c.name);
    
    console.log('📋 Existing columns:', columnNames.join(', '));

    // Check what needs to be done
    const hasType = columnNames.includes('type');
    const hasMessageType = columnNames.includes('messageType');
    const hasSenderType = columnNames.includes('senderType');
    const hasSender = columnNames.includes('sender');
    const hasStickerPackageId = columnNames.includes('stickerPackageId');
    const hasPackageId = columnNames.includes('packageId');

    console.log('\n📊 Column Status:');
    console.log(`   type: ${hasType ? '✓ exists' : '✗ missing'}`);
    console.log(`   messageType: ${hasMessageType ? '✓ exists' : '✗ missing'}`);
    console.log(`   senderType: ${hasSenderType ? '✓ exists' : '✗ missing'}`);
    console.log(`   sender: ${hasSender ? '✓ exists' : '✗ missing'}`);
    console.log(`   stickerPackageId: ${hasStickerPackageId ? '✓ exists' : '✗ missing'}`);
    console.log(`   packageId: ${hasPackageId ? '✓ exists' : '✗ missing'}`);

    // Add missing columns
    const migrations = [];

    if (!hasMessageType) {
      migrations.push({
        name: 'Add messageType column',
        sql: `ALTER TABLE LineChatMessage ADD COLUMN messageType TEXT NOT NULL DEFAULT 'text'`
      });
    }

    if (!hasSender) {
      migrations.push({
        name: 'Add sender column',
        sql: `ALTER TABLE LineChatMessage ADD COLUMN sender TEXT NOT NULL DEFAULT 'user'`
      });
    }

    if (!hasPackageId) {
      migrations.push({
        name: 'Add packageId column',
        sql: `ALTER TABLE LineChatMessage ADD COLUMN packageId TEXT`
      });
    }

    if (!hasStickerPackageId) {
      migrations.push({
        name: 'Add stickerPackageId column (for backwards compatibility)',
        sql: `ALTER TABLE LineChatMessage ADD COLUMN stickerPackageId TEXT`
      });
    }

    // Run migrations
    if (migrations.length > 0) {
      console.log('\n🔄 Running migrations...');
      for (const migration of migrations) {
        try {
          db.exec(migration.sql);
          console.log(`   ✅ ${migration.name}`);
        } catch (err) {
          if (err.message.includes('duplicate column')) {
            console.log(`   ⏭️  ${migration.name} (column already exists)`);
          } else {
            console.error(`   ❌ ${migration.name}: ${err.message}`);
          }
        }
      }
    }

    // Migrate data from old columns to new columns
    console.log('\n🔄 Migrating data...');

    // Copy type → messageType (if both exist and messageType is empty/default)
    if (hasType && hasMessageType) {
      const updated = db.prepare(`
        UPDATE LineChatMessage 
        SET messageType = type 
        WHERE type IS NOT NULL 
          AND type != '' 
          AND (messageType IS NULL OR messageType = 'text')
      `).run();
      console.log(`   📝 type → messageType: ${updated.changes} rows updated`);
    }

    // Copy senderType → sender (if both exist and sender is empty/default)
    if (hasSenderType && hasSender) {
      const updated = db.prepare(`
        UPDATE LineChatMessage 
        SET sender = senderType 
        WHERE senderType IS NOT NULL 
          AND senderType != '' 
          AND (sender IS NULL OR sender = 'user')
      `).run();
      console.log(`   📝 senderType → sender: ${updated.changes} rows updated`);
    }

    // Copy stickerPackageId → packageId (if both exist)
    if (hasStickerPackageId && hasPackageId) {
      const updated = db.prepare(`
        UPDATE LineChatMessage 
        SET packageId = stickerPackageId 
        WHERE stickerPackageId IS NOT NULL 
          AND stickerPackageId != '' 
          AND (packageId IS NULL OR packageId = '')
      `).run();
      console.log(`   📝 stickerPackageId → packageId: ${updated.changes} rows updated`);
    }

    // Also copy packageId → stickerPackageId (for backwards compatibility)
    if (hasPackageId && hasStickerPackageId) {
      const updated = db.prepare(`
        UPDATE LineChatMessage 
        SET stickerPackageId = packageId 
        WHERE packageId IS NOT NULL 
          AND packageId != '' 
          AND (stickerPackageId IS NULL OR stickerPackageId = '')
      `).run();
      console.log(`   📝 packageId → stickerPackageId: ${updated.changes} rows updated`);
    }

    // Create indexes for performance
    console.log('\n📇 Creating indexes...');
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_linechatmessage_roomid ON LineChatMessage(roomId)`);
      console.log('   ✅ Index on roomId created');
    } catch (err) {
      console.log('   ⏭️  Index on roomId already exists');
    }

    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_linechatmessage_createdat ON LineChatMessage(createdAt)`);
      console.log('   ✅ Index on createdAt created');
    } catch (err) {
      console.log('   ⏭️  Index on createdAt already exists');
    }

    // Verify final state
    const finalColumns = db.prepare(`PRAGMA table_info(LineChatMessage)`).all();
    const finalColumnNames = finalColumns.map(c => c.name);
    
    console.log('\n📋 Final columns:', finalColumnNames.join(', '));

    // Count messages
    const msgCount = db.prepare(`SELECT COUNT(*) as count FROM LineChatMessage`).get();
    console.log(`\n📊 Total messages in database: ${msgCount.count}`);

    // Sample some data to verify
    const sampleMsgs = db.prepare(`
      SELECT id, messageType, sender, packageId, stickerId 
      FROM LineChatMessage 
      ORDER BY createdAt DESC 
      LIMIT 5
    `).all();

    if (sampleMsgs.length > 0) {
      console.log('\n📝 Sample messages (latest 5):');
      sampleMsgs.forEach((msg, i) => {
        console.log(`   ${i + 1}. ID: ${msg.id.substring(0, 20)}...`);
        console.log(`      messageType: ${msg.messageType}, sender: ${msg.sender}`);
        if (msg.stickerId) {
          console.log(`      packageId: ${msg.packageId}, stickerId: ${msg.stickerId}`);
        }
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('✅ Migration completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration
migrateSchema();
