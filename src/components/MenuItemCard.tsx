import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Leaf, Circle } from "lucide-react";

interface MenuItem {
  "Item Id": string;
  Item: string;
  Qty: string;
  Category: string;
  Price: string;
  Veg: string; // "TRUE" or "FALSE"
  "Image URL": string;
  Available: string; // "TRUE" or "FALSE"
}

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const isVeg = item.Veg?.toUpperCase() === "TRUE";
  const isAvailable = item.Available?.toUpperCase() === "TRUE";

  return (
    <Card
      className={`overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
        !isAvailable ? "opacity-60 grayscale" : ""
      }`}
    >
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Image */}
          <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
            {item["Image URL"] ? (
              <img src={item["Image URL"]} alt={item.Item} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-start gap-2">
                <h3 className="font-semibold text-sm leading-tight flex-1 truncate">{item.Item}</h3>
                {isVeg ? (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                    <Leaf className="w-4 h-4 fill-current" />
                    <span>Veg</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                    <Circle className="w-4 h-4 fill-current" />
                    <span>Non-Veg</span>
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-primary mt-1">₹{item.Price}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.Qty}</p>
            </div>

            {/* Add Button */}
            <Button
              size="sm"
              onClick={() => isAvailable && onAddToCart(item)}
              disabled={!isAvailable}
              className="self-end"
            >
              {isAvailable ? (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </>
              ) : (
                "Unavailable"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
