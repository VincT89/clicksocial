import React, { useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

const THRESHOLD = 60;
const MAX_PULL = 90;

// Pull-to-refresh per dispositivi touch: trascina in cima alla pagina per ricaricare.
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  const handleTouchStart = (e) => {
    if (refreshing) return;
    startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
  };

  const handleTouchMove = (e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY <= 0) {
      setPull(Math.min(MAX_PULL, delta * 0.5));
    } else if (delta < 0) {
      setPull(0);
    }
  };

  const handleTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(0);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPull(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pull > 0 || refreshing) && (
        <div className="flex justify-center pb-3 select-none">
          {refreshing ? (
            <Loader2 className="w-5 h-5 animate-spin text-purple" />
          ) : (
            <RefreshCw
              className="w-5 h-5 text-muted-foreground transition-transform"
              style={{ transform: `rotate(${(pull / MAX_PULL) * 180}deg)` }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}