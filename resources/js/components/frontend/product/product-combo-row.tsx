import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight, Star, Box, Gift } from 'lucide-react';
import { AddToCartButton } from '@/components/frontend/cart';
import { buildProductUrl } from '@/lib/url-helper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

interface ProductComboRowProps {
    combos?: any[];
    currentProductId: number;
}

/**
    * Premium Product Card for Combo Row
    */
const ProductCardPremium = ({ product }: { product: any }) => {
    const { settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';
    const productUrl = buildProductUrl(product.canonical, urlType);
    
    const formatPrice = (price: number) => {
        if (price === 0) return <span className="text-emerald-600 font-bold">Miễn phí</span>;
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price || 0);
    };

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col h-full">
            {/* Image Container */}
            <div className="relative aspect-square bg-white overflow-hidden p-4">
                <span className="absolute top-3 left-3 z-10 bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded shadow-sm uppercase">
                    Combo
                </span>
                <Link href={productUrl} className="block w-full h-full">
                    <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.name}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                    />
                </Link>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow bg-white">
                {/* Category with Icon */}
                <div className="flex items-center gap-1.5 mb-2">
                    <span className="shrink-0 w-3.5 h-3.5 bg-blue-500 rounded-sm flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <span className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">
                        {product.category_name || 'Combo Tiết Kiệm'}
                    </span>
                </div>

                {/* Title */}
                <Link href={productUrl}>
                    <h3 className="text-[14px] font-bold text-gray-800 line-clamp-2 mb-2 min-h-[40px] group-hover:text-blue-600 transition-colors leading-snug">
                        {product.name}
                    </h3>
                </Link>

                {/* Info (Combo count) */}
                <div className="flex items-center gap-1 mb-3">
                    <span className="text-[11px] text-gray-500 font-medium">
                        Bộ gồm {product.items_count} sản phẩm
                    </span>
                </div>

                {/* Price Section */}
                <div className="mb-4">
                    <div className="flex flex-col min-h-[38px] justify-center">
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[17px] font-bold text-gray-900 leading-none">
                                {formatPrice(product.price)}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">Giá trọn bộ</span>
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                    <Link href={productUrl} className="w-full flex items-center justify-center h-10 text-[13px] font-medium bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white rounded-full transition-all duration-300">
                        Xem bộ sản phẩm
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default function ProductComboRow({ 
    combos = [], 
    currentProductId 
}: ProductComboRowProps) {
    
    const comboListData = React.useMemo(() => {
        return combos.map(combo => {
            const firstItem = combo.items?.[0];
            return {
                id: combo.id,
                name: combo.name,
                price: Number(combo.combo_price || 0),
                image: firstItem?.image,
                category_name: 'Combo Tiết Kiệm',
                items_count: combo.items?.length || 0,
                canonical: firstItem?.canonical || '#'
            };
        });
    }, [combos]);

    if (comboListData.length === 0) return null;

    const SectionHeader = ({ title, icon, colorClass, prevClass, nextClass }: any) => (
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-gray-100">
            <div className="relative">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3 uppercase tracking-tight">
                    <span className={`p-2 rounded-lg ${colorClass} bg-opacity-10 shrink-0`}>
                        {icon}
                    </span>
                    {title}
                </h2>
                <div className={`absolute -bottom-[3px] left-0 w-24 h-[3px] rounded-full ${colorClass.replace('text-', 'bg-')}`}></div>
            </div>
            <div className="flex gap-2.5">
                <button className={`p-2.5 rounded-full border border-gray-200 text-gray-600 hover:bg-white hover:shadow-md hover:border-blue-200 hover:text-blue-600 transition-all disabled:opacity-30 ${prevClass}`}>
                    <ChevronLeft size={18} />
                </button>
                <button className={`p-2.5 rounded-full border border-gray-200 text-gray-600 hover:bg-white hover:shadow-md hover:border-blue-200 hover:text-blue-600 transition-all disabled:opacity-30 ${nextClass}`}>
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="mt-16 mb-20">
            <div className="w-full">
                <SectionHeader 
                    title="Combo khuyến mãi" 
                    icon={<Box className="w-5 h-5 text-blue-600" />}
                    colorClass="text-blue-600"
                    prevClass="combo-prev"
                    nextClass="combo-next"
                />
                
                <Swiper
                    modules={[Navigation, Autoplay]}
                    spaceBetween={20}
                    slidesPerView={2}
                    navigation={{ prevEl: '.combo-prev', nextEl: '.combo-next' }}
                    autoplay={{ delay: 5000, disableOnInteraction: false }}
                    breakpoints={{
                        320: { slidesPerView: 2 },
                        640: { slidesPerView: 3 },
                        1024: { slidesPerView: 4 },
                        1280: { slidesPerView: 5 }
                    }}
                    className="pb-6"
                >
                    {comboListData.map((combo) => (
                        <SwiperSlide key={combo.id} className="h-auto">
                            <ProductCardPremium product={combo as any} />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </div>
    );
}
