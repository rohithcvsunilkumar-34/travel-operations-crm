import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyTask extends Document {
  taskDate: Date;
  taskText: string;
  completed: boolean;
  createdAt: Date;
}

const DailyTaskSchema = new Schema<IDailyTask>(
  {
    taskDate: { type: Date, required: true, index: true },
    taskText: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const DailyTask =
  mongoose.models.DailyTask || mongoose.model<IDailyTask>('DailyTask', DailyTaskSchema);
export default DailyTask;
