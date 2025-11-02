import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DashboardHeader } from "@/components/DashboardHeader";

interface Settings {
  id: string;
  merchant_upi_id: string;
  service_charge: number;
  restaurant_name: string;
  restaurant_address: string;
  table_count: number;
  payment_modes: { cash: boolean; upi: boolean; card: boolean };
  menu_sheet_url: string | null;
}

export default function TenantAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isManager, setIsManager] = useState(false);
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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", session.user.id)
      .eq("tenant_id", tenantId)
      .in("role", ["tenant_admin", "manager"]);

    if (!roles || roles.length === 0) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this tenant's admin panel.",
        duration: 2000,
      });
      setTimeout(() => navigate("/auth"), 2000);
      return;
    }

    const isManagerRole = roles.some(r => r.role === 'manager');
    setIsManager(isManagerRole);

    await fetchSettings();
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .limit(1)
        .single();

      if (error) throw error;
      setSettings({
        ...data,
        payment_modes: data.payment_modes as { cash: boolean; upi: boolean; card: boolean }
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save settings",
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
        title="Restaurant Admin"
        subtitle={settings?.restaurant_name || "Manage Settings"}
        logo={
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Settings className="h-6 w-6" />
          </div>
        }
        navigationLinks={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/${tenantId}/chef`)}
              size="sm"
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Kitchen Dashboard
            </Button>
            {isManager && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/${tenantId}/analytics`)}
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20"
              >
                Analytics
              </Button>
            )}
          </div>
        }
        onLogout={handleLogout}
      />

      <div className="pt-14 sm:pt-16 md:pt-20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Card className="rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle>Restaurant Settings</CardTitle>
              <CardDescription>
                Configure your restaurant's payment and operational settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="restaurant_name">Restaurant Name</Label>
                <Input
                  id="restaurant_name"
                  value={settings?.restaurant_name || ""}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, restaurant_name: e.target.value } : null)}
                  placeholder="My Restaurant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurant_address">Restaurant Address</Label>
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
                onClick={handleSave}
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
        </div>
      </div>
    </div>
  );
}
