import { createContext, useContext, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  tenant_name: string;
  restaurant_name: string;
  contact_email: string;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantSettings {
  tenant_id: string;
  service_charge: number;
  restaurant_name: string;
  restaurant_address: string;
  merchant_upi_id?: string;
  payment_modes: any;
  menu_sheet_url: string | null;
  theme_config: any;
}

interface GlobalSettings {
  login_type: 'google' | 'otp' | 'disabled';
}

interface TenantContextType {
  tenantId: string;
  tenant: Tenant | null;
  settings: TenantSettings | null;
  globalSettings: GlobalSettings | null;
  isLoading: boolean;
  error: Error | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { tenantId } = useParams<{ tenantId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID is required');

      // Fetch tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      // Fetch tenant settings using public view for customer pages
      const { data: settingsData, error: settingsError } = await supabase
        .from('public_tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (settingsError) throw settingsError;

      // Fetch global settings
      const { data: globalData, error: globalError } = await supabase
        .from('global_settings')
        .select('login_type')
        .single();

      if (globalError) throw globalError;

      return {
        tenant: tenantData,
        settings: settingsData,
        globalSettings: { login_type: globalData.login_type as 'google' | 'otp' | 'disabled' }
      };
    },
    enabled: !!tenantId,
  });

  return (
    <TenantContext.Provider
      value={{
        tenantId: tenantId!,
        tenant: data?.tenant || null,
        settings: data?.settings || null,
        globalSettings: data?.globalSettings || null,
        isLoading,
        error: error as Error | null,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};
