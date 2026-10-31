import React from 'react';
import { FitnessCalendar } from '../components/calendar/FitnessCalendar';

export const CalendarPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary tracking-tight">
          Calendar &amp; Athletic Notes
        </h1>
        <p className="text-xs text-secondary mt-0.5">
          Select any date to log custom notes, record daily weight, review workout sessions, and track long-term discipline.
        </p>
      </div>

      {/* Main Interactive Calendar */}
      <FitnessCalendar />
    </div>
  );
};
