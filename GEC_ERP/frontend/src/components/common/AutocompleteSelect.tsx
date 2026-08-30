import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface AutocompleteOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface AutocompleteSelectProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const AutocompleteSelect: React.FC<AutocompleteSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Type to search & select...',
  required = false
}) => {
  const selectedOption = options.find(o => o.value === value);
  const [query, setQuery] = useState<string>(selectedOption?.label || '');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = options.find(o => o.value === value);
    if (found) {
      setQuery(found.label);
    } else if (!value) {
      setQuery('');
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        const match = options.find(o => o.value === value);
        setQuery(match ? match.label : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options]);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase())) ||
    o.value.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          required={required}
          className="input-field"
          style={{ paddingRight: '2rem' }}
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
        />
        <ChevronDown 
          size={16} 
          style={{ 
            position: 'absolute', 
            right: '0.75rem', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--text-muted)',
            pointerEvents: 'none'
          }} 
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '0.25rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          maxHeight: '220px',
          overflowY: 'auto',
          zIndex: 200,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No matching suggestions found
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setQuery(opt.label);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '0.625rem 0.875rem',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{opt.label}</div>
                    {opt.sublabel && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.sublabel}</div>
                    )}
                  </div>
                  {opt.badge && (
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                      {opt.badge}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
