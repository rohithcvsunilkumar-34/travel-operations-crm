import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyLog {
  dayNumber: number;
  date: Date;
  placesVisited: string;
  hotelStayed: string;
  dailyRemarks: string;
}

export interface IHotelAllocation {
  hotelName: string;
  location?: string;
  roomType?: string;
  numberOfRooms: number;
  extraBeds: number;
  cost?: number;
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
  hotelName: string;
  numberOfRooms: number;
  extraBeds: number;
  hotelAllocations: IHotelAllocation[];
  packageAmount: number;
  advancePaid: number;
  balancePending: number;
  hotelCost: number;
  total_hotel_cost: number;
  cabVendorCost: number;
  total_cab_cost: number;
  total_food_cost: number;
  otherExpenses: number;
  totalExpense: number;
  netProfit: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
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
    hotelName: { type: String, trim: true, default: '' },
    numberOfRooms: { type: Number, default: 1 },
    extraBeds: { type: Number, default: 0 },
    hotelAllocations: [
      {
        hotelName: { type: String, default: '', trim: true },
        location: { type: String, default: '' },
        roomType: { type: String, default: 'Standard' },
        numberOfRooms: { type: Number, default: 1 },
        extraBeds: { type: Number, default: 0 },
        cost: { type: Number, default: 0 },
      },
    ],
    packageAmount: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    balancePending: { type: Number, default: 0 },
    hotelCost: { type: Number, default: 0 },
    total_hotel_cost: { type: Number, default: 0 },
    cabVendorCost: { type: Number, default: 0 },
    total_cab_cost: { type: Number, default: 0 },
    total_food_cost: { type: Number, default: 0 },
    otherExpenses: { type: Number, default: 0 },
    totalExpense: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Upcoming',
    },
    dailyLogs: [DailyLogSchema],
  },
  { timestamps: true }
);

PackageSchema.index({ checkInDate: 1, checkOutDate: 1 });
PackageSchema.index({ status: 1, checkInDate: 1 });
PackageSchema.index({ guestName: 'text', bookingId: 'text', agencyName: 'text' });
PackageSchema.index({ hotelName: 1, checkInDate: 1 });
PackageSchema.index({ 'hotelAllocations.hotelName': 1 });

// Auto-calculate financial metrics and generate unique bookingId before save
PackageSchema.pre('save', async function (next) {
  // Sync expenses and net profit
  const hCost = Number(this.total_hotel_cost) || Number(this.hotelCost) || 0;
  this.total_hotel_cost = hCost;
  this.hotelCost = hCost;

  const cCost = Number(this.total_cab_cost) || Number(this.cabVendorCost) || 0;
  this.total_cab_cost = cCost;
  this.cabVendorCost = cCost;

  const fCost = Number(this.total_food_cost) || 0;
  this.total_food_cost = fCost;

  const oCost = Number(this.otherExpenses) || 0;
  this.totalExpense = hCost + cCost + fCost + oCost;
  this.netProfit = (Number(this.packageAmount) || 0) - this.totalExpense;

  // If primary hotelName not explicitly set, sync from hotelAllocations or hotelDetails
  if (!this.hotelName && this.hotelAllocations && this.hotelAllocations.length > 0) {
    this.hotelName = this.hotelAllocations[0].hotelName;
  } else if (!this.hotelName && this.hotelDetails) {
    // extract first hotel name if simple
    const firstWord = this.hotelDetails.split(/[\n,;-]/)[0]?.trim();
    if (firstWord && firstWord.length < 50) {
      this.hotelName = firstWord;
    }
  }

  // Ensure balance pending calculation
  const pkgAmt = Number(this.packageAmount) || 0;
  const advPaid = Number(this.advancePaid) || 0;
  this.balancePending = Math.max(0, pkgAmt - advPaid);

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
