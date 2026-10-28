#!/usr/bin/env node
/**
 * scripts/notify.mjs
 * Standalone CLI runner to trigger upcoming package check-in notifications
 * (7 days, 3 days, 1 day)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  });
}

const PORT = process.env.PORT || 3001;
const CRON_SECRET = process.env.CRON_SECRET || 'crm_cron_secret_2026';
const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');

console.log('🚀 Checking Upcoming Tour Check-in Reminders (7-day, 3-day, 1-day)...');

async function triggerReminders() {
  const url = `http://localhost:${PORT}/api/cron/reminders?secret=${encodeURIComponent(CRON_SECRET)}${force ? '&force=true' : ''}${dryRun ? '&dryRun=true' : ''}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error('❌ Failed to process reminders:', data.error || res.statusText);
      process.exit(1);
    }

    const report = data.report;
    console.log(`\n📅 Date: ${report.referenceDate}`);
    console.log(`📊 Active Packages Evaluated: ${report.totalActivePackages}`);
    console.log(`🎯 Milestone Matches Found: ${report.eligiblePackages}`);
    console.log(`✉️ Reminders Sent: ${report.remindersSentCount}`);
    console.log(`⏭️ Skipped (Already Sent Today): ${report.skippedAlreadySent}`);

    if (report.results && report.results.length > 0) {
      console.log('\n📬 Sent Reminders:');
      report.results.forEach((r) => {
        const status = r.success ? (r.simulated ? 'SIMULATED' : 'SENT') : 'FAILED';
        console.log(`  • [${r.stage}] ${r.guestName} (${r.bookingId}) -> ${r.recipient} [${status}]`);
      });
    }

    console.log('\n✅ Tour check-in reminder run completed successfully.');
  } catch (err) {
    console.error('❌ Could not connect to Travel CRM at localhost:' + PORT);
    console.error('Ensure the CRM server is running: npm run dev\n');
    console.error(err.message);
    process.exit(1);
  }
}

triggerReminders();
