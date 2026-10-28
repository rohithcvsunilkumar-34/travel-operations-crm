// lib/mailer.ts
import nodemailer from 'nodemailer';
import { formatName } from './formatters';

export type ReminderStage = '7_days' | '3_days' | '1_day';

export interface EmailReminderResult {
  bookingId: string;
  guestName: string;
  stage: ReminderStage;
  recipient: string;
  success: boolean;
  simulated?: boolean;
  messageId?: string;
  error?: string;
}

export function getReminderConfig(stage: ReminderStage) {
  switch (stage) {
    case '7_days':
      return {
        label: '1 Week (7 Days) Before Check-in',
        subjectPrefix: '📅 [1 Week Reminder]',
        badgeBg: '#3B82F6',
        textColor: '#1E3A8A',
        badgeLight: '#EFF6FF',
        urgencyText: 'Check-in is in 7 days. Time to re-confirm hotel bookings and schedule fleet vehicles.',
      };
    case '3_days':
      return {
        label: '3 Days Before Check-in',
        subjectPrefix: '⏰ [3 Days Reminder]',
        badgeBg: '#F59E0B',
        textColor: '#78350F',
        badgeLight: '#FFFBEB',
        urgencyText: 'Check-in is in 3 days. Ensure cab allocations and driver phone numbers are finalized.',
      };
    case '1_day':
      return {
        label: '🚨 TOMORROW (1 Day Before Check-in)',
        subjectPrefix: '🚨 [URGENT - Tomorrow]',
        badgeBg: '#EF4444',
        textColor: '#7F1D1D',
        badgeLight: '#FEF2F2',
        urgencyText: 'Check-in is tomorrow! Confirm pickup schedule with driver and verify arrival flight/train.',
      };
  }
}

/**
 * Creates Nodemailer Transporter
 */
