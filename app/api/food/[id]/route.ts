import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FoodLog from '@/models/FoodLog';
import Package from '@/models/Package';
import { syncPackageFinancials } from '@/lib/packageFinancials';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await request.json();
    if (body.mealDate) {
      body.mealDate = new Date(body.mealDate);
    }
    if (body.foodCost !== undefined) {
      body.foodCost = Number(body.foodCost) || 0;
    }

    const oldLog = await FoodLog.findById(params.id).lean();

    const log = await FoodLog.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!log) return NextResponse.json({ error: 'Food entry not found' }, { status: 404 });

    const logObj = log as any;
    if (logObj.packageId) {
      await syncPackageFinancials(logObj.packageId);
    }
    if (oldLog && (oldLog as any).packageId && (oldLog as any).packageId !== logObj.packageId) {
      await syncPackageFinancials((oldLog as any).packageId);
    }

    return NextResponse.json(JSON.parse(JSON.stringify(logObj)));
  } catch (error) {
    console.error('PUT /api/food/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update food entry' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const log = await FoodLog.findByIdAndDelete(params.id).lean();
    if (!log) return NextResponse.json({ error: 'Food entry not found' }, { status: 404 });

    const logObj = log as any;
    if (logObj.packageId) {
      await syncPackageFinancials(logObj.packageId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/food/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete food entry' }, { status: 500 });
  }
}

