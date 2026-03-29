import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Gift, Sparkles, Tag, Eye, ShoppingCart, Plus, Package, CheckCircle, Info } from 'lucide-react';
import ComboDetailPopup from './combo-detail-popup';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/cart-context';
import { buildProductUrl } from '@/lib/url-helper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface RewardDetail {
    product_id: number;
    variant_id: number | null;
    name: string;
    canonical?: string;
    image: string;
    price: number;
    quantity: number;
    discount_type?: string;
    discount_value?: number;
}

interface BXGYPromo {
    id: number;
    name: string;
    description: string;
    buy_qty: number;
    rewards: RewardDetail[];
}

interface Combo {
    id: number;
    name: string;
    description?: string;
    combo_price: number;
    image?: string;
    combo_products: any[];
}

interface ProductPromotionBlocksProps {
    combos: Combo[];
    buy_x_get_y: {
        free_gifts: BXGYPromo[];
        discounts: BXGYPromo[];
    };
}

const ProductPromotionBlocks: React.FC<ProductPromotionBlocksProps> = ({ combos = [], buy_x_get_y }) => {
    const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const { settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';
    const { addCombo } = useCart();
    const { toast } = useToast();

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const handleViewCombo = (combo: Combo) => {
        setSelectedCombo(combo);
        setIsPopupOpen(true);
    };

    const handleAddComboToCart = async (combo: Combo) => {
        try {
            await addCombo(combo.id);
            toast({
                title: "Đã thêm combo vào giỏ hàng!",
                description: `Combo "${combo.name}" đã được thêm vào giỏ hàng của bạn.`,
            });
        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.response?.data?.message || 'Có lỗi xảy ra khi thêm combo',
                variant: "destructive",
            });
        }
    };

    const hasAnyPromo = combos.length > 0 || (buy_x_get_y?.free_gifts?.length ?? 0) > 0 || (buy_x_get_y?.discounts?.length ?? 0) > 0;

    if (!hasAnyPromo) return null;

    return (
        <div className="space-y-6 mt-4">
            {/* 1. Combo Section */}
            {combos.length > 0 && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-5 overflow-hidden relative">
                    <div className="flex items-center justify-between mb-8 relative px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 leading-none">Siêu Combo Giá Sốc</h3>
                                <p className="text-sm text-blue-500 font-medium mt-1">Tiết kiệm hơn khi mua trọn bộ combo sản phẩm</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative combo-swiper-container px-2">
                        <Swiper
                            modules={[Navigation, Pagination]}
                            spaceBetween={20}
                            slidesPerView={1}
                            navigation
                            pagination={{ clickable: true }}
                            breakpoints={{
                                640: { slidesPerView: 2 },
                                1024: { slidesPerView: 3 },
                            }}
                            className="!pb-4"
                        >
                            {combos.map((combo) => (
                                <SwiperSlide key={combo.id}>
                                    <div className="bg-white border border-blue-100 rounded-2xl p-4 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 transition-all h-full shadow-sm">
                                        <div className="flex gap-4 items-stretch h-full">
                                            {/* Image Column (1/3) */}
                                            <div className="w-1/3 aspect-[3/4] rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 relative border border-gray-100">
                                                <img src={combo.image || combo.combo_products[0]?.image} alt={combo.name} className="w-full h-full object-cover" />
                                            </div>
                                            
                                            {/* Info Column (2/3) */}
                                            <div className="flex-1 min-w-0 flex flex-col py-0.5">
                                                {/* Top info */}
                                                <div className="mb-2">
                                                    <h4 className="font-bold text-gray-900 text-[15px] line-clamp-2 leading-snug mb-2 h-[42px]" title={combo.name}>{combo.name}</h4>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-lg w-fit">
                                                        <Package className="w-3.5 h-3.5" />
                                                        Gồm {combo.combo_products.length} sản phẩm
                                                    </div>
                                                </div>

                                                {/* Price & Action stacked at bottom */}
                                                <div className="mt-auto space-y-2.5">
                                                    <div className="flex items-center justify-between border-t border-dashed border-gray-100 pt-2.5">
                                                        <div className="text-red-600 font-black text-base">
                                                            <div className="text-[10px] text-gray-400 font-medium leading-none mb-1">Giá Combo:</div>
                                                            {formatPrice(combo.combo_price)}
                                                        </div>
                                                        <button 
                                                            onClick={() => handleViewCombo(combo)}
                                                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                    </div>
                                                    
                                                    <button
                                                        onClick={() => handleAddComboToCart(combo)}
                                                        className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors cursor-pointer active:scale-[0.98]"
                                                    >
                                                        <ShoppingCart size={14} />
                                                        Thêm combo
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            )}

            {/* 2. BXGY Sections in 2 Columns */}
            {(buy_x_get_y?.free_gifts?.length > 0 || buy_x_get_y?.discounts?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {/* Column 1: Promotional Products (Free Gifts) */}
                    {buy_x_get_y.free_gifts.length > 0 && (
                        <div className="bg-gradient-to-br from-white to-emerald-50/20 border border-emerald-100 rounded-3xl p-5 overflow-hidden relative group flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-6 relative shrink-0">
                                <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100/50">
                                    <Gift size={20} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 leading-none">Quà Tặng Miễn Phí</h3>
                                    <p className="text-sm text-emerald-600 font-medium mt-1">
                                        Mua từ {buy_x_get_y.free_gifts[0]?.buy_qty || 1} sản phẩm chính để nhận ngay quà tặng hấp dẫn
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 promo-swiper-mini relative">
                                <Swiper
                                    modules={[Pagination]}
                                    spaceBetween={16}
                                    slidesPerView={1}
                                    pagination={{ clickable: true }}
                                    breakpoints={{
                                        480: { slidesPerView: 2 }
                                    }}
                                    className="!pb-4 h-full !px-1"
                                >
                                    {buy_x_get_y.free_gifts.flatMap(promo => promo.rewards.map((reward, idx) => (
                                        <SwiperSlide key={`${promo.id}-${idx}`}>
                                            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 group/reward flex flex-col h-full relative">
                                                <Link href={buildProductUrl(reward.canonical, urlType)} className="aspect-[3/4] w-full relative overflow-hidden bg-gray-50 flex items-center justify-center p-0 group-hover/reward:opacity-90">
                                                    <img src={reward.image} alt={reward.name} className="w-full h-full object-cover group-hover/reward:scale-110 transition-transform duration-500" />
                                                    <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-md z-10">
                                                        -100%
                                                    </div>
                                                </Link>
                                                <div className="p-3 flex flex-col flex-1 relative">
                                                    <Link href={buildProductUrl(reward.canonical, urlType)} className="block">
                                                        <h5 className="text-[15px] font-bold text-gray-800 line-clamp-2 leading-snug group-hover/reward:text-emerald-700 transition-colors h-[42px]" title={reward.name}>
                                                            {reward.name}
                                                        </h5>
                                                    </Link>
                                                    <div className="mt-auto pt-4 flex flex-col gap-0.5">
                                                        <span className="text-[13px] text-gray-400 line-through opacity-60 font-medium">{formatPrice(reward.price)}</span>
                                                        <span className="text-[20px] text-emerald-600 font-black tracking-tighter flex items-center gap-1 leading-none">
                                                            Miễn phí
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    )))}
                                </Swiper>
                            </div>
                        </div>
                    )}

                    {/* Column 2: Add-on Deals (Discounts) */}
                    {buy_x_get_y.discounts.length > 0 && (
                        <div className="bg-gradient-to-br from-white to-orange-50/20 border border-orange-100 rounded-3xl p-5 overflow-hidden relative group flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-6 relative shrink-0">
                                <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100">
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 leading-none">Ưu Đãi Mua Kèm</h3>
                                    <p className="text-sm text-orange-600 font-medium mt-1">
                                        Mua từ {buy_x_get_y.discounts[0]?.buy_qty || 1} sản phẩm chính để nhận mức giá ưu đãi này
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 promo-swiper-mini relative">
                                <Swiper
                                    modules={[Pagination]}
                                    spaceBetween={16}
                                    slidesPerView={1}
                                    pagination={{ clickable: true }}
                                    breakpoints={{
                                        480: { slidesPerView: 2 }
                                    }}
                                    className="!pb-4 h-full !px-1"
                                >
                                    {buy_x_get_y.discounts.flatMap(promo => promo.rewards.map((reward, idx) => (
                                        <SwiperSlide key={`${promo.id}-${idx}`}>
                                            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/50 transition-all duration-300 group/disc flex flex-col h-full relative">
                                                <Link href={buildProductUrl(reward.canonical, urlType)} className="aspect-[3/4] w-full relative overflow-hidden bg-gray-50 flex items-center justify-center p-0 group-hover/disc:opacity-90">
                                                    <img src={reward.image} alt={reward.name} className="w-full h-full object-cover group-hover/disc:scale-110 transition-transform duration-500" />
                                                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-md z-10">
                                                        HOT DEAL -{(() => {
                                                            const pct = reward.discount_type === 'percentage' 
                                                                ? reward.discount_value 
                                                                : reward.discount_type === 'fixed_amount' 
                                                                    ? (reward.discount_value || 0) / reward.price * 100 
                                                                    : 0;
                                                            return Math.round(pct || 0);
                                                        })()}%
                                                    </div>
                                                </Link>
                                                <div className="p-3 flex flex-col flex-1 relative">
                                                    <Link href={buildProductUrl(reward.canonical, urlType)} className="block">
                                                        <h5 className="text-[15px] font-bold text-gray-800 line-clamp-2 leading-snug group-hover/disc:text-orange-700 transition-colors h-[42px]" title={reward.name}>
                                                            {reward.name}
                                                        </h5>
                                                    </Link>
                                                    <div className="mt-auto pt-4 flex flex-col gap-0.5">
                                                        <span className="text-[13px] text-gray-400 line-through opacity-60 font-medium">{formatPrice(reward.price)}</span>
                                                        <span className="text-[20px] text-orange-600 font-black tracking-tighter leading-none">
                                                            {formatPrice(
                                                                reward.discount_type === 'percentage'
                                                                    ? reward.price * (1 - (reward.discount_value || 0) / 100)
                                                                    : reward.discount_type === 'fixed_amount'
                                                                        ? reward.price - (reward.discount_value || 0)
                                                                        : reward.price
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    )))}
                                </Swiper>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Popup Details */}
            <ComboDetailPopup 
                isOpen={isPopupOpen} 
                onClose={() => setIsPopupOpen(false)} 
                combo={selectedCombo}
                onAddToCart={handleAddComboToCart}
            />
        </div>
    );
};

export default ProductPromotionBlocks;
