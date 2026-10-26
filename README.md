# Travel Operations, Fleet & Package CRM Dashboard

A local-first, offline-capable **Operations, Fleet & Package CRM** built for travel companies and tour operators using **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Local MongoDB (Mongoose)**.

---

## Features

- **Daily Operations Command Center:**
  - Global interactive date selector (Previous, Today, Next).
  - 4 Dynamic KPIs: Check-ins Today, Vehicles Running Today, Total Pax on Ground, and Upcoming Packages.
  - Daily Operational Tasks & Notes quick-widget.
- **Master Package & Guest CRM:**
  - Auto-generated collision-proof Booking IDs (`TRV-XXXX`).
  - Auto-calculated travel duration (`5 Days / 4 Nights`) and pending balance.
  - Multi-criteria filtering (Agency, Dates, Status, Search).
- **Day-by-Day Sightseeing & Stay Log:**
  - Embedded itinerary updater with day-by-day movements, hotels, and remarks.
- **Daily Fleet & Vehicle Tracker:**
  - Daily cab deployment tracking linked to packages or entered manually.
  - Driver names, direct click-to-call links, vehicle numbers, vendors, and duty routes.
- **Multi-Sheet Excel Export (.xlsx):**
  - Sheet 1: Filtered Packages & Daily Itineraries.
  - Sheet 2: Daily Fleet Logs.
- **2-Month Retention & Safe Purge:**
  - Automatic scan of records older than 60 days.
  - Enforces automatic Excel backup download before deleting records from MongoDB.
  - Custom date-range archive and delete.

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** Local MongoDB via Mongoose
- **Styling:** Tailwind CSS + Lucide React
- **Export:** SheetJS (`xlsx`)

---

## Getting Started

### 1. Prerequisites
Ensure MongoDB is running locally:
```bash
brew services start mongodb/brew/mongodb-community
# or: mongod --dbpath /usr/local/var/mongodb
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create `.env.local` (or copy from `.env.example`):
```env
MONGODB_URI=mongodb://127.0.0.1:27017/travel_operations_crm
```

### 4. (Optional) Seed Sample Data
```bash
npm run seed
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

