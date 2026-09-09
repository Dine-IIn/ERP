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
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const found = options.find(o => o.value === value);
    if (found) {
      setQuery(found.label);
    } else if (!value) {
      setQuery('');
    }
    setIsTyping(false);
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        const match = options.find(o => o.value === value);
        setQuery(match ? match.label : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options]);

  // When user opens/clicks dropdown without typing new search text, show ALL options.
  // Filter only when actively typing a new search.
  const filteredOptions = (!isTyping || query === selectedOption?.label)
    ? options
    : options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase())) ||
        o.value.toLowerCase().includes(query.toLowerCase())
      );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          required={required}
          className="input-field"
          style={{ paddingRight: '2rem', cursor: 'pointer' }}
          placeholder={placeholder}
          value={query}
          onFocus={() => {
            setIsOpen(true);
            setIsTyping(false);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsTyping(true);
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
          maxHeight: '240px',
          overflowY: 'auto',
          zIndex: 200,
          boxShadow: '0 10px 20px -3px rgba(0, 0, 0, 0.35)',
          padding: '0.25rem'
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No matching options found
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
                    setIsTyping(false);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '0.55rem 0.75rem',
                    cursor: 'pointer',
                    borderRadius: '0.375rem',
                    marginBottom: '2px',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.16)' : 'transparent',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.84rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <div style={{ fontWeight: isSelected ? 800 : 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {opt.label}
                      {isSelected && (
                        <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                          Selected
                        </span>
                      )}
                    </div>
                    {opt.sublabel && (
                      <div style={{ fontSize: '0.74rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {opt.sublabel}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {opt.badge && (
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check size={16} color="var(--accent-primary)" style={{ strokeWidth: 2.5 }} />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
