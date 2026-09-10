import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { WorkoutPlan, WorkoutLog, LoggedExercise, CompletedSet } from '../../types';
import confetti from 'canvas-confetti';

interface WorkoutLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLog: (logData: Omit<WorkoutLog, 'id' | 'created_at'>) => Promise<void>;
  plan: WorkoutPlan;
  userId: string;
}

export const WorkoutLogModal: React.FC<WorkoutLogModalProps> = ({
  isOpen,
  onClose,
  onSaveLog,
  plan,
  userId,
}) => {
  const [durationMins, setDurationMins] = useState(45);
  const [exerciseLogs, setExerciseLogs] = useState<LoggedExercise[]>(() => {
    return (plan.exercises || []).map((ex) => {
      const sets: CompletedSet[] = Array.from({ length: ex.target_sets || 3 }).map((_, i) => ({
        set_number: i + 1,
        weight: ex.target_weight || 0,
        reps: ex.target_reps || 10,
        completed: true,
      }));
      return {
        exercise_id: ex.id,
        exercise_name: ex.name,
        target_muscle: ex.target_muscle,
        sets,
      };
    });
  });

  const handleToggleSet = (exIndex: number, setIndex: number) => {
    setExerciseLogs((prev) =>
      prev.map((ex, i) => {
        if (i !== exIndex) return ex;
        const newSets = ex.sets.map((s, sj) =>
          sj === setIndex ? { ...s, completed: !s.completed } : s
        );
        return { ...ex, sets: newSets };
      })
    );
  };

  const handleUpdateSetField = (
    exIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    val: number
  ) => {
    setExerciseLogs((prev) =>
      prev.map((ex, i) => {
        if (i !== exIndex) return ex;
        const newSets = ex.sets.map((s, sj) =>
          sj === setIndex ? { ...s, [field]: val } : s
        );
        return { ...ex, sets: newSets };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveLog({
      user_id: userId,
      workout_plan_id: plan.id,
      workout_name: plan.workout_name,
      date: new Date().toISOString().split('T')[0],
      duration_minutes: Number(durationMins) || 45,
      exercise_logs: exerciseLogs,
    });

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00d2ff', '#00e599', '#f97316'],
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log Workout: ${plan.workout_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between bg-surface-container p-3 rounded-xl border border-outline-variant/20">
          <div>
            <div className="font-heading font-bold text-sm text-on-surface">{plan.workout_name}</div>
            <div className="text-xs text-on-surface-variant">{plan.muscle_group}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-on-surface-variant">Duration (mins):</label>
            <input
              type="number"
              min="1"
              max="300"
              value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value))}
              className="w-16 px-2 py-1 rounded-lg bg-surface-container-high text-xs font-bold text-primary-container text-center border border-outline-variant/30"
            />
          </div>
        </div>

        {/* Exercise Sets Tracker */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {exerciseLogs.map((exLog, exIdx) => (
            <div key={exLog.exercise_id} className="bg-surface-container-high/40 p-3 rounded-xl space-y-2 border border-outline-variant/20">
              <div className="font-heading text-xs font-bold text-on-surface">
                {exLog.exercise_name}
              </div>

              <div className="space-y-1">
                {exLog.sets.map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className="flex items-center justify-between bg-surface-container px-3 py-1.5 rounded-lg text-xs"
                  >
                    <span className="font-heading font-bold text-on-surface-variant w-12">
                      Set {set.set_number}
                    </span>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          value={set.weight}
                          onChange={(e) =>
                            handleUpdateSetField(exIdx, setIdx, 'weight', Number(e.target.value))
                          }
                          className="w-14 px-1 py-0.5 rounded bg-surface-container-high text-center font-bold text-on-surface"
                        />
                        <span className="text-[10px] text-on-surface-variant">kg</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={set.reps}
                          onChange={(e) =>
                            handleUpdateSetField(exIdx, setIdx, 'reps', Number(e.target.value))
                          }
                          className="w-12 px-1 py-0.5 rounded bg-surface-container-high text-center font-bold text-on-surface"
                        />
                        <span className="text-[10px] text-on-surface-variant">reps</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSet(exIdx, setIdx)}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                          set.completed
                            ? 'bg-secondary-container text-on-secondary-fixed font-bold'
                            : 'bg-surface-container-high text-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
            className="px-5 py-2 rounded-xl bg-secondary-container text-on-secondary-fixed text-xs font-bold shadow-[0_0_12px_rgba(0,229,153,0.3)]"
          >
            Complete Workout Log
          </button>
        </div>
      </form>
    </Modal>
  );
};
