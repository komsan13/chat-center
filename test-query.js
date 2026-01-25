const db = require('better-sqlite3')('./prisma/dev.db');

console.log('=== ทดสอบข้อมูลวันที่ 25 มกราคม 2026 ===\n');

// ถอนเงิน
const cashWithdrawals = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(fee), 0) as totalFee FROM CashWithdrawal WHERE date = ?`).get('2026-01-25');
console.log('1. ถอนเงิน:', cashWithdrawals.total.toLocaleString(), 'บาท');
console.log('2. ค่าธรรมเนียม:', cashWithdrawals.totalFee.toLocaleString(), 'บาท');

// โยกเงินสด
const transfer = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM Transfer WHERE date = ? AND (fromBankName = 'เงินสด' OR fromBankName LIKE '%เงินสด%')`).get('2026-01-25');
console.log('3. โยกเงินสด:', transfer.total.toLocaleString(), 'บาท');

// ค่าใช้จ่ายเงินสด
const expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM Expenses WHERE date = ? AND (paymentType = 'เงินสด' OR paymentType = 'cash')`).get('2026-01-25');
console.log('4. ค่าใช้จ่ายเงินสด:', (expenses?.total || 0).toLocaleString(), 'บาท');

// ยอดคงเหลือรายวัน
const dailyBalance = db.prepare(`SELECT COALESCE(SUM(closingBalance), 0) as total FROM DailyBalance WHERE date = ?`).get('2026-01-25');
console.log('5. ยอดคงเหลือรายวัน:', dailyBalance.total.toLocaleString(), 'บาท');

// คำนวณ
const netBalance = cashWithdrawals.total - cashWithdrawals.totalFee - transfer.total - (expenses?.total || 0) + dailyBalance.total;
console.log('\n=== สูตรคำนวณ ===');
console.log(`ถอนเงิน (${cashWithdrawals.total.toLocaleString()}) - ค่าธรรมเนียม (${cashWithdrawals.totalFee.toLocaleString()}) - โยกเงินสด (${transfer.total.toLocaleString()}) - ค่าใช้จ่าย (${(expenses?.total || 0).toLocaleString()}) + ยอดคงเหลือ (${dailyBalance.total.toLocaleString()})`);
console.log(`= ${netBalance.toLocaleString()} บาท`);

db.close();
