import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';
import FoodLog from '@/models/FoodLog';

/**
 * Re-aggregates all operational costs for a package from its child entries:
 * 1. Hotel Cost (from package.total_hotel_cost or package.hotelCost or hotelAllocations)
 * 2. Cab Fleet Cost (dynamically sum of all VehicleLog entries for this bookingId)
 * 3. Food & Dining Cost (dynamically sum of all FoodLog entries for this bookingId)
 * 4. Other Expenses (miscellaneous expenses)
 *
 * Then calculates:
 * - totalExpense = hotelCost + cabCost + foodCost + otherExpenses
 * - balancePending = Math.max(0, packageAmount - advancePaid)
 * - netProfit = packageAmount - totalExpense
 *
 * This ensures that when any user manually adds, edits, or deletes an item
 * in ANY section, the package master totals remain 100% accurate.
 */
export async function syncPackageFinancials(packageRef: string) {
  if (!packageRef) return null;

  try {
    const pkg = await Package.findOne({
      $or: [{ bookingId: packageRef }, { _id: packageRef }],
    });

    if (!pkg) return null;

    const bookingId = pkg.bookingId;

    // 1. Fetch child records
    const [fleetLogs, foodLogs] = await Promise.all([
      VehicleLog.find({ packageId: bookingId }).lean(),
      FoodLog.find({ packageId: bookingId }).lean(),
    ]);

    // 2. Aggregate Cab Cost
    // If vehicle logs exist, sum daily_cab_cost / vendorCost; otherwise keep package's own total_cab_cost
    let totalCabCost = fleetLogs.reduce(
      (sum, l: any) => sum + (Number(l.daily_cab_cost) || Number(l.vendorCost) || 0),
      0
    );
    if (fleetLogs.length === 0) {
      totalCabCost = Number(pkg.total_cab_cost) || Number(pkg.cabVendorCost) || 0;
    }

    // 3. Aggregate Food Cost
    // If food logs exist, sum foodCost; otherwise keep package's own total_food_cost
    let totalFoodCost = foodLogs.reduce(
      (sum, f: any) => sum + (Number(f.foodCost) || 0),
      0
    );
    if (foodLogs.length === 0) {
      totalFoodCost = Number(pkg.total_food_cost) || 0;
    }

    // 4. Hotel Cost
    let hotelCost = Number(pkg.total_hotel_cost) || Number(pkg.hotelCost) || 0;
    if (hotelCost === 0 && Array.isArray(pkg.hotelAllocations) && pkg.hotelAllocations.length > 0) {
      hotelCost = pkg.hotelAllocations.reduce((sum: number, h: any) => sum + (Number(h.cost) || 0), 0);
    }

    // 5. Package Revenue & Advances
    const packageAmount = Number(pkg.packageAmount) || 0;
    const advancePaid = Number(pkg.advancePaid) || 0;
    const otherExpenses = Number(pkg.otherExpenses) || 0;

    // 6. Calculate Totals
    const totalExpense = hotelCost + totalCabCost + totalFoodCost + otherExpenses;
    const balancePending = Math.max(0, packageAmount - advancePaid);
    const netProfit = packageAmount - totalExpense;

    // 7. Update and Save
    pkg.total_hotel_cost = hotelCost;
    pkg.hotelCost = hotelCost;
    pkg.total_cab_cost = totalCabCost;
    pkg.cabVendorCost = totalCabCost;
    pkg.total_food_cost = totalFoodCost;
    pkg.otherExpenses = otherExpenses;
    pkg.totalExpense = totalExpense;
    pkg.balancePending = balancePending;
    pkg.netProfit = netProfit;

    await pkg.save();
    return pkg;
  } catch (error) {
    console.error(`syncPackageFinancials error for ${packageRef}:`, error);
    return null;
  }
}
