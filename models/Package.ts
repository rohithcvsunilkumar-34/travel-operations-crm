import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyLog {
  dayNumber: number;
  date: Date;
  placesVisited: string;
  hotelStayed: string;
  dailyRemarks: string;
}

export interface IPackage extends Document {
  bookingId: string;
  guestName: string;
  contactNumber: string;
  agencyName: string;
  totalPax: number;
  checkInDate: Date;
  checkOutDate: Date;
  totalDays: string;
  hotelDetails: string;
  packageAmount: number;
  advancePaid: number;
  balancePending: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
  remindersSent?: string[];
  dailyLogs: IDailyLog[];
  createdAt: Date;
  updatedAt: Date;
}

const DailyLogSchema = new Schema<IDailyLog>({
  dayNumber: { type: Number, required: true },
  date: { type: Date, required: true },
  placesVisited: { type: String, default: '' },
  hotelStayed: { type: String, default: '' },
  dailyRemarks: { type: String, default: '' },
});

const PackageSchema = new Schema<IPackage>(
  {
    bookingId: { type: String, unique: true, index: true },
    guestName: { type: String, required: true, trim: true },
    contactNumber: { type: String, trim: true, default: '' },
    agencyName: { type: String, trim: true, default: 'Direct' },
    totalPax: { type: Number, default: 1 },
    checkInDate: { type: Date, required: true, index: true },
    checkOutDate: { type: Date, required: true, index: true },
    totalDays: { type: String, default: '' },
    hotelDetails: { type: String, default: '' },
    packageAmount: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    balancePending: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Upcoming',
    },
    remindersSent: {
      type: [String],
      default: [],
    },
    dailyLogs: [DailyLogSchema],
  },
  { timestamps: true }
);

// Auto-generate unique bookingId before save
PackageSchema.pre('save', async function (next) {
  if (!this.bookingId) {
    const PkgModel = (this.constructor as mongoose.Model<IPackage>);
    const lastPkg = await PkgModel.findOne({ bookingId: /^TRV-\d+$/ })
      .sort({ createdAt: -1 })
      .lean();
    let nextNum = 1001;
    if (lastPkg && lastPkg.bookingId) {
      const match = lastPkg.bookingId.match(/TRV-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    // Guarantee uniqueness
    while (await PkgModel.exists({ bookingId: `TRV-${nextNum}` })) {
      nextNum++;
    }
    this.bookingId = `TRV-${nextNum}`;
  }
  next();
});

const Package = mongoose.models.Package || mongoose.model<IPackage>('Package', PackageSchema);
export default Package;
