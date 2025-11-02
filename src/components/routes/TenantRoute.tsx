import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface TenantRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const TenantRoute = ({ children, allowedRoles }: TenantRouteProps) => {
  const { tenantId } = useParams<{ tenantId: string }>();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['userRole', session?.user?.id, tenantId],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role, tenant_id')
        .eq('user_id', session.user.id)
        .eq('tenant_id', tenantId);
      
      return data;
    },
    enabled: !!session?.user?.id,
  });

  if (sessionLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!roleData || roleData.length === 0) {
    return <Navigate to="/" replace />;
  }

  // Check if user has any of the allowed roles for this tenant
  const hasAllowedRole = roleData.some(r => 
    r.tenant_id === tenantId && allowedRoles.includes(r.role)
  );

  if (!hasAllowedRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
