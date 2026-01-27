import { Link } from '@inertiajs/react';
import { Product } from '@/types/frontend';
import { cn } from '@/lib/utils';

/**
 * ProductItemVerticalReverse Component
 * 
 * Layout: Information Top, Image Bottom
 * 
 * @param {Product} product - The product data object
 * @param {string} className - Optional additional classes
 */
export default function ProductItemVerticalReverse({ product, className }: { product: Product, className?: string }) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className={cn("group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300", className)}>

            {/* Content Section - Top */}
            <div className="flex flex-col flex-1 p-4 pb-0">
                {/* Category */}
                {product.product_catalogues && product.product_catalogues.length > 0 && (
                    <div className="text-xs text-muted-foreground mb-1">
                        {product.product_catalogues[0].name}
                    </div>
                )}

                {/* Title */}
                <Link href={product.canonical || '#'} className="block">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                    </h3>
                </Link>

                {/* Price */}
                <div className="mt-2 mb-3">
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
            </div>

            {/* Image Section - Bottom */}
            <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800 mt-auto">
                <Link href={product.canonical || '#'}>
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </Link>
                {product.price_sale && product.price_sale > 0 && product.price > product.price_sale && (
                    <span className="absolute bottom-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                        -{Math.round(((product.price - product.price_sale) / product.price) * 100)}%
                    </span>
                )}
            </div>
        </div>
    );
}
