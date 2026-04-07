import { Head, Link } from '@inertiajs/react';
import FrontendLayout from '@/layouts/frontend-layout';
import { CheckCircle2, Home, ShoppingBag, Package, Truck, CreditCard, Mail, Phone, MapPin, Zap, Info, Gift } from 'lucide-react';
import React from 'react';

interface OrderItem {
    id: number;
    product_name: string;
    variant_name: string | null;
    quantity: number;
    price: string | number;
    total: string | number;
    image?: string;
    type?: string;
    is_combo_group?: boolean;
    child_items?: OrderItem[];
    original_price?: number | string;
    promotions_snapshot?: any[];
}

interface Order {
    id: number;
    order_code: string;
    total_amount: string | number;
    subtotal: string | number;
    shipping_fee: string | number;
    discount_total: string | number;
    items_subtotal?: number | string;
    additional_discount?: number | string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    shipping_address: string;
    payment_method_id: number;
    payment_status: string;
    order_status: string;
    display_items: OrderItem[];
    payment_method?: {
        name: string;
    };
}

interface Props {
    order: Order;
    thanksMessage?: string;
}

const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
};

const SuccessItemRow = ({ item }: { item: any }) => {
    const isCombo = !!item.is_combo_group;
    
    // Prioritize pre-calculated total (like for combos), otherwise fallback to price * quantity
    const totalFinal = (item.total !== undefined && item.total !== null) ? Number(item.total) : (Number(item.price || 0) * (item.quantity || 1));

    return (
        <div className={`py-4 flex gap-4 ${isCombo ? 'bg-blue-50/10' : ''} transition-colors px-2 rounded-lg border-b border-gray-50 last:border-0`}>
            {/* Image */}
            <div className="w-20 h-24 bg-gray-50 rounded border border-gray-100 flex-shrink-0 overflow-hidden relative">
                <img
                    src={item.image || '/images/placeholder.png'}
                    alt={item.name || item.product_name}
                    className="w-full h-full object-cover"
                />
                {isCombo && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md uppercase">
                        Combo
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col py-0.5">
                <div className="mb-1">
                    <h4 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">
                        {item.name || item.product_name}
                    </h4>
                    
                    {isCombo ? (
                        <div className="mt-2 space-y-1">
                            {item.child_items?.map((child: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-500">
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    <span>{child.product_name} x{child.quantity}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                {item.variant_name || 'Tiêu chuẩn'}
                            </p>
                            
                            {/* Promotions Badges */}
                            {item.promotions_snapshot && item.promotions_snapshot.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {item.promotions_snapshot.map((promo: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold bg-orange-50 text-orange-600 border border-orange-100">
                                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex items-center justify-center text-white">
                                                <CheckCircle2 size={8} strokeWidth={4} />
                                            </div>
                                            {promo.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {item.type === 'gift' && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase tracking-wider bg-green-50 px-2 py-1 rounded w-fit">
                            <Gift size={12} />
                            QUÀ TẶNG KÈM THEO
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-2 flex justify-between items-end">
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Số lượng: {item.quantity}</span>
                    <div className="text-right">
                        <span className={`font-black text-sm ${item.type === 'gift' ? 'text-green-600' : 'text-gray-900'}`}>
                            {item.type === 'gift' ? 'MIỄN PHÍ' : formatPrice(totalFinal)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Success({ order, thanksMessage }: Props) {
    const defaultThanks = `Cảm ơn bạn đã mua sản phẩm tại hệ thống website của chúng tôi. 
    Một Email xác nhận đã được gửi đến ${order.customer_email || 'email người dùng đăng ký tài khoản'}. 
    Hãy kiểm tra lại thông tin email của bạn. Xin cảm ơn.`;

    // New Summary Logic: 
    // Subtotal = sum of what the user sees in the rows (items_subtotal from controller)
    // Extra Discount = additional_discount (Vouchers, Order-level promos)
    const itemsSubtotal = Number(order.items_subtotal || 0);
    const totalPayable = Number(order.total_amount);
    const extraDiscount = Number(order.additional_discount || 0);
    const shipping = Number(order.shipping_fee);

    return (
        <FrontendLayout
            title={`Đặt hàng thành công #${order.order_code}`}
            seo={{ meta_robots: 'noindex' }}
        >
            <div className="bg-[#fcfcfc] min-h-screen py-10">
                <div className="max-w-6xl mx-auto px-4">
                    
                    {/* Header: Success Icon & Summary */}
                    <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 text-green-500 rounded-full mb-4 border border-green-100 shadow-sm">
                            <CheckCircle2 size={36} />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">ĐẶT HÀNG THÀNH CÔNG</h1>
                        <p className="text-gray-400 font-medium tracking-wide">Mã đơn hàng: <span className="text-gray-900 font-bold px-2 py-0.5 bg-gray-100 rounded ml-1">#{order.order_code}</span></p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* LEFT COLUMN: 60% - Message & Details */}
                        <div className="lg:col-span-7 space-y-6">
                            
                            {/* Thank you card */}
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-2 opacity-[0.03]">
                                    <ShoppingBag size={80} />
                                </div>
                                <div className="flex items-start gap-5 relative z-10">
                                    <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl border border-blue-100 shadow-sm">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-3 tracking-tight italic">Lời cảm ơn</h2>
                                        <p className="text-gray-600 leading-relaxed text-[15px] font-medium">
                                            {thanksMessage || defaultThanks}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Shipping & Payment Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 text-gray-900 border-b border-gray-50 pb-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                            <Truck size={16} />
                                        </div>
                                        <h3 className="font-bold uppercase text-[11px] tracking-[0.1em] text-gray-400">Thông tin giao hàng</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center mt-0.5">
                                                <MapPin size={12} className="text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-bold text-gray-900">{order.customer_name}</p>
                                                <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{order.shipping_address}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center">
                                                <Phone size={12} className="text-gray-400" />
                                            </div>
                                            <p className="text-[13px] text-gray-700 font-medium group cursor-pointer hover:text-primary transition-colors">{order.customer_phone}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 text-gray-900 border-b border-gray-50 pb-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                            <CreditCard size={16} />
                                        </div>
                                        <h3 className="font-bold uppercase text-[11px] tracking-[0.1em] text-gray-400">Thanh toán</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider">Phương thức</p>
                                            <p className="text-[13px] font-bold text-gray-900 leading-tight">{order.payment_method?.name || 'Thanh toán trực tiếp'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider">Trạng thái</p>
                                            <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-tighter ${
                                                order.payment_status === 'paid' 
                                                ? 'bg-green-50 text-green-500 border border-green-100' 
                                                : 'bg-orange-50 text-orange-500 border border-orange-100'
                                            }`}>
                                                {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Help Box */}
                            <div className="bg-gray-900 p-6 rounded-3xl flex items-center justify-between overflow-hidden relative shadow-lg shadow-gray-200">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-16 -mt-16 blur-xl" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-1.5">
                                        <Info size={14} /> Cần hỗ trợ?
                                    </div>
                                    <h4 className="font-bold text-lg text-white mb-1 shadow-sm">Mã đơn hàng: #{order.order_code}</h4>
                                    <p className="text-sm text-gray-400">Hotline: 1900 xxxx (Hỗ trợ 24/7)</p>
                                </div>
                                <Link 
                                    href="/contact" 
                                    className="relative z-10 px-6 py-2.5 bg-white text-gray-900 rounded-xl font-bold text-[13px] hover:bg-primary hover:text-white transition-all shadow-md active:scale-95"
                                >
                                    Liên hệ ngay
                                </Link>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: 40% - Product List */}
                        <div className="lg:col-span-5">
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden sticky top-8">
                                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                                    <h3 className="font-black text-gray-900 text-sm tracking-tight italic">TÓM TẮT ĐƠN HÀNG</h3>
                                    <div className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-black rounded uppercase tracking-tighter">
                                        {order.display_items.length} hạng mục
                                    </div>
                                </div>
                                
                                <div className="px-4 py-2 max-h-[480px] overflow-y-auto custom-scrollbar divide-y divide-gray-50/50">
                                    {order.display_items.map((item, idx) => (
                                        <SuccessItemRow key={idx} item={item} />
                                    ))}
                                </div>

                                <div className="px-6 py-6 bg-gray-50/80 space-y-3.5 border-t border-gray-100">
                                    <div className="flex justify-between text-[13px] text-gray-500 font-bold">
                                        <span className="flex items-center gap-1.5"><Package size={14} className="opacity-40"/> Tạm tính</span>
                                        <span className="text-gray-700">{formatPrice(itemsSubtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px] text-gray-500 font-bold">
                                        <span className="flex items-center gap-1.5"><Truck size={14} className="opacity-40"/> Phí vận chuyển</span>
                                        <span className="text-gray-700">{formatPrice(shipping)}</span>
                                    </div>
                                    {extraDiscount > 0 && (
                                        <div className="flex justify-between text-[13px] text-primary font-black animate-pulse">
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-1.5"><Zap size={14} className="opacity-100"/> Chiết khấu đơn hàng</span>
                                                <span className="text-[10px] text-primary/60 font-medium">(Mã Voucher / Giảm giá bổ sung)</span>
                                            </div>
                                            <span>-{formatPrice(extraDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-5 border-t border-gray-200 mt-2">
                                        <span className="text-sm font-black text-gray-900 tracking-widest italic uppercase">TỔNG CỘNG</span>
                                        <div className="text-right">
                                            <span className="text-2xl font-[1000] text-gray-900 tracking-tighter">{formatPrice(totalPayable)}</span>
                                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase leading-none">(Đã bao gồm VAT)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 flex flex-col gap-3">
                                    <Link 
                                        href="/" 
                                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-center hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <Home size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                                        TIẾP TỤC MUA SẮM
                                    </Link>
                                    <Link 
                                        href="/customer/orders" 
                                        className="w-full py-4 border border-gray-200 text-gray-600 rounded-xl font-bold text-center hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShoppingBag size={18} />
                                        QUẢN LÝ ĐƠN HÀNG
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}
