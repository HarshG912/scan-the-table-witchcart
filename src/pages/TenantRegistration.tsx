import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

export default function TenantRegistration() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenantName: "",
    restaurantName: "",
    contactEmail: "",
    contactPhone: "",
    tableCount: 10,
    menuSheetUrl: "",
    merchantUpiId: "",
    serviceCharge: 5,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: tenantId, error } = await supabase.rpc('create_new_tenant', {
        p_tenant_name: formData.tenantName,
        p_restaurant_name: formData.restaurantName,
        p_contact_email: formData.contactEmail,
        p_contact_phone: formData.contactPhone,
        p_table_count: formData.tableCount,
        p_menu_sheet_url: formData.menuSheetUrl,
        p_merchant_upi_id: formData.merchantUpiId,
        p_service_charge: formData.serviceCharge,
      });

      if (error) throw error;

      toast({
        title: "Tenant Registered",
        description: `${formData.restaurantName} has been successfully registered.`,
      });

      navigate(`/admin`);
    } catch (error: any) {
      console.error("Error registering tenant:", error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Failed to register tenant",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-primary-foreground hover:bg-primary-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Register New Tenant</h1>
            <p className="text-sm opacity-90">Add a new restaurant to the platform</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Tenant Name *</Label>
                <Input
                  id="tenantName"
                  required
                  value={formData.tenantName}
                  onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                  placeholder="e.g., ABC Foods Pvt Ltd"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurantName">Restaurant Name *</Label>
                <Input
                  id="restaurantName"
                  required
                  value={formData.restaurantName}
                  onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                  placeholder="e.g., The Golden Spoon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="admin@restaurant.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+91 1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tableCount">Number of Tables *</Label>
                <Input
                  id="tableCount"
                  type="number"
                  required
                  min="1"
                  value={formData.tableCount}
                  onChange={(e) => setFormData({ ...formData, tableCount: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="menuSheetUrl">Menu Google Sheet URL</Label>
                <Input
                  id="menuSheetUrl"
                  value={formData.menuSheetUrl}
                  onChange={(e) => setFormData({ ...formData, menuSheetUrl: e.target.value })}
                  placeholder="https://docs.google.com/spreadsheets/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchantUpiId">Merchant UPI ID *</Label>
                <Input
                  id="merchantUpiId"
                  required
                  value={formData.merchantUpiId}
                  onChange={(e) => setFormData({ ...formData, merchantUpiId: e.target.value })}
                  placeholder="merchant@upi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceCharge">Service Charge (%) *</Label>
                <Input
                  id="serviceCharge"
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.serviceCharge}
                  onChange={(e) => setFormData({ ...formData, serviceCharge: parseFloat(e.target.value) })}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Tenant"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
