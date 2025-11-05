import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";

interface AddTenantUserProps {
  tenantId: string;
  onUserAdded?: () => void;
}

export function AddTenantUser({ tenantId, onUserAdded }: AddTenantUserProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "tenant_admin" as "tenant_admin" | "chef" | "manager" | "waiter",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.role) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all fields",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Password must be at least 6 characters",
      });
      return;
    }

    setLoading(true);

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Add role to user_roles table
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: formData.role,
          tenant_id: tenantId,
        });

      if (roleError) throw roleError;

      toast({
        title: "User Added",
        description: `Successfully added ${formData.role} user: ${formData.email}`,
      });

      // Reset form
      setFormData({
        email: "",
        password: "",
        role: "tenant_admin",
      });

      onUserAdded?.();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add User",
        description: error.message || "An error occurred while creating the user",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add Tenant User
        </CardTitle>
        <CardDescription>
          Create a new user account with tenant-specific role
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_email">Email Address</Label>
            <Input
              id="user_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_password">Password</Label>
            <Input
              id="user_password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_role">User Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as typeof formData.role }))}
            >
              <SelectTrigger id="user_role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="chef">Chef</SelectItem>
                <SelectItem value="waiter">Waiter</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.role === "tenant_admin" && "Full access to tenant settings and management"}
              {formData.role === "manager" && "Access to analytics, orders, and staff management"}
              {formData.role === "chef" && "Access to kitchen orders and order status updates"}
              {formData.role === "waiter" && "Access to table orders and order management"}
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating User...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
