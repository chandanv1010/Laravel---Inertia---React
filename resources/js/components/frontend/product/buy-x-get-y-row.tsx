import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { AddToCartButton } from '@/components/frontend/cart';
import { buildProductUrl } from '@/lib/url-helper';

interface BuyXGetYRowProps {
    promotions: any[];
    productName: string;
}

/**
 * Product Card for BXGY Rewards
 * Matches the CategoryBlockSection style with specific pricing logic
 */
const RewardProductCard = ({ product, urlType }: { product: any; urlType: string }) => {
    const productUrl = buildProductUrl(product.canonical, urlType);

    const formatPrice = (price: number) => {
        if (price === 0) return <span className="text-emerald-600 font-bold">Miễn phí</span>;
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price || 0);
    };

    const hasSale = product.price_sale !== null && product.price_sale < product.price;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden group hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
            {/* Image Container */}
            <div className="relative aspect-square bg-white overflow-hidden">
                {product.discount_percent > 0 && (
                    <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        -{product.discount_percent}%
                    </span>
                )}

                <Link href={productUrl} className="block w-full h-full">
                    <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.name}
                        className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                    />
                </Link>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
                {/* Title */}
                <Link href={productUrl}>
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-[40px] group-hover:text-emerald-600 transition-colors">
                        {product.name}
                    </h3>
                </Link>

                {/* Category Name */}
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <span className="w-3 h-3 bg-teal-500 rounded-sm flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                    </span>
                    {product.category_name || 'Ưu đãi'}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2 flex-wrap mb-2">
                    <span className="text-base font-bold text-gray-900">
                        {formatPrice(product.price_sale ?? product.price)}
                    </span>
                    {hasSale && (
                        <span className="text-xs text-gray-400 line-through">
                            {formatPrice(product.price)}
                        </span>
                    )}
                </div>

                {/* Rating (Static 5 star for rewards usually) */}
                <div className="flex items-center gap-1 mb-3">
                    <span className="text-sm font-medium text-gray-700">5.0</span>
                    <Star className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                    <span className="text-xs text-gray-400">(0)</span>
                </div>

                {/* Add to Cart Button - Only show if not free */}
                {product.price_sale !== 0 && (
                    <div className="mt-auto">
                        <AddToCartButton
                            productId={product.id}
                            productName={product.name}
                            productPrice={product.price_sale ?? product.price}
                            hasVariants={product.has_variants || false}
                            variants={product.variants || []}
                            buttonText="Thêm vào giỏ hàng"
                            showIcon={true}
                            className="w-full justify-center h-10 text-[13px] bg-sky-50 text-sky-700 border-sky-200/50 hover:bg-sky-600 hover:text-white rounded-full transition-all duration-300"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default function BuyXGetYRow({ promotions = [], productName }: BuyXGetYRowProps) {
    const { settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';

    // Process BXGY Rewards - Deduplicate products
    const rewardProducts = React.useMemo(() => {
        const productsMap = new Map();
        promotions.forEach(promo => {
            (promo.reward_details || []).forEach((item: any) => {
                if (!productsMap.has(item.product_id)) {
                    let salePrice = null;
                    const basePrice = Number(item.price);
                    if (item.discount_type === 'free') {
                        salePrice = 0;
                    } else if (item.discount_type === 'fixed_amount') {
                        salePrice = basePrice - Number(item.discount_value || 0);
                    } else if (item.discount_type === 'percentage') {
                        salePrice = basePrice * (1 - Number(item.discount_value || 0) / 100);
                    }

                    productsMap.set(item.product_id, {
                        ...item,
                        id: item.product_id,
                        price: basePrice,
                        price_sale: salePrice,
                        discount_percent: (salePrice !== null && basePrice > 0) ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0,
                    });
                }
            });
        });
        return Array.from(productsMap.values());
    }, [promotions]);

    // Get unique conditions for display
    const conditions = React.useMemo(() => {
        const uniqueConditions = new Set<string>();
        promotions.forEach(promo => {
            const buyItem = (promo.buy_x_get_y_items || []).find((item: any) => item.item_type === 'buy');
            if (buyItem) {
                if (buyItem.min_order_value > 0) {
                    uniqueConditions.add(`Mua đơn hàng từ ${new Intl.NumberFormat('vi-VN').format(buyItem.min_order_value)}đ`);
                } else if (buyItem.quantity > 0) {
                    uniqueConditions.add(`Mua từ ${buyItem.quantity} sản phẩm`);
                }
            }
        });
        return Array.from(uniqueConditions);
    }, [promotions]);

    if (rewardProducts.length === 0) return null;

    return (
        <section className="py-12 bg-white mt-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex flex-col gap-2 mb-8">
                    <h2 className="text-2xl font-extrabold text-gray-900 uppercase tracking-tight">
                        ƯU ĐÃI KHI MUA SẢN PHẨM: <span className="text-emerald-600">{productName}</span>
                    </h2>
                    {conditions.length > 0 && (
                        <p className="text-gray-600 text-sm italic">
                            ({conditions.join(' hoặc ')} để nhận được các ưu đãi dưới đây)
                        </p>
                    )}
                </div>

                {/* Products Grid - 6 columns on XL screens */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {rewardProducts.map((product) => (
                        <RewardProductCard
                            key={product.id}
                            product={product}
                            urlType={urlType}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
