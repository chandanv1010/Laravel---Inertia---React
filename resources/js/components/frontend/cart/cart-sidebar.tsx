import React, { useState, useEffect } from 'react';
import { Trash2, Gift, Ticket } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import CartItemRow from './cart-item-row';
import VoucherList from './voucher-list';

import GenericSlider from '../sliders/generic-slider';

interface CartSidebarProps {
    promoProducts?: any[];
}

export default function CartSidebar({ promoProducts = [] }: CartSidebarProps) {
    const { cart, cartItems, cartTotal, discountTotal, finalTotal, removeFromCart, addToCart, clearCart } = useCart();
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Check if all items are selected based on IDs match
    const isAllSelected = cartItems.length > 0 && cartItems.every(item =>
        selectedItems.some(id => String(id) === String(item.row_id))
    );

    // Sync selectedItems when cartItems change (remove invalid IDs, add default if empty?)
    useEffect(() => {
        if (cartItems.length === 0) {
            setSelectedItems([]);
            return;
        }

        // Optional: If you want to force "Select All" ONLY on initial load (empty selection), do this:
        // if (selectedItems.length === 0) {
        //     setSelectedItems(cartItems.map(item => item.row_id));
        // }
        // BUT current behavior "Auto select new items" implies:
        // Let's keep existing logic but just ensure validity?
        // Actually the user probably wants "Always Select All" when entering the cart.

        // Let's replicate strict logic:
        // If the list of IDs changes radically, maybe reset?
        // For now, let's just stick to "Select All on Load" behavior but implementing it more safely.
        // If we want to persist selection across quantity updates, we shouldn't reset.

        // Filter out selectedItems that are no longer in cart
        const currentIds = cartItems.map(i => i.row_id);
        const validSelections = selectedItems.filter(id => currentIds.includes(id));

        // If this was a refresh or initial load (or previous selection was empty?), maybe select all?
        // Let's stick to the previous simple UX: Select all if `cartItems` array changes length (added/removed).
        // But simply filtering is safer for quantity updates.

        if (validSelections.length !== selectedItems.length) {
            setSelectedItems(validSelections);
        }

        // If we have new items, should we auto-select them?
        // The original code:
        // if (cartItems.length > 0) setSelectedItems(all);

        // Let's just default to selecting ALL if the cart length changes, which matches original intent but might annoy if user carefully deselected.
        // Better: If unselected items are removed, keep valid selections. If new items added, maybe select them?
        // Simplify: Just default to "Select All" whenever cartItems changes length, as per original.
        if (cartItems.length > 0 && selectedItems.length === 0) {
            setSelectedItems(cartItems.map(item => item.row_id));
        }

    }, [cartItems.length]); // Depend on length like before, or maybe better on cartItems to catch ID changes.

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedItems([]);
        } else {
            setSelectedItems(cartItems.map(item => item.row_id));
        }
    };

    const handleSelect = (rowId: string) => {
        if (selectedItems.includes(rowId)) {
            setSelectedItems(selectedItems.filter(id => id !== rowId));
        } else {
            setSelectedItems([...selectedItems, rowId]);
        }
    };

    const handleDeleteSelected = async () => {
        if (confirm('Bạn có chắc muốn xóa các sản phẩm đã chọn?')) {
            if (isAllSelected) {
                await clearCart();
            } else {
                // Delete one by one
                for (const id of selectedItems) {
                    await removeFromCart(id);
                }
            }
            setSelectedItems([]);
        }
    };

    const handleAddPromoItem = async (product: any) => {
        try {
            await addToCart(product.id, product.variant_id || null, 1);
        } catch (error) {
            console.error("Failed to add promo item", error);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const renderPromoItem = (product: any) => (
        <div className="p-4 pr-12 flex gap-4 items-center bg-white h-full relative">
            <div className="w-20 h-24 bg-gray-100 rounded flex-shrink-0 overflow-hidden relative border border-gray-100">
                {(product.discount_percent > 0) && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                        -{product.discount_percent}%
                    </span>
                )}
                <img
                    src={product.image || product.image_url || '/images/placeholder.png'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image';
                        e.currentTarget.onerror = null;
                    }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold line-clamp-2 mb-1" title={product.name}>{product.name}</div>
                <div className="text-xs text-gray-500 italic mb-2">Đừng bỏ lỡ ưu đãi này!</div>
                <div className="text-red-600 font-bold text-base">
                    {formatPrice(product.promotion_price || product.price)}
                    {(product.original_price > (product.promotion_price || product.price)) && (
                        <span className="text-gray-400 line-through text-xs font-normal ml-1">
                            {formatPrice(product.original_price)}
                        </span>
                    )}
                </div>
            </div>
            <button
                onClick={() => handleAddPromoItem(product)}
                className="bg-black text-white text-xs px-3 py-2 rounded-full font-bold hover:bg-gray-800 transition-transform active:scale-95 whitespace-nowrap cursor-pointer z-10"
            >
                Lấy ngay
            </button>
        </div>
    );

    if (cartItems.length === 0) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="text-gray-400" size={32} />
                </div>
                <p className="text-gray-500 mb-4 text-lg">Giỏ hàng của bạn đang trống</p>
                <a href="/" className="inline-block bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors">
                    Tiếp tục mua sắm
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* 1. Main Cart Group (Header + Items) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className="relative flex items-center justify-center">
                                <input type="checkbox" className="peer sr-only"
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                />
                                <div className="w-5 h-5 border-2 border-blue-600 rounded bg-white flex items-center justify-center peer-checked:border-blue-600 transition-all shrink-0 leading-none">
                                    <div className={`w-3 h-3 bg-blue-600 rounded-[2px] transition-transform transform ${isAllSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}></div>
                                </div>
                            </div>
                            <span className="font-semibold text-gray-700 text-sm">Tất cả ({cartItems.length} sản phẩm)</span>
                        </label>
                    </div>

                    {selectedItems.length > 0 && (
                        <button onClick={handleDeleteSelected} className="text-red-500 text-sm font-medium flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                            <Trash2 size={16} />
                            Xóa đã chọn ({selectedItems.length})
                        </button>
                    )}
                </div>

                {/* Items List */}
                <div className="divide-y divide-gray-100">
                    {cartItems.map((item) => (
                        <CartItemRow
                            key={item.row_id}
                            item={item}
                            isSelected={selectedItems.includes(item.row_id)}
                            onSelect={handleSelect}
                            formatPrice={formatPrice}
                        />
                    ))}
                </div>
            </div>

            {/* 3. Order Summary & Vouchers */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Ticket size={18} className="text-blue-600" />
                    Mã giảm giá
                </h3>
                <VoucherList />

                {/* Applied Buy X Get Y Promotions (Free Gifts) */}
                {cartItems.some(item => item.is_gift) && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100 mt-4">
                        <div className="flex items-center gap-2 text-green-700 font-bold text-sm mb-2">
                            <Gift size={16} />
                            Quà tặng & Ưu đãi đã áp dụng
                        </div>
                        <ul className="space-y-1.5">
                            {cartItems.filter(item => item.is_gift).map((item, idx) => (
                                <li key={idx} className="text-xs text-green-600 flex justify-between items-center">
                                    <span>• {item.name} x{item.quantity}</span>
                                    <span className="font-bold">Miễn phí</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="border-t border-dashed pt-4 space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Tạm tính</span>
                        <span>{formatPrice(cartTotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Phí giao hàng</span>
                        <span>Miễn phí</span>
                    </div>
                    {discountTotal > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Giảm giá</span>
                            <span>-{formatPrice(discountTotal)}</span>
                        </div>
                    )}
                    <div className="border-t border-gray-100 pt-3 flex justify-between items-end">
                        <span className="font-bold text-gray-900 text-lg">Thành tiền</span>
                        <span className="font-bold text-2xl text-blue-600">
                            {formatPrice(finalTotal !== undefined ? finalTotal : cartTotal)}
                        </span>
                    </div>
                </div>

                <button className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-lg hover:bg-gray-800 transition-transform active:scale-[0.98] shadow-lg shadow-gray-200">
                    Thanh toán ngay
                </button>
            </div>

            {/* 4. Eligible Rewards (BXGY Discounted Offers) */}
            {cart.eligible_rewards && cart.eligible_rewards.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-orange-400 bg-white shadow-sm mt-2">
                    <div className="p-3 bg-orange-500 text-white text-sm font-bold flex items-center gap-2">
                        <Ticket size={18} className="fill-white/20" />
                        Ưu đãi dành riêng cho bạn
                    </div>

                    <div className="divide-y divide-gray-100">
                        {cart.eligible_rewards.map((reward: any, idx: number) => (
                            <div key={idx} className="p-4 flex gap-4 items-center bg-white h-full relative">
                                <div className="w-20 h-24 bg-gray-100 rounded flex-shrink-0 overflow-hidden relative border border-gray-100">
                                    {(reward.discount_type === 'percentage') && (
                                        <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                                            -{reward.discount_value}%
                                        </span>
                                    )}
                                    <img
                                        src={reward.image || '/images/placeholder.png'}
                                        alt={reward.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image';
                                            e.currentTarget.onerror = null;
                                        }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold line-clamp-2 mb-1" title={reward.name}>{reward.name}</div>
                                    <div className="text-xs text-orange-600 font-medium mb-2 italic">
                                        Đủ điều kiện nhận {reward.discount_type === 'free' ? 'quà tặng 0đ' : 'ưu đãi giảm giá'}!
                                    </div>
                                    <div className="text-red-600 font-bold text-base">
                                        {reward.discount_type === 'free' ? '0 đ' : formatPrice(reward.price - (reward.discount_type === 'fixed_amount' ? reward.discount_value : (reward.price * reward.discount_value / 100)))}
                                        <span className="text-gray-400 line-through text-xs font-normal ml-1">
                                            {formatPrice(reward.price)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAddPromoItem(reward)}
                                    className="bg-orange-500 text-white text-xs px-3 py-2 rounded-full font-bold hover:bg-orange-600 transition-transform active:scale-95 whitespace-nowrap cursor-pointer z-10"
                                >
                                    Thêm ngay
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
