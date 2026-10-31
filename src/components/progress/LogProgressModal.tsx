import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { ProgressEntry } from '../../types';

interface LogProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProgress: (entry: Omit<ProgressEntry, 'id' | 'created_at'>) => Promise<void>;
  userId: string;
}

export const LogProgressModal: React.FC<LogProgressModalProps> = ({
  isOpen,
  onClose,
  onSaveProgress,
  userId,
}) => {
  const [weight, setWeight] = useState<string>('75.0');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [waist, setWaist] = useState<string>('');
  const [chest, setChest] = useState<string>('');
  const [arms, setArms] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSaveProgress({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      weight: weight ? Number(weight) : undefined,
      body_fat: bodyFat ? Number(bodyFat) : undefined,
      waist: waist ? Number(waist) : undefined,
      chest: chest ? Number(chest) : undefined,
      arms: arms ? Number(arms) : undefined,
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Body Measurements">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase text-secondary mb-1">
            Body Weight (kg) *
          </label>
          <input
            type="number"
            step="0.1"
            required
            placeholder="e.g. 75.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Body Fat (%)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 15.0"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Waist (cm)
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="e.g. 80.0"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Chest (cm)
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="e.g. 100.0"
              value={chest}
              onChange={(e) => setChest(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Arms (cm)
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="e.g. 38.0"
              value={arms}
              onChange={(e) => setArms(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-outline-variant text-secondary hover:text-primary transition-colors text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-primary text-on-primary hover:bg-neutral-800 transition-colors text-xs font-medium cursor-pointer"
          >
            Commit Entry
          </button>
        </div>
      </form>
    </Modal>
  );
};
