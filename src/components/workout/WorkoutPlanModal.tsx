import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { WorkoutPlan, WorkoutExercise } from '../../types';

interface WorkoutPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    dayOfWeek: number,
    workoutName: string,
    muscleGroup: string,
    exercises: WorkoutExercise[]
  ) => Promise<void>;
  initialPlan?: WorkoutPlan | null;
  selectedDay?: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WorkoutPlanModal: React.FC<WorkoutPlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPlan,
  selectedDay = 0,
}) => {
  const [dayOfWeek, setDayOfWeek] = useState(selectedDay);
  const [workoutName, setWorkoutName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

  useEffect(() => {
    if (initialPlan) {
      setDayOfWeek(initialPlan.day_of_week);
      setWorkoutName(initialPlan.workout_name);
      setMuscleGroup(initialPlan.muscle_group);
      setExercises(initialPlan.exercises || []);
    } else {
      setDayOfWeek(selectedDay);
      setWorkoutName('');
      setMuscleGroup('');
      setExercises([
        {
          id: 'ex_' + Date.now(),
          name: '',
          target_muscle: '',
          target_sets: 3,
          target_reps: 10,
          target_weight: 0,
        },
      ]);
    }
  }, [initialPlan, selectedDay, isOpen]);

  const handleAddExerciseRow = () => {
    setExercises((prev) => [
      ...prev,
      {
        id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        name: '',
        target_muscle: muscleGroup || 'General',
        target_sets: 3,
        target_reps: 10,
        target_weight: 0,
      },
    ]);
  };

  const handleRemoveExerciseRow = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (
    index: number,
    field: keyof WorkoutExercise,
    value: string | number
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutName.trim()) return;

    const validExercises = exercises.filter((ex) => ex.name.trim().length > 0);
    await onSave(dayOfWeek, workoutName.trim(), muscleGroup.trim() || 'Full Body', validExercises);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Workout Plan">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Training Day
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Workout Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Push Hypertrophy"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-secondary mb-1">
            Target Muscle Group
          </label>
          <input
            type="text"
            placeholder="e.g. Chest, Shoulders, Triceps"
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Exercises Builder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-mono uppercase text-secondary font-medium">
              Exercise List ({exercises.length})
            </label>
            <button
              type="button"
              onClick={handleAddExerciseRow}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Exercise</span>
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {exercises.map((ex, idx) => (
              <div
                key={ex.id}
                className="bg-surface p-3 rounded border border-outline-variant space-y-2 relative"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Exercise Name (e.g. Incline Bench Press)"
                    value={ex.name}
                    onChange={(e) => handleExerciseChange(idx, 'name', e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded bg-surface-container-lowest border border-outline-variant text-primary text-xs focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExerciseRow(idx)}
                    className="text-secondary hover:text-error p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-secondary">
                      Sets
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ex.target_sets}
                      onChange={(e) =>
                        handleExerciseChange(idx, 'target_sets', Number(e.target.value))
                      }
                      className="w-full px-2 py-1 rounded bg-surface-container-lowest border border-outline-variant text-primary text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-secondary">
                      Target Reps
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ex.target_reps}
                      onChange={(e) =>
                        handleExerciseChange(idx, 'target_reps', Number(e.target.value))
                      }
                      className="w-full px-2 py-1 rounded bg-surface-container-lowest border border-outline-variant text-primary text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-secondary">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={ex.target_weight}
                      onChange={(e) =>
                        handleExerciseChange(idx, 'target_weight', Number(e.target.value))
                      }
                      className="w-full px-2 py-1 rounded bg-surface-container-lowest border border-outline-variant text-primary text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
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
            Save Training Split
          </button>
        </div>
      </form>
    </Modal>
  );
};
