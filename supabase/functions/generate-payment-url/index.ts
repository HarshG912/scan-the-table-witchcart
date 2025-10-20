import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  order_id: string;
  amount: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { order_id, amount }: PaymentRequest = await req.json();

    console.log('Generating payment URL for order:', order_id, 'amount:', amount);

    // Validate input
    if (!order_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid order_id or amount' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch merchant UPI ID from settings (server-side only)
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('merchant_upi_id')
      .limit(1)
      .single();

    if (settingsError || !settingsData?.merchant_upi_id) {
      console.error('Error fetching merchant UPI:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve payment settings' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const merchantUpi = settingsData.merchant_upi_id;
    console.log('Using merchant UPI for payment generation');

    // Generate UPI payment URL
    const upiString = `upi://pay?pa=${merchantUpi}&pn=TableOrder&am=${amount}&tn=Order+${order_id}&cu=INR`;
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}`;

    console.log('Payment URL generated successfully for order:', order_id);

    return new Response(
      JSON.stringify({ 
        upi_url: upiString,
        qr_url: qrUrl 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-payment-url function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
