import React from "react";
import { Outlet } from "react-router-dom";
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

  return (
    <div className={showNavigation ? 'app-with-tabs' : ''}>
      <NativeLifecycle />
      <Outlet />
      <GenerationProgress />
      {showNavigation && <div
        className="mobile-bottom-nav fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <WorkspaceNav mobile />
      </div>}
    </div>
  );
}
