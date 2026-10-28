import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import { syncToCloud } from '@/lib/cloudSync';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await request.json();

    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    const pkg = await Package.findById(params.id);
    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const paymentDate = body.paymentDate || new Date().toISOString().slice(0, 10);
    const paymentMode = body.paymentMode || 'UPI';
    const transactionId = (body.transactionId || '').trim();
    const notes = (body.notes || '').trim();

    // Update package financial figures
    const previousAdvance = Number(pkg.advancePaid) || 0;
    const newAdvance = previousAdvance + amount;
    const packageAmount = Number(pkg.packageAmount) || 0;
    const newBalance = Math.max(0, packageAmount - newAdvance);

    pkg.advancePaid = newAdvance;
    pkg.balancePending = newBalance;

    await pkg.save();

    // Dual-write sync to Cloud MongoDB Atlas if configured
    await syncToCloud('packages', pkg.toObject(), 'upsert');

    const receiptNo = `RCP-${pkg.bookingId || 'TRV'}-${Date.now().toString().slice(-4)}`;

    const receiptData = {
      receiptNo,
      receiptDate: paymentDate,
      amount,
      paymentMode,
      transactionId,
      notes,
      bookingId: pkg.bookingId,
      guestName: pkg.guestName,
      contactNumber: pkg.contactNumber,
      packageAmount: pkg.packageAmount,
      previousAdvance,
      totalPaidToDate: newAdvance,
      balancePending: newBalance,
    };

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${amount.toLocaleString('en-IN')} recorded successfully`,
      pkg: JSON.parse(JSON.stringify(pkg)),
      receipt: receiptData,
    });
  } catch (error: any) {
    console.error('POST /api/packages/[id]/payment error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record payment' }, { status: 500 });
  }
}
