const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const dbFile = process.env.DATABASE_FILE || './data/cleanbnb.sqlite3';
const dir = require('path').dirname(dbFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
const db = new sqlite3.Database(dbFile);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT, phone TEXT, created_at TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY, title TEXT, address TEXT, owner_id TEXT, default_clean_minutes INTEGER DEFAULT 90, created_at TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, property_id TEXT, external_id TEXT, checkin TEXT, checkout TEXT, source TEXT, created_at TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, booking_id TEXT, property_id TEXT, scheduled_start TEXT, scheduled_end TEXT, estimated_minutes INTEGER, status TEXT, cleaner_id TEXT, checklist TEXT, photos TEXT, notes TEXT, created_at TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS ical_sources (
    id TEXT PRIMARY KEY, property_id TEXT, url TEXT, last_sync TEXT
  )`);
  console.log('DB initialized at', dbFile);
  db.close();
});
