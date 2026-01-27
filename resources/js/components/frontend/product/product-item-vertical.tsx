import { Link } from '@inertiajs/react';
import { Product } from '@/types/frontend';
import { cn } from '@/lib/utils';

/**
 * ProductItemVertical Component
 * 
 * Layout: Image Top, Information Bottom
 * 
 * Features:
 * - Full width image
 * - Price display with sale styling
 * - "Add to Cart" or "View Detail" call to action
 * 
 * @param {Product} product - The product data object
 * @param {string} className - Optional additional classes
 */
export default function ProductItemVertical({ product, className }: { product: Product, className?: string }) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className={cn("group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300", className)}>
            {/* Image Section - Top */}
            <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <Link href={product.canonical || '#'}>
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </Link>
                {product.price_sale && product.price_sale > 0 && product.price > product.price_sale && (
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                        -{Math.round(((product.price - product.price_sale) / product.price) * 100)}%
                    </span>
                )}
            </div>

            {/* Content Section - Bottom */}
            <div className="flex flex-col flex-1 p-4">
                {/* Category */}
                {(product.category_name || (product.product_catalogues && product.product_catalogues.length > 0)) && (
                    <div className="text-xs text-muted-foreground mb-1">
                        <Link
                            href={product.category_canonical ? `/${product.category_canonical}.html` : '#'}
                            className="hover:text-primary hover:underline"
                            onClick={(e) => {
                                if (!product.category_canonical) e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
                            {product.category_name || product.product_catalogues?.[0]?.name}
                        </Link>
                    </div>
                )}

                {/* Title */}
                <Link href={product.canonical || '#'} className="block">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
                        {product.name}
                    </h3>
                </Link>

                {/* Price */}
                <div className="mt-3">
                    {product.price_sale && product.price_sale > 0 ? (
                        <div className="flex items-baseline space-x-2">
                            <span className="text-lg font-bold text-red-600">
                                {formatCurrency(product.price_sale)}
                            </span>
                            <span className="text-sm text-muted-foreground line-through decoration-zinc-500">
                                {formatCurrency(product.price)}
                            </span>
                        </div>
                    ) : (
                        <span className="text-lg font-bold text-foreground">
                            {product.price > 0 ? formatCurrency(product.price) : 'Liên hệ'}
                        </span>
                    )}
                </div>

                {/* Button */}
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <Link
                        href={product.canonical || '#'}
                        className="flex items-center justify-center w-full py-2 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary rounded-md transition-all text-sm font-medium text-foreground"
                    >
                        Xem chi tiết
                    </Link>
                </div>
            </div>
        </div>
    );
}
