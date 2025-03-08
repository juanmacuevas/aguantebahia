-- Drop existing tables if they exist to reset the schema
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS admin_users;

-- Create incidents table with the correct structure
CREATE TABLE incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  description TEXT NOT NULL,
  urgent INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL,  -- Almacena JSON con lat/lng
  timestamp TEXT NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_incidents_timestamp ON incidents(timestamp);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_urgent ON incidents(urgent);

-- Create admin users table (for future admin panel)
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);