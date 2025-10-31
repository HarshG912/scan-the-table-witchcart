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

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ['userRole', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role, tenant_id')
        .eq('user_id', session.user.id)
        .single();
      
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

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (role.tenant_id !== tenantId) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
