import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyTask from '@/models/DailyTask';
import { syncToCloud } from '@/lib/cloudSync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (date) {
      const d = new Date(date);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      query.taskDate = { $gte: start, $lte: end };
    }

    const tasks = await DailyTask.find(query).sort({ createdAt: 1 }).lean();
    return NextResponse.json(JSON.parse(JSON.stringify(tasks)));
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const task = new DailyTask(body);
    await task.save();

    // Mirror to cloud
    syncToCloud('dailytasks', 'insert', task.toObject());

    return NextResponse.json(JSON.parse(JSON.stringify(task)), { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
