import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Star, Share2, Heart, ShieldCheck, RefreshCw, Truck, Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { toast } from 'sonner';

interface ProductInfoProps {
    product: any;
    catalogue: any;
    selectedVariant?: any | null;
    allOutOfStock?: boolean;
    quantity: number;
    onQuantityChange: (quantity: number) => void;
}

export default function ProductInfo({ product, catalogue, selectedVariant, allOutOfStock, quantity, onQuantityChange }: ProductInfoProps) {
    const { addToCart } = useCart();
    const [isAdding, setIsAdding] = useState(false);

    // Price formatting helper
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const hasDiscount = product.sale_price && product.sale_price < product.price;

    // Determine valid stock
    // For simple products, check multiple probable fields. If undefined/null, default to In Stock (e.g. 999) to avoid blocking sales on missing data.
    // If it is explicitly 0, it will be respected.
    const simpleStock = product.quantity ?? product.stock ?? product.stock_quantity ?? product.total_stock;
    const currentStock = selectedVariant ? (selectedVariant.stock_quantity ?? 0) : (simpleStock ?? 999);

    const isOutOfStock = currentStock <= 0;
    const isLimitReached = quantity >= currentStock;

    const handleAddToCart = async () => {
        if (isOutOfStock || quantity > currentStock) return;

        setIsAdding(true);
        try {
            await addToCart(
                product.id,
                selectedVariant ? selectedVariant.id : null,
                quantity
            );
            // Replace with proper Toast
            toast.success('Thêm vào giỏ hàng thành công!');
        } catch (error) {
            toast.error('Có lỗi xảy ra khi thêm vào giỏ hàng.');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Stock Display */}
            <div className="mb-4 text-sm font-medium">
                {isOutOfStock ? (
                    <span className="text-red-500">Hết hàng</span>
                ) : (
                    <span className="text-green-600">
                        {currentStock < 999 ? `Còn lại: ${currentStock} sản phẩm` : 'Còn hàng'}
                    </span>
                )}
            </div>

            {/* Add to Cart with separate quantity controls */}
            <div className="mb-8">
                <div className="flex gap-3 h-12">
                    {/* Quantity controls - Grey Pill */}
                    <div className={`
                        flex items-center gap-3 px-4 rounded-full bg-gray-100 text-gray-900 font-medium min-w-[140px] justify-between
                        ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                    `}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isOutOfStock) {
                                    onQuantityChange(Math.max(1, quantity - 1));
                                }
                            }}
                            disabled={isOutOfStock || quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-white hover:shadow-sm transition-all cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            -
                        </button>
                        <span className="w-8 text-center text-lg">{quantity}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isOutOfStock && !isLimitReached) {
                                    onQuantityChange(quantity + 1);
                                }
                            }}
                            disabled={isOutOfStock || isLimitReached}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-white hover:shadow-sm transition-all cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            +
                        </button>
                    </div>

                    {/* Add to cart button - Black Pill */}
                    <button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock || isAdding || quantity > currentStock}
                        className={`
                            flex-1 font-bold rounded-full transition-all flex items-center justify-center gap-2 px-6
                            ${isOutOfStock || quantity > currentStock
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg transform active:scale-[0.98] cursor-pointer'}
                        `}
                    >
                        {isAdding ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        )}
                        <span>
                            {isOutOfStock
                                ? 'Hết hàng'
                                : (isAdding ? 'Đang thêm...' : 'Thêm vào giỏ')}
                        </span>
                    </button>
                </div>
            </div>

            {/* Extra Info */}
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 border-t pt-4">
                <div className="flex items-center gap-2">
                    <RefreshCw size={18} className="text-blue-600" />
                    <span>Đổi trả trong 30 ngày</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-600" />
                    <span>Bảo hành chính hãng</span>
                </div>
            </div>
        </div>
    );
}
