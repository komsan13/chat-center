import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailySummaries, dailyBalances, transfers, cashWithdrawals, expenses, websites, banks } from '@/lib/db/schema';
import { eq, sql, and, gte, lte, desc, or, like } from 'drizzle-orm';

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
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');
    const websiteId = searchParams.get('websiteId') || 'all';
    
    const { startDate, endDate } = getDateRange(monthParam);
    
    // 1. Get total deposits from DailySummary
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let netProfit = 0;
    try {
      const summaryConditions = [
        gte(dailySummaries.date, startDate),
        lte(dailySummaries.date, endDate)
      ];
      if (websiteId !== 'all') {
        summaryConditions.push(eq(dailySummaries.websiteName, websiteId));
      }
      
      const summary = await db.select({
        totalDeposits: sql<number>`COALESCE(SUM(${dailySummaries.totalDeposit}), 0)`,
        totalWithdrawals: sql<number>`COALESCE(SUM(${dailySummaries.totalWithdrawal}), 0)`,
        netProfit: sql<number>`COALESCE(SUM(${dailySummaries.totalProfit}), 0)`,
      })
        .from(dailySummaries)
        .where(and(...summaryConditions));
      
      if (summary[0]) {
        totalDeposits = summary[0].totalDeposits || 0;
        totalWithdrawals = summary[0].totalWithdrawals || 0;
        netProfit = summary[0].netProfit || 0;
      }
    } catch (e) {
      console.log('DailySummary table error:', e);
    }
    
    // 2. Get total transfers
    let totalTransfers = 0;
    let transferCount = 0;
    try {
      const transferConditions = [
        gte(transfers.date, startDate),
        lte(transfers.date, endDate)
      ];
      if (websiteId !== 'all') {
        transferConditions.push(eq(transfers.websiteId, websiteId));
      }
      
      const transferResult = await db.select({
        total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
        .from(transfers)
        .where(and(...transferConditions));
      
      if (transferResult[0]) {
        totalTransfers = transferResult[0].total || 0;
        transferCount = transferResult[0].count || 0;
      }
    } catch (e) {
      console.log('Transfer table error:', e);
    }
    
    // 3. Get total cash withdrawals
    let totalCashWithdrawals = 0;
    let cashWithdrawalCount = 0;
    try {
      const cashConditions = [
        gte(cashWithdrawals.date, startDate),
        lte(cashWithdrawals.date, endDate)
      ];
      if (websiteId !== 'all') {
        cashConditions.push(eq(cashWithdrawals.websiteId, websiteId));
      }
      
      const cashResult = await db.select({
        total: sql<number>`COALESCE(SUM(${cashWithdrawals.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
        .from(cashWithdrawals)
        .where(and(...cashConditions));
      
      if (cashResult[0]) {
        totalCashWithdrawals = cashResult[0].total || 0;
        cashWithdrawalCount = cashResult[0].count || 0;
      }
    } catch (e) {
      console.log('CashWithdrawal table error:', e);
    }
    
    // 4. Get total expenses
    let totalExpenses = 0;
    let expenseCount = 0;
    try {
      const expenseConditions = [
        gte(expenses.date, startDate),
        lte(expenses.date, endDate)
      ];
      if (websiteId !== 'all') {
        expenseConditions.push(eq(expenses.websiteId, websiteId));
      }
      
      const expenseResult = await db.select({
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
        .from(expenses)
        .where(and(...expenseConditions));
      
      if (expenseResult[0]) {
        totalExpenses = expenseResult[0].total || 0;
        expenseCount = expenseResult[0].count || 0;
      }
    } catch (e) {
      console.log('Expenses table error:', e);
    }
    
    // 5. Get current total balance from DailyBalance
    let totalBalance = 0;
    try {
      const maxDateResult = await db.select({
        maxDate: sql<string>`MAX(${dailyBalances.date})`,
      }).from(dailyBalances);
      
      if (maxDateResult[0]?.maxDate) {
        const balanceResult = await db.select({
          total: sql<number>`COALESCE(SUM(${dailyBalances.closingBalance}), 0)`,
        })
          .from(dailyBalances)
          .where(eq(dailyBalances.date, maxDateResult[0].maxDate));
        
        totalBalance = balanceResult[0]?.total || 0;
      }
    } catch (e) {
      console.log('DailyBalance table error:', e);
    }
    
    // 6. Get website count
    let websiteCount = 0;
    try {
      const websiteResult = await db.select({
        count: sql<number>`COUNT(*)`,
      })
        .from(websites)
        .where(eq(websites.status, 'active'));
      websiteCount = websiteResult[0]?.count || 0;
    } catch (e) {
      console.log('Website table error:', e);
    }
    
    // 7. Get bank count
    let bankCount = 0;
    try {
      const bankResult = await db.select({
        count: sql<number>`COUNT(*)`,
      })
        .from(banks)
        .where(eq(banks.status, 'active'));
      bankCount = bankResult[0]?.count || 0;
    } catch (e) {
      console.log('Bank table error:', e);
    }
    
    // 8. Get daily balance summary for chart (within selected month)
    const dailyData: { date: string; dailyBalance: number; cashWithdrawal: number; fee: number; transfer: number; cashExpenses: number; netBalance: number }[] = [];
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
          const balanceResult = await db.select({
            total: sql<number>`COALESCE(SUM(${dailyBalances.closingBalance}), 0)`,
          })
            .from(dailyBalances)
            .where(eq(dailyBalances.date, date));
          totalDailyBalance = balanceResult[0]?.total || 0;
        } catch (e) {}
        
        // Get total cash withdrawals for that day
        let totalCashWithdrawal = 0;
        let totalFee = 0;
        try {
          const cashResult = await db.select({
            total: sql<number>`COALESCE(SUM(${cashWithdrawals.amount}), 0)`,
            totalFee: sql<number>`COALESCE(SUM(${cashWithdrawals.fee}), 0)`,
          })
            .from(cashWithdrawals)
            .where(eq(cashWithdrawals.date, date));
          totalCashWithdrawal = cashResult[0]?.total || 0;
          totalFee = cashResult[0]?.totalFee || 0;
        } catch (e) {}
        
        // Get total transfers FROM CASH only (fromBankName = 'เงินสด')
        let totalTransfer = 0;
        try {
          const transferResult = await db.select({
            total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)`,
          })
            .from(transfers)
            .where(and(
              eq(transfers.date, date),
              or(
                eq(transfers.fromBankName, 'เงินสด'),
                like(transfers.fromBankName, '%เงินสด%')
              )
            ));
          totalTransfer = transferResult[0]?.total || 0;
        } catch (e) {}
        
        // Get total cash expenses for that day (paymentType would need to be added if exists)
        let totalCashExpenses = 0;
        // Note: expenses table doesn't have paymentType in schema, defaulting to 0
        
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
    const recentTransactions: { id: string; date: string; type: string; description: string; amount: number; status?: string; website?: string | null }[] = [];
    
    // Recent transfers
    try {
      const recentTransfers = await db.select({
        id: transfers.id,
        date: transfers.date,
        amount: transfers.amount,
        fromBankName: transfers.fromBankName,
        toBankName: transfers.toBankName,
        websiteName: transfers.websiteName,
      })
        .from(transfers)
        .orderBy(desc(transfers.date), desc(transfers.createdAt))
        .limit(5);
      
      recentTransfers.forEach(t => {
        recentTransactions.push({
          id: t.id,
          date: t.date,
          type: 'transfer',
          description: `${t.fromBankName} → ${t.toBankName}`,
          amount: t.amount,
          website: t.websiteName
        });
      });
    } catch (e) {}
    
    // Recent cash withdrawals
    try {
      const recentCash = await db.select({
        id: cashWithdrawals.id,
        date: cashWithdrawals.date,
        amount: cashWithdrawals.amount,
        bankName: cashWithdrawals.bankName,
        websiteName: cashWithdrawals.websiteName,
      })
        .from(cashWithdrawals)
        .orderBy(desc(cashWithdrawals.date), desc(cashWithdrawals.createdAt))
        .limit(5);
      
      recentCash.forEach(c => {
        recentTransactions.push({
          id: c.id,
          date: c.date,
          type: 'withdrawal',
          description: `${c.bankName}`,
          amount: c.amount,
          website: c.websiteName
        });
      });
    } catch (e) {}
    
    // Recent expenses
    try {
      const recentExpenses = await db.select({
        id: expenses.id,
        date: expenses.date,
        amount: expenses.amount,
        category: expenses.category,
        description: expenses.description,
        websiteName: expenses.websiteName,
      })
        .from(expenses)
        .orderBy(desc(expenses.date), desc(expenses.createdAt))
        .limit(5);
      
      recentExpenses.forEach(e => {
        recentTransactions.push({
          id: e.id,
          date: e.date,
          type: 'expense',
          description: e.description || e.category,
          amount: e.amount,
          website: e.websiteName
        });
      });
    } catch (e) {}
    
    // Sort by date and take top 10
    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const topTransactions = recentTransactions.slice(0, 10);
    
    // 10. Get website performance
    const websitePerformance: { name: string | null; deposits: number; withdrawals: number; profit: number }[] = [];
    try {
      const perf = await db.select({
        name: dailySummaries.websiteName,
        deposits: sql<number>`SUM(${dailySummaries.totalDeposit})`,
        withdrawals: sql<number>`SUM(${dailySummaries.totalWithdrawal})`,
        profit: sql<number>`SUM(${dailySummaries.totalProfit})`,
      })
        .from(dailySummaries)
        .where(and(
          gte(dailySummaries.date, startDate),
          lte(dailySummaries.date, endDate)
        ))
        .groupBy(dailySummaries.websiteName)
        .orderBy(desc(sql`SUM(${dailySummaries.totalProfit})`))
        .limit(5);
      
      perf.forEach(p => {
        websitePerformance.push({
          name: p.name,
          deposits: p.deposits || 0,
          withdrawals: p.withdrawals || 0,
          profit: p.profit || 0
        });
      });
    } catch (e) {}
    
    // Note: Change percentages require historical comparison data
    // These will show 0 until we implement month-over-month comparison
    const depositChange = 0;
    const withdrawalChange = 0;
    const profitChange = 0;
    const balanceChange = 0;
    
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
