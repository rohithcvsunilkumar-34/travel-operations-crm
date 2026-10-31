import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FoodLog from '@/models/FoodLog';
import Package from '@/models/Package';
import { syncPackageFinancials } from '@/lib/packageFinancials';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get('packageId');
    const month = searchParams.get('month');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const restaurant = searchParams.get('restaurant');
    const mealType = searchParams.get('mealType');
    const search = searchParams.get('search');

    const query: any = {};

    if (packageId) {
      query.packageId = packageId;
    }

    if (month) {
      const [y, m] = month.split('-').map(Number);
      if (y && m) {
        query.mealDate = {
          $gte: new Date(y, m - 1, 1, 0, 0, 0, 0),
          $lte: new Date(y, m, 0, 23, 59, 59, 999),
        };
      }
    } else if (fromDate || toDate) {
      query.mealDate = {};
      if (fromDate) query.mealDate.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.mealDate.$lte = end;
      }
    }

    if (restaurant) {
      query.restaurantName = { $regex: restaurant, $options: 'i' };
    }

    if (mealType && mealType !== 'all') {
      query.mealType = mealType;
    }

    if (search) {
      query.$or = [
        { guestName: { $regex: search, $options: 'i' } },
        { restaurantName: { $regex: search, $options: 'i' } },
        { packageId: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
      ];
    }

    const logs = await FoodLog.find(query).sort({ mealDate: -1 }).lean();
    return NextResponse.json(JSON.parse(JSON.stringify(logs)));
  } catch (error) {
    console.error('GET /api/food error:', error);
    return NextResponse.json({ error: 'Failed to fetch food logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.restaurantName || !body.guestName || !body.mealDate) {
      return NextResponse.json(
        { error: 'Restaurant/Hotel name, guest name, and date are required' },
        { status: 400 }
      );
    }

    const log = new FoodLog({
      ...body,
      foodCost: Number(body.foodCost) || 0,
      paxCount: Number(body.paxCount) || 1,
      mealDate: new Date(body.mealDate),
    });
    await log.save();

    // Auto-sync package financial metrics
    if (log.packageId) {
      await syncPackageFinancials(log.packageId);
    }

    return NextResponse.json(JSON.parse(JSON.stringify(log)), { status: 201 });
  } catch (error) {
    console.error('POST /api/food error:', error);
    return NextResponse.json({ error: 'Failed to create food dining entry' }, { status: 500 });
  }
}

