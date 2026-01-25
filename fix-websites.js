const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');

// Update websiteName from websiteId where empty
db.prepare("UPDATE Salaries SET websiteName = websiteId WHERE websiteName = '' OR websiteName IS NULL").run();

console.log('Updated Salaries!');

// Check result
const rows = db.prepare('SELECT id, employeeName, websiteId, websiteName FROM Salaries').all();
console.log(JSON.stringify(rows, null, 2));

db.close();
