import React from 'react';
import { CheckCircle } from 'lucide-react';

interface Props {
  user: any;
}

const QualityMaintenance: React.FC<Props> = ({ user }) => {
  return (
    <div className="max-w-4xl mx-auto select-none animate-fade-in">
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 mb-6">
        <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2 font-display">
          <CheckCircle className="w-5 h-5 text-indigo-400" />
          Quality Management & Maintenance
        </h3>
      </div>
      
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-8 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-bold text-[var(--text-primary)] mb-2 font-display">Welcome to Quality Management & Maintenance</h4>
        <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
          Schedule machine maintenance and perform product quality inspections. This module is currently active but waiting for data populations. Please configure the sub-features from the super admin panel.
        </p>
      </div>
    </div>
  );
};

export default QualityMaintenance;
