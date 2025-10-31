import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAnalyticsTheme } from "@/hooks/use-analytics-theme";
import Menu from "./pages/Menu";
import TenantMenu from "./pages/TenantMenu";
import NotFound from "./pages/NotFound";
import { TenantLayout } from "./components/layouts/TenantLayout";

const queryClient = new QueryClient();

const ThemeInitializer = () => {
  useAnalyticsTheme();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeInitializer />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Legacy route - redirect to demo */}
            <Route path="/" element={<Menu />} />
            <Route path="/menu" element={<Menu />} />
            
            {/* Tenant-specific routes */}
            <Route path="/:tenantId" element={<TenantLayout />}>
              <Route path="table/:tableNumber" element={<TenantMenu />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
