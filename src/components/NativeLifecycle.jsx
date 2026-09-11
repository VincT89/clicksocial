import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { useNavigate } from 'react-router-dom';
import { isNative } from '@/lib/mobile';
import { restoreNativePhoto } from '@/lib/nativeCamera';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function NativeLifecycle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => {
    if (!isNative) return;
    const listeners = [
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
