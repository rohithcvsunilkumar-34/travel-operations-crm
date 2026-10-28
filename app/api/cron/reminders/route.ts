import { NextRequest, NextResponse } from 'next/server';
import { processUpcomingReminders } from '@/lib/reminderService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    const dryRun = searchParams.get('dryRun') === 'true';
    const dateParam = searchParams.get('date');

    const referenceDate = dateParam ? new Date(dateParam) : undefined;

    const report = await processUpcomingReminders({
      force,
      dryRun,
      referenceDate,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error in /api/cron/reminders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal reminder service error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty or query params only
    }

    const { searchParams } = new URL(req.url);
    const force = body.force ?? searchParams.get('force') === 'true';
    const dryRun = body.dryRun ?? searchParams.get('dryRun') === 'true';
    const dateParam = body.date || searchParams.get('date');

    const referenceDate = dateParam ? new Date(dateParam) : undefined;

    const report = await processUpcomingReminders({
      force,
      dryRun,
      referenceDate,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error in /api/cron/reminders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal reminder service error',
      },
      { status: 500 }
    );
  }
}
