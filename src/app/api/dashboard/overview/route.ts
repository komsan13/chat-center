import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  const db = new Database(dbPath);
  return db;
}

// Helper: format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', { 
    style: 'currency', 
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(amount);
}

// Helper: get date range from month/year format (e.g., "1/2026")
function getDateRange(monthParam: string | null) {
  if (monthParam && monthParam.includes('/')) {
    const [monthStr, yearStr] = monthParam.split('/');
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    
    // Start of month (day 1)
    const startDay = 1;
    // End of month (last day)
    const lastDay = new Date(year, month, 0).getDate();
    
    // Format as YYYY-MM-DD
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    return { startDate, endDate };
  }
  
  // Default: current month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  return { startDate, endDate };
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');
    const websiteId = searchParams.get('websiteId') || 'all';
    
    const { startDate, endDate } = getDateRange(monthParam);
    
    // Build website filter
    const websiteFilter = websiteId !== 'all' ? `AND websiteId = '${websiteId}'` : '';
    
    // 1. Get total deposits from DailySummary
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let netProfit = 0;
    try {
      const summaryQuery = `
        SELECT 
          COALESCE(SUM(totalDeposit), 0) as totalDeposits,
          COALESCE(SUM(totalWithdrawal), 0) as totalWithdrawals,
          COALESCE(SUM(totalProfit), 0) as netProfit
        FROM DailySummary 
        WHERE date >= ? AND date <= ? ${websiteFilter.replace('websiteId', 'websiteName')}
      `;
      const summary = db.prepare(summaryQuery).get(startDate, endDate) as any;
      if (summary) {
        totalDeposits = summary.totalDeposits || 0;
        totalWithdrawals = summary.totalWithdrawals || 0;
        netProfit = summary.netProfit || 0;
      }
    } catch (e) {
      console.log('DailySummary table not found, using defaults');
    }
    
    // 2. Get total transfers
    let totalTransfers = 0;
    let transferCount = 0;
    try {
      const transferQuery = `
        SELECT 
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as count
        FROM Transfer 
        WHERE date >= ? AND date <= ? ${websiteFilter}
      `;
      const transfers = db.prepare(transferQuery).get(startDate, endDate) as any;
      if (transfers) {
        totalTransfers = transfers.total || 0;
        transferCount = transfers.count || 0;
      }
    } catch (e) {
      console.log('Transfer table not found');
    }
    
    // 3. Get total cash withdrawals
    let totalCashWithdrawals = 0;
    let cashWithdrawalCount = 0;
    try {
      const cashQuery = `
        SELECT 
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as count
        FROM CashWithdrawal 
        WHERE date >= ? AND date <= ? ${websiteFilter}
      `;
      const cash = db.prepare(cashQuery).get(startDate, endDate) as any;
      if (cash) {
        totalCashWithdrawals = cash.total || 0;
        cashWithdrawalCount = cash.count || 0;
      }
    } catch (e) {
      console.log('CashWithdrawal table not found');
    }
    
    // 4. Get total expenses
    let totalExpenses = 0;
    let expenseCount = 0;
    try {
      const expenseQuery = `
        SELECT 
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as count
        FROM Expenses 
        WHERE date >= ? AND date <= ? ${websiteFilter}
      `;
      const expenses = db.prepare(expenseQuery).get(startDate, endDate) as any;
      if (expenses) {
        totalExpenses = expenses.total || 0;
        expenseCount = expenses.count || 0;
      }
    } catch (e) {
      console.log('Expenses table not found');
    }
    
    // 5. Get current total balance from DailyBalance
    let totalBalance = 0;
    try {
      const balanceQuery = `
        SELECT COALESCE(SUM(closingBalance), 0) as total
        FROM DailyBalance 
        WHERE date = (SELECT MAX(date) FROM DailyBalance)
      `;
      const balance = db.prepare(balanceQuery).get() as any;
      if (balance) {
        totalBalance = balance.total || 0;
      }
    } catch (e) {
      console.log('DailyBalance table not found');
    }
    
    // 6. Get website count
    let websiteCount = 0;
    try {
      const websites = db.prepare("SELECT COUNT(*) as count FROM Website WHERE status = 'active'").get() as any;
      websiteCount = websites?.count || 0;
    } catch (e) {
      console.log('Website table not found');
    }
    
    // 7. Get bank count
    let bankCount = 0;
    try {
      const banks = db.prepare("SELECT COUNT(*) as count FROM Bank WHERE status = 'active'").get() as any;
      bankCount = banks?.count || 0;
    } catch (e) {
      console.log('Bank table not found');
    }
    
    // 8. Get daily balance summary for chart (within selected month)
    const dailyData: any[] = [];
    try {
      // Generate all dates in the selected month (1 to last day)
      const [startYear, startMonth] = startDate.split('-').map(Number);
      const [, , lastDay] = endDate.split('-').map(Number);
      
      const allDates: string[] = [];
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        allDates.push(dateStr);
      }
      
      for (const date of allDates) {
        // Get total daily balance (sum of all accounts' closing balance for that day)
        let totalDailyBalance = 0;
        try {
          const balanceResult = db.prepare(`
            SELECT COALESCE(SUM(closingBalance), 0) as total
            FROM DailyBalance WHERE date = ?
          `).get(date) as any;
          totalDailyBalance = balanceResult?.total || 0;
        } catch (e) {}
        
        // Get total cash withdrawals for that day
        let totalCashWithdrawal = 0;
        let totalFee = 0;
        try {
          const cashResult = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(fee), 0) as totalFee
            FROM CashWithdrawal WHERE date = ?
          `).get(date) as any;
          totalCashWithdrawal = cashResult?.total || 0;
          totalFee = cashResult?.totalFee || 0;
        } catch (e) {}
        
        // Get total transfers FROM CASH only (fromBankName = 'เงินสด')
        let totalTransfer = 0;
        try {
          const transferResult = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM Transfer WHERE date = ? AND (fromBankName = 'เงินสด' OR fromBankName LIKE '%เงินสด%')
          `).get(date) as any;
          totalTransfer = transferResult?.total || 0;
        } catch (e) {}
        
        // Get total cash expenses for that day (paymentType = 'เงินสด' or 'cash')
        let totalCashExpenses = 0;
        try {
          const expenseResult = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM Expenses WHERE date = ? AND (paymentType = 'เงินสด' OR paymentType = 'cash' OR paymentType LIKE '%เงินสด%')
          `).get(date) as any;
          totalCashExpenses = expenseResult?.total || 0;
        } catch (e) {}
        
        // Calculate: ถอนเงิน - ค่าธรรมเนียม - โยกเงิน(จากเงินสด) - ค่าใช้จ่าย(เงินสด) + ยอดเงินคงเหลือรายวัน
        const netBalance = totalCashWithdrawal - totalFee - totalTransfer - totalCashExpenses + totalDailyBalance;
        
        dailyData.push({
          date: date,
          dailyBalance: totalDailyBalance,
          cashWithdrawal: totalCashWithdrawal,
          fee: totalFee,
          transfer: totalTransfer,
          cashExpenses: totalCashExpenses,
          netBalance: netBalance
        });
      }
    } catch (e) {
      console.log('Error fetching daily data:', e);
    }
    
    // 9. Get recent transactions (combined from multiple tables)
    const recentTransactions: any[] = [];
    
    // Recent transfers
    try {
      const transfers = db.prepare(`
        SELECT id, date, 'transfer' as type, amount, fromBankName, toBankName, status, websiteName
        FROM Transfer 
        ORDER BY date DESC, createdAt DESC 
        LIMIT 5
      `).all() as any[];
      transfers.forEach(t => {
        recentTransactions.push({
          id: t.id,
          date: t.date,
          type: 'transfer',
          description: `${t.fromBankName} → ${t.toBankName}`,
          amount: t.amount,
          status: t.status,
          website: t.websiteName
        });
      });
    } catch (e) {}
    
    // Recent cash withdrawals
    try {
      const cash = db.prepare(`
        SELECT id, date, 'withdrawal' as type, amount, bankName, accountName, status, websiteName
        FROM CashWithdrawal 
        ORDER BY date DESC, createdAt DESC 
        LIMIT 5
      `).all() as any[];
      cash.forEach(c => {
        recentTransactions.push({
          id: c.id,
          date: c.date,
          type: 'withdrawal',
          description: `${c.bankName} - ${c.accountName}`,
          amount: c.amount,
          status: c.status,
          website: c.websiteName
        });
      });
    } catch (e) {}
    
    // Recent expenses
    try {
      const expenses = db.prepare(`
        SELECT id, date, 'expense' as type, amount, category, description, status, websiteName
        FROM Expenses 
        ORDER BY date DESC, createdAt DESC 
        LIMIT 5
      `).all() as any[];
      expenses.forEach(e => {
        recentTransactions.push({
          id: e.id,
          date: e.date,
          type: 'expense',
          description: e.description || e.category,
          amount: e.amount,
          status: e.status,
          website: e.websiteName
        });
      });
    } catch (e) {}
    
    // Sort by date and take top 10
    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const topTransactions = recentTransactions.slice(0, 10);
    
    // 10. Get website performance
    const websitePerformance: any[] = [];
    try {
      const perfQuery = `
        SELECT 
          website as name,
          SUM(depositAmount) as deposits,
          SUM(withdrawalAmount) as withdrawals,
          SUM(netProfit) as profit
        FROM DailySummary 
        WHERE date >= ? AND date <= ?
        GROUP BY website
        ORDER BY profit DESC
        LIMIT 5
      `;
      const perf = db.prepare(perfQuery).all(startDate, endDate) as any[];
      perf.forEach(p => {
        websitePerformance.push({
          name: p.name,
          deposits: p.deposits || 0,
          withdrawals: p.withdrawals || 0,
          profit: p.profit || 0
        });
      });
    } catch (e) {}
    
    db.close();
    
    // Calculate changes (mock for now, would need historical data)
    const depositChange = 8.5;
    const withdrawalChange = -3.2;
    const profitChange = 12.4;
    const balanceChange = 5.1;
    
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalDeposits: {
            value: totalDeposits,
            formatted: formatCurrency(totalDeposits),
            change: depositChange
          },
          totalWithdrawals: {
            value: totalWithdrawals,
            formatted: formatCurrency(totalWithdrawals),
            change: withdrawalChange
          },
          netProfit: {
            value: netProfit,
            formatted: formatCurrency(netProfit),
            change: profitChange
          },
          totalBalance: {
            value: totalBalance,
            formatted: formatCurrency(totalBalance),
            change: balanceChange
          },
          transfers: {
            count: transferCount,
            total: totalTransfers,
            formatted: formatCurrency(totalTransfers)
          },
          cashWithdrawals: {
            count: cashWithdrawalCount,
            total: totalCashWithdrawals,
            formatted: formatCurrency(totalCashWithdrawals)
          },
          expenses: {
            count: expenseCount,
            total: totalExpenses,
            formatted: formatCurrency(totalExpenses)
          },
          websites: websiteCount,
          banks: bankCount
        },
        dailyChart: dailyData,
        recentTransactions: topTransactions,
        websitePerformance
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard overview' },
      { status: 500 }
    );
  }
}
