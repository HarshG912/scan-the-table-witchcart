import { useState, useEffect } from "react";

export interface AnalyticsTheme {
  name: string;
  primary: string;
  secondary: string;
  text: string;
  primaryHsl: string;
  secondaryHsl: string;
  textHsl: string;
}

const themes: Record<string, AnalyticsTheme> = {
  classicLight: {
    name: "Classic Light",
    primary: "#FFFFFF",
    secondary: "#F5F5F5",
    text: "#1A1A1A",
    primaryHsl: "0 0% 100%",
    secondaryHsl: "0 0% 96%",
    textHsl: "0 0% 10%",
  },
  modernDark: {
    name: "Modern Dark",
    primary: "#121212",
    secondary: "#1E1E1E",
    text: "#E0E0E0",
    primaryHsl: "0 0% 7%",
    secondaryHsl: "0 0% 12%",
    textHsl: "0 0% 88%",
  },
  elegantBlue: {
    name: "Elegant Blue",
    primary: "#0D1B2A",
    secondary: "#1B263B",
    text: "#E0E1DD",
    primaryHsl: "207 51% 11%",
    secondaryHsl: "213 36% 17%",
    textHsl: "75 14% 88%",
  },
  warmSunset: {
    name: "Warm Sunset",
    primary: "#FFF5E6",
    secondary: "#FFE0B2",
    text: "#2C1810",
    primaryHsl: "36 100% 95%",
    secondaryHsl: "34 100% 85%",
    textHsl: "24 38% 12%",
  },
  mintFresh: {
    name: "Mint Fresh",
    primary: "#F1F8F4",
    secondary: "#C8E6C9",
    text: "#1B4D20",
    primaryHsl: "138 36% 96%",
    secondaryHsl: "122 30% 84%",
    textHsl: "125 45% 20%",
  },
  royalPurple: {
    name: "Royal Purple",
    primary: "#2E003E",
    secondary: "#512D6D",
    text: "#EDE7F6",
    primaryHsl: "284 100% 12%",
    secondaryHsl: "277 40% 31%",
    textHsl: "263 60% 93%",
  },
};

export function useAnalyticsTheme() {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem("selectedTheme");
        if (savedTheme && themes[savedTheme]) {
          return savedTheme;
        }
      } catch (error) {
        console.error("Failed to read theme from localStorage:", error);
      }
    }
    return "classicLight";
  });

  const applyTheme = (themeKey: string, skipEvent = false) => {
    const theme = themes[themeKey];
    if (!theme || typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // Remove previous theme classes
    Object.keys(themes).forEach(k => {
      root.classList.remove(`theme-${k}`);
    });
    
    // Add new theme class
    root.classList.add(`theme-${themeKey}`);
    
    // Set as data attribute for CSS targeting
    root.setAttribute('data-theme', themeKey);
    
    try {
      // Store in localStorage
      localStorage.setItem("selectedTheme", themeKey);
      // Dispatch custom event to sync across components (unless this is from an event)
      if (!skipEvent) {
        window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme: themeKey } }));
      }
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
    
    setCurrentTheme(themeKey);
  };

  const changeTheme = (themeKey: string) => {
    if (themes[themeKey]) {
      applyTheme(themeKey, false);
    }
  };

  // Apply theme on mount and set up listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Apply the current theme without dispatching event on mount
    const root = document.documentElement;
    Object.keys(themes).forEach(k => root.classList.remove(`theme-${k}`));
    root.classList.add(`theme-${currentTheme}`);
    root.setAttribute('data-theme', currentTheme);

    // Listen for theme changes from other components
    const handleThemeChange = (event: CustomEvent<{ theme: string }>) => {
      const newTheme = event.detail.theme;
      if (themes[newTheme]) {
        setCurrentTheme(newTheme);
        // Apply the new theme
        const root = document.documentElement;
        Object.keys(themes).forEach(k => root.classList.remove(`theme-${k}`));
        root.classList.add(`theme-${newTheme}`);
        root.setAttribute('data-theme', newTheme);
      }
    };

    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'selectedTheme' && event.newValue && themes[event.newValue]) {
        const newTheme = event.newValue;
        setCurrentTheme(newTheme);
        // Apply the new theme
        const root = document.documentElement;
        Object.keys(themes).forEach(k => root.classList.remove(`theme-${k}`));
        root.classList.add(`theme-${newTheme}`);
        root.setAttribute('data-theme', newTheme);
      }
    };

    window.addEventListener('themeChange', handleThemeChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Empty dependency array - only run once on mount

  return {
    currentTheme,
    themes,
    changeTheme,
    activeTheme: themes[currentTheme],
  };
}
