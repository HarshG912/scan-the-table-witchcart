import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMenuItems, groupByCategory } from "@/lib/menuService";
import { MenuItem, CartItem } from "@/types/menu";
import { MenuItemCard } from "@/components/MenuItemCard";
import { TrackOrder } from "@/components/TrackOrder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CartBottomBar } from "@/components/CartBottomBar";
import { ThemeControls } from "@/components/ThemeControls";

export default function Menu() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const tableId = searchParams.get("table") || "1";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<"menu" | "track">(
    (location.state as { activeTab?: "menu" | "track" })?.activeTab || "menu"
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const queryClient = useQueryClient();

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenuItems,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const handleRefreshMenu = () => {
    queryClient.invalidateQueries({ queryKey: ["menu"] });
    toast.success("Menu refreshed!", {
      position: "bottom-center",
      duration: 1500,
    });
  };

  const handleRefreshOrders = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast.success("Orders refreshed!", {
      position: "bottom-center",
      duration: 1500,
    });
  };

  const categories = menuItems ? groupByCategory(menuItems) : {};
  const categoryNames = Object.keys(categories);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((i) => i["Item Id"] === item["Item Id"]);
      if (existingItem) {
        return prevCart.map((i) =>
          i["Item Id"] === item["Item Id"]
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
    
    const quantity = cart.find((i) => i["Item Id"] === item["Item Id"])?.quantity || 0;
    toast(`✨ Added to cart — ${quantity + 1} × ${item.Item}`, {
      position: "bottom-center",
      duration: 1500,
      className: "mb-20 animate-slide-up",
    });
  };

  // Store cart in localStorage
  useEffect(() => {
    localStorage.setItem(`cart_${tableId}`, JSON.stringify(cart));
  }, [cart, tableId]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-background pb-24 animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scan The Table</h1>
            <p className="text-sm opacity-90">Table {tableId}</p>
          </div>
          <div className="flex gap-2">
            <ThemeControls variant="compact" />
            <Button
              variant="secondary"
              size="icon"
              onClick={activeTab === "menu" ? handleRefreshMenu : handleRefreshOrders}
              className="bg-white text-primary hover:bg-white/90 h-9 w-9"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation - Sticky below header */}
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "menu" | "track")} className="w-full">
          <TabsList className="sticky top-[72px] left-0 right-0 w-full grid grid-cols-2 h-14 rounded-none border-b shadow-md z-30 bg-background transition-all duration-300">
            <TabsTrigger value="menu" className="h-full text-base font-semibold transition-all duration-200 hover:scale-105">
              Menu
            </TabsTrigger>
            <TabsTrigger value="track" className="h-full text-base font-semibold transition-all duration-200 hover:scale-105">
              Track Order
            </TabsTrigger>
          </TabsList>

          <div className="px-4 pt-4 pb-24">
            <TabsContent value="menu">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : categoryNames.length > 0 ? (
                <Tabs defaultValue={categoryNames[0]} className="w-full">
                  <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6">
                    {categoryNames.map((category) => (
                      <TabsTrigger key={category} value={category} className="whitespace-nowrap">
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {categoryNames.map((category) => (
                    <TabsContent key={category} value={category} className="space-y-3">
                      {categories[category].map((item) => (
                        <MenuItemCard
                          key={`${category}-${item["Item Id"]}`}
                          item={item}
                          onAddToCart={handleAddToCart}
                        />
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No menu items available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="track">
              <TrackOrder initialTableId={tableId} refreshTrigger={refreshTrigger} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Cart Bottom Bar */}
      {activeTab === "menu" && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <CartBottomBar itemCount={totalItems} total={totalPrice} tableId={tableId} />
        </div>
      )}
    </div>
  );
}
