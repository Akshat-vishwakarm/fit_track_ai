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
  editingMeal?: MealEntry | null;
}

const MEAL_TYPES: { label: string; value: MealType }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
  { label: 'Other', value: 'other' },
];

const UNITS = ['g', 'oz', 'servings', 'pieces', 'ml'];

export const LogMealModal: React.FC<LogMealModalProps> = ({
  isOpen,
  onClose,
  onSaveMeal,
  userId,
  editingMeal,
}) => {
  // Step flow: 'input' | 'analyzing' | 'confirm' | 'error'
  const [step, setStep] = useState<'input' | 'analyzing' | 'confirm' | 'error'>('input');

  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [foodDescription, setFoodDescription] = useState('');
  const [amount, setAmount] = useState<string>('200');
  const [unit, setUnit] = useState<string>('g');

  const [analysisResult, setAnalysisResult] = useState<NutritionAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (editingMeal) {
      setMealType(editingMeal.meal_type || 'breakfast');
      setFoodDescription(editingMeal.food_name || '');
      setAmount(editingMeal.amount ? String(editingMeal.amount) : '200');
      setUnit(editingMeal.unit || 'g');
      setStep('input');
    } else if (isOpen) {
      setStep('input');
      setMealType('breakfast');
      setFoodDescription('');
      setAmount('200');
      setUnit('g');
      setAnalysisResult(null);
      setErrorMessage('');
    }
  }, [editingMeal, isOpen]);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!foodDescription.trim()) return;

    setStep('analyzing');
    setErrorMessage('');

    try {
      const numAmount = amount.trim() ? Number(amount) : undefined;

      // 2.5-second hard timeout race to ensure user never gets stuck loading
      const apiPromise = geminiNutritionService.analyzeNutrition({
        mealType,
        foodDescription: foodDescription.trim(),
        amount: numAmount,
        unit,
      });

      const timeoutPromise = new Promise<NutritionAnalysisResult>((resolve) => {
        setTimeout(() => {
          resolve(geminiNutritionService.fallbackAnalysis(mealType, foodDescription.trim(), numAmount, unit));
        }, 2500);
      });

      const result = await Promise.race([apiPromise, timeoutPromise]);

      setAnalysisResult(result);
      setStep('confirm');
    } catch (err: any) {
      console.warn('API error, using instant calculated fallback:', err);
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

  const handleConfirmSave = async () => {
    if (!analysisResult) return;

    await onSaveMeal({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      meal_type: analysisResult.mealType,
      food_name: analysisResult.originalDescription,
      amount: analysisResult.amount,
      unit: analysisResult.unit,
      calories: analysisResult.totalCalories,
      protein: analysisResult.totalProtein,
      carbs: analysisResult.totalCarbs,
      fats: analysisResult.totalFat,
      food_items: analysisResult.foodItems,
      estimation_note: analysisResult.estimationNote,
    });

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#00e599', '#00d2ff', '#dab1ff'],
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'confirm' ? 'AI Nutrition Analysis' : editingMeal ? 'Edit Logged Meal' : 'Log Meal'}
    >
      {/* STEP 1: INPUT FORM */}
      {step === 'input' && (
        <form onSubmit={handleAnalyze} className="space-y-4">
          {/* FIELD 1: Meal Type */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
              Meal Type *
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container capitalize font-heading font-semibold"
            >
              {MEAL_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* FIELD 2: What did you eat? */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
              What did you eat? *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. 200g chicken breast + 150g cooked rice or 2 eggs and 3 chapatis"
              value={foodDescription}
              onChange={(e) => setFoodDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container font-sans leading-relaxed"
            />
          </div>

          {/* FIELD 3 & 4: Amount & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                Amount
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container font-heading font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container font-heading font-semibold"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-semibold hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!foodDescription.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed text-xs font-heading font-bold shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span>Analyze with AI</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: ANALYZING LOADING STATE */}
      {step === 'analyzing' && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-primary-container/20 border-t-primary-container animate-spin" />
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              auto_awesome
            </span>
          </div>
          <div>
            <h4 className="font-heading font-bold text-base text-on-surface">Analyzing your meal...</h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Calculating calories, protein, carbs, and fat breakdown.
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: AI CONFIRMATION CARD */}
      {step === 'confirm' && analysisResult && (
        <div className="space-y-5">
          {/* Ambiguity Warning Banner if present */}
          {analysisResult.isAmbiguous && analysisResult.clarificationQuestion && (
            <div className="bg-flame/15 border border-flame/40 p-3 rounded-xl flex items-start gap-2.5 text-xs text-flame">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">help</span>
              <div>
                <span className="font-bold font-heading uppercase block mb-0.5">Note on Ambiguity</span>
                <span>{analysisResult.clarificationQuestion}</span>
              </div>
            </div>
          )}

          {/* Meal Overview Header */}
          <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10 flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-heading font-bold uppercase bg-surface-container-high text-primary-container">
                {analysisResult.mealType}
              </span>
              <h4 className="font-heading font-bold text-sm text-on-surface mt-1">
                {analysisResult.originalDescription}
              </h4>
            </div>
            {analysisResult.amount && (
              <span className="text-xs font-heading font-bold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-lg">
                {analysisResult.amount} {analysisResult.unit}
              </span>
            )}
          </div>

          {/* Individual Food Items Cards */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            <div className="text-[11px] font-heading font-bold text-on-surface-variant uppercase tracking-wider">
              Detected Food Items ({analysisResult.foodItems.length})
            </div>
            {analysisResult.foodItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-surface-container-high/40 p-3 rounded-xl border border-outline-variant/20 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-heading font-bold text-on-surface">{item.name}</div>
                  <div className="text-[10px] text-on-surface-variant">Portion: {item.amount} {item.unit}</div>
                </div>
                <div className="text-right">
                  <div className="font-heading font-bold text-primary-container">{item.calories} kcal</div>
                  <div className="text-[10px] text-on-surface-variant font-medium">
                    P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* TOTAL Summary Box */}
          <div className="bg-surface-container p-4 rounded-xl border border-primary-container/30 space-y-2 shadow-md">
            <div className="text-xs font-heading font-bold text-on-surface uppercase tracking-wider">
              TOTAL NUTRITION SUMMARY
            </div>

            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="bg-surface-container-high p-2 rounded-lg border border-outline-variant/10">
                <div className="text-[10px] text-on-surface-variant font-heading uppercase">Calories</div>
                <div className="font-heading font-extrabold text-sm text-primary-container">
                  {analysisResult.totalCalories} kcal
                </div>
              </div>
              <div className="bg-surface-container-high p-2 rounded-lg border border-outline-variant/10">
                <div className="text-[10px] text-on-surface-variant font-heading uppercase">Protein</div>
                <div className="font-heading font-extrabold text-sm text-secondary">
                  {analysisResult.totalProtein}g
                </div>
              </div>
              <div className="bg-surface-container-high p-2 rounded-lg border border-outline-variant/10">
                <div className="text-[10px] text-on-surface-variant font-heading uppercase">Carbs</div>
                <div className="font-heading font-extrabold text-sm text-primary-container">
                  {analysisResult.totalCarbs}g
                </div>
              </div>
              <div className="bg-surface-container-high p-2 rounded-lg border border-outline-variant/10">
                <div className="text-[10px] text-on-surface-variant font-heading uppercase">Fat</div>
                <div className="font-heading font-extrabold text-sm text-tertiary-container">
                  {analysisResult.totalFat}g
                </div>
              </div>
            </div>
          </div>

          {/* Estimation Note Disclaimer */}
          <div className="text-[11px] text-on-surface-variant/80 italic bg-surface-container-high/30 p-2.5 rounded-lg border border-outline-variant/10">
            ℹ️ {analysisResult.estimationNote}
          </div>

          {/* Action Buttons: [ Edit ] and [ Save Meal ] */}
          <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-heading font-bold transition-colors"
            >
              Edit Inputs
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-secondary-container text-on-secondary-fixed text-xs font-heading font-bold shadow-[0_0_12px_rgba(0,229,153,0.3)] hover:scale-105 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Save Meal</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ERROR STATE */}
      {step === 'error' && (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-error-container/30 text-error flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px]">warning</span>
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-on-surface">Unable to analyze this meal right now</h4>
            <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">{errorMessage}</p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="px-5 py-2 rounded-xl bg-primary-container text-on-primary-fixed text-xs font-bold shadow-[0_0_12px_rgba(0,210,255,0.3)]"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
