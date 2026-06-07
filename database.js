const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Default empty database structure
const DEFAULT_DATA = {
  users: [],
  schemes: [],
  members: [],
  payments: [],
  loans: []
};

// Load database from disk (or create with defaults)
function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading database, starting fresh:', err.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

// In-memory cache
let data = load();

// Persist to disk
function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Generic helpers
const db = {
  // Get all records from a collection
  all(collection) {
    return data[collection] || [];
  },

  // Find one record matching a predicate
  find(collection, predicate) {
    return (data[collection] || []).find(predicate);
  },

  // Filter records
  filter(collection, predicate) {
    return (data[collection] || []).filter(predicate);
  },

  // Insert a record
  insert(collection, record) {
    if (!data[collection]) data[collection] = [];
    data[collection].push(record);
    save();
    return record;
  },

  // Update a record by id
  update(collection, id, updates) {
    const idx = (data[collection] || []).findIndex(r => r.id === id);
    if (idx === -1) return null;
    data[collection][idx] = { ...data[collection][idx], ...updates };
    save();
    return data[collection][idx];
  },

  // Delete a record by id
  remove(collection, id) {
    const before = (data[collection] || []).length;
    data[collection] = (data[collection] || []).filter(r => r.id !== id);
    save();
    return before !== data[collection].length;
  },

  // Reset everything (used for seeding check)
  isEmpty(collection) {
    return !data[collection] || data[collection].length === 0;
  },

  save
};

module.exports = db;
