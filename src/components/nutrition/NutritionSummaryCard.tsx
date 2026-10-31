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
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  const targetCalories = goal?.calories || 0;
  const calPct = targetCalories > 0 ? Math.min(100, Math.round((todayConsumed.calories / targetCalories) * 100)) : 0;
  const remainingCals = Math.max(0, targetCalories - todayConsumed.calories);

  const targetProtein = goal?.protein || 0;
  const proteinPct = targetProtein > 0 ? Math.min(100, Math.round((todayConsumed.protein / targetProtein) * 100)) : 0;

  const targetCarbs = goal?.carbs || 0;
  const carbsPct = targetCarbs > 0 ? Math.min(100, Math.round((todayConsumed.carbs / targetCarbs) * 100)) : 0;

  const targetFats = goal?.fats || 0;
  const fatsPct = targetFats > 0 ? Math.min(100, Math.round((todayConsumed.fats / targetFats) * 100)) : 0;

  // Group meals by date (YYYY-MM-DD)
  const mealsByDateMap: Record<string, MealEntry[]> = {};
  (allMeals || []).forEach((meal) => {
    const d = meal.date || new Date().toISOString().split('T')[0];
    if (!mealsByDateMap[d]) mealsByDateMap[d] = [];
    mealsByDateMap[d].push(meal);
  });

  const sortedDates = Object.keys(mealsByDateMap).sort((a, b) => (b > a ? 1 : -1));
  const todayStr = new Date().toISOString().split('T')[0];

  const toggleDateCollapse = (dateStr: string) => {
    setCollapsedDates((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  const formatDateHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const formatted = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
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
      {/* Energy Status & Macro Overview Bento matching Stitch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Total Calories Panel (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-secondary font-medium">
                Energy Budget
              </span>
              <span className="font-mono text-xs text-secondary bg-surface px-2.5 py-0.5 rounded border border-outline-variant">
                Target: {targetCalories > 0 ? `${targetCalories.toLocaleString()} kcal` : 'Unset'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 my-2">
              <span className="font-heading text-4xl sm:text-5xl font-semibold text-primary tracking-tight">
                {todayConsumed.calories.toLocaleString()}
              </span>
              <span className="font-heading text-lg text-secondary">
                / {targetCalories > 0 ? `${targetCalories.toLocaleString()} kcal` : '—'}
              </span>
              <span className="font-mono text-xs text-primary font-medium bg-surface px-2 py-0.5 rounded border border-outline-variant ml-auto">
                {calPct}% Met
              </span>
            </div>

            <p className="text-xs text-secondary mt-1">
              {targetCalories > 0
                ? `${remainingCals.toLocaleString()} kcal remaining for optimal athletic maintenance.`
                : 'Configure targets to track deficit or surplus windows.'}
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, calPct))}%` }}
              />
            </div>
            <div className="flex justify-between items-center font-mono text-xs text-secondary">
              <span className="text-primary font-medium">{todayConsumed.calories.toLocaleString()} kcal logged</span>
              <span>{remainingCals.toLocaleString()} kcal remaining</span>
            </div>
          </div>
        </div>

        {/* Macro Telemetry Cards (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-1 gap-3">
          {/* Protein Metric */}
          <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-mono text-xs uppercase tracking-widest text-primary font-medium">
                  Protein
                </span>
              </div>
              <div className="font-mono text-xs text-primary">
                <span className="font-medium">{todayConsumed.protein}g</span>{' '}
                <span className="text-secondary">/ {targetProtein}g</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${proteinPct}%` }} />
            </div>
            <div className="flex justify-between items-center mt-2 font-mono text-[11px] text-secondary">
              <span>Goal pace: {proteinPct >= 80 ? 'Optimal' : 'Active'}</span>
              <span>{proteinPct}%</span>
            </div>
          </div>

          {/* Carbs Metric */}
          <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-mono text-xs uppercase tracking-widest text-primary font-medium">
                  Carbohydrates
                </span>
              </div>
              <div className="font-mono text-xs text-primary">
                <span className="font-medium">{todayConsumed.carbs}g</span>{' '}
                <span className="text-secondary">/ {targetCarbs}g</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${carbsPct}%` }} />
            </div>
            <div className="flex justify-between items-center mt-2 font-mono text-[11px] text-secondary">
              <span>Glycogen stores: {carbsPct >= 70 ? 'High' : 'Moderate'}</span>
              <span>{carbsPct}%</span>
            </div>
          </div>

          {/* Fats Metric */}
          <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-mono text-xs uppercase tracking-widest text-primary font-medium">
                  Lipids / Fats
                </span>
              </div>
              <div className="font-mono text-xs text-primary">
                <span className="font-medium">{todayConsumed.fats}g</span>{' '}
                <span className="text-secondary">/ {targetFats}g</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${fatsPct}%` }} />
            </div>
            <div className="flex justify-between items-center mt-2 font-mono text-[11px] text-secondary">
              <span>Hormonal baseline: {fatsPct >= 50 ? 'Optimal' : 'Low'}</span>
              <span>{fatsPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary Matrix Strip (4 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] text-secondary uppercase tracking-wider">Hydration State</div>
            <div className="font-heading text-lg sm:text-xl font-semibold text-primary mt-1">Logged Daily</div>
          </div>
          <span className="material-symbols-outlined text-secondary text-[24px]">water_drop</span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] text-secondary uppercase tracking-wider">Total Meals</div>
            <div className="font-heading text-lg sm:text-xl font-semibold text-primary mt-1">
              {(mealsByDateMap[todayStr] || []).length} Today
            </div>
          </div>
          <span className="material-symbols-outlined text-secondary text-[24px]">restaurant</span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] text-secondary uppercase tracking-wider">All-Time Meals</div>
            <div className="font-heading text-lg sm:text-xl font-semibold text-primary mt-1">
              {allMeals.length} Total
            </div>
          </div>
          <span className="material-symbols-outlined text-secondary text-[24px]">schedule</span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] text-secondary uppercase tracking-wider">Target Variance</div>
            <div className="font-heading text-lg sm:text-xl font-semibold text-primary mt-1">
              {targetCalories > 0 ? `${calPct - 100}%` : '0.0%'}
            </div>
          </div>
          <span className="material-symbols-outlined text-secondary text-[24px]">analytics</span>
        </div>
      </div>

      {/* Meal Log History Section matching Stitch */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        {/* Table Section Header */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-base font-semibold text-primary tracking-tight">
              Meal Log History by Date
            </h2>
            <span className="font-mono text-xs text-secondary bg-surface px-2.5 py-0.5 rounded border border-outline-variant">
              {allMeals.length} Total Entries
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSetGoalClick}
              className="h-8 px-3 flex items-center gap-1.5 rounded border border-outline-variant bg-surface hover:bg-neutral-200 text-primary font-mono text-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Targets</span>
            </button>
            <button
              onClick={onLogMealClick}
              className="h-8 px-3 flex items-center gap-1.5 rounded bg-primary text-on-primary hover:bg-[#222222] font-mono text-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Log Meal</span>
            </button>
            {onDownloadLog && (
              <button
                onClick={onDownloadLog}
                className="h-8 px-3 flex items-center gap-1.5 rounded border border-outline-variant bg-surface hover:bg-neutral-200 text-primary font-mono text-xs transition-colors cursor-pointer"
                id="download-log-btn"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>Download CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Blocks Accordions */}
        {sortedDates.length === 0 ? (
          <div className="p-8 text-center text-secondary text-xs font-mono">
            No meal logs recorded yet. Click &quot;+ Log Meal&quot; to begin your food ledger.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {sortedDates.map((dateStr) => {
              const dateMeals = mealsByDateMap[dateStr] || [];
              const isCollapsed = !!collapsedDates[dateStr];

              let sumCals = 0;
              let sumP = 0;
              let sumC = 0;
              let sumF = 0;

              dateMeals.forEach((m) => {
                sumCals += m.calories || 0;
                sumP += m.protein || 0;
                sumC += m.carbs || 0;
                sumF += m.fats || 0;
              });

              return (
                <div key={dateStr} className="bg-surface-container-lowest">
                  {/* Accordion Toggle Header */}
                  <div
                    onClick={() => toggleDateCollapse(dateStr)}
                    className="px-5 py-3.5 bg-surface flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`material-symbols-outlined text-[18px] text-primary transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      >
                        expand_more
                      </span>
                      <span className="font-heading text-xs font-semibold text-primary">
                        {formatDateHeader(dateStr)}
                      </span>
                      <span className="font-mono text-xs text-secondary">
                        ({dateMeals.length} {dateMeals.length === 1 ? 'meal' : 'meals'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary bg-surface-container-lowest px-2.5 py-0.5 rounded border border-outline-variant">
                        {sumCals} kcal | P: {sumP}g | C: {sumC}g | F: {sumF}g
                      </span>
                    </div>
                  </div>

                  {/* Entries Body */}
                  {!isCollapsed && (
                    <div className="divide-y divide-outline-variant">
                      {dateMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-neutral-50 transition-colors group"
                        >
                          <div className="flex items-start lg:items-center gap-3 min-w-[280px]">
                            <span className="font-mono text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded bg-surface border border-outline-variant text-primary">
                              {meal.meal_type || 'MEAL'}
                            </span>
                            <div>
                              <div className="font-heading text-xs font-semibold text-primary">
                                {meal.food_name || 'Food Item'}{' '}
                                {meal.amount ? `(${meal.amount}${meal.unit ? ` ${meal.unit}` : ''})` : ''}
                              </div>
                              <div className="font-mono text-[11px] text-secondary mt-0.5">
                                Logged {meal.time || '12:00'}
                              </div>
                            </div>
                          </div>

                          {/* Macros Detail Strip */}
                          <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-secondary text-[10px] uppercase">P:</span>
                              <span className="text-primary font-medium">{meal.protein || 0}g</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-secondary text-[10px] uppercase">C:</span>
                              <span className="text-primary font-medium">{meal.carbs || 0}g</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-secondary text-[10px] uppercase">F:</span>
                              <span className="text-primary font-medium">{meal.fats || 0}g</span>
                            </div>
                          </div>

                          {/* Calories and Actions */}
                          <div className="flex items-center justify-between lg:justify-end gap-4">
                            <div className="text-right">
                              <span className="font-heading text-base font-semibold text-primary">
                                {meal.calories || 0}
                              </span>
                              <span className="font-mono text-xs text-secondary ml-1">kcal</span>
                            </div>

                            <div className="flex items-center gap-1 text-secondary">
                              <button
                                onClick={() => onEditMeal(meal)}
                                className="w-7 h-7 flex items-center justify-center rounded border border-outline-variant hover:bg-surface hover:text-primary transition-colors cursor-pointer"
                                title="Edit entry"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button
                                onClick={() => onDeleteMeal(meal.id)}
                                className="w-7 h-7 flex items-center justify-center rounded border border-outline-variant hover:bg-surface hover:text-error transition-colors cursor-pointer"
                                title="Delete entry"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
