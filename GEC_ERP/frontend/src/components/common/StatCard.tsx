import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color = 'blue', onClick, onDoubleClick }) => {
  const getColorStyles = () => {
    switch (color) {
      case 'green': return { bg: 'rgba(16, 185, 129, 0.12)', text: 'var(--success)' };
      case 'amber': return { bg: 'rgba(245, 158, 11, 0.12)', text: 'var(--warning)' };
      case 'red': return { bg: 'rgba(239, 68, 68, 0.12)', text: 'var(--danger)' };
      case 'purple': return { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7' };
      default: return { bg: 'var(--accent-light)', text: 'var(--accent-primary)' };
    }
  };

  const style = getColorStyles();
  const isInteractive = Boolean(onClick || onDoubleClick);

  return (
    <div 
      className="card" 
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={isInteractive ? `${title} (Double-click or click to open)` : title}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        cursor: isInteractive ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease'
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '0.75rem',
        backgroundColor: style.bg,
        color: style.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {title}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
