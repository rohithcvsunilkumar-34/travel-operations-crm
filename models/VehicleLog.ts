import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicleLog extends Document {
  operationDate: Date;
  packageId: string;
  guestName: string;
  paxInVehicle: number;
  vehicleType: string;
  vehicleNumber: string;
  vendorName: string;
  numberOfCabs: number;
  vendorCost: number;
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
    numberOfCabs: { type: Number, default: 1 },
    vendorCost: { type: Number, default: 0 },
    driverName: { type: String, default: '' },
    driverPhone: { type: String, default: '' },
    dutyRoute: { type: String, default: '' },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

VehicleLogSchema.index({ packageId: 1, operationDate: 1 });
VehicleLogSchema.index({ vehicleNumber: 1, operationDate: 1 });
VehicleLogSchema.index({ driverName: 1, operationDate: 1 });
VehicleLogSchema.index({ vendorName: 1, operationDate: 1 });

const VehicleLog =
  mongoose.models.VehicleLog || mongoose.model<IVehicleLog>('VehicleLog', VehicleLogSchema);
export default VehicleLog;
