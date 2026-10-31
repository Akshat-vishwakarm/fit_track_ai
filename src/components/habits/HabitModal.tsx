import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { Habit, HabitCategory } from '../../types';
import { formatLocalDate } from '../../utils/dateUtils';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: Omit<Habit, 'id' | 'created_at' | 'archived'>) => Promise<void>;
  userId: string;
}

const ICONS = [
  'water_drop',
  'directions_run',
  'fitness_center',
  'bedtime',
  'menu_book',
  'self_improvement',
  'restaurant',
  'local_fire_department',
  'check_circle',
  'timer',
];

const CATEGORIES: { label: string; value: HabitCategory }[] = [
  { label: 'Health', value: 'health' },
  { label: 'Fitness', value: 'fitness' },
  { label: 'Mindset', value: 'mindset' },
  { label: 'Nutrition', value: 'nutrition' },
  { label: 'Productivity', value: 'productivity' },
  { label: 'Custom', value: 'custom' },
];

export const HabitModal: React.FC<HabitModalProps> = ({ isOpen, onClose, onSave, userId }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('check_circle');
  const [category, setCategory] = useState<HabitCategory>('fitness');
  const [goalTarget, setGoalTarget] = useState(1);
  const unit = 'times';
  const [color, setColor] = useState('#111111');
  const COLORS = ['#111111', '#333333', '#555555', '#777777', '#000000'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedName = name.trim();
    const target = Number(goalTarget) || 1;

    if (target > 1) {
      for (let i = 1; i <= target; i++) {
        await onSave({
          user_id: userId,
          name: `${trimmedName} ${i}`,
          icon,
          category,
          frequency: 'daily',
          goal_target: 1,
          unit: unit.trim() || 'times',
          color,
          start_date: formatLocalDate(),
        });
      }
    } else {
      await onSave({
        user_id: userId,
        name: trimmedName,
        icon,
        category,
        frequency: 'daily',
        goal_target: 1,
        unit: unit.trim() || 'times',
        color,
        start_date: formatLocalDate(),
      });
    }

    setName('');
    setGoalTarget(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Habit Routine">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase text-secondary mb-1">
            Habit Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Drink 3L Water"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as HabitCategory)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Daily Target Count
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={goalTarget}
              onChange={(e) => setGoalTarget(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-secondary mb-1.5">
            Select Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`w-9 h-9 rounded border flex items-center justify-center transition-colors ${
                  icon === ic
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface hover:border-primary text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{ic}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-secondary mb-1.5">
            Monochrome Tone
          </label>
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded border transition-transform ${
                  color === c ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'border-outline-variant'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-outline-variant text-secondary hover:text-primary transition-colors text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-primary text-on-primary hover:bg-neutral-800 transition-colors text-xs font-medium"
          >
            Create Routine
          </button>
        </div>
      </form>
    </Modal>
  );
};
