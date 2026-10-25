'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CheckSquare, Square, Loader2, ClipboardList } from 'lucide-react';
import { ToastMessage } from './Toast';

interface Task {
  _id: string;
  taskText: string;
  completed: boolean;
  taskDate: string;
}

interface DailyTaskWidgetProps {
  selectedDate: string;
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

export default function DailyTaskWidget({ selectedDate, addToast }: DailyTaskWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to load tasks' });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, addToast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskText: newTask.trim(), taskDate: selectedDate, completed: false }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks((prev) => [...prev, task]);
        setNewTask('');
        addToast({ type: 'success', message: 'Task added!' });
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to add task' });
    } finally {
      setAdding(false);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, completed: !t.completed } : t))
        );
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to update task' });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== id));
        addToast({ type: 'success', message: 'Task removed' });
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete task' });
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} style={{ color: '#FF9F1C' }} />
          <h3 className="font-heading font-semibold text-gray-800">Daily Tasks & Notes</h3>
        </div>
        {tasks.length > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
            {completedCount}/{tasks.length} done
          </span>
        )}
      </div>

      {/* Add task input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a task or note..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': '#FF9F1C' } as React.CSSProperties}
        />
        <button
          onClick={addTask}
          disabled={adding || !newTask.trim()}
          className="px-3 py-2 rounded-lg text-white flex items-center gap-1 text-sm font-medium disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#FF9F1C' }}
        >
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
      </div>

      {/* Tasks list */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No tasks for today. Add one above!</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group transition-colors"
            >
              <button onClick={() => toggleTask(task)} className="flex-shrink-0">
                {task.completed ? (
                  <CheckSquare size={18} style={{ color: '#FF9F1C' }} />
                ) : (
                  <Square size={18} className="text-gray-400" />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  task.completed ? 'line-through text-gray-400' : 'text-gray-700'
                }`}
              >
                {task.taskText}
              </span>
              <button
                onClick={() => deleteTask(task._id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
