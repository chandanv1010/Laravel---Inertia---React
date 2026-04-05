import { Link, usePage } from '@inertiajs/react';
import { User, Heart, ShoppingCart, ChevronDown, Contact, Package, Lock, LogOut } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { useState, useRef, useEffect } from 'react';

export default function Toolbox() {
    const { cartCount } = useCart();
    const { props } = usePage<any>();
    const { translations, auth } = props;
    const t = translations?.frontend || {};
    const customer = auth?.customer;
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex items-center space-x-6">
            {customer ? (
                <div className="relative group" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-2 group text-foreground hover:text-primary transition-all duration-200"
                    >
                        <div className="w-8 h-8 rounded-full bg-[#1C8EB8]/10 border border-[#1C8EB8]/20 flex items-center justify-center text-[#1C8EB8] group-hover:bg-[#1C8EB8] group-hover:text-white transition-colors">
                            <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Xin chào</span>
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-black text-gray-900 line-clamp-1 max-w-[120px]">
                                    {customer.last_name} {customer.first_name}
                                </span>
                                <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                    </button>

                    {/* Premium Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-100 shadow-xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tài khoản</p>
                            </div>
                            
                            <Link 
                                href="/customer/profile" 
                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-[#1C8EB8]/10 hover:text-[#1C8EB8] transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Contact className="h-4 w-4" />
                                Thông tin cá nhân
                            </Link>
                            
                            <Link 
                                href="/customer/orders" 
                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-[#1C8EB8]/10 hover:text-[#1C8EB8] transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Package className="h-4 w-4" />
                                Đơn hàng của tôi
                            </Link>

                            <Link 
                                href="/customer/change-password" 
                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-[#1C8EB8]/10 hover:text-[#1C8EB8] transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Lock className="h-4 w-4" />
                                Đổi mật khẩu
                            </Link>

                            <div className="h-px bg-gray-50 my-1 mx-2" />

                            <Link 
                                href="/signout" 
                                method="post" 
                                as="button"
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <LogOut className="h-4 w-4" />
                                Đăng xuất
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <Link href="/signin" className="flex items-center gap-2 group text-foreground hover:text-primary transition-colors">
                    <User className="h-5 w-5" />
                    <span className="text-sm font-medium hidden lg:inline-block">
                        {t.header?.login_register || 'Register/Sign In'}
                    </span>
                </Link>
            )}

            <Link href="/wishlist" className="flex items-center gap-2 group text-foreground hover:text-primary transition-colors relative">
                <Heart className="h-5 w-5" />
                <span className="text-sm font-medium hidden lg:inline-block">
                    {t.header?.wishlist || 'Wishlist'}
                </span>
                <span className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">
                    2
                </span>
            </Link>

            <Link href="/cart" className="flex items-center gap-2 group text-foreground hover:text-primary transition-colors relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm font-medium hidden lg:inline-block">
                    {t.header?.cart || 'Cart'}
                </span>
                {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">
                        {cartCount}
                    </span>
                )}
            </Link>
        </div>
    );
}
