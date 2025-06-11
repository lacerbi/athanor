// AI Summary: Custom hook that provides current dark mode state and updates on theme changes.
// Uses existing nativeThemeBridge for theme detection and change notifications.
import { useState, useEffect } from 'react';

/**
 * Hook that provides the current dark mode state and automatically updates
 * when the system theme changes.
 * 
 * @returns boolean indicating if dark mode is currently active
 */
const useDarkMode = (): boolean => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // Initialize with current theme state
    (async () => {
      try {
        const initialDarkMode = await window.nativeThemeBridge.getInitialDarkMode();
        setIsDarkMode(initialDarkMode);
      } catch (error) {
        console.warn('Failed to get initial dark mode state:', error);
        // Fallback to checking document class
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
    })();

    // Subscribe to theme changes
    const unsubscribe = window.nativeThemeBridge.onNativeThemeUpdated((isDark: boolean) => {
      setIsDarkMode(isDark);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return isDarkMode;
};

export default useDarkMode;
