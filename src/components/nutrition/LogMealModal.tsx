import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { MealEntry, MealType, NutritionAnalysisResult } from '../../types';
import { geminiNutritionService } from '../../services/ai/geminiNutritionService';
import confetti from 'canvas-confetti';

interface LogMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMeal: (meal: Omit<MealEntry, 'id' | 'created_at'>) => Promise<void>;
  userId: string;
  initialMeal?: MealEntry | null;
  editingMeal?: MealEntry | null;
}

const MEAL_TYPES: { label: string; value: MealType }[] = [
  { label: 'BREAKFAST', value: 'breakfast' },
  { label: 'LUNCH', value: 'lunch' },
  { label: 'DINNER', value: 'dinner' },
  { label: 'SNACK', value: 'snack' },
  { label: 'OTHER', value: 'other' },
];

const UNITS = ['g', 'oz', 'servings', 'pieces', 'ml'];

export const LogMealModal: React.FC<LogMealModalProps> = ({
  isOpen,
  onClose,
  onSaveMeal,
  userId,
  initialMeal,
  editingMeal,
}) => {
  const currentEditing = initialMeal !== undefined ? initialMeal : editingMeal;
  const [step, setStep] = useState<'input' | 'analyzing' | 'confirm'>('input');

  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [foodDescription, setFoodDescription] = useState('');
  const [amount, setAmount] = useState<string>('200');
  const [unit, setUnit] = useState<string>('g');

  const [analysisResult, setAnalysisResult] = useState<NutritionAnalysisResult | null>(null);

  useEffect(() => {
    if (currentEditing) {
      setMealType(currentEditing.meal_type || 'breakfast');
      setFoodDescription(currentEditing.food_name || '');
      setAmount(currentEditing.amount ? String(currentEditing.amount) : '200');
      setUnit(currentEditing.unit || 'g');
      setAnalysisResult({
        mealType: currentEditing.meal_type || 'breakfast',
        originalDescription: currentEditing.food_name || '',
        foodItems: [],
        totalCalories: currentEditing.calories || 0,
        totalProtein: currentEditing.protein || 0,
        totalCarbs: currentEditing.carbs || 0,
        totalFat: currentEditing.fats || 0,
        estimationNote: currentEditing.estimation_note || 'Manual entry',
      });
      setStep('confirm');
    } else if (isOpen) {
      setStep('input');
      setMealType('breakfast');
      setFoodDescription('');
      setAmount('200');
      setUnit('g');
      setAnalysisResult(null);
    }
  }, [currentEditing, isOpen]);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!foodDescription.trim()) return;

    setStep('analyzing');

    try {
      const numAmount = amount.trim() ? Number(amount) : undefined;
      const apiPromise = geminiNutritionService.analyzeNutrition({
        mealType,
        foodDescription: foodDescription.trim(),
        amount: numAmount,
        unit,
      });

      const timeoutPromise = new Promise<NutritionAnalysisResult>((resolve) => {
        setTimeout(() => {
          resolve(geminiNutritionService.fallbackAnalysis(mealType, foodDescription.trim(), numAmount, unit));
        }, 2000);
      });

      const result = await Promise.race([apiPromise, timeoutPromise]);
      setAnalysisResult(result);
      setStep('confirm');
    } catch {
      const numAmount = amount.trim() ? Number(amount) : undefined;
      const fallback = geminiNutritionService.fallbackAnalysis(
        mealType,
        foodDescription.trim(),
        numAmount,
        unit
      );
      setAnalysisResult(fallback);
      setStep('confirm');
    }
  };

  const handleCommit = async () => {
    if (!analysisResult) return;

    await onSaveMeal({
      user_id: userId,
      meal_type: mealType,
      food_name: foodDescription.trim() || 'Meal Item',
      amount: Number(amount) || 200,
      unit: unit.trim() || 'g',
      calories: Math.round(Number(analysisResult.totalCalories) || 0),
      protein: Math.round(Number(analysisResult.totalProtein) || 0),
      carbs: Math.round(Number(analysisResult.totalCarbs) || 0),
      fats: Math.round(Number(analysisResult.totalFat) || 0),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
      colors: ['#000000', '#555555', '#999999'],
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentEditing ? 'Edit Nutrition Entry' : 'Log Nutrition Entry'}
    >
      <div className="space-y-4">
        {/* Step 1: Input Description and Tag */}
        {step === 'input' && (
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-secondary mb-1.5">
                Meal Category
              </label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setMealType(t.value)}
                    className={`py-1.5 px-3 rounded font-mono text-xs font-medium cursor-pointer transition-colors ${
                      mealType === t.value
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-secondary hover:text-primary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-secondary mb-1">
                Food Item Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Oats 100g with whey isolate protein, or 200g grilled chicken"
                value={foodDescription}
                onChange={(e) => setFoodDescription(e.target.value)}
                className="w-full px-3 py-2 rounded bg-surface border border-outline text-primary text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-secondary mb-1">
                  Portion Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surface border border-outline text-primary text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-secondary mb-1">
                  Unit Measurement
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surface border border-outline text-primary text-sm focus:outline-none focus:border-primary font-mono"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-outline">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded border border-outline text-secondary hover:text-primary transition-colors text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-primary text-on-primary hover:bg-[#222222] transition-colors text-xs font-medium flex items-center gap-1.5"
              >
                <span>Analyze &amp; Calculate</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Analyzing State */}
        {step === 'analyzing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="font-mono text-xs text-primary font-medium">
              Analyzing Macronutrient Telemetry...
            </div>
            <p className="text-xs text-secondary">
              Calculating calories, protein, carbs, and fats profile
            </p>
          </div>
        )}

        {/* Step 3: Confirm and Commit */}
        {step === 'confirm' && analysisResult && (
          <div className="space-y-4">
            <div className="bg-surface p-3.5 rounded border border-outline space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold text-sm text-primary">
                  {foodDescription || 'Meal Summary'}
                </span>
                <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-surface-container-highest text-primary">
                  {mealType}
                </span>
              </div>
              <div className="font-mono text-xs text-secondary">
                Amount: {amount} {unit}
              </div>
            </div>

            {/* Editable Macro Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-surface border border-outline rounded p-2.5">
                <label className="block text-[10px] font-mono uppercase text-secondary">
                  Calories
                </label>
                <input
                  type="number"
                  value={analysisResult.totalCalories}
                  onChange={(e) =>
                    setAnalysisResult({ ...analysisResult, totalCalories: Number(e.target.value) || 0 })
                  }
                  className="w-full mt-1 font-heading text-lg font-semibold text-primary bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-mono text-secondary">kcal</span>
              </div>

              <div className="bg-surface border border-outline rounded p-2.5">
                <label className="block text-[10px] font-mono uppercase text-secondary">
                  Protein
                </label>
                <input
                  type="number"
                  value={analysisResult.totalProtein}
                  onChange={(e) =>
                    setAnalysisResult({ ...analysisResult, totalProtein: Number(e.target.value) || 0 })
                  }
                  className="w-full mt-1 font-heading text-lg font-semibold text-primary bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-mono text-secondary">grams</span>
              </div>

              <div className="bg-surface border border-outline rounded p-2.5">
                <label className="block text-[10px] font-mono uppercase text-secondary">
                  Carbs
                </label>
                <input
                  type="number"
                  value={analysisResult.totalCarbs}
                  onChange={(e) =>
                    setAnalysisResult({ ...analysisResult, totalCarbs: Number(e.target.value) || 0 })
                  }
                  className="w-full mt-1 font-heading text-lg font-semibold text-primary bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-mono text-secondary">grams</span>
              </div>

              <div className="bg-surface border border-outline rounded p-2.5">
                <label className="block text-[10px] font-mono uppercase text-secondary">
                  Fats
                </label>
                <input
                  type="number"
                  value={analysisResult.totalFat}
                  onChange={(e) =>
                    setAnalysisResult({ ...analysisResult, totalFat: Number(e.target.value) || 0 })
                  }
                  className="w-full mt-1 font-heading text-lg font-semibold text-primary bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-mono text-secondary">grams</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-outline">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 rounded border border-outline text-secondary hover:text-primary transition-colors text-xs font-medium"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleCommit}
                className="px-4 py-2 rounded bg-primary text-on-primary hover:bg-[#222222] transition-colors text-xs font-medium"
              >
                Commit Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
