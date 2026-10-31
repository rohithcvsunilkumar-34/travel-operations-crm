import mongoose, { Schema, Document } from 'mongoose';

export interface IFoodLog extends Document {
  packageId: string;
  guestName: string;
  mealDate: Date;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
  restaurantName: string;
  foodCost: number;
  paxCount: number;
  paymentStatus: 'Pending' | 'Paid';
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}

const FoodLogSchema = new Schema<IFoodLog>(
  {
    packageId: { type: String, default: '', index: true },
    guestName: { type: String, required: true, trim: true },
    mealDate: { type: Date, required: true, index: true },
    mealType: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
      default: 'Lunch',
    },
    restaurantName: { type: String, required: true, trim: true, index: true },
    foodCost: { type: Number, required: true, default: 0 },
    paxCount: { type: Number, default: 1 },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending',
    },
    remarks: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

FoodLogSchema.index({ restaurantName: 1, mealDate: 1 });
FoodLogSchema.index({ packageId: 1, mealDate: 1 });

const FoodLog =
  mongoose.models.FoodLog || mongoose.model<IFoodLog>('FoodLog', FoodLogSchema);
export default FoodLog;

