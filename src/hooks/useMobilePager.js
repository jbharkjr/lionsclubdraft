import { useState } from 'react';

export function useMobilePager() {
  const mobilePages = ['Clock', 'Progress', 'Members', 'Settings'];
  const [mobilePage, setMobilePage] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);

  const handleMobileTouchEnd = (event) => {
    if (touchStartX === null) return;

    const touchEndX = event.changedTouches?.[0]?.clientX ?? touchStartX;
    const distance = touchStartX - touchEndX;

    if (Math.abs(distance) > 45) {
      setMobilePage((page) => {
        if (distance > 0) return Math.min(page + 1, mobilePages.length - 1);
        return Math.max(page - 1, 0);
      });
    }

    setTouchStartX(null);
  };

  return {
    mobilePages,
    mobilePage,
    setMobilePage,
    setTouchStartX,
    handleMobileTouchEnd,
  };
}
