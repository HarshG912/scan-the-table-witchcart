import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface UniversalAdminRouteProps {
  children: React.ReactNode;
}

export const UniversalAdminRoute = ({ children }: UniversalAdminRouteProps) => {
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

  if (role?.role !== 'admin' || role?.tenant_id !== null) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
