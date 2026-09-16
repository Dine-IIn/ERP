import React from 'react';
import { Rocket, Sparkles, CheckCircle2 } from 'lucide-react';
import { updaterService, UpdateInfo } from '../../services/updaterService';

interface UpdateEnforcementModalProps {
  updateInfo: UpdateInfo;
}

export const UpdateEnforcementModal: React.FC<UpdateEnforcementModalProps> = ({ updateInfo }) => {
  const handleApply = () => {
    updaterService.applyClientUpdate();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '1.5rem'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '2px solid var(--accent-primary)',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        textAlign: 'center',
        padding: '2rem 1.75rem'
      }}>
        {/* Animated Rocket Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          color: 'var(--accent-primary)'
        }}>
          <Rocket size={32} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
          System Update Available
        </h2>
        
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: '1rem'
        }}>
          <Sparkles size={14} />
          <span>New Version: v{updateInfo.latestVersion}</span>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
          GEC ERP has been updated with new manufacturing features, optimizations, and security patches. To ensure system reliability and data consistency, please apply the update now.
        </p>

        {updateInfo.releaseNotes && (
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            fontSize: '0.78rem',
            textAlign: 'left',
            color: 'var(--text-secondary)',
            maxHeight: '120px',
            overflowY: 'auto',
            marginBottom: '1.5rem',
            lineHeight: 1.4
          }}>
            <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Release Notes:</strong>
            {updateInfo.releaseNotes}
          </div>
        )}

        <button
          type="button"
          onClick={handleApply}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.85rem',
            fontSize: '1rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            borderRadius: '0.5rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>OK (Update & Relaunch)</span>
        </button>
      </div>
    </div>
  );
};
