import { useState, useEffect } from 'react';

export function useTableKeyboardNav<T>(
  itemsList: T[],
  onOpenItem: (item: T) => void
) {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [itemsList]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in normal inputs (except search bar), ignore arrow keys
      const activeElement = document.activeElement;
      const activeTag = activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      
      if (itemsList.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (isInput && activeElement instanceof HTMLElement) {
          activeElement.blur(); // Blur input to allow visual row navigation
        }
        setSelectedIndex(prev => (prev + 1 < itemsList.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (isInput && activeElement instanceof HTMLElement) {
          activeElement.blur();
        }
        setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : itemsList.length - 1));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < itemsList.length) {
          e.preventDefault();
          onOpenItem(itemsList[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemsList, selectedIndex, onOpenItem]);

  return { selectedIndex, setSelectedIndex };
}