export function getMailerTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null; // Signals simulation / mock mode
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function formatDate(dateStrOrObj?: string | Date): string {
  if (!dateStrOrObj) return '—';
  try {
    return new Date(dateStrOrObj).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStrOrObj);
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Generates an executive HTML email body for check-in reminder
 */
export function buildReminderEmailHTML(pkg: any, stage: ReminderStage, fleetLogs: any[] = []): string {
  const config = getReminderConfig(stage);
  const formattedGuest = formatName(pkg.guestName);
  const checkInStr = formatDate(pkg.checkInDate);
  const checkOutStr = formatDate(pkg.checkOutDate);

  const fleetRows = fleetLogs.length > 0
    ? fleetLogs
        .map(
          (f) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 10px; font-size: 12px; color: #334155;"><strong>${formatDate(f.operationDate)}</strong></td>
            <td style="padding: 8px 10px; font-size: 12px; color: #0f172a;">${f.dutyRoute || 'Tour Duty'}</td>
            <td style="padding: 8px 10px; font-size: 12px; color: #475569;">${f.vehicleType || '—'} ${f.vehicleNumber ? `(${f.vehicleNumber})` : ''}</td>
            <td style="padding: 8px 10px; font-size: 12px; color: #1e293b;">${f.driverName || 'Unassigned'} ${f.driverPhone ? `<br><a href="tel:${f.driverPhone}" style="color: #2563eb; text-decoration: none;">📞 ${f.driverPhone}</a>` : ''}</td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8; font-size: 12px; font-style: italic;">No fleet vehicles assigned yet.</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.subjectPrefix} ${formattedGuest} - ${pkg.bookingId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 620px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    
    <!-- Top Header Banner -->
    <div style="background: linear-gradient(135deg, #0B192C 0%, #1E293B 100%); padding: 24px; color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 700; color: #FF9F1C; letter-spacing: 1px; text-transform: uppercase;">TravelOps CRM &bull; Alert</span>
        <span style="background: rgba(255,255,255,0.15); color: #ffffff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 12px; font-weight: 700;">${pkg.bookingId}</span>
      </div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">${config.label}</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">${config.urgencyText}</p>
    </div>

    <!-- Alert Highlight Pill -->
    <div style="background-color: ${config.badgeLight}; border-left: 4px solid ${config.badgeBg}; padding: 12px 20px; margin: 16px 20px 0 20px; border-radius: 0 8px 8px 0;">
      <div style="font-size: 13px; font-weight: 700; color: ${config.textColor};">
        Lead Guest: <span style="font-size: 15px; color: #0f172a;">${formattedGuest}</span>
        ${pkg.contactNumber ? ` &bull; <a href="tel:${pkg.contactNumber}" style="color: #2563eb; text-decoration: none;">📞 ${pkg.contactNumber}</a>` : ''}
      </div>
    </div>

    <!-- Schedule & Package Summary -->
    <div style="padding: 20px;">
      <h2 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 10px 0;">Trip & Check-in Schedule</h2>
      
      <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; font-size: 13px;">
        <tr>
          <td style="padding: 10px 14px; width: 35%; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Check-in Date:</td>
          <td style="padding: 10px 14px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">📅 ${checkInStr}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Check-out Date:</td>
          <td style="padding: 10px 14px; color: #334155; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${checkOutStr}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Guests & Duration:</td>
          <td style="padding: 10px 14px; color: #334155; font-weight: 600; border-bottom: 1px solid #e2e8f0;">👥 ${pkg.totalPax || 1} Guests &bull; ${pkg.totalDays || 'Tour'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Booking Agency:</td>
          <td style="padding: 10px 14px; color: #334155; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${pkg.agencyName || 'Direct'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Hotels:</td>
          <td style="padding: 10px 14px; color: #334155; font-weight: 600; border-bottom: 1px solid #e2e8f0;">🏨 ${pkg.hotelDetails || 'As per itinerary'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #64748b; font-weight: 600;">Payment Balance:</td>
          <td style="padding: 10px 14px; font-weight: 700; color: ${pkg.balancePending > 0 ? '#dc2626' : '#16a34a'};">
            ${pkg.balancePending > 0 ? `⚠️ Pending ${formatCurrency(pkg.balancePending)} (Total: ${formatCurrency(pkg.packageAmount)})` : `✅ Fully Paid (${formatCurrency(pkg.packageAmount)})`}
          </td>
        </tr>
      </table>

      <!-- Fleet Schedule Section -->
      <h2 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 20px 0 10px 0;">Assigned Fleet & Driver Details</h2>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <thead style="background: #e2e8f0; text-align: left;">
          <tr>
            <th style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569;">Date</th>
            <th style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569;">Duty Route</th>
            <th style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569;">Vehicle</th>
            <th style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569;">Driver</th>
          </tr>
        </thead>
        <tbody>
          ${fleetRows}
        </tbody>
      </table>

      <!-- Action Button -->
      <div style="text-align: center; margin-top: 24px; margin-bottom: 8px;">
        <a href="http://localhost:3001" style="display: inline-block; background-color: #0B192C; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; box-shadow: 0 2px 8px rgba(11,25,44,0.3);">
          Open CRM & Manage Package &rarr;
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 20px; font-size: 11px; color: #94a3b8; text-align: center;">
      This is an automated operational reminder from <strong>Travel Operations CRM</strong>.<br>
      Milestone check: 7 days, 3 days, and 1 day prior to guest check-in.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends a single reminder email or simulates it if SMTP is not configured.
 */
export async function sendPackageReminderEmail(
  pkg: any,
  stage: ReminderStage,
  fleetLogs: any[] = []
): Promise<EmailReminderResult> {
  const recipient =
    process.env.NOTIFICATION_RECIPIENT_EMAIL ||
    process.env.SMTP_USER ||
    'operations@travelcrm.local';

  const config = getReminderConfig(stage);
  const formattedGuest = formatName(pkg.guestName);
  const subject = `${config.subjectPrefix} Check-in: ${formattedGuest} (${pkg.bookingId}) - ${formatDate(pkg.checkInDate)}`;

  const html = buildReminderEmailHTML(pkg, stage, fleetLogs);
  const transporter = getMailerTransporter();

  // If SMTP is not set up yet, perform simulation (logs preview and marks success)
  if (!transporter) {
    console.log(`[Email Simulation] To: ${recipient} | Subject: "${subject}"`);
    return {
      bookingId: pkg.bookingId,
      guestName: pkg.guestName,
      stage,
      recipient,
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}-${pkg.bookingId}`,
    };
  }

  try {
    const fromAddress = process.env.SMTP_FROM_NAME
      ? `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`
      : process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject,
      html,
    });

    console.log(`[Email Sent] MessageId: ${info.messageId} to ${recipient}`);

    return {
      bookingId: pkg.bookingId,
      guestName: pkg.guestName,
      stage,
      recipient,
      success: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error(`[Email Failed] Error sending to ${recipient}:`, err);
    return {
      bookingId: pkg.bookingId,
      guestName: pkg.guestName,
      stage,
      recipient,
      success: false,
      error: err.message || 'Unknown SMTP error',
    };
  }
}
