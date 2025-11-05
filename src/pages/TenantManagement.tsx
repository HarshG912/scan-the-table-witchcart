import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Switch } from "@/components/ui/switch";
import { AddTenantUser } from "@/components/AddTenantUser";

interface TenantInfo {
  id: string;
  tenant_name: string;
  restaurant_name: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
}

interface TenantSettings {
  id: string;
  merchant_upi_id: string;
  service_charge: number;
  restaurant_name: string;
  restaurant_address: string;
  table_count: number;
  payment_modes: { cash: boolean; upi: boolean; card: boolean };
  menu_sheet_url: string | null;
}

export default function TenantManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenantId } = useParams<{ tenantId: string }>();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is universal admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .is("tenant_id", null);

    if (!roles || roles.length === 0) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need universal admin privileges to access this page.",
        duration: 2000,
      });
      setTimeout(() => navigate("/admin"), 2000);
      return;
    }

    await fetchTenantData();
  };

  const fetchTenantData = async () => {
    try {
      // Fetch tenant info
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (tenantError) throw tenantError;
      setTenant(tenantData);

      // Fetch tenant settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("tenant_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      if (settingsError) throw settingsError;
      setSettings({
        ...settingsData,
        payment_modes: settingsData.payment_modes as { cash: boolean; upi: boolean; card: boolean }
      });
    } catch (error) {
      console.error("Error fetching tenant data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tenant data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTenant = async () => {
    if (!tenant) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          tenant_name: tenant.tenant_name,
          restaurant_name: tenant.restaurant_name,
          contact_email: tenant.contact_email,
          contact_phone: tenant.contact_phone,
          is_active: tenant.is_active,
        })
        .eq("id", tenant.id);

      if (error) throw error;

      toast({
        title: "Tenant updated",
        description: "Tenant information has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving tenant:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save tenant information",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("tenant_settings")
        .update({
          merchant_upi_id: settings.merchant_upi_id,
          service_charge: settings.service_charge,
          restaurant_name: settings.restaurant_name,
          restaurant_address: settings.restaurant_address,
          table_count: settings.table_count,
          payment_modes: settings.payment_modes,
          menu_sheet_url: settings.menu_sheet_url,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Restaurant settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save restaurant settings",
      });
    } finally {
      setSaving(false);
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
        title="Manage Tenant"
        subtitle={tenant?.tenant_name || "Loading..."}
        logo={
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Settings className="h-6 w-6" />
          </div>
        }
        navigationLinks={
          <Button
            variant="secondary"
            onClick={() => navigate("/admin")}
            size="sm"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        }
        onLogout={handleLogout}
      />

      <div className="pt-14 sm:pt-16 md:pt-20">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Tenant Information Card */}
          <Card className="rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle>Tenant Information</CardTitle>
              <CardDescription>
                Manage basic tenant information and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tenant_name">Tenant Name</Label>
                <Input
                  id="tenant_name"
                  value={tenant?.tenant_name || ""}
                  onChange={(e) => setTenant(prev => prev ? { ...prev, tenant_name: e.target.value } : null)}
                  placeholder="Tenant Legal Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurant_name">Restaurant Display Name</Label>
                <Input
                  id="restaurant_name"
                  value={tenant?.restaurant_name || ""}
                  onChange={(e) => setTenant(prev => prev ? { ...prev, restaurant_name: e.target.value } : null)}
                  placeholder="Restaurant Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant_id">Tenant ID (URL Slug)</Label>
                <Input
                  id="tenant_id"
                  value={tenant?.id || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  This is the unique identifier in the URL and cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={tenant?.contact_email || ""}
                  onChange={(e) => setTenant(prev => prev ? { ...prev, contact_email: e.target.value } : null)}
                  placeholder="contact@restaurant.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={tenant?.contact_phone || ""}
                  onChange={(e) => setTenant(prev => prev ? { ...prev, contact_phone: e.target.value } : null)}
                  placeholder="+1234567890"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Tenant Status</Label>
                  <p className="text-xs text-muted-foreground">
                    {tenant?.is_active ? 'Tenant is active and accepting orders' : 'Tenant is inactive'}
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={tenant?.is_active || false}
                  onCheckedChange={(checked) => setTenant(prev => prev ? { ...prev, is_active: checked } : null)}
                />
              </div>

              <Button
                onClick={handleSaveTenant}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Tenant Info
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Restaurant Settings Card */}
          <Card className="rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle>Restaurant Settings</CardTitle>
              <CardDescription>
                Configure restaurant operational settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="restaurant_name">Display Name</Label>
                <Input
                  id="restaurant_name"
                  value={settings?.restaurant_name || ""}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, restaurant_name: e.target.value } : null)}
                  placeholder="My Restaurant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurant_address">Address</Label>
                <Input
                  id="restaurant_address"
                  value={settings?.restaurant_address || ""}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, restaurant_address: e.target.value } : null)}
                  placeholder="123 Main Street, City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchant_upi">Merchant UPI ID</Label>
                <Input
                  id="merchant_upi"
                  value={settings?.merchant_upi_id || ""}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, merchant_upi_id: e.target.value } : null)}
                  placeholder="merchant@upi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_charge">Service Charge (%)</Label>
                <Input
                  id="service_charge"
                  type="number"
                  value={settings?.service_charge || 0}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, service_charge: parseFloat(e.target.value) } : null)}
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="table_count">Number of Tables</Label>
                <Input
                  id="table_count"
                  type="number"
                  value={settings?.table_count || 0}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, table_count: parseInt(e.target.value) } : null)}
                  placeholder="10"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="menu_sheet">Google Sheet Link (Menu)</Label>
                <Input
                  id="menu_sheet"
                  value={settings?.menu_sheet_url || ""}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, menu_sheet_url: e.target.value } : null)}
                  placeholder="https://docs.google.com/spreadsheets/..."
                />
              </div>

              <div className="space-y-3">
                <Label>Payment Modes</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cash"
                      checked={settings?.payment_modes.cash || false}
                      onCheckedChange={(checked) => 
                        setSettings(prev => prev ? {
                          ...prev,
                          payment_modes: { ...prev.payment_modes, cash: checked as boolean }
                        } : null)
                      }
                    />
                    <Label htmlFor="cash" className="font-normal cursor-pointer">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="upi"
                      checked={settings?.payment_modes.upi || false}
                      onCheckedChange={(checked) => 
                        setSettings(prev => prev ? {
                          ...prev,
                          payment_modes: { ...prev.payment_modes, upi: checked as boolean }
                        } : null)
                      }
                    />
                    <Label htmlFor="upi" className="font-normal cursor-pointer">UPI</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="card"
                      checked={settings?.payment_modes.card || false}
                      onCheckedChange={(checked) => 
                        setSettings(prev => prev ? {
                          ...prev,
                          payment_modes: { ...prev.payment_modes, card: checked as boolean }
                        } : null)
                      }
                    />
                    <Label htmlFor="card" className="font-normal cursor-pointer">Card</Label>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* User Management Card */}
          <AddTenantUser tenantId={tenantId!} />
        </div>
      </div>
    </div>
  );
}
