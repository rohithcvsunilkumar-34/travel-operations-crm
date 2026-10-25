import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicleLog extends Document {
  operationDate: Date;
  packageId: string;
  guestName: string;
  paxInVehicle: number;
  vehicleType: string;
  vehicleNumber: string;
  vendorName: string;
  driverName: string;
  driverPhone: string;
  dutyRoute: string;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleLogSchema = new Schema<IVehicleLog>(
  {
    operationDate: { type: Date, required: true, index: true },
    packageId: { type: String, default: '' },
    guestName: { type: String, required: true, trim: true },
    paxInVehicle: { type: Number, default: 1 },
    vehicleType: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' },
    vendorName: { type: String, default: '' },
    driverName: { type: String, default: '' },
    driverPhone: { type: String, default: '' },
    dutyRoute: { type: String, default: '' },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

const VehicleLog =
  mongoose.models.VehicleLog || mongoose.model<IVehicleLog>('VehicleLog', VehicleLogSchema);
export default VehicleLog;
