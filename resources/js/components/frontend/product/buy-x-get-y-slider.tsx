import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { Gift, Zap, Plus } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { useCart } from '@/contexts/cart-context';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface RewardItem {
    product_id: number;
    variant_id?: number | null;
    name: string;
    sku: string;
    image: string;
    price: number | string;
    quantity: number;
    discount_type: 'free' | 'fixed_amount' | 'percentage';
    discount_value?: number | string;
}

interface BuyXGetYPromotion {
    id: number;
    name: string;
    reward_details: RewardItem[];
}

interface BuyXGetYSliderProps {
    promotions: BuyXGetYPromotion[];
}

export default function BuyXGetYSlider({ promotions }: BuyXGetYSliderProps) {
    const { addToCart } = useCart();
    
    if (!promotions || promotions.length === 0) return null;

    const formatPrice = (price: number | string) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(Number(price));
    };

    const renderRewardTag = (item: RewardItem) => {
        if (item.discount_type === 'free') {
            return <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Miễn phí</span>;
        }
        if (item.discount_type === 'percentage') {
            return <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase">-{item.discount_value}%</span>;
        }
        return <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">Ưu đãi</span>;
    };

    return (
        <div className="mt-8 mb-4 border-t pt-6 bg-white relative">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold">
                <Gift className="w-5 h-5 text-red-500" />
                <h3 className="text-sm uppercase tracking-wide">Ưu đãi mua kèm có hời</h3>
            </div>

            <div className="rounded-xl p-3 border border-gray-100 bg-white">
                <Swiper
                    modules={[Navigation, Pagination]}
                    spaceBetween={16}
                    slidesPerView={1.2}
                    navigation={{
                        nextEl: '.buy-x-next',
                        prevEl: '.buy-x-prev',
                    }}
                    className="buy-x-get-y-swiper relative"
                    breakpoints={{
                        640: { slidesPerView: 2 },
                        1024: { slidesPerView: 2 }
                    }}
                >
                    {promotions.flatMap(promo => promo.reward_details).map((item, index) => (
                        <SwiperSlide key={`${item.product_id}-${index}`}>
                            <div className="bg-white rounded-lg p-2 border border-gray-100 shadow-sm flex items-center gap-4 h-full group">
                                {/* Left: Image */}
                                <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-50 border">
                                    <img 
                                        src={item.image} 
                                        alt={item.name} 
                                        className="w-full h-full object-contain transition-transform group-hover:scale-110" 
                                    />
                                    <div className="absolute top-1 left-1">
                                        {renderRewardTag(item)}
                                    </div>
                                </div>
                                
                                {/* Right: Info */}
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                    <h4 className="text-[12px] font-bold text-gray-900 line-clamp-1 mb-0.5">
                                        {item.name}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 mb-2 font-mono uppercase tracking-tighter">
                                        Mã: {item.sku || 'N/A'}
                                    </p>
                                    
                                    <div className="flex items-center justify-between gap-4 mt-auto">
                                        <div className="flex flex-col">
                                            <div className="text-[13px] font-bold text-red-600 leading-none">
                                                {item.discount_type === 'free' ? '0đ' : formatPrice(Number(item.price) * (1 - (Number(item.discount_value || 0) / 100)))}
                                            </div>
                                            <div className="text-[10px] text-gray-400 line-through">
                                                {formatPrice(item.price)}
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => addToCart(item.product_id, item.variant_id ?? null, 1)}
                                            className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-gray-800 transition-colors shadow-sm active:scale-95"
                                        >
                                            <Plus size={12} />
                                            Thêm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                    
                    {/* Navigation Buttons (smaller and repositioned) */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 z-10 buy-x-prev cursor-pointer bg-white shadow-md rounded-full p-1 border border-gray-100 hover:text-primary transition-colors disabled:opacity-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </div>
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 z-10 buy-x-next cursor-pointer bg-white shadow-md rounded-full p-1 border border-gray-100 hover:text-primary transition-colors disabled:opacity-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </div>
                </Swiper>
                
                <p className="mt-2 text-[10px] text-gray-500 italic flex items-center gap-1 opacity-80">
                    <Zap className="w-3 h-3 text-orange-400" />
                    Tự động giảm giá khi đủ điều kiện trong giỏ hàng
                </p>
            </div>
        </div>
    );
}
