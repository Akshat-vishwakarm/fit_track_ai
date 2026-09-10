import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { Goal, GoalCategory } from '../../types';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGoal: (goal: Omit<Goal, 'id' | 'created_at' | 'status'>) => Promise<void>;
  userId: string;
}

const CATEGORIES: { label: string; value: GoalCategory }[] = [
  { label: 'Weight Target', value: 'weight' },
  { label: 'Habit Consistency', value: 'habit' },
  { label: 'Workout Volume', value: 'workout' },
  { label: 'Nutrition Adherence', value: 'nutrition' },
  { label: 'Custom Milestone', value: 'custom' },
];

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSaveGoal, userId }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('weight');
  const [targetValue, setTargetValue] = useState(72);
  const [currentValue, setCurrentValue] = useState(75);
  const [unit, setUnit] = useState('kg');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onSaveGoal({
      user_id: userId,
      title: title.trim(),
      category,
      target_value: Number(targetValue) || 0,
      current_value: Number(currentValue) || 0,
      unit: unit.trim() || 'units',
      start_date: new Date().toISOString().split('T')[0],
      deadline: deadline || undefined,
    });

    setTitle('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Personal Fitness Goal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Goal Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Reach 72kg Target Body Weight"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Goal Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as GoalCategory)}
            className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Start / Current
            </label>
            <input
              type="number"
              step="0.1"
              value={currentValue}
              onChange={(e) => setCurrentValue(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Target Value
            </label>
            <input
              type="number"
              step="0.1"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Unit
            </label>
            <input
              type="text"
              placeholder="e.g. kg, days"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Target Deadline (optional)
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-primary-container text-on-primary-fixed text-xs font-bold shadow-[0_0_12px_rgba(0,210,255,0.3)]"
          >
            Create Goal
          </button>
        </div>
      </form>
    </Modal>
  );
};
