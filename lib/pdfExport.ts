// lib/pdfExport.ts
import { formatName, getStatusConfig } from './formatters';

interface DailyLog {
  dayNumber: number;
  date: string;
  placesVisited: string;
  hotelStayed: string;
  dailyRemarks: string;
}

interface PackageData {
  bookingId: string;
  guestName: string;
  contactNumber: string;
  agencyName: string;
  totalPax: number;
  checkInDate: string;
  checkOutDate: string;
  totalDays: string;
  hotelDetails: string;
  packageAmount: number;
  advancePaid: number;
  balancePending: number;
  status: string;
  dailyLogs?: DailyLog[];
}

interface VehicleData {
  operationDate: string;
  packageId?: string;
  guestName: string;
  paxInVehicle: number;
  vehicleType: string;
  vehicleNumber?: string;
  vendorName?: string;
  driverName?: string;
  driverPhone?: string;
  dutyRoute: string;
  remarks?: string;
}

interface KPIData {
  checkInsToday: number;
  vehiclesRunningToday: number;
  totalGuestsOnGround: number;
  upcomingPackages: number;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function openPrintWindow(
  title: string,
  htmlContent: string,
  orientation: 'portrait' | 'landscape' = 'landscape'
) {
  const width = orientation === 'portrait' ? 880 : 1100;
  const height = orientation === 'portrait' ? 1000 : 850;
  const printWindow = window.open('', '_blank', `width=${width},height=${height}`);
  if (!printWindow) {
    alert('Please allow pop-ups in your browser to view and download the PDF report.');
    return;
  }

  printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4 ${orientation};
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 10px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0B192C;
      color: white;
      padding: 12px 20px;
      margin-bottom: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .print-btn {
      background: #FF9F1C;
      color: #ffffff;
      border: none;
      padding: 9px 20px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .print-btn:hover { opacity: 0.9; }
    .close-btn {
      background: transparent;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      margin-left: 8px;
    }
    .close-btn:hover { color: white; border-color: white; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-top: 10px;
    }
    th {
      background-color: #0B192C !important;
      color: #ffffff !important;
      font-weight: 600;
      text-align: left;
      padding: 7px 8px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      font-size: 9.5px;
    }
    td {
      padding: 7px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 600;
    }
    .badge-upcoming { background: #dbeafe; color: #1e40af; }
    .badge-ongoing { background: #dcfce7; color: #166534; }
    .badge-completed { background: #f1f5f9; color: #475569; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }
    .page-break {
      page-break-before: always;
      break-before: page;
      margin-top: 20px;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong>PDF Preview Ready:</strong> Click "Save as PDF" (or press Ctrl/Cmd + P) and choose <em>"Save as PDF"</em> as your printer destination.
    </div>
    <div>
      <button class="print-btn" onclick="window.print()">🖨️ Save as PDF / Print</button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  ${htmlContent}

  <script>
    // Automatically trigger print dialog on desktop
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>
  `);

  printWindow.document.close();
}

/**
 * Exports the complete Master Operations Report (Packages + Fleet + KPIs) as a formatted PDF
 */
export function exportMasterReportPDF(
  packages: PackageData[],
  vehicles: VehicleData[],
  kpi?: KPIData | null,
  activeDate?: string
) {
  const reportDate = activeDate ? formatDate(activeDate) : formatDate(new Date().toISOString());
  const totalPackageAmount = packages.reduce((sum, p) => sum + (p.packageAmount || 0), 0);
  const totalBalancePending = packages.reduce((sum, p) => sum + (p.balancePending || 0), 0);
  const totalPaxTraveling = packages.reduce((sum, p) => sum + (p.totalPax || 0), 0);

  const html = `
    <!-- Letterhead -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0B192C; padding-bottom: 12px; margin-bottom: 16px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: #FF9F1C; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px;">T</div>
          <h1 style="margin: 0; font-size: 20px; color: #0B192C; font-weight: 800; letter-spacing: -0.5px;">TRAVEL OPERATIONS CRM</h1>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Daily Operations, Fleet Deployments & Package Master Report</div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #475569;">
        <div><strong>Operations Date:</strong> <span style="color: #0B192C; font-weight: 700;">${reportDate}</span></div>
        <div><strong>Generated At:</strong> ${new Date().toLocaleString('en-IN')}</div>
      </div>
    </div>

    <!-- Executive KPI Grid -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        <div style="font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 600;">Check-ins Today</div>
        <div style="font-size: 18px; font-weight: 800; color: #FF9F1C; margin-top: 2px;">${kpi?.checkInsToday ?? packages.length}</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        <div style="font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 600;">Vehicles Deployed</div>
        <div style="font-size: 18px; font-weight: 800; color: #0B192C; margin-top: 2px;">${kpi?.vehiclesRunningToday ?? vehicles.length}</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        <div style="font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 600;">Total Pax Traveling</div>
        <div style="font-size: 18px; font-weight: 800; color: #4338ca; margin-top: 2px;">${kpi?.totalGuestsOnGround ?? totalPaxTraveling}</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        <div style="font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 600;">Balance Pending</div>
        <div style="font-size: 18px; font-weight: 800; color: ${totalBalancePending > 0 ? '#b91c1c' : '#15803d'}; margin-top: 2px;">${formatCurrency(totalBalancePending)}</div>
      </div>
    </div>

    <!-- Section 1: Packages -->
    <div style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <h2 style="margin: 0; font-size: 13px; font-weight: 700; color: #0B192C;">1. MASTER PACKAGES & GUEST CRM (${packages.length} Packages)</h2>
        <span style="font-size: 10px; color: #64748b;">Total Value: <strong>${formatCurrency(totalPackageAmount)}</strong></span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 25px;">#</th>
            <th style="width: 75px;">Booking ID</th>
            <th>Guest Name</th>
            <th style="width: 85px;">Contact</th>
            <th>Agency</th>
            <th style="width: 35px; text-align: center;">Pax</th>
            <th style="width: 75px;">Check-In</th>
            <th style="width: 75px;">Check-Out</th>
            <th>Hotels Booked</th>
            <th style="width: 80px; text-align: right;">Amount</th>
            <th style="width: 80px; text-align: right;">Balance</th>
            <th style="width: 70px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${
            packages.length === 0
              ? `<tr><td colspan="12" style="text-align: center; padding: 20px; color: #94a3b8;">No packages recorded.</td></tr>`
              : packages
                  .map(
                    (p, i) => `
            <tr>
              <td style="color: #94a3b8;">${i + 1}</td>
              <td style="font-family: monospace; font-weight: 700; color: #1d4ed8;">${p.bookingId}</td>
              <td><strong>${formatName(p.guestName)}</strong></td>
              <td style="color: #475569;">${p.contactNumber || '—'}</td>
              <td style="color: #475569;">${p.agencyName}</td>
              <td style="text-align: center; font-weight: 600;">${p.totalPax}</td>
              <td>${formatDate(p.checkInDate)}</td>
              <td>${formatDate(p.checkOutDate)}</td>
              <td style="color: #475569; font-size: 9.5px;">${p.hotelDetails || '—'}</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(p.packageAmount)}</td>
              <td style="text-align: right; font-weight: 700; color: ${p.balancePending > 0 ? '#dc2626' : '#16a34a'};">${formatCurrency(p.balancePending)}</td>
              <td style="text-align: center;">
                <span class="badge badge-${(p.status || 'upcoming').toLowerCase()}">${getStatusConfig(p.status).label}</span>
              </td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>

    <!-- Section 2: Fleet Logs (page break if many) -->
    <div style="margin-top: 24px;" class="page-break">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <h2 style="margin: 0; font-size: 13px; font-weight: 700; color: #0B192C;">2. DAILY FLEET & VEHICLE LOGS (${vehicles.length} Vehicles)</h2>
        <span style="font-size: 10px; color: #64748b;">Date: <strong>${reportDate}</strong></span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 25px;">#</th>
            <th style="width: 75px;">Date</th>
            <th style="width: 75px;">Booking ID</th>
            <th>Guest Assigned</th>
            <th style="width: 35px; text-align: center;">Pax</th>
            <th>Vehicle Details</th>
            <th>Vendor / Transporter</th>
            <th>Driver & Phone</th>
            <th>Duty Route</th>
          </tr>
        </thead>
        <tbody>
          ${
            vehicles.length === 0
              ? `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No vehicle logs recorded.</td></tr>`
              : vehicles
                  .map(
                    (v, i) => `
            <tr>
              <td style="color: #94a3b8;">${i + 1}</td>
              <td>${formatDate(v.operationDate)}</td>
              <td style="font-family: monospace; font-weight: 600; color: #1d4ed8;">${v.packageId || '—'}</td>
              <td><strong>${formatName(v.guestName)}</strong></td>
              <td style="text-align: center; font-weight: 600;">${v.paxInVehicle}</td>
              <td>
                <span style="font-weight: 600;">${v.vehicleType}</span>
                ${v.vehicleNumber ? `<br><span style="font-family: monospace; font-size: 9px; color: #64748b;">${v.vehicleNumber}</span>` : ''}
              </td>
              <td style="color: #475569;">${v.vendorName || '—'}</td>
              <td>
                <div style="font-weight: 600;">${v.driverName || '—'}</div>
                ${v.driverPhone ? `<div style="font-size: 9px; color: #d97706;">${v.driverPhone}</div>` : ''}
              </td>
              <td style="color: #334155; font-size: 9.5px;">
                ${v.dutyRoute}
                ${v.remarks ? `<br><i style="color: #94a3b8;">${v.remarks}</i>` : ''}
              </td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
      <div>Travel Operations CRM • Local-First Operations Dashboard</div>
      <div>Confidential • For Internal Company Operations Only</div>
    </div>
  `;

  openPrintWindow(`TravelOps_MasterReport_${reportDate.replace(/\s+/g, '_')}`, html);
}

/**
 * Exports currently filtered packages as a standalone PDF report
 */
export function exportPackagesReportPDF(packages: PackageData[], filterLabel?: string) {
  const totalAmount = packages.reduce((sum, p) => sum + (p.packageAmount || 0), 0);
  const totalAdvance = packages.reduce((sum, p) => sum + (p.advancePaid || 0), 0);
  const totalBalance = packages.reduce((sum, p) => sum + (p.balancePending || 0), 0);
  const totalPax = packages.reduce((sum, p) => sum + (p.totalPax || 0), 0);

  const html = `
    <!-- Letterhead -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0B192C; padding-bottom: 12px; margin-bottom: 16px;">
      <div>
        <h1 style="margin: 0; font-size: 20px; color: #0B192C; font-weight: 800;">PACKAGES & GUEST CRM REPORT</h1>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          ${filterLabel || 'All Active & Scheduled Packages'} • Total Records: <strong>${packages.length}</strong>
        </div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #475569;">
        <div><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</div>
      </div>
    </div>

    <!-- Summary Box -->
    <div style="display: flex; gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px;">
      <div>Total Guests: <strong style="color: #0B192C;">${totalPax} Pax</strong></div>
      <div style="color: #cbd5e1;">|</div>
      <div>Total Billing: <strong style="color: #0B192C;">${formatCurrency(totalAmount)}</strong></div>
      <div style="color: #cbd5e1;">|</div>
      <div>Advance Received: <strong style="color: #16a34a;">${formatCurrency(totalAdvance)}</strong></div>
      <div style="color: #cbd5e1;">|</div>
      <div>Balance Outstanding: <strong style="color: ${totalBalance > 0 ? '#dc2626' : '#16a34a'};">${formatCurrency(totalBalance)}</strong></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 25px;">#</th>
          <th style="width: 75px;">Booking ID</th>
          <th>Lead Guest</th>
          <th style="width: 85px;">Contact</th>
          <th>Agency</th>
          <th style="width: 35px; text-align: center;">Pax</th>
          <th style="width: 75px;">Check-In</th>
          <th style="width: 75px;">Check-Out</th>
          <th style="width: 85px;">Duration</th>
          <th>Hotels Booked</th>
          <th style="width: 80px; text-align: right;">Amount</th>
          <th style="width: 80px; text-align: right;">Balance</th>
          <th style="width: 70px; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${
          packages.length === 0
            ? `<tr><td colspan="13" style="text-align: center; padding: 25px; color: #94a3b8;">No matching packages found.</td></tr>`
            : packages
                .map(
                  (p, i) => `
          <tr>
            <td style="color: #94a3b8;">${i + 1}</td>
            <td style="font-family: monospace; font-weight: 700; color: #1d4ed8;">${p.bookingId}</td>
            <td><strong>${formatName(p.guestName)}</strong></td>
            <td style="color: #475569;">${p.contactNumber || '—'}</td>
            <td style="color: #475569;">${p.agencyName}</td>
            <td style="text-align: center; font-weight: 600;">${p.totalPax}</td>
            <td>${formatDate(p.checkInDate)}</td>
            <td>${formatDate(p.checkOutDate)}</td>
            <td style="font-size: 9.5px; color: #64748b;">${p.totalDays || '—'}</td>
            <td style="font-size: 9.5px; color: #475569;">${p.hotelDetails || '—'}</td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(p.packageAmount)}</td>
            <td style="text-align: right; font-weight: 700; color: ${p.balancePending > 0 ? '#dc2626' : '#16a34a'};">${formatCurrency(p.balancePending)}</td>
            <td style="text-align: center;">
              <span class="badge badge-${(p.status || 'upcoming').toLowerCase()}">${getStatusConfig(p.status).label}</span>
            </td>
          </tr>
        `
                )
                .join('')
        }
      </tbody>
    </table>
  `;

  openPrintWindow(`TravelOps_Packages_${new Date().toISOString().slice(0, 10)}`, html);
}

/**
 * Exports currently filtered fleet logs as a standalone PDF report
 */
export function exportFleetReportPDF(vehicles: VehicleData[], filterLabel?: string) {
  const totalPax = vehicles.reduce((sum, v) => sum + (v.paxInVehicle || 0), 0);

  const html = `
    <!-- Letterhead -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0B192C; padding-bottom: 12px; margin-bottom: 16px;">
      <div>
        <h1 style="margin: 0; font-size: 20px; color: #0B192C; font-weight: 800;">DAILY FLEET & DRIVER ROSTER</h1>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          ${filterLabel || 'Vehicles in Active Transit'} • Total Vehicles: <strong>${vehicles.length}</strong> • Total Pax: <strong>${totalPax}</strong>
        </div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #475569;">
        <div><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 25px;">#</th>
          <th style="width: 80px;">Date</th>
          <th style="width: 80px;">Booking ID</th>
          <th>Guest Assigned</th>
          <th style="width: 40px; text-align: center;">Pax</th>
          <th>Vehicle Type & No.</th>
          <th>Vendor / Fleet Owner</th>
          <th>Driver Details</th>
          <th>Duty Route & Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${
          vehicles.length === 0
            ? `<tr><td colspan="9" style="text-align: center; padding: 25px; color: #94a3b8;">No fleet logs found for this filter.</td></tr>`
            : vehicles
                .map(
                  (v, i) => `
          <tr>
            <td style="color: #94a3b8;">${i + 1}</td>
            <td><strong>${formatDate(v.operationDate)}</strong></td>
            <td style="font-family: monospace; font-weight: 600; color: #1d4ed8;">${v.packageId || '—'}</td>
            <td><strong>${v.guestName}</strong></td>
            <td style="text-align: center; font-weight: 600;">${v.paxInVehicle}</td>
            <td>
              <span style="font-weight: 600;">${v.vehicleType}</span>
              ${v.vehicleNumber ? `<br><span style="font-family: monospace; font-size: 9.5px; color: #64748b;">${v.vehicleNumber}</span>` : ''}
            </td>
            <td style="color: #475569;">${v.vendorName || '—'}</td>
            <td>
              <div style="font-weight: 600;">${v.driverName || '—'}</div>
              ${v.driverPhone ? `<div style="font-size: 9.5px; color: #d97706;">📞 ${v.driverPhone}</div>` : ''}
            </td>
            <td style="color: #334155; font-size: 9.5px;">
              <strong>${v.dutyRoute}</strong>
              ${v.remarks ? `<br><i style="color: #94a3b8;">${v.remarks}</i>` : ''}
            </td>
          </tr>
        `
                )
                .join('')
        }
      </tbody>
    </table>
  `;

  openPrintWindow(`TravelOps_FleetRoster_${new Date().toISOString().slice(0, 10)}`, html);
}

export function exportSinglePackagePDF(pkg: any, fleetLogs: any[] = []) {
  const statusConf = getStatusConfig(pkg.status);
  const formattedName = formatName(pkg.guestName);
  const balance = Number(pkg.balancePending) || 0;
  const isPaidFull = balance <= 0;

  const html = `
    <!-- Top Executive Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0B192C; padding-bottom: 12px; margin-bottom: 16px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 28px; height: 28px; background: #FF9F1C; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 15px;">T</div>
          <h1 style="margin: 0; font-size: 19px; color: #0B192C; font-weight: 800; letter-spacing: -0.5px;">TRAVEL OPERATIONS CRM</h1>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          Tour Package Confirmation Voucher & Itinerary
        </div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #475569;">
        <div style="margin-bottom: 3px;">
          <span style="font-family: monospace; font-weight: 800; font-size: 12px; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 7px; border-radius: 5px;">
            ${pkg.bookingId}
          </span>
        </div>
        <div>
          <span class="badge badge-${(pkg.status || 'upcoming').toLowerCase()}" style="font-size: 10px; padding: 3px 8px; border-radius: 12px;">
            ● ${statusConf.label}
          </span>
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">Issued: ${new Date().toLocaleString('en-IN')}</div>
      </div>
    </div>

    <!-- Section 1: Guest & Stay Two-Column Grid -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
      <!-- Lead Guest Card -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
        <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          👤 Lead Guest & Booking Details
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 0;">
          <tr>
            <td style="padding: 3px 0; color: #64748b; width: 110px; border: none;">Lead Guest:</td>
            <td style="padding: 3px 0; font-weight: 700; color: #0B192C; border: none; font-size: 12px;">${formattedName}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b; border: none;">Contact Phone:</td>
            <td style="padding: 3px 0; font-weight: 600; color: #2563eb; font-family: monospace; border: none;">${pkg.contactNumber || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b; border: none;">Booking Agency:</td>
            <td style="padding: 3px 0; font-weight: 600; color: #334155; border: none;">${pkg.agencyName || 'Direct'}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b; border: none;">Total Travelers:</td>
            <td style="padding: 3px 0; font-weight: 700; color: #0B192C; border: none;">${pkg.totalPax} Guests (Pax)</td>
          </tr>
        </table>
      </div>

      <!-- Schedule & Accommodations Card -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
        <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          📅 Schedule & Accommodations
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 0;">
          <tr>
            <td style="padding: 3px 0; color: #64748b; width: 110px; border: none;">Check-in Date:</td>
            <td style="padding: 3px 0; font-weight: 700; color: #0B192C; border: none;">${formatDate(pkg.checkInDate)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b; border: none;">Check-out Date:</td>
            <td style="padding: 3px 0; font-weight: 700; color: #0B192C; border: none;">${formatDate(pkg.checkOutDate)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b; border: none;">Tour Duration:</td>
            <td style="padding: 3px 0; font-weight: 600; color: #d97706; border: none;">${pkg.totalDays || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b; border: none; vertical-align: top;">Hotels / Stay:</td>
            <td style="padding: 3px 0; font-size: 10.5px; color: #334155; border: none;">${pkg.hotelDetails || 'As per itinerary'}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Section 2: Financial Summary Box -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        <div style="font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 600;">Total Package Amount</div>
        <div style="font-size: 17px; font-weight: 800; color: #0B192C; margin-top: 2px;">${formatCurrency(pkg.packageAmount)}</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        <div style="font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 600;">Advance Received</div>
        <div style="font-size: 17px; font-weight: 800; color: #16a34a; margin-top: 2px;">${formatCurrency(pkg.advancePaid)}</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        <div style="font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 600;">Balance Pending</div>
        <div style="font-size: 17px; font-weight: 800; color: ${isPaidFull ? '#16a34a' : '#dc2626'}; margin-top: 2px;">
          ${formatCurrency(balance)} ${isPaidFull ? '<span style="font-size: 10px; color: #16a34a; font-weight: 600;">(PAID IN FULL)</span>' : ''}
        </div>
      </div>
    </div>

    <!-- Section 3: Daily Fleet & Transportation (Full Updated) -->
    <div style="margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <h2 style="margin: 0; font-size: 12px; font-weight: 700; color: #0B192C; text-transform: uppercase; letter-spacing: 0.3px;">
          🚗 Assigned Daily Fleet & Cab Schedule (${fleetLogs.length} Days)
        </h2>
      </div>

      <table style="margin-top: 0;">
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">Day</th>
            <th style="width: 75px;">Date</th>
            <th>Duty Route / Movement</th>
            <th style="width: 120px;">Vehicle Details</th>
            <th style="width: 110px;">Driver & Contact</th>
            <th style="width: 90px;">Vendor</th>
            <th style="width: 100px;">Remarks / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${
            fleetLogs.length === 0
              ? `<tr><td colspan="7" style="text-align: center; padding: 14px; color: #94a3b8; font-style: italic;">No specific fleet vehicles logged. Transfers handled via local operator.</td></tr>`
              : fleetLogs
                  .map(
                    (v, i) => `
            <tr>
              <td style="text-align: center; font-weight: 700; color: #1e40af; background: #eff6ff;">${i + 1}</td>
              <td><strong>${formatDate(v.operationDate)}</strong></td>
              <td><strong style="color: #0B192C;">${v.dutyRoute || 'Sightseeing / Movement'}</strong></td>
              <td>
                <span style="font-weight: 700; color: #334155;">${v.vehicleType || 'Cab'}</span>
                ${v.vehicleNumber ? `<br><span style="font-family: monospace; font-size: 9.5px; font-weight: 700; color: #1d4ed8; background: #eff6ff; padding: 1px 4px; border-radius: 3px;">${v.vehicleNumber}</span>` : ''}
              </td>
              <td>
                <div style="font-weight: 600; color: #1e293b;">${v.driverName || '—'}</div>
                ${v.driverPhone ? `<div style="font-size: 9.5px; color: #d97706; font-family: monospace;">📞 ${v.driverPhone}</div>` : ''}
              </td>
              <td style="color: #64748b; font-size: 10px;">${v.vendorName || 'Own / Direct'}</td>
              <td style="color: #475569; font-size: 9.5px;">${v.remarks || '—'}</td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>

    <!-- Section 4: Day-by-Day Daily Itinerary (if available) -->
    ${
      pkg.dailyLogs && pkg.dailyLogs.length > 0
        ? `
      <div style="margin-bottom: 18px;">
        <h2 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #0B192C; text-transform: uppercase; letter-spacing: 0.3px;">
          📍 Day-by-Day Tour Itinerary
        </h2>
        <table style="margin-top: 0;">
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">Day</th>
              <th style="width: 75px;">Date</th>
              <th>Places Visited / Sightseeing</th>
              <th style="width: 140px;">Hotel / Overnight Stay</th>
              <th>Daily Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${pkg.dailyLogs
              .map(
                (log: any) => `
              <tr>
                <td style="text-align: center; font-weight: 700; color: #b45309; background: #fffbeb;">${log.dayNumber}</td>
                <td><strong>${formatDate(log.date)}</strong></td>
                <td><strong style="color: #0f172a;">${log.placesVisited || 'As scheduled'}</strong></td>
                <td style="color: #334155; font-weight: 600;">🏨 ${log.hotelStayed || '—'}</td>
                <td style="color: #64748b; font-size: 9.5px; font-style: italic;">${log.dailyRemarks || '—'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
        : ''
    }

    <!-- Section 5: Important Terms & Support -->
    <div style="margin-top: 14px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 9.5px; color: #64748b; line-height: 1.5;">
      <div style="font-weight: 700; color: #0B192C; margin-bottom: 3px; font-size: 10px;">
        ℹ️ Important Guest Information & Support:
      </div>
      <div>• Valid government photo identification (Aadhaar / Passport) is mandatory at all hotel check-ins.</div>
      <div>• Driver contact and vehicle details are confirmed above; please coordinate directly on day of pickup.</div>
      <div>• For 24/7 on-ground emergency assistance or route updates, contact your dedicated travel coordinator.</div>
    </div>

    <!-- Sign-off Block -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 12px; font-size: 10px; color: #64748b;">
      <div>
        <div>System-generated document from <strong>Travel Operations CRM</strong></div>
        <div>Verify booking status online at <code>http://localhost:3001</code></div>
      </div>
      <div style="text-align: center; width: 180px;">
        <div style="border-bottom: 1.5px solid #0B192C; height: 35px; margin-bottom: 4px;"></div>
        <div style="font-weight: 700; color: #0B192C;">Authorized Operations Sign</div>
      </div>
    </div>
  `;

  openPrintWindow(`Voucher_${pkg.bookingId || 'Package'}_${formattedName.replace(/\s+/g, '_')}`, html, 'portrait');
}


