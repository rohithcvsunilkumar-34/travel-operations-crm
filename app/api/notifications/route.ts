import { NextResponse } from 'next/server';
import { getInAppNotifications } from '@/lib/notificationService';
export type { InAppNotification } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report = await getInAppNotifications();
    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error: any) {
    console.error('Error fetching in-app notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load notifications' },
      { status: 500 }
    );
  }
}
