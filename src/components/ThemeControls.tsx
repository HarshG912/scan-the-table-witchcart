import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useAnalyticsTheme } from "@/hooks/use-analytics-theme";

interface ThemeControlsProps {
  variant?: "default" | "compact";
  className?: string;
}

export function ThemeControls({ variant = "default", className = "" }: ThemeControlsProps) {
  const { theme, setTheme } = useTheme();
  const { currentTheme, themes, changeTheme } = useAnalyticsTheme();

  if (variant === "compact") {
    return (
      <div className={`flex gap-2 ${className}`}>
        <Button 
          variant="secondary" 
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20 h-9 w-9 active:scale-95 transition-all"
          title="Toggle dark mode"
          aria-label="Toggle between light and dark mode"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Select value={currentTheme} onValueChange={changeTheme}>
          <SelectTrigger className="w-[140px] h-9 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm focus:ring-2 focus:ring-white/30">
            <Palette className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(themes).map(([key, theme]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div 
                      className="w-3 h-3 rounded-full border" 
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full border" 
                      style={{ backgroundColor: theme.secondary }}
                    />
                  </div>
                  <span>{theme.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select value={currentTheme} onValueChange={changeTheme}>
        <SelectTrigger className="w-[140px] sm:w-[180px] h-8 sm:h-10 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
          <Palette className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(themes).map(([key, theme]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div 
                    className="w-3 h-3 rounded-full border" 
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div 
                    className="w-3 h-3 rounded-full border" 
                    style={{ backgroundColor: theme.secondary }}
                  />
                </div>
                <span>{theme.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button 
        variant="secondary" 
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm h-8 w-8 sm:h-10 sm:w-10"
        title="Toggle dark mode"
      >
        {theme === "dark" ? <Sun className="h-3 w-3 sm:h-4 sm:w-4" /> : <Moon className="h-3 w-3 sm:h-4 sm:w-4" />}
      </Button>
    </div>
  );
}
