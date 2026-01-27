import { Link } from '@inertiajs/react';
import { User, Heart, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';

export default function Toolbox() {
    const { cartCount } = useCart();

    return (
        <div className="flex items-center space-x-6">
            <Link href="/login" className="flex items-center gap-2 group text-foreground hover:text-primary transition-colors">
                <User className="h-5 w-5" />
                <span className="text-sm font-medium hidden lg:inline-block">Register/Signal In</span>
            </Link>

            <Link href="/wishlist" className="flex items-center gap-2 group text-foreground hover:text-primary transition-colors relative">
                <Heart className="h-5 w-5" />
                <span className="text-sm font-medium hidden lg:inline-block">Wishlist</span>
                <span className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">
                    2
                </span>
            </Link>

            <Link href="/cart" className="flex items-center gap-2 group text-foreground hover:text-primary transition-colors relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm font-medium hidden lg:inline-block">Cart</span>
                {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">
                        {cartCount}
                    </span>
                )}
            </Link>
        </div>
    );
}
