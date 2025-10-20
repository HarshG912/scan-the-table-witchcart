import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { ThemeControls } from "@/components/ThemeControls";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  logo?: ReactNode;
  actions?: ReactNode;
  onLogout: () => void;
  navigationLinks?: ReactNode;
}

export function DashboardHeader({
  title,
  subtitle,
  logo,
  actions,
  onLogout,
  navigationLinks,
}: DashboardHeaderProps) {
  const { scrollDirection, isAtTop } = useScrollDirection();
  
  // Show header when at top or scrolling up
  const showHeader = isAtTop || scrollDirection === 'up';

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out",
        "bg-primary/95 backdrop-blur-md text-primary-foreground shadow-xl border-b border-primary/20",
        showHeader ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-2 h-14 sm:h-16 md:h-20">
          {/* Left Section: Logo + Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {logo && (
              <div className="flex-shrink-0 hidden sm:block">
                {logo}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold truncate bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[10px] sm:text-xs md:text-sm opacity-90 mt-0.5 truncate hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Section: Actions + Navigation + Theme + Logout */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Custom Actions (e.g., Refresh button) */}
            {actions && <div className="flex gap-1 sm:gap-2">{actions}</div>}
            
            {/* Navigation Links (hidden on mobile) */}
            {navigationLinks && (
              <div className="hidden lg:flex gap-2">
                {navigationLinks}
              </div>
            )}

            {/* Theme Controls */}
            <div className="hidden sm:flex">
              <ThemeControls variant="compact" />
            </div>

            {/* Logout Button - Always visible, touch-friendly */}
            <Button
              variant="secondary"
              onClick={onLogout}
              className="bg-white text-primary hover:bg-white/90 h-9 sm:h-10 px-2 sm:px-3 md:px-4 
                         active:scale-95 transition-transform duration-150 
                         touch-manipulation min-w-[44px]"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline text-sm md:text-base">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
