import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAnalyticsTheme } from "@/hooks/use-analytics-theme";
import TenantMenu from "./pages/TenantMenu";
import TenantCart from "./pages/TenantCart";
import TenantBilling from "./pages/TenantBilling";
import UniversalAdmin from "./pages/UniversalAdmin";
import TenantRegistration from "./pages/TenantRegistration";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { TenantLayout } from "./components/layouts/TenantLayout";
import { UniversalAdminRoute } from "./components/routes/UniversalAdminRoute";

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
            {/* Root redirect to admin or auth */}
            <Route path="/" element={<NotFound />} />
            
            {/* Universal Admin Routes */}
            <Route path="/admin" element={<UniversalAdminRoute><UniversalAdmin /></UniversalAdminRoute>} />
            <Route path="/admin/register-tenant" element={<UniversalAdminRoute><TenantRegistration /></UniversalAdminRoute>} />
            
            {/* Auth Route */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Tenant-specific routes */}
            <Route path="/:tenantId" element={<TenantLayout />}>
              <Route path="table/:tableNumber" element={<TenantMenu />} />
              <Route path="cart/:tableNumber" element={<TenantCart />} />
              <Route path="billing" element={<TenantBilling />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
