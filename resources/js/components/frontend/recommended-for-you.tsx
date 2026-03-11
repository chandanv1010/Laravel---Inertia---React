import React, { useState, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { AddToCartButton } from '@/components/frontend/cart';
import { buildProductUrl } from '@/lib/url-helper';

interface AppliedPromotion {
    id: number;
    name: string;
    discount: number;
    type: string;
    value: number;
}

interface Product {
    id: number;
    name: string;
    image: string;
    canonical?: string;
    category_name?: string;
    price: number;
    original_price?: number;
    sale_price?: number;
    discount_amount?: number;
    discount_percent?: number;
    applied_promotions?: AppliedPromotion[];
    is_combined_discount?: boolean;
    has_discount?: boolean;
    rating?: number;
    review_count?: number;
    sold?: number;
    total_stock?: number;
    has_variants?: boolean;
    variants?: Array<{
        id: number;
        name: string;
        price: number;
        stock?: number;
    }>;
    badge?: 'sale' | 'best_sale' | 'new' | null;
}

interface ChildCategory {
    id: number;
    name: string;
    image?: string;
}

interface CategoryBlock {
    parent_id: number;
    parent_name: string;
    parent_image?: string;
    children: ChildCategory[];
    products_by_child: Record<number, Product[]>;
    all_products: Product[];
}

interface RecommendedData {
    main_title: string;
    blocks: CategoryBlock[];
}

interface Props {
    data?: RecommendedData;
}

// Individual Category Block Component
function CategoryBlockSection({
    block,
    mainTitle,
    urlType
}: {
    block: CategoryBlock;
    mainTitle: string;
    urlType: string;
}) {
    const [activeChildId, setActiveChildId] = useState<number | 'all'>('all');

    // Format price in VND
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price);
    };

    // Get products for current tab
    const currentProducts = useMemo(() => {
        if (activeChildId === 'all') {
            return block.all_products || [];
        }
        return block.products_by_child[activeChildId] || [];
    }, [block, activeChildId]);

    const renderBadge = (badge?: string | null, discountPercent?: number) => {
        if (badge === 'sale' && discountPercent && discountPercent > 0) {
            return (
                <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    Sale {discountPercent}%
                </span>
            );
        }
        if (badge === 'best_sale') {
            return (
                <span className="absolute top-2 left-2 z-10 bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded">
                    Best Sale
                </span>
            );
        }
        if (badge === 'new') {
            return (
                <span className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    New
                </span>
            );
        }
        return null;
    };

    const renderProductCard = (product: Product) => {
        const productUrl = buildProductUrl(product.canonical, urlType);
        // Use has_discount from backend if available, otherwise fallback to price comparison
        const hasSale = product.has_discount ?? (product.sale_price != null && product.sale_price < product.price);

        return (
            <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden group hover:shadow-lg transition-shadow duration-300 flex flex-col"
            >
                {/* Image Container */}
                <div className="relative aspect-square bg-white overflow-hidden">
                    {renderBadge(product.badge, product.discount_percent)}

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
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-[40px] group-hover:text-primary transition-colors">
                            {product.name}
                        </h3>
                    </Link>

                    {/* Category Name (instead of store name) */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <span className="w-3 h-3 bg-teal-500 rounded-sm flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                        </span>
                        {product.category_name || 'Danh mục'}
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 flex-wrap mb-2">
                        <span className="text-base font-bold text-gray-900">
                            {formatPrice(hasSale ? product.sale_price! : product.price)}
                        </span>
                        {hasSale && (
                            <span className="text-xs text-gray-400 line-through">
                                {formatPrice(product.original_price || product.price)}
                            </span>
                        )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3">
                        <span className="text-sm font-medium text-gray-700">{product.rating || 5.0}</span>
                        <Star className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                        <span className="text-xs text-gray-400">
                            ({product.review_count ?
                                (product.review_count > 1000 ?
                                    Math.round(product.review_count / 1000) + 'k' :
                                    product.review_count
                                ) : '0'
                            })
                        </span>
                    </div>

                    {/* Add to Cart Button */}
                    <div className="mt-auto">
                        <AddToCartButton
                            productId={product.id}
                            productName={product.name}
                            productPrice={hasSale ? product.sale_price! : product.price}
                            hasVariants={product.has_variants || false}
                            variants={product.variants}
                            buttonText="Thêm vào giỏ hàng"
                            showIcon={true}
                            className="w-full justify-center"
                        />
                    </div>
                </div>
            </div>
        );
    };

    if (block.children.length === 0 && block.all_products.length === 0) {
        return null;
    }

    return (
        <section className="py-8 bg-white border-b border-gray-100">
            <div className="container mx-auto px-4">
                {/* Header - Category Title Only (Uppercase) */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">
                        {block.parent_name}
                    </h2>

                    {/* Child Category Tabs */}
                    {block.children.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* All Tab */}
                            <button
                                onClick={() => setActiveChildId('all')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${activeChildId === 'all'
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                Tất cả
                            </button>

                            {/* Child Category Tabs */}
                            {block.children.map((child) => (
                                <button
                                    key={child.id}
                                    onClick={() => setActiveChildId(child.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${activeChildId === child.id
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {child.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Products Grid */}
                {currentProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {currentProducts.map(renderProductCard)}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        Không có sản phẩm nào trong danh mục này.
                    </div>
                )}
            </div>
        </section>
    );
}

// Main Component - Renders all blocks
export default function RecommendedForYou({ data: propData }: Props) {
    const { widgets, settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';
    const data: RecommendedData | null = propData || widgets?.recommendedCategories;

    if (!data || !data.blocks || data.blocks.length === 0) {
        return null;
    }

    return (
        <div className="recommended-for-you-container">
            {data.blocks.map((block) => (
                <CategoryBlockSection
                    key={block.parent_id}
                    block={block}
                    mainTitle={data.main_title}
                    urlType={urlType}
                />
            ))}
        </div>
    );
}
