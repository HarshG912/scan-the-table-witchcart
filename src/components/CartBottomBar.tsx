import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CartBottomBarProps {
  itemCount: number;
  total: number;
  tableId: string;
}

export function CartBottomBar({ itemCount, total, tableId }: CartBottomBarProps) {
  const navigate = useNavigate();

  if (itemCount === 0) return null;

  return (
    <div className="bg-card border-t border-border shadow-lg animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">{itemCount} item{itemCount > 1 ? 's' : ''}</p>
            <p className="text-lg font-bold text-primary">₹{total.toFixed(2)}</p>
          </div>
        </div>
        <Button 
          size="lg"
          onClick={() => navigate(`/cart?table=${tableId}`)}
          className="font-semibold"
        >
          Go to Cart
        </Button>
      </div>
    </div>
  );
}
