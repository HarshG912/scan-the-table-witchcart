import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in and redirect based on role
    async function checkSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        return;
      }
      if (session) {
        const { data: rolesData, error: roleError } = await supabase
          .from("user_roles")
          .select("role, tenant_id")
          .eq("user_id", session.user.id);

        console.log("useEffect - Roles query result:", { rolesData, roleError });

        if (roleError) {
          console.error("useEffect - Role fetch error:", roleError);
          return;
        }

        if (!rolesData || rolesData.length === 0) {
          console.log("useEffect - No roles found");
          return;
        }

        // Role priority: universal admin > manager > tenant_admin > chef > waiter
        const universalAdmin = rolesData.find(r => r.role === 'admin' && r.tenant_id === null);
        const manager = rolesData.find(r => r.role === 'manager' && r.tenant_id);
        const tenantAdmin = rolesData.find(r => r.role === 'tenant_admin' && r.tenant_id);
        const chef = rolesData.find(r => r.role === 'chef' && r.tenant_id);
        const waiter = rolesData.find(r => r.role === 'waiter' && r.tenant_id);

        if (universalAdmin) {
          console.log("useEffect - Redirecting to /admin");
          navigate("/admin");
        } else if (manager) {
          console.log("useEffect - Redirecting to analytics:", `/${manager.tenant_id}/analytics`);
          navigate(`/${manager.tenant_id}/analytics`);
        } else if (tenantAdmin) {
          console.log("useEffect - Redirecting to tenant admin:", `/${tenantAdmin.tenant_id}/admin`);
          navigate(`/${tenantAdmin.tenant_id}/admin`);
        } else if (chef) {
          console.log("useEffect - Redirecting to chef:", `/${chef.tenant_id}/chef`);
          navigate(`/${chef.tenant_id}/chef`);
        } else if (waiter) {
          console.log("useEffect - Redirecting to waiter:", `/${waiter.tenant_id}/waiter`);
          navigate(`/${waiter.tenant_id}/waiter`);
        }
      }
    }
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch user roles to redirect appropriately
      const { data: rolesData, error: roleError } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", data.user.id);

      console.log("handleLogin - Roles query result:", { rolesData, roleError });

      if (roleError) {
        console.error("handleLogin - Role fetch error:", roleError);
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: `Failed to fetch user roles: ${roleError.message}`,
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!rolesData || rolesData.length === 0) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "No valid role assigned to this account.",
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      toast({
        title: "Login successful",
        description: "Redirecting...",
      });

      // Role priority: universal admin > manager > tenant_admin > chef > waiter
      const universalAdmin = rolesData.find(r => r.role === 'admin' && r.tenant_id === null);
      const manager = rolesData.find(r => r.role === 'manager' && r.tenant_id);
      const tenantAdmin = rolesData.find(r => r.role === 'tenant_admin' && r.tenant_id);
      const chef = rolesData.find(r => r.role === 'chef' && r.tenant_id);
      const waiter = rolesData.find(r => r.role === 'waiter' && r.tenant_id);

      if (universalAdmin) {
        console.log("handleLogin - Redirecting to /admin");
        navigate("/admin");
      } else if (manager) {
        console.log("handleLogin - Redirecting to analytics:", `/${manager.tenant_id}/analytics`);
        navigate(`/${manager.tenant_id}/analytics`);
      } else if (tenantAdmin) {
        console.log("handleLogin - Redirecting to tenant admin:", `/${tenantAdmin.tenant_id}/admin`);
        navigate(`/${tenantAdmin.tenant_id}/admin`);
      } else if (chef) {
        console.log("handleLogin - Redirecting to chef:", `/${chef.tenant_id}/chef`);
        navigate(`/${chef.tenant_id}/chef`);
      } else if (waiter) {
        console.log("handleLogin - Redirecting to waiter:", `/${waiter.tenant_id}/waiter`);
        navigate(`/${waiter.tenant_id}/waiter`);
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "No valid role assigned to this account.",
        });
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
          title: "Login failed",
        description: error.message || "Invalid credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Staff Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@scanthetable.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : ("Login")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
