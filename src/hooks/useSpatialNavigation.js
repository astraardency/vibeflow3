import { useEffect } from 'react';

export function useSpatialNavigation() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        // Find all focusable elements
        const focusableElements = Array.from(document.querySelectorAll('.tv-focusable, [tabindex="0"]')).filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
        });

        if (focusableElements.length === 0) return;

        let currentFocused = document.activeElement;
        
        // If nothing is focused or activeElement is body, focus the first element
        if (!currentFocused || currentFocused === document.body || !focusableElements.includes(currentFocused)) {
          if (e.key !== 'Enter') {
            e.preventDefault();
            focusableElements[0].focus();
          }
          return;
        }

        if (e.key === 'Enter') {
          // Let default click handling happen if it's a button or link
          return;
        }

        e.preventDefault(); // Prevent scrolling

        const currentRect = currentFocused.getBoundingClientRect();
        
        let bestMatch = null;
        let minDistance = Infinity;

        focusableElements.forEach(el => {
          if (el === currentFocused) return;
          const rect = el.getBoundingClientRect();
          
          let isEligible = false;
          let distance = Infinity;
          
          // Calculate overlap to prioritize straight lines over diagonals
          const hOverlap = Math.max(0, Math.min(currentRect.right, rect.right) - Math.max(currentRect.left, rect.left));
          const vOverlap = Math.max(0, Math.min(currentRect.bottom, rect.bottom) - Math.max(currentRect.top, rect.top));

          if (e.key === 'ArrowRight' && rect.left >= currentRect.right - 10) {
            isEligible = true;
            const dx = rect.left - currentRect.right;
            const dy = (rect.top + rect.bottom) / 2 - (currentRect.top + currentRect.bottom) / 2;
            distance = Math.sqrt(dx * dx + dy * dy * 4); // penalize diagonal movement
            if (hOverlap > 0) distance -= 1000; // heavily prefer overlapping rows
          } else if (e.key === 'ArrowLeft' && rect.right <= currentRect.left + 10) {
            isEligible = true;
            const dx = currentRect.left - rect.right;
            const dy = (rect.top + rect.bottom) / 2 - (currentRect.top + currentRect.bottom) / 2;
            distance = Math.sqrt(dx * dx + dy * dy * 4);
            if (hOverlap > 0) distance -= 1000;
          } else if (e.key === 'ArrowDown' && rect.top >= currentRect.bottom - 10) {
            isEligible = true;
            const dy = rect.top - currentRect.bottom;
            const dx = (rect.left + rect.right) / 2 - (currentRect.left + currentRect.right) / 2;
            distance = Math.sqrt(dy * dy + dx * dx * 4);
            if (vOverlap > 0) distance -= 1000;
          } else if (e.key === 'ArrowUp' && rect.bottom <= currentRect.top + 10) {
            isEligible = true;
            const dy = currentRect.top - rect.bottom;
            const dx = (rect.left + rect.right) / 2 - (currentRect.left + currentRect.right) / 2;
            distance = Math.sqrt(dy * dy + dx * dx * 4);
            if (vOverlap > 0) distance -= 1000;
          }

          if (isEligible && distance < minDistance) {
            minDistance = distance;
            bestMatch = el;
          }
        });

        if (bestMatch) {
          bestMatch.focus();
          // Attempt to scroll into view if needed
          bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
