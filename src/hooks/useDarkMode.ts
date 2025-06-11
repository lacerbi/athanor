// AI Summary: Custom hook that provides the current dark mode state, respecting user's theme setting.
// It combines the application's 'uiTheme' setting ('Auto', 'Light', 'Dark') with the OS-level theme for 'Auto' mode.
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Hook that provides the current dark mode state and automatically updates
 * when the system theme or the application theme setting changes.
 * It respects the user's choice of 'Light', 'Dark', or 'Auto' mode.
 *
 * @returns boolean indicating if dark mode is currently active
 */
const useDarkMode = (): boolean => {
  const { applicationSettings } = useSettingsStore();
  const uiTheme = applicationSettings?.uiTheme ?? 'Auto';

  const [isSystemDark, setSystemDark] = useState<boolean>(false);

  // This effect handles system theme changes only when in 'Auto' mode
  useEffect(() => {
    if (uiTheme !== 'Auto') {
      return; // Don't listen to system theme if mode is manual
    }

    let isMounted = true;

    // Asynchronously get the initial state
    (async () => {
      try {
        const initialDarkMode =
          await window.nativeThemeBridge.getInitialDarkMode();
        if (isMounted) {
          setSystemDark(initialDarkMode);
        }
      } catch (error) {
        console.warn('Failed to get initial dark mode state:', error);
        // Fallback to checking document class
        if (isMounted) {
          setSystemDark(document.documentElement.classList.contains('dark'));
        }
      }
    })();

    // Subscribe to theme updates
    const unsubscribe = window.nativeThemeBridge.onNativeThemeUpdated(
      (isDark: boolean) => {
        setSystemDark(isDark);
      }
    );

    // Cleanup subscription
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [uiTheme]);

  if (uiTheme === 'Light') {
    return false;
  }
  if (uiTheme === 'Dark') {
    return true;
  }

  // For 'Auto' mode, return the detected system state
  return isSystemDark;
};

export default useDarkMode;
