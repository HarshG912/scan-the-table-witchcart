import { Outlet, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { Loader2 } from 'lucide-react';

const TenantValidator = () => {
  const { tenant, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    return <Navigate to="/404" replace />;
  }

  if (!tenant.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Restaurant Inactive</h1>
          <p className="text-muted-foreground">This restaurant is currently not accepting orders.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export const TenantLayout = () => {
  return (
    <TenantProvider>
      <TenantValidator />
    </TenantProvider>
  );
};
