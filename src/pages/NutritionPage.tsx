import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { nutritionService } from '../services/nutritionService';
import { NutritionSummaryCard } from '../components/nutrition/NutritionSummaryCard';
import { NutritionGoalModal } from '../components/nutrition/NutritionGoalModal';
import { LogMealModal } from '../components/nutrition/LogMealModal';
import type { MealEntry } from '../types';

export const NutritionPage: React.FC = () => {
  const { nutritionGoal, todayConsumed, allMeals, refreshData } = useData();
  const { currentUser } = useAuth();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);

  const handleSaveGoal = async (goals: { calories: number; protein: number; carbs: number; fats: number }) => {
    if (!currentUser) return;
    await nutritionService.saveNutritionGoal(currentUser.id, goals);
    await refreshData();
  };

  const handleSaveMeal = async (mealData: Omit<MealEntry, 'id' | 'created_at'>) => {
    if (editingMeal) {
      await nutritionService.updateMealEntry(editingMeal.id, mealData);
    } else {
      await nutritionService.addMealEntry(mealData);
    }
    setEditingMeal(null);
    await refreshData();
  };

  const handleEditMeal = (meal: MealEntry) => {
    setEditingMeal(meal);
    setIsMealModalOpen(true);
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (confirm('Remove meal entry?')) {
      await nutritionService.deleteMealEntry(mealId);
      await refreshData();
    }
  };

  const handleOpenNewMealModal = () => {
    setEditingMeal(null);
    setIsMealModalOpen(true);
  };

  const handleDownloadLog = async () => {
    if (!currentUser) return;

    const fetchedMeals = await nutritionService.getMealEntries(currentUser.id);
    if (fetchedMeals.length === 0) {
      alert('No nutrition entries found to download.');
      return;
    }

    // Group meals by date (YYYY-MM-DD)
    const mealsByDateMap: Record<string, MealEntry[]> = {};
    fetchedMeals.forEach((meal) => {
      const d = meal.date || new Date().toISOString().split('T')[0];
      if (!mealsByDateMap[d]) mealsByDateMap[d] = [];
      mealsByDateMap[d].push(meal);
    });

    const sortedDates = Object.keys(mealsByDateMap).sort((a, b) => (b > a ? 1 : -1));

    const csvLines: string[] = [];
    csvLines.push(`FITTRACK AI NUTRITION LOG BACKUP - ${currentUser.name}`);
    csvLines.push(`Export Date: ${new Date().toLocaleString()}`);
    csvLines.push('');

    sortedDates.forEach((dateStr) => {
      const dateMeals = mealsByDateMap[dateStr];
      const dObj = new Date(dateStr + 'T00:00:00');
      const formattedDate = dObj.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      csvLines.push(`================================================================================`);
      csvLines.push(`DATE: ${dateStr} (${formattedDate}) - ${dateMeals.length} Meals Logged`);
      csvLines.push(`================================================================================`);
      csvLines.push('Time,Meal Type,Food Description,Amount,Unit,Calories (kcal),Protein (g),Carbs (g),Fat (g)');

      let dayCals = 0;
      let dayP = 0;
      let dayC = 0;
      let dayF = 0;

      dateMeals.forEach((m) => {
        dayCals += m.calories || 0;
        dayP += m.protein || 0;
        dayC += m.carbs || 0;
        dayF += m.fats || 0;

        csvLines.push(
          [
            `"${m.time || ''}"`,
            `"${m.meal_type.toUpperCase()}"`,
            `"${(m.food_name || '').replace(/"/g, '""')}"`,
            m.amount !== undefined ? m.amount : '',
            `"${m.unit || 'g'}"`,
            m.calories || 0,
            m.protein || 0,
            m.carbs || 0,
            m.fats || 0,
          ].join(',')
        );
      });

      csvLines.push(
        `"--- DAILY TOTAL (${dateStr}) ---",,,,,${dayCals},${dayP.toFixed(1)},${dayC.toFixed(1)},${dayF.toFixed(1)}`
      );
      csvLines.push('');
    });

    const csvContent = csvLines.join('\n');

    // Trigger Browser Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    const safeUserName = (currentUser.name || 'user').replace(/\s+/g, '_');

    link.setAttribute('href', url);
    link.setAttribute('download', `FitTrack_Nutrition_Log_${safeUserName}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-on-surface">AI Nutrition Tracker</h1>
          <p className="text-xs text-on-surface-variant">
            Describe your meal to Gemini AI for automated nutritional analysis and real macro tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadLog}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-heading font-bold text-xs transition-all border border-outline-variant/20 shadow-sm"
            title="Download CSV Log"
          >
            <span className="material-symbols-outlined text-[18px] text-primary-container">download</span>
            <span>Download Log</span>
          </button>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-heading font-bold text-xs transition-all border border-outline-variant/20 shadow-sm"
          >
            ⚙️ Macro Targets
          </button>
          <button
            onClick={handleOpenNewMealModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed font-heading font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>Log Meal</span>
          </button>
        </div>
      </div>

      {/* Main Nutrition Summary Card */}
      <NutritionSummaryCard
        goal={nutritionGoal}
        todayConsumed={todayConsumed}
        allMeals={allMeals}
        onSetGoalClick={() => setIsGoalModalOpen(true)}
        onLogMealClick={handleOpenNewMealModal}
        onEditMeal={handleEditMeal}
        onDeleteMeal={handleDeleteMeal}
        onDownloadLog={handleDownloadLog}
      />

      {/* Target Configuration Modal */}
      <NutritionGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSaveGoal}
        initialGoal={nutritionGoal}
      />

      {/* Gemini AI Log Meal Modal */}
      {currentUser && (
        <LogMealModal
          isOpen={isMealModalOpen}
          onClose={() => {
            setIsMealModalOpen(false);
            setEditingMeal(null);
          }}
          onSaveMeal={handleSaveMeal}
          userId={currentUser.id}
          editingMeal={editingMeal}
        />
      )}
    </div>
  );
};
