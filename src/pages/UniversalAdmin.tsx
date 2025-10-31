import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, Building2, Users, Plus } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";

interface Tenant {
  id: string;
  tenant_name: string;
  restaurant_name: string;
  contact_email: string;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function UniversalAdmin() {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0 || roles[0].tenant_id !== null) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Universal admin privileges required.",
      });
      navigate("/auth");
      return;
    }

    await fetchTenants();
  };

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tenants",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <DashboardHeader
        title="Universal Admin"
        subtitle="Multi-Tenant Management"
        logo={
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Settings className="h-6 w-6" />
          </div>
        }
        navigationLinks={
          <Button
            variant="secondary"
            onClick={() => navigate("/admin/register-tenant")}
            size="sm"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Register Tenant
          </Button>
        }
        onLogout={handleLogout}
      />

      <div className="pt-14 sm:pt-16 md:pt-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <Building2 className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{tenants.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Building2 className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {tenants.filter(t => t.is_active).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive</CardTitle>
                <Building2 className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  {tenants.filter(t => !t.is_active).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenants.map(tenant => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{tenant.restaurant_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tenant.tenant_name} • {tenant.contact_email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {tenant.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tenant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/tenant/${tenant.id}`)}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
                {tenants.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No tenants registered yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
