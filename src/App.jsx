import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
const Studio = lazy(() => import('@/pages/Studio'));
const Library = lazy(() => import('@/pages/Library'));
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const BusinessSetup = lazy(() => import('@/pages/BusinessSetup'));
const Profile = lazy(() => import('@/pages/Profile'));
const Admin = lazy(() => import('@/pages/Admin'));
const Sviluppatore = lazy(() => import('@/pages/Sviluppatore'));
import ProtectedRoute from '@/components/ProtectedRoute';
import MobileLayout from '@/components/MobileLayout';
import { TourProvider } from '@/lib/TourContext';
import useDarkMode from '@/hooks/useDarkMode';
import { TooltipProvider } from '@/components/ui/tooltip';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, checkAppState } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'unknown') return <main className="max-w-md mx-auto px-6 py-16" role="alert"><h1 className="font-heading text-2xl">Connessione all’app non disponibile</h1><p className="text-sm text-muted-foreground my-4">{authError.message}</p><button onClick={checkAppState} className="rounded-xl bg-primary text-primary-foreground px-5 py-3">Riprova</button></main>;
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
        </div>
      }
    >
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<MobileLayout />}>
        <Route path="/" element={<Landing />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/configura-azienda" element={<BusinessSetup />} />
          <Route path="/profilo" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/sviluppatore" element={<Sviluppatore />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/library" element={<Library />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {
  useDarkMode();

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <TooltipProvider delayDuration={350} skipDelayDuration={100}><TourProvider>
            <AuthenticatedApp />
          </TourProvider></TooltipProvider>
        </Router>
        <Toaster />
        <SonnerToaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
