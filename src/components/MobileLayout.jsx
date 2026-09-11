import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { StudioStateProvider } from "@/lib/StudioStateContext";
import { useAuth } from "@/lib/AuthContext";
import WorkspaceNav from "@/components/WorkspaceNav";
import NativeLifecycle from '@/components/NativeLifecycle';
import GenerationProgress from '@/components/studio/GenerationProgress';

export default function MobileLayout() {
  return (
    <StudioStateProvider>
      <MobileLayoutInner />
    </StudioStateProvider>
  );
}

function MobileLayoutInner() {
  const { isAuthenticated } = useAuth();
  const showNavigation = isAuthenticated;
  const navigate = useNavigate();

  // Il cambio sezione conserva la bozza e non accumula i tab nella cronologia.
  const handleTabClick = (e, to) => {
    e.preventDefault();
    navigate(to, { replace: true });
  };

  return (
    <div className={showNavigation ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0' : ''}>
      <NativeLifecycle />
      <Outlet />
      <GenerationProgress />
      {showNavigation && <div
        className="mobile-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-16 items-center justify-center px-4"><WorkspaceNav mobile onNavigate={handleTabClick} /></div>
      </div>}
    </div>
  );
}
