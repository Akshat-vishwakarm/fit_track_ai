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
  'eco',
  'psychology',
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
  const [icon, setIcon] = useState('directions_run');
  const [category, setCategory] = useState<HabitCategory>('fitness');
  const [goalTarget, setGoalTarget] = useState(1);
  const [unit, setUnit] = useState('times');
  const [color, setColor] = useState('#00d2ff');
  const COLORS = ['#00d2ff', '#00e599', '#dab1ff', '#f97316', '#ffb4ab', '#47d6ff'];

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
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Habit Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Drink 3L Water"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as HabitCategory)}
            className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Daily Target
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={goalTarget}
              onChange={(e) => setGoalTarget(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Unit
            </label>
            <input
              type="text"
              placeholder="e.g. Liters, Mins"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
            />
          </div>
        </div>

        {goalTarget > 1 && (
          <div className="text-[11px] text-primary-container font-heading font-semibold flex items-center gap-1.5 bg-primary-container/10 px-3 py-2 rounded-xl border border-primary-container/20">
            <span className="material-symbols-outlined text-[16px]">splitscreen</span>
            <span>
              Creates {goalTarget} separate rows: &quot;{name.trim() || 'gym'} 1&quot;, &quot;{name.trim() || 'gym'} 2&quot;
              {goalTarget > 2 ? `, ... &quot;${name.trim() || 'gym'} ${goalTarget}&quot;` : ''}
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-2">
            Accent Color
          </label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-white shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-2">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  icon === ic
                    ? 'bg-primary-container text-on-primary-fixed ring-2 ring-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{ic}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-semibold hover:bg-surface-variant"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-primary-container text-on-primary-fixed text-xs font-bold shadow-[0_0_12px_rgba(0,210,255,0.3)] hover:scale-[1.02] transition-transform"
          >
            Save Habit
          </button>
        </div>
      </form>
    </Modal>
  );
};
