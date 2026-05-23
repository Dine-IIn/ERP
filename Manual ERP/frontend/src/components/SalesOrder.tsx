import React from 'react';
import { TrendingUp } from 'lucide-react';

interface Props {
  user: any;
}

const SalesOrder: React.FC<Props> = ({ user }) => {
  return (
    <div className="max-w-4xl mx-auto select-none animate-fade-in">
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 mb-6">
        <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2 font-display">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          Sales & Order Management
        </h3>
      </div>
      
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-8 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-bold text-[var(--text-primary)] mb-2 font-display">Welcome to Sales & Order Management</h4>
        <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
          Track sales pipelines, customer orders, and distribution logistics. This module is currently active but waiting for data populations. Please configure the sub-features from the super admin panel.
        </p>
      </div>
    </div>
  );
};

export default SalesOrder;
