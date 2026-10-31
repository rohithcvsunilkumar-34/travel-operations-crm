import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthParam = searchParams.get('month') || currentMonthKey;
    const yearParam = searchParams.get('year') || String(currentYear);
    const selectedYear = parseInt(yearParam, 10) || currentYear;

    const [yStr, mStr] = monthParam.split('-');
    const mYear = parseInt(yStr, 10) || currentYear;
    const mNum = parseInt(mStr, 10) || (now.getMonth() + 1);

    // 1. Single Month Calculation (Anchored strictly to Check-Out Month / Trip Completion)
    const startOfSingleMonth = new Date(mYear, mNum - 1, 1, 0, 0, 0, 0);
    const endOfSingleMonth = new Date(mYear, mNum, 0, 23, 59, 59, 999);

    const singleMonthPackages = await Package.find({
      checkOutDate: { $gte: startOfSingleMonth, $lte: endOfSingleMonth },
      status: { $ne: 'Cancelled' },
    }).lean();

    // Standalone vehicle vendor costs for this single month (not linked to any package)
    const unlinkedFleetLogs = await VehicleLog.find({
      operationDate: { $gte: startOfSingleMonth, $lte: endOfSingleMonth },
      $or: [{ packageId: { $exists: false } }, { packageId: '' }, { packageId: null }],
    }).lean();

    const unlinkedFleetCost = unlinkedFleetLogs.reduce(
      (sum: number, log: any) => sum + (Number(log.vendorCost) || Number(log.daily_cab_cost) || 0),
      0
    );

    let totalIncome = 0;
    let totalAdvance = 0;
    let totalBalance = 0;
    let hotelExpense = 0;
    let cabExpense = 0;
    let foodExpense = 0;
    let otherExpense = 0;
    let totalExpense = 0;

    for (const rawPkg of singleMonthPackages) {
      const p = rawPkg as any;
      const amt = Number(p.packageAmount) || 0;
      const adv = Number(p.advancePaid) || 0;
      const bal = Number(p.balancePending) || Math.max(0, amt - adv);

      totalIncome += amt;
      totalAdvance += adv;
      totalBalance += bal;

      let hCost = Number(p.total_hotel_cost) || Number(p.hotelCost) || 0;
      // If hotel allocations have costs, add them if hCost is 0
      if (hCost === 0 && Array.isArray(p.hotelAllocations)) {
        hCost = p.hotelAllocations.reduce(
          (sum: number, a: any) => sum + (Number(a.cost) || 0),
          0
        );
      }

      const cCost = Number(p.total_cab_cost) || Number(p.cabVendorCost) || 0;
      const fCost = Number(p.total_food_cost) || 0;
      const oCost = Number(p.otherExpenses) || 0;
      let pkgExp = Number(p.totalExpense) || (hCost + cCost + fCost + oCost);

      // If package has 0 expense recorded, estimate standard 65% operational baseline
      if (pkgExp === 0 && amt > 0) {
        hCost = Math.round(amt * 0.35);
        const estCab = Math.round(amt * 0.20);
        const estFood = Math.round(amt * 0.08);
        const estMisc = Math.round(amt * 0.02);
        pkgExp = hCost + estCab + estFood + estMisc;
        cabExpense += estCab;
        foodExpense += estFood;
        otherExpense += estMisc;
      } else {
        cabExpense += cCost;
        foodExpense += fCost;
        otherExpense += oCost;
      }

      hotelExpense += hCost;
      totalExpense += pkgExp;
    }

    // Add unlinked general fleet costs if any exist
    if (unlinkedFleetCost > 0) {
      cabExpense += unlinkedFleetCost;
      totalExpense += unlinkedFleetCost;
    }

    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0';

    // Donut chart breakdown slices
    const donutBreakdown = [
      {
        name: 'Hotel Expenses',
        amount: hotelExpense,
        percentage: totalIncome > 0 ? Math.round((hotelExpense / totalIncome) * 100) : 0,
        color: '#3B82F6', // Blue
      },
      {
        name: 'Cab & Fleet Vendor',
        amount: cabExpense,
        percentage: totalIncome > 0 ? Math.round((cabExpense / totalIncome) * 100) : 0,
        color: '#F59E0B', // Amber
      },
      {
        name: 'Food & Dining Expenses',
        amount: foodExpense,
        percentage: totalIncome > 0 ? Math.round((foodExpense / totalIncome) * 100) : 0,
        color: '#FB923C', // Orange
      },
      {
        name: 'Other Operating Costs',
        amount: otherExpense,
        percentage: totalIncome > 0 ? Math.round((otherExpense / totalIncome) * 100) : 0,
        color: '#EC4899', // Pink
      },
      {
        name: 'Net Profit',
        amount: Math.max(0, netProfit),
        percentage: totalIncome > 0 ? Math.max(0, Math.round((netProfit / totalIncome) * 100)) : 0,
        color: '#10B981', // Emerald
      },
    ];

    // 2. Year Month-by-Month Timeline (Jan to Dec)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTimeline: Array<{
      month: string;
      monthKey: string;
      income: number;
      expense: number;
      profit: number;
      bookingsCount: number;
    }> = [];

    const startOfYear = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    // Attributed entirely to its Check-Out Month (Trip Completion)
    const yearPackages = await Package.find({
      checkOutDate: { $gte: startOfYear, $lte: endOfYear },
      status: { $ne: 'Cancelled' },
    }).lean();

    for (let m = 0; m < 12; m++) {
      const mStart = new Date(selectedYear, m, 1, 0, 0, 0, 0);
      const mEnd = new Date(selectedYear, m + 1, 0, 23, 59, 59, 999);
      const key = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;

      // Filter packages strictly where checkOutDate falls in this month
      const activePkgs = yearPackages.filter((raw: any) => {
        const outD = new Date(raw.checkOutDate);
        return outD >= mStart && outD <= mEnd;
      });

      let mIncome = 0;
      let mExpense = 0;

      for (const p of activePkgs) {
        const pObj = p as any;
        const amt = Number(pObj.packageAmount) || 0;
        let exp =
          Number(pObj.totalExpense) ||
          (Number(pObj.total_hotel_cost) || Number(pObj.hotelCost) || 0) +
            (Number(pObj.total_cab_cost) || Number(pObj.cabVendorCost) || 0) +
            (Number(pObj.total_food_cost) || 0) +
            (Number(pObj.otherExpenses) || 0);
        if (exp === 0 && amt > 0) {
          exp = Math.round(amt * 0.65);
        }
        mIncome += amt;
        mExpense += exp;
      }

      monthlyTimeline.push({
        month: monthNames[m],
        monthKey: key,
        income: mIncome,
        expense: mExpense,
        profit: mIncome - mExpense,
        bookingsCount: activePkgs.length,
      });
    }

    const yearlyIncome = monthlyTimeline.reduce((acc, m) => acc + m.income, 0);
    const yearlyExpense = monthlyTimeline.reduce((acc, m) => acc + m.expense, 0);
    const yearlyProfit = yearlyIncome - yearlyExpense;
    const yearlyMargin = yearlyIncome > 0 ? ((yearlyProfit / yearlyIncome) * 100).toFixed(1) : '0.0';

    return NextResponse.json({
      singleMonth: {
        month: monthParam,
        totalIncome,
        advanceCollected: totalAdvance,
        balancePending: totalBalance,
        hotelExpense,
        cabExpense,
        foodExpense,
        otherExpense,
        totalExpense,
        netProfit,
        profitMargin,
        bookingsCount: singleMonthPackages.length,
        breakdown: donutBreakdown,
      },
      yearly: {
        year: selectedYear,
        totalIncome: yearlyIncome,
        totalExpense: yearlyExpense,
        netProfit: yearlyProfit,
        profitMargin: yearlyMargin,
        timeline: monthlyTimeline,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/financials error:', error);
    return NextResponse.json({ error: 'Failed to load financial analytics' }, { status: 500 });
  }
}

