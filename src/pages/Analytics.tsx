import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, DollarSign, Package, Download, LogOut, Clock, TrendingDown, ChefHat, RefreshCw } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DashboardHeader } from "@/components/DashboardHeader";

interface OrderStats {
  totalOrders: number;
  revenue: number;
  completedOrders: number;
  liveOrders: number;
  rejectedOrders: number;
  unpaidTotal: number;
  topItems: { name: string; quantity: number }[];
  ordersByHour: { hour: string; orders: number }[];
  ordersByDay: { day: string; orders: number; revenue: number }[];
  avgCookingTime: number;
  fastestCookingTime: number;
  cookPerformance: { cookName: string; avgTime: number; orders: number }[];
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [timeRange, setTimeRange] = useState("today");
  const [hasManagerRole, setHasManagerRole] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (hasManagerRole) {
      fetchStats();
    }
  }, [timeRange, hasManagerRole]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "manager");

    if (!roles || roles.length === 0) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need manager privileges to access analytics.",
      });
      navigate("/chef");
      return;
    }

    setHasManagerRole(true);
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "7days":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30days":
          startDate.setDate(now.getDate() - 30);
          break;
      }

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      // Calculate basic stats
      const totalOrders = orders?.length || 0;
      const revenue = orders
        ?.filter((o) => o.payment_status === "paid")
        .reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const completedOrders = orders?.filter((o) => o.status === "completed").length || 0;
      const rejectedOrders = orders?.filter((o) => o.status === "rejected").length || 0;
      const liveOrders = orders?.filter((o) => ["pending", "accepted", "cooking"].includes(o.status)).length || 0;
      const unpaidTotal = orders
        ?.filter((o) => o.payment_status === "unpaid")
        .reduce((sum, o) => sum + Number(o.total), 0) || 0;

      // Calculate top items
      const itemsMap = new Map<string, number>();
      orders?.forEach((order) => {
        try {
          const items = JSON.parse(order.items_json);
          items.forEach((item: any) => {
            const current = itemsMap.get(item.Item) || 0;
            itemsMap.set(item.Item, current + item.quantity);
          });
        } catch (e) {
          console.error("Error parsing items:", e);
        }
      });

      const topItems = Array.from(itemsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, quantity]) => ({ name, quantity }));

      // Orders by hour (for today)
      const ordersByHour = Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, '0') + ':00';
        const count = orders?.filter(o => {
          const orderHour = new Date(o.created_at).getHours();
          return orderHour === i && new Date(o.created_at).toDateString() === now.toDateString();
        }).length || 0;
        return { hour, orders: count };
      });

      // Orders by day
      const ordersByDay = (() => {
        const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 1;
        return Array.from({ length: days }, (_, i) => {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dayOrders = orders?.filter(o => 
            new Date(o.created_at).toDateString() === date.toDateString()
          ) || [];
          const dayRevenue = dayOrders
            .filter(o => o.payment_status === "paid")
            .reduce((sum, o) => sum + Number(o.total), 0);
          return {
            day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            orders: dayOrders.length,
            revenue: dayRevenue
          };
        });
      })();

      // Calculate cooking time insights
      const completedWithTimes = orders?.filter(o => 
        o.status === "completed" && o.accepted_at && o.completed_at
      ) || [];

      const avgCookingTime = completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum, o) => {
            const accepted = new Date(o.accepted_at!).getTime();
            const completed = new Date(o.completed_at!).getTime();
            return sum + (completed - accepted);
          }, 0) / completedWithTimes.length / 60000 // Convert to minutes
        : 0;

      // Calculate fastest cooking time
      const fastestCookingTime = completedWithTimes.length > 0
        ? Math.min(...completedWithTimes.map(o => {
            const accepted = new Date(o.accepted_at!).getTime();
            const completed = new Date(o.completed_at!).getTime();
            return (completed - accepted) / 60000; // Convert to minutes
          }))
        : 0;

      // Cook performance
      const cookMap = new Map<string, { totalTime: number; count: number }>();
      completedWithTimes.forEach(o => {
        if (!o.cook_name) return;
        const accepted = new Date(o.accepted_at!).getTime();
        const completed = new Date(o.completed_at!).getTime();
        const time = (completed - accepted) / 60000; // minutes
        
        const current = cookMap.get(o.cook_name) || { totalTime: 0, count: 0 };
        cookMap.set(o.cook_name, {
          totalTime: current.totalTime + time,
          count: current.count + 1
        });
      });

      const cookPerformance = Array.from(cookMap.entries())
        .map(([cookName, data]) => ({
          cookName,
          avgTime: data.totalTime / data.count,
          orders: data.count
        }))
        .sort((a, b) => a.avgTime - b.avgTime);

      setStats({
        totalOrders,
        revenue,
        completedOrders,
        liveOrders,
        rejectedOrders,
        unpaidTotal,
        topItems,
        ordersByHour,
        ordersByDay,
        avgCookingTime,
        fastestCookingTime,
        cookPerformance,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!orders) return;

      const csv = [
        ["Order ID", "Table", "Total", "Status", "Payment Status", "Cook", "Cooking Time (min)", "Created At"].join(","),
        ...orders.map((o) => {
          const cookingTime = o.accepted_at && o.completed_at
            ? ((new Date(o.completed_at).getTime() - new Date(o.accepted_at).getTime()) / 60000).toFixed(1)
            : "N/A";
          return [
            o.order_id,
            o.table_id,
            o.total,
            o.status,
            o.payment_status,
            o.cook_name || "N/A",
            cookingTime,
            new Date(o.created_at).toLocaleString(),
          ].join(",");
        }),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();

      toast({
        title: "Export successful",
        description: "Orders exported to CSV",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export data",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--destructive))'];

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 animate-fade-in transition-colors duration-300"
      style={{
        backgroundColor: `hsl(var(--analytics-primary, var(--background)))`,
        color: `hsl(var(--analytics-text, var(--foreground)))`,
      }}
    >
      <DashboardHeader
        title="Analytics Dashboard"
        subtitle="Real-time insights & performance metrics"
        logo={
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        }
        actions={
          <Button
            variant="secondary"
            size="icon"
            onClick={fetchStats}
            className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm h-9 w-9 sm:h-10 sm:w-10 active:scale-95 transition-transform"
            title="Refresh analytics"
            aria-label="Refresh analytics data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
        onLogout={handleLogout}
      />

      {/* Add padding-top to account for fixed header */}
      <div className="pt-14 sm:pt-16 md:pt-20">
        <div 
          className="max-w-7xl mx-auto px-4 py-6 space-y-6 transition-colors duration-300"
          style={{
            backgroundColor: `hsl(var(--analytics-primary, var(--background)))`,
            color: `hsl(var(--analytics-text, var(--foreground)))`,
          }}
        >
        <div className="flex items-center justify-between">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48 shadow-lg border-2 hover:border-primary/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportCSV} variant="outline" className="shadow-lg hover:shadow-xl transition-all">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 backdrop-blur-sm animate-slide-up"
            style={{
              backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
              color: `hsl(var(--analytics-text, var(--foreground)))`,
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {stats?.totalOrders}
              </div>
              <p className="text-xs mt-1" style={{ color: `hsl(var(--analytics-text, var(--foreground)) / 0.6)` }}>All time orders</p>
            </CardContent>
          </Card>

          <Card 
            className="rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 hover:border-green-500/50 backdrop-blur-sm animate-slide-up" 
            style={{ 
              animationDelay: '0.1s',
              backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
              color: `hsl(var(--analytics-text, var(--foreground)))`,
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                ₹{stats?.revenue.toFixed(2)}
              </div>
              <p className="text-xs mt-1" style={{ color: `hsl(var(--analytics-text, var(--foreground)) / 0.6)` }}>Paid orders only</p>
            </CardContent>
          </Card>

          <Card 
            className="rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-500/50 backdrop-blur-sm animate-slide-up" 
            style={{ 
              animationDelay: '0.2s',
              backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
              color: `hsl(var(--analytics-text, var(--foreground)))`,
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                {stats?.completedOrders}
              </div>
              <p className="text-xs mt-1" style={{ color: `hsl(var(--analytics-text, var(--foreground)) / 0.6)` }}>
                {stats?.rejectedOrders} rejected
              </p>
            </CardContent>
          </Card>

          <Card 
            className="rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 hover:border-orange-500/50 backdrop-blur-sm animate-slide-up" 
            style={{ 
              animationDelay: '0.3s',
              backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
              color: `hsl(var(--analytics-text, var(--foreground)))`,
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Orders</CardTitle>
              <Package className="h-5 w-5 text-orange-600 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                {stats?.liveOrders}
              </div>
              <p className="text-xs mt-1" style={{ color: `hsl(var(--analytics-text, var(--foreground)) / 0.6)` }}>
                ₹{stats?.unpaidTotal.toFixed(2)} unpaid
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cooking Time Stats */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card 
            className="rounded-2xl shadow-xl border-2 backdrop-blur-sm transition-colors duration-300"
            style={{
              backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
              color: `hsl(var(--analytics-text, var(--foreground)))`,
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Average Cooking Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {stats?.avgCookingTime.toFixed(1)} <span className="text-2xl">min</span>
              </div>
              <p className="text-sm mt-2" style={{ color: `hsl(var(--analytics-text, var(--foreground)) / 0.7)` }}>
                From accepted to completed
              </p>
            </CardContent>
          </Card>

          <Card 
            className="rounded-2xl shadow-xl border-2 backdrop-blur-sm transition-colors duration-300"
            style={{
              backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
              color: `hsl(var(--analytics-text, var(--foreground)))`,
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
                Fastest Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                {stats?.fastestCookingTime.toFixed(1)} <span className="text-2xl">min</span>
              </div>
              <p className="text-sm mt-2" style={{ color: `hsl(var(--analytics-text, var(--foreground)) / 0.7)` }}>
                Best single order time ⚡
              </p>
            </CardContent>
          </Card>

          <Card 
            className="rounded-2xl shadow-xl border-2 backdrop-blur-sm transition-colors duration-300"
            style={{
              backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
              color: `hsl(var(--analytics-text, var(--foreground)))`,
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                Cook Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.cookPerformance.slice(0, 3).map((cook, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg transition-all duration-300"
                    style={{
                      backgroundColor: `hsl(var(--analytics-primary, var(--background)) / 0.5)`,
                      border: `1px solid hsl(var(--analytics-text, var(--foreground)) / 0.1)`,
                    }}
                  >
                    <div>
                      <p className="font-semibold" style={{ color: `hsl(var(--analytics-text, var(--foreground)))` }}>{cook.cookName}</p>
                      <p className="text-xs" style={{ color: `hsl(var(--analytics-text, var(--foreground)) / 0.6)` }}>{cook.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{cook.avgTime.toFixed(1)} min</p>
                      {index === 0 && <p className="text-xs text-green-600 font-semibold">Fastest ⚡</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Orders by Hour/Day */}
          <Card 
            className="rounded-2xl shadow-xl border-2 backdrop-blur-sm transition-colors duration-300"
            style={{
              backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
              color: `hsl(var(--analytics-text, var(--foreground)))`,
            }}
          >
            <CardHeader>
              <CardTitle>Orders {timeRange === "today" ? "by Hour" : "by Day"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={300} minWidth={300}>
                  <BarChart data={timeRange === "today" ? stats?.ordersByHour.filter(h => h.orders > 0) : stats?.ordersByDay}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey={timeRange === "today" ? "hour" : "day"} 
                      fontSize={12}
                      stroke={`hsl(var(--analytics-text, var(--foreground)))`}
                    />
                    <YAxis 
                      fontSize={12}
                      stroke={`hsl(var(--analytics-text, var(--foreground)))`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`, 
                        border: '2px solid hsl(var(--primary))',
                        borderRadius: '12px',
                        color: `hsl(var(--analytics-text, var(--foreground)))`,
                      }}
                      labelStyle={{
                        color: `hsl(var(--analytics-text, var(--foreground)))`,
                      }}
                    />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          {timeRange !== "today" && (
            <Card 
              className="rounded-2xl shadow-xl border-2 backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
                color: `hsl(var(--analytics-text, var(--foreground)))`,
              }}
            >
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <ResponsiveContainer width="100%" height={300} minWidth={300}>
                    <LineChart data={stats?.ordersByDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="day" 
                        fontSize={12}
                        stroke={`hsl(var(--analytics-text, var(--foreground)))`}
                      />
                      <YAxis 
                        fontSize={12}
                        stroke={`hsl(var(--analytics-text, var(--foreground)))`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`, 
                          border: '2px solid hsl(var(--primary))',
                          borderRadius: '12px',
                          color: `hsl(var(--analytics-text, var(--foreground)))`,
                        }}
                        labelStyle={{
                          color: `hsl(var(--analytics-text, var(--foreground)))`,
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Rate Pie */}
          <Card 
            className="rounded-2xl shadow-xl border-2 backdrop-blur-sm transition-colors duration-300"
            style={{
              backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
              color: `hsl(var(--analytics-text, var(--foreground)))`,
            }}
          >
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto flex justify-center">
                <ResponsiveContainer width="100%" height={300} minWidth={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: stats?.completedOrders || 0 },
                        { name: 'Rejected', value: stats?.rejectedOrders || 0 },
                        { name: 'Live', value: stats?.liveOrders || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        const percentText = `${(percent * 100).toFixed(0)}%`;
                        
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="white" 
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            className="font-bold text-sm drop-shadow-lg"
                            style={{ 
                              textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)',
                              paintOrder: 'stroke fill'
                            }}
                          >
                            {`${name}: ${percentText}`}
                          </text>
                        );
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`, 
                        border: '2px solid hsl(var(--primary))',
                        borderRadius: '12px',
                        color: `hsl(var(--analytics-text, var(--foreground)))`,
                        fontWeight: 600,
                      }}
                      labelStyle={{
                        color: `hsl(var(--analytics-text, var(--foreground)))`,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Items */}
        <Card 
          className="rounded-2xl shadow-xl border-2 backdrop-blur-sm transition-colors duration-300"
          style={{
            backgroundColor: `hsl(var(--analytics-secondary, var(--card)))`,
            color: `hsl(var(--analytics-text, var(--foreground)))`,
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top 10 Most Ordered Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topItems.map((item, index) => (
                <div 
                  key={index} 
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl transition-all duration-300"
                  style={{
                    backgroundColor: `hsl(var(--analytics-primary, var(--secondary)))`,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`text-xl sm:text-2xl font-bold flex-shrink-0 ${
                      index === 0 ? 'text-yellow-500' : 
                      index === 1 ? 'text-gray-400' : 
                      index === 2 ? 'text-orange-600' : 
                      'text-muted-foreground'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <span className="font-semibold text-sm sm:text-lg truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex-1 sm:w-32 bg-secondary rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary to-primary/70 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${(item.quantity / (stats.topItems[0]?.quantity || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-base sm:text-lg font-bold w-12 sm:w-16 text-right bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex-shrink-0">
                      {item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}