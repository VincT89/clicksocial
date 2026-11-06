import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { StudioStateProvider } from "@/lib/StudioStateContext";
import { useAuth } from "@/lib/AuthContext";
import WorkspaceFooter from '@/components/WorkspaceFooter';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
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
  const { pathname } = useLocation();
  const pageClass = { '/impostazioni':'workspace-brand-page', '/media':'workspace-media-page' }[pathname] || '';

  return (
    <div className={showNavigation ? 'app-with-tabs' : ''}>
      <NativeLifecycle />
      {showNavigation && <WorkspaceSidebar />}
      <div className={'workspace-page ' + pageClass}><Outlet />{showNavigation && pathname !== '/studio' && <WorkspaceFooter />}</div>
      <GenerationProgress />
      {showNavigation && <div
        className="mobile-bottom-nav fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background"
        style={{ paddingBottom: "var(--app-safe-bottom,env(safe-area-inset-bottom))" }}
      >
        <WorkspaceNav mobile />
      </div>}
    </div>
  );
}
