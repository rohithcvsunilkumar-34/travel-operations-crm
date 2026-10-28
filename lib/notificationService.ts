// lib/notificationService.ts
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';
import { formatName } from '@/lib/formatters';

export interface InAppNotification {
  id: string;
  packageId: string;
  bookingId: string;
  guestName: string;
  contactNumber: string;
  agencyName: string;
  totalPax: number;
  checkInDate: string;
  checkOutDate: string;
  hotelDetails: string;
  packageAmount: number;
  balancePending: number;
  status: string;
  daysRemaining: number;
  stage: 'today' | '1_day' | '3_days' | '7_days' | 'upcoming';
  severity: 'urgent' | 'warning' | 'info';
  badge: string;
  title: string;
  message: string;
  fleetAssigned: boolean;
  fleetCount: number;
  fleetSummary: string;
  createdAt: string;
}

export interface NotificationReport {
  total: number;
  counts: {
    total: number;
    urgent: number;
    today: number;
    oneDay: number;
    threeDays: number;
    sevenDays: number;
  };
  notifications: InAppNotification[];
}

/**
 * Computes all active in-app notifications for upcoming tour check-ins
 */
export async function getInAppNotifications(): Promise<NotificationReport> {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxHorizon = new Date(today);
  maxHorizon.setDate(maxHorizon.getDate() + 8); // Lookahead 8 days to catch 7-day milestone
  maxHorizon.setHours(23, 59, 59, 999);

  // Fetch active packages checking in from today up to 8 days ahead
  const packages = await Package.find({
    status: { $in: ['Upcoming', 'Ongoing'] },
    checkInDate: { $gte: today, $lte: maxHorizon },
  }).sort({ checkInDate: 1 }).lean();

  // Fetch relevant vehicle logs
  const bookingIds = packages.map((p: any) => p.bookingId);
  const vehicleLogs = await VehicleLog.find({ packageId: { $in: bookingIds } }).lean();

  const vehicleMap = new Map<string, any[]>();
  for (const v of vehicleLogs) {
    if (v.packageId) {
      if (!vehicleMap.has(v.packageId)) vehicleMap.set(v.packageId, []);
      vehicleMap.get(v.packageId)!.push(v);
    }
  }

  const notifications: InAppNotification[] = [];
  let urgentCount = 0;
  let todayCount = 0;
  let oneDayCount = 0;
  let threeDaysCount = 0;
  let sevenDaysCount = 0;

  for (const pkg of packages) {
    const p = pkg as any;
    const checkIn = new Date(p.checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    const msDiff = checkIn.getTime() - today.getTime();
    const daysRemaining = Math.round(msDiff / (1000 * 60 * 60 * 24));

    // Determine stage
    let stage: 'today' | '1_day' | '3_days' | '7_days' | 'upcoming';
    let severity: 'urgent' | 'warning' | 'info';
    let badge: string;
    let title: string;

    if (daysRemaining === 0) {
      stage = 'today';
      severity = 'urgent';
      badge = '🚨 Today';
      title = 'Guest Arriving Today';
      todayCount++;
      urgentCount++;
    } else if (daysRemaining === 1) {
      stage = '1_day';
      severity = 'urgent';
      badge = '🚨 Tomorrow';
      title = 'Check-in Tomorrow (1 Day)';
      oneDayCount++;
      urgentCount++;
    } else if (daysRemaining <= 3) {
      stage = '3_days';
      severity = 'warning';
      badge = `⏰ ${daysRemaining} Days`;
      title = `Check-in in ${daysRemaining} Days`;
      threeDaysCount++;
    } else if (daysRemaining <= 7) {
      stage = '7_days';
      severity = 'info';
      badge = `📅 ${daysRemaining} Days`;
      title = `Check-in in ${daysRemaining} Days (1 Week)`;
      sevenDaysCount++;
    } else {
      stage = 'upcoming';
      severity = 'info';
      badge = 'Upcoming';
      title = `Check-in in ${daysRemaining} Days`;
    }

    const assignedVehicles = vehicleMap.get(p.bookingId) || [];
    const fleetAssigned = assignedVehicles.length > 0;
    const fleetSummary = fleetAssigned
      ? `${assignedVehicles.length} vehicle(s) scheduled (${assignedVehicles[0]?.vehicleType || 'Cab'})`
      : '⚠️ No fleet/cab assigned yet';

    const formattedGuest = formatName(p.guestName);
    let message = `${formattedGuest} (${p.totalPax} Pax) via ${p.agencyName || 'Direct'}.`;
    if (!fleetAssigned && daysRemaining <= 3) {
      message += ' Note: Cab allocation is pending!';
    }
    if (p.balancePending > 0 && daysRemaining <= 1) {
      message += ` Balance pending: ₹${p.balancePending.toLocaleString('en-IN')}`;
    }

    notifications.push({
      id: `notif-${p._id.toString()}-${daysRemaining}d`,
      packageId: p._id.toString(),
      bookingId: p.bookingId,
      guestName: formattedGuest,
      contactNumber: p.contactNumber || '',
      agencyName: p.agencyName || 'Direct',
      totalPax: p.totalPax || 1,
      checkInDate: p.checkInDate ? new Date(p.checkInDate).toISOString() : '',
      checkOutDate: p.checkOutDate ? new Date(p.checkOutDate).toISOString() : '',
      hotelDetails: p.hotelDetails || '',
      packageAmount: p.packageAmount || 0,
      balancePending: p.balancePending || 0,
      status: p.status,
      daysRemaining,
      stage,
      severity,
      badge,
      title,
      message,
      fleetAssigned,
      fleetCount: assignedVehicles.length,
      fleetSummary,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    total: notifications.length,
    counts: {
      total: notifications.length,
      urgent: urgentCount,
      today: todayCount,
      oneDay: oneDayCount,
      threeDays: threeDaysCount,
      sevenDays: sevenDaysCount,
    },
    notifications,
  };
}
