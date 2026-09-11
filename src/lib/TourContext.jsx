import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TourOverlay from '@/components/TourOverlay';
import { TOURS } from '@/lib/tours';
import { visibleTourTarget } from '@/lib/tourTargets';

const TourContext = createContext(null);
export function TourProvider({ children }) {
  const { pathname } = useLocation();
  const [tour, setTour] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const close = useCallback(() => setTour(null), []);
  useEffect(() => { close(); }, [pathname, close]);
  const startTour = useCallback(() => {
    const steps = (TOURS[pathname] || []).filter(step => visibleTourTarget(step.selector));
    if (!steps.length) return;
    setStepIndex(0);
    setTour({ path: pathname, steps });
  }, [pathname]);
  const steps = tour?.path === pathname ? tour.steps : [];
  const next = () => stepIndex + 1 < steps.length ? setStepIndex(i => i + 1) : close();
  return <TourContext.Provider value={{ startTour, restartTour: startTour, next, prev: () => setStepIndex(i => Math.max(0, i - 1)), skip: close, steps, stepIndex }}>
    {children}<TourOverlay />
  </TourContext.Provider>;
}
export function useTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTour richiede TourProvider.');
  return context;
}

