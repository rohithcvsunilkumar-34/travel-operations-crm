// lib/reminderService.ts
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';
import { sendPackageReminderEmail, ReminderStage, EmailReminderResult } from '@/lib/mailer';

export interface ProcessRemindersOptions {
  referenceDate?: Date; // Defaults to today
  force?: boolean;      // If true, sends even if already in remindersSent
  dryRun?: boolean;     // If true, reports what would be sent without sending
}

export interface ReminderRunReport {
  timestamp: string;
  referenceDate: string;
  totalActivePackages: number;
  eligiblePackages: number;
  remindersSentCount: number;
  results: EmailReminderResult[];
  skippedAlreadySent: number;
}

/**
 * Normalizes a date to local midnight (00:00:00.000)
 */
export function toMidnight(d: Date | string): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Calculates day difference between two dates (b - a) in integer days
 */
export function getDiffInDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((toMidnight(b).getTime() - toMidnight(a).getTime()) / msPerDay);
}

/**
 * Identifies the milestone stage (7_days, 3_days, 1_day) based on days remaining
 */
export function getReminderStageForDays(diffDays: number): ReminderStage | null {
  if (diffDays === 7) return '7_days';
  if (diffDays === 3) return '3_days';
  if (diffDays === 1) return '1_day';
  return null;
}

/**
 * Main function that checks all upcoming packages and triggers reminder emails
 */
export async function processUpcomingReminders(
  options: ProcessRemindersOptions = {}
): Promise<ReminderRunReport> {
  await connectDB();

  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const todayMidnight = toMidnight(refDate);

  // Query packages that are Upcoming or Ongoing with checkInDate >= today
  const activePackages = await Package.find({
    status: { $in: ['Upcoming', 'Ongoing'] },
    checkInDate: { $gte: todayMidnight },
  }).sort({ checkInDate: 1 });

  const results: EmailReminderResult[] = [];
  let eligibleCount = 0;
  let skippedAlreadySentCount = 0;

  for (const pkg of activePackages) {
    const checkInMidnight = toMidnight(pkg.checkInDate);
    const diffDays = getDiffInDays(todayMidnight, checkInMidnight);

    const stage = getReminderStageForDays(diffDays);
    if (!stage) {
      // Not a 7-day, 3-day, or 1-day milestone
      continue;
    }

    eligibleCount++;

    const alreadySent = Array.isArray(pkg.remindersSent) && pkg.remindersSent.includes(stage);

    if (alreadySent && !options.force) {
      skippedAlreadySentCount++;
      continue;
    }

    if (options.dryRun) {
      results.push({
        bookingId: pkg.bookingId,
        guestName: pkg.guestName,
        stage,
        recipient: process.env.NOTIFICATION_RECIPIENT_EMAIL || 'dry-run@crm.local',
        success: true,
        simulated: true,
      });
      continue;
    }

    // Fetch assigned fleet for this package
    const fleetLogs = await VehicleLog.find({ packageId: pkg.bookingId }).sort({ operationDate: 1 }).lean();

    // Send the email
    const emailRes = await sendPackageReminderEmail(pkg, stage, fleetLogs);
    results.push(emailRes);

    // If sent successfully, mark in database
    if (emailRes.success) {
      await Package.findByIdAndUpdate(pkg._id, {
        $addToSet: { remindersSent: stage },
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    referenceDate: todayMidnight.toISOString().slice(0, 10),
    totalActivePackages: activePackages.length,
    eligiblePackages: eligibleCount,
    remindersSentCount: results.filter((r) => r.success).length,
    results,
    skippedAlreadySent: skippedAlreadySentCount,
  };
}
