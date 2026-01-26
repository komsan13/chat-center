-- Migration script to add missing columns to LineChatRoom table

-- Add isPinned column if not exists
ALTER TABLE LineChatRoom ADD COLUMN isPinned INTEGER DEFAULT 0;

-- Add isMuted column if not exists
ALTER TABLE LineChatRoom ADD COLUMN isMuted INTEGER DEFAULT 0;

-- Add tags column if not exists (JSON array string)
ALTER TABLE LineChatRoom ADD COLUMN tags TEXT DEFAULT '[]';

-- Add status column if not exists
ALTER TABLE LineChatRoom ADD COLUMN status TEXT DEFAULT 'active';

-- Add assignedTo column if not exists
ALTER TABLE LineChatRoom ADD COLUMN assignedTo TEXT;

-- Create ChatNote table for customer notes
CREATE TABLE IF NOT EXISTS ChatNote (
  id TEXT PRIMARY KEY,
  roomId TEXT NOT NULL,
  content TEXT NOT NULL,
  createdBy TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roomId) REFERENCES LineChatRoom(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chatnote_roomid ON ChatNote(roomId);
CREATE INDEX IF NOT EXISTS idx_linechatroom_ispinned ON LineChatRoom(isPinned);
CREATE INDEX IF NOT EXISTS idx_linechatroom_status ON LineChatRoom(status);
