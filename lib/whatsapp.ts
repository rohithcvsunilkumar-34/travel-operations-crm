// lib/whatsapp.ts
import { formatName } from './formatters';

/**
 * Normalizes phone numbers to WhatsApp international format (e.g. 919876543210)
 */
export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // If 10 digits (standard Indian mobile), prepend country code 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // If starts with 0 and is 11 digits (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

function formatDate(dateStrOrObj?: string | Date): string {
  if (!dateStrOrObj) return '—';
  try {
    return new Date(dateStrOrObj).toLocaleDateString('en-IN', {
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
 * Builds a 1-click WhatsApp message link to send tour confirmation & itinerary to the guest
 */
export function getGuestWhatsAppLink(pkg: any, fleetLogs: any[] = []): string {
  const phone = formatWhatsAppPhone(pkg.contactNumber);
  const formattedName = formatName(pkg.guestName);

  let cabDetails = '• Cab allocation in progress (will be updated soon)';
  if (fleetLogs.length > 0) {
    const primary = fleetLogs[0];
    cabDetails = `• Vehicle: ${primary.vehicleType || 'Cab'} ${primary.vehicleNumber ? `(${primary.vehicleNumber})` : ''}\n• Driver: ${primary.driverName || 'Will coordinate'} ${primary.driverPhone ? `(Ph: ${primary.driverPhone})` : ''}`;
  }

  const paymentText =
    pkg.balancePending > 0
      ? `Pending ${formatCurrency(pkg.balancePending)} (Total: ${formatCurrency(pkg.packageAmount)})`
      : `Fully Paid (${formatCurrency(pkg.packageAmount)})`;

  const message = ` *Tour Confirmation & Itinerary* 

Dear *${formattedName}*,
Greetings from *EasyToExplore Operations*! Your travel booking has been confirmed:

 *Booking ID:* ${pkg.bookingId || '—'}
 *Guests:* ${pkg.totalPax || 1} Pax
 *Check-in:* ${formatDate(pkg.checkInDate)}
 *Check-out:* ${formatDate(pkg.checkOutDate)} (${pkg.totalDays || 'Tour'})
 *Hotel Stay:* ${pkg.hotelDetails || 'As per confirmed plan'}

 *Payment Status:*
${paymentText}

For any assistance or route updates during your trip, please reply directly to this number. Wishing you a pleasant journey! `;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds a 1-click WhatsApp message link to dispatch a duty slip to the cab driver
 */
export function getDriverDutyWhatsAppLink(vehicleLog: any, pkg?: any): string {
  const phone = formatWhatsAppPhone(vehicleLog.driverPhone);
  const driverName = formatName(vehicleLog.driverName || 'Driver');

  const message = `🚕 *Duty Slip / Trip Assignment*
*EasyToExplore Operations*

Hello *${driverName}*,
You have been assigned the following duty:

📅 *Date:* ${formatDate(vehicleLog.operationDate)}
🛣️ *Duty Route:* ${vehicleLog.dutyRoute || 'Tour Duty'}
🚘 *Vehicle:* ${vehicleLog.vehicleType || 'Cab'} ${vehicleLog.vehicleNumber ? `(${vehicleLog.vehicleNumber})` : ''}

👤 *Lead Guest:* ${vehicleLog.guestName || pkg?.guestName || 'Guest'} (${vehicleLog.paxInVehicle || pkg?.totalPax || 1} Pax)
📞 *Guest Phone:* ${pkg?.contactNumber || 'Please collect at desk'}
🏨 *Hotel / Destination:* ${pkg?.hotelDetails || 'As directed'}
📝 *Special Instructions:* ${vehicleLog.remarks || 'None'}

Please reach 15 minutes before pickup and ensure the vehicle is clean. Have a safe drive!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

