import React, { useState } from 'react';
import type { NutritionGoal, MealEntry } from '../../types';

interface NutritionSummaryCardProps {
  goal: NutritionGoal | null;
  todayConsumed: { calories: number; protein: number; carbs: number; fats: number };
  allMeals: MealEntry[];
  onSetGoalClick: () => void;
  onLogMealClick: () => void;
  onEditMeal: (meal: MealEntry) => void;
  onDeleteMeal: (mealId: string) => Promise<void>;
  onDownloadLog?: () => void;
}

export const NutritionSummaryCard: React.FC<NutritionSummaryCardProps> = ({
  goal,
  todayConsumed,
  allMeals,
  onSetGoalClick,
  onLogMealClick,
  onEditMeal,
  onDeleteMeal,
  onDownloadLog,
}) => {
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  const targetCalories = goal?.calories || 0;
  const calPct = targetCalories > 0 ? Math.min(100, Math.round((todayConsumed.calories / targetCalories) * 100)) : 0;

  const targetProtein = goal?.protein || 0;
  const proteinPct = targetProtein > 0 ? Math.min(100, Math.round((todayConsumed.protein / targetProtein) * 100)) : 0;

  const targetCarbs = goal?.carbs || 0;
  const carbsPct = targetCarbs > 0 ? Math.min(100, Math.round((todayConsumed.carbs / targetCarbs) * 100)) : 0;

  const targetFats = goal?.fats || 0;
  const fatsPct = targetFats > 0 ? Math.min(100, Math.round((todayConsumed.fats / targetFats) * 100)) : 0;

  const hasNoData = !goal && allMeals.length === 0;

  const toggleExpand = (id: string) => {
    setExpandedMealId(expandedMealId === id ? null : id);
  };

  // Group meals by date (YYYY-MM-DD)
  const mealsByDateMap: Record<string, MealEntry[]> = {};
  (allMeals || []).forEach((meal) => {
    const d = meal.date || new Date().toISOString().split('T')[0];
    if (!mealsByDateMap[d]) mealsByDateMap[d] = [];
    mealsByDateMap[d].push(meal);
  });

  // Sorted dates descending (newest first)
  const sortedDates = Object.keys(mealsByDateMap).sort((a, b) => (b > a ? 1 : -1));
  const todayStr = new Date().toISOString().split('T')[0];

  const formatDateHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const formatted = d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      if (dateStr === todayStr) return `Today (${formatted})`;
      return formatted;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Zero State if unconfigured */}
      {hasNoData && (
        <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/20 shadow-lg text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-tertiary-container mb-4">
            <span className="material-symbols-outlined text-[36px]">restaurant</span>
          </div>
          <h3 className="font-heading text-lg font-bold text-on-surface mb-1">No nutrition data yet</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mb-6">
            Log your food using Gemini AI analysis to automatically track calories and macronutrients.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={onSetGoalClick}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-heading font-bold text-sm"
            >
              Set Calorie Target
            </button>
            <button
              onClick={onLogMealClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed font-heading font-bold text-sm shadow-[0_0_12px_rgba(0,210,255,0.3)] hover:scale-105 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Log Meal with AI</span>
            </button>
          </div>
        </div>
      )}

      {/* Daily Macro Progress Summary */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
              Today's Fuel Breakdown
            </span>
            <p className="text-xs text-on-surface-variant">Real stored calorie & macro totals</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSetGoalClick}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface-variant text-xs font-heading font-semibold transition-colors"
            >
              ⚙️ Targets
            </button>
            <button
              onClick={onLogMealClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-container text-on-primary-fixed text-xs font-heading font-bold shadow-[0_0_10px_rgba(0,210,255,0.3)] hover:scale-105 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              <span>Log Meal</span>
            </button>
          </div>
        </div>

        {/* Calorie Card Header */}
        <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-heading font-bold text-on-surface-variant uppercase">
              Calories Consumed
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-heading text-3xl font-extrabold text-primary-container">
                {todayConsumed.calories}
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                / {targetCalories || '0'} kcal ({calPct}%)
              </span>
            </div>
          </div>

          <div className="w-full sm:w-48">
            <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden">
              <div
                className="bg-primary-container h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,210,255,0.4)]"
                style={{ width: `${calPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-on-surface-variant mt-1 font-semibold">
              <span>{todayConsumed.calories} kcal</span>
              <span>{Math.max(0, targetCalories - todayConsumed.calories)} kcal left</span>
            </div>
          </div>
        </div>

        {/* Macros Trio Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Protein */}
          <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-heading font-bold text-secondary uppercase">Protein</span>
              <span className="font-bold text-on-surface">{todayConsumed.protein}g / {targetProtein}g</span>
            </div>
            <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
              <div
                className="bg-secondary-container h-full rounded-full transition-all duration-500"
                style={{ width: `${proteinPct}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-heading font-bold text-primary-container uppercase">Carbs</span>
              <span className="font-bold text-on-surface">{todayConsumed.carbs}g / {targetCarbs}g</span>
            </div>
            <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary-container h-full rounded-full transition-all duration-500"
                style={{ width: `${carbsPct}%` }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-heading font-bold text-tertiary-container uppercase">Fats</span>
              <span className="font-bold text-on-surface">{todayConsumed.fats}g / {targetFats}g</span>
            </div>
            <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
              <div
                className="bg-tertiary-container h-full rounded-full transition-all duration-500"
                style={{ width: `${fatsPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logged Meals List - Grouped by Date */}
      {sortedDates.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
              Meal Log History by Date ({allMeals.length} Total Meals)
            </div>

            {onDownloadLog && (
              <button
                onClick={onDownloadLog}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-heading font-bold border border-outline-variant/20 transition-all shadow-sm"
                title="Download CSV Log"
              >
                <span className="material-symbols-outlined text-[16px] text-primary-container">download</span>
                <span>Download Log</span>
              </button>
            )}
          </div>

          {/* Render Date Sections */}
          {sortedDates.map((dateStr) => {
            const dateMeals = mealsByDateMap[dateStr];
            
            // Calculate total for this specific date
            const dateTotals = dateMeals.reduce(
              (acc, m) => {
                acc.cals += m.calories || 0;
                acc.p += m.protein || 0;
                acc.c += m.carbs || 0;
                acc.f += m.fats || 0;
                return acc;
              },
              { cals: 0, p: 0, c: 0, f: 0 }
            );

            return (
              <div
                key={dateStr}
                className="bg-surface-container-low border border-outline-variant/25 rounded-2xl p-5 space-y-4 shadow-lg"
              >
                {/* Date Section Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">
                      calendar_month
                    </span>
                    <span className="font-heading font-bold text-sm text-on-surface">
                      {formatDateHeader(dateStr)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-heading font-extrabold bg-surface-container-high text-on-surface-variant">
                      {dateMeals.length} {dateMeals.length === 1 ? 'meal' : 'meals'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-heading font-bold">
                    <span className="text-primary-container bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/10">
                      🔥 {dateTotals.cals} kcal
                    </span>
                    <span className="text-secondary bg-surface-container px-2 py-1 rounded-lg border border-outline-variant/10 text-[11px]">
                      P: {dateTotals.p.toFixed(1)}g
                    </span>
                    <span className="text-primary-container bg-surface-container px-2 py-1 rounded-lg border border-outline-variant/10 text-[11px]">
                      C: {dateTotals.c.toFixed(1)}g
                    </span>
                    <span className="text-tertiary-container bg-surface-container px-2 py-1 rounded-lg border border-outline-variant/10 text-[11px]">
                      F: {dateTotals.f.toFixed(1)}g
                    </span>
                  </div>
                </div>

                {/* Meals under this date */}
                <div className="space-y-3">
                  {dateMeals.map((meal) => {
                    const isExpanded = expandedMealId === meal.id;
                    const hasItems = meal.food_items && meal.food_items.length > 0;

                    return (
                      <div
                        key={meal.id}
                        className="bg-surface-container border border-outline-variant/20 rounded-xl p-4 space-y-2 transition-all hover:border-outline-variant/40"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-heading font-bold uppercase bg-surface-container-high text-primary-container">
                                {meal.meal_type}
                              </span>
                              <span className="font-heading text-xs font-bold text-on-surface">
                                {meal.food_name}
                              </span>
                              {meal.amount && (
                                <span className="text-[10px] text-on-surface-variant font-semibold bg-surface-container-high px-2 py-0.5 rounded">
                                  {meal.amount} {meal.unit || 'g'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-on-surface-variant">
                              P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-heading text-xs font-bold text-primary-container">
                              {meal.calories} kcal
                            </span>

                            {hasItems && (
                              <button
                                onClick={() => toggleExpand(meal.id)}
                                className="text-on-surface-variant hover:text-on-surface p-1 text-[11px] font-heading font-bold flex items-center"
                                title="View Items"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {isExpanded ? 'expand_less' : 'expand_more'}
                                </span>
                              </button>
                            )}

                            <button
                              onClick={() => onEditMeal(meal)}
                              className="text-on-surface-variant hover:text-primary-container p-1"
                              title="Edit Meal"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>

                            <button
                              onClick={() => onDeleteMeal(meal.id)}
                              className="text-on-surface-variant hover:text-error p-1"
                              title="Delete Meal"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Item Breakdown */}
                        {isExpanded && hasItems && (
                          <div className="pt-2 border-t border-outline-variant/10 space-y-1.5 animate-fade-in">
                            <div className="text-[10px] font-heading font-bold text-on-surface-variant uppercase">
                              AI Item Breakdown:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {meal.food_items!.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="bg-surface-container-high/60 p-2.5 rounded-lg border border-outline-variant/10 text-xs flex justify-between items-center"
                                >
                                  <div>
                                    <div className="font-heading font-bold text-on-surface">{item.name}</div>
                                    <div className="text-[10px] text-on-surface-variant">
                                      {item.amount} {item.unit}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-heading font-bold text-primary-container">
                                      {item.calories} kcal
                                    </div>
                                    <div className="text-[10px] text-on-surface-variant">
                                      P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {meal.estimation_note && (
                              <div className="text-[10px] text-on-surface-variant/80 italic pt-1">
                                ℹ️ {meal.estimation_note}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
