import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { socialReturnPath } from '../../shared/social-return.mjs';
import { Keyboard } from '@capacitor/keyboard';
import { useNavigate } from 'react-router-dom';
import { isNative } from '@/lib/mobile';
import { restoreNativePhoto } from '@/lib/nativeCamera';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function NativeLifecycle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const launchRead = useRef(false);
  useEffect(() => {
    if (!isNative) return;
    const socialReturn = ({ url }) => {
      const path = socialReturnPath(url);
      if (path) { Browser.close().catch(() => {}); navigate(path); }
    };
    if (!launchRead.current) {
      launchRead.current = true;
      App.getLaunchUrl().then(value => { if (value) socialReturn(value); }).catch(() => {});
    }
    const listeners = [
      App.addListener('appUrlOpen', socialReturn),
      Keyboard.addListener('keyboardWillShow', () => document.documentElement.classList.add('native-keyboard-open')),
      Keyboard.addListener('keyboardWillHide', () => document.documentElement.classList.remove('native-keyboard-open')),
      App.addListener('backButton', ({ canGoBack }) => {
        if (document.querySelector('[role="dialog"]')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
        else if (canGoBack) window.history.back();
        else App.minimizeApp();
      }),
    ];
    if (user?.id) listeners.push(App.addListener('appRestoredResult', event => {
      restoreNativePhoto(event, user.id).then(restored => { if (restored) navigate('/studio'); }).catch(error => toast.error(error.message));
    }));
    return () => { listeners.forEach(listener => listener.then(value => value.remove())); document.documentElement.classList.remove('native-keyboard-open'); };
  }, [navigate, user?.id]);
  return null;
}
