import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { NutritionGoal } from '../../types';

interface NutritionGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goals: { calories: number; protein: number; carbs: number; fats: number }) => Promise<void>;
  initialGoal?: NutritionGoal | null;
}

export const NutritionGoalModal: React.FC<NutritionGoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialGoal,
}) => {
  const [calories, setCalories] = useState(2000);
  const [protein, setProtein] = useState(150);
  const [carbs, setCarbs] = useState(200);
  const [fats, setFats] = useState(65);

  useEffect(() => {
    if (initialGoal) {
      setCalories(initialGoal.calories || 2000);
      setProtein(initialGoal.protein || 150);
      setCarbs(initialGoal.carbs || 200);
      setFats(initialGoal.fats || 65);
    }
  }, [initialGoal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      calories: Number(calories) || 2000,
      protein: Number(protein) || 150,
      carbs: Number(carbs) || 200,
      fats: Number(fats) || 65,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Daily Nutrition Targets">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase text-secondary mb-1">
            Daily Calorie Target (kcal) *
          </label>
          <input
            type="number"
            required
            min="500"
            max="10000"
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value))}
            className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Protein (g)
            </label>
            <input
              type="number"
              min="0"
              value={protein}
              onChange={(e) => setProtein(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Carbs (g)
            </label>
            <input
              type="number"
              min="0"
              value={carbs}
              onChange={(e) => setCarbs(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Fats (g)
            </label>
            <input
              type="number"
              min="0"
              value={fats}
              onChange={(e) => setFats(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
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
            Save Target Budget
          </button>
        </div>
      </form>
    </Modal>
  );
};
