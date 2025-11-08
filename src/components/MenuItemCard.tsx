import { MenuItem } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Leaf, Circle } from "lucide-react";

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.01] rounded-xl">
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Image */}
          <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
            {item["Image URL"] ? (
              <img src={item["Image URL"]} alt={item["Item"]} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-start gap-2">
                <h3 className="font-semibold text-sm leading-tight flex-1">{item["Item"]}</h3>
                {item.Veg === "TRUE" || item.Veg === true ? (
                  <div className="flex items-center gap-1 text-accent text-xs font-medium shadow-sm">
                    <Leaf className="w-4 h-4 fill-current" />
                    <span>Veg</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-destructive text-xs font-medium shadow-sm">
                    <Circle className="w-4 h-4 fill-current" />
                    <span>Non-Veg</span>
                  </div>
                )}
              </div>

              {/* Price and Qty */}
              <p className="text-lg font-bold text-primary mt-1">₹{item.Price}</p>
              <p className="text-xs text-muted-foreground">{item.Qty}</p>
            </div>

            {/* Add button */}
            <Button size="sm" onClick={() => onAddToCart(item)} className="self-end">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
