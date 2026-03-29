import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Minus, Plus, Gift } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import _ from 'lodash';

interface CartItemProps {
    item: any;
    isSelected: boolean;
    onSelect: (rowId: string) => void;
    formatPrice: (price: number) => string;
}

export default function CartItemRow({ item, isSelected, onSelect, formatPrice }: CartItemProps) {
    const { removeFromCart, updateQuantity } = useCart();
    const [localQuantity, setLocalQuantity] = useState(item.quantity);
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync from prop to local when prop changes
    useEffect(() => {
        setLocalQuantity(item.quantity);
        setIsUpdating(false); 
    }, [item.quantity, item.row_id, item.updated_at]); 

    // Debounced API call
    const debouncedUpdate = useCallback(
        _.debounce(async (rowId: string, qty: number, callback?: () => void) => {
            if (qty > 0) {
                await updateQuantity(rowId, qty);
                if (callback) callback();
            }
        }, 500),
        []
    );

    const handleQuantityChange = (delta: number) => {
        if (item.is_gift) return; // Cannot change gift quantity
        const newQty = localQuantity + delta;
        if (newQty < 1) return;
        setLocalQuantity(newQty);
        setIsUpdating(true);
        debouncedUpdate(item.row_id, newQty, () => setIsUpdating(false));
    };

    const handleManualQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (item.is_gift) return;
        const val = e.target.value;
        if (val === '') {
            // @ts-ignore
            setLocalQuantity('');
            return;
        }

        const numVal = parseInt(val);
        if (!isNaN(numVal) && numVal >= 1) {
            setLocalQuantity(numVal);
            setIsUpdating(true);
            debouncedUpdate(item.row_id, numVal, () => setIsUpdating(false));
        }
    };

    const handleBlur = () => {
        if (localQuantity === '' || localQuantity < 1) {
            setLocalQuantity(item.quantity);
        }
    };

    const isCombo = item.is_combo_group || item.is_combo_item;
    const isGift = item.is_gift;

    const handleDelete = async () => {
        if (item.is_combo_group) {
            if (confirm('Bạn có chắc muốn xóa combo này?')) {
                for (const rowId of item.child_row_ids) {
                    await removeFromCart(rowId);
                }
            }
        } else {
            await removeFromCart(item.row_id);
        }
    };

    return (
        <div className={`p-4 flex gap-4 group transition-colors items-center ${
            isGift ? 'bg-green-50/30' : 
            isCombo ? 'bg-blue-50/30' :
            item.promo_id ? 'bg-orange-50/30' :
            'hover:bg-gray-50'
        }`}>
            {/* Checkbox */}
            <div className="flex-shrink-0">
                {!isGift && (
                    <label className="relative flex items-center justify-center cursor-pointer p-1">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={isSelected}
                            onChange={() => onSelect(item.row_id)}
                        />
                        <div className={`w-[20px] h-[20px] border-2 rounded-[4px] bg-white flex items-center justify-center transition-all shrink-0 leading-none ${
                            isCombo ? 'border-blue-500 peer-checked:border-blue-600' :
                            item.promo_id ? 'border-orange-500 peer-checked:border-orange-600' : 
                            'border-blue-600 peer-checked:border-blue-600'
                        }`}>
                            <div className={`w-3 h-3 rounded-[2px] transition-transform transform ${
                                isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                            } ${isCombo ? 'bg-blue-600' : item.promo_id ? 'bg-orange-600' : 'bg-blue-600'}`}></div>
                        </div>
                    </label>
                )}
                {isGift && (
                    <div className="w-[20px] h-[20px] flex items-center justify-center text-green-600">
                        <Gift size={18} />
                    </div>
                )}
            </div>

            {/* Image */}
            <div className={`w-24 h-32 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden border relative ${
                isGift ? 'border-green-200' : 
                isCombo ? 'border-blue-200' : 
                item.promo_id ? 'border-orange-200' : 
                'border-gray-200'
            }`}>
                <img
                    src={item.image || '/images/placeholder.png'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image';
                        e.currentTarget.onerror = null;
                    }}
                />
                {isGift && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md shadow-sm uppercase">
                        Gift
                    </div>
                )}
                {isCombo && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md shadow-sm uppercase">
                        Combo
                    </div>
                )}
                {item.promo_id && !isGift && !isCombo && (
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md shadow-sm uppercase">
                        Ưu đãi
                    </div>
                )}
            </div>

            {/* Content Grid */}
            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                {/* Left: Info & Delete */}
                <div className="col-span-5 flex flex-col justify-between h-full py-1">
                    <div>
                        <h3 className={`font-bold text-sm line-clamp-2 mb-1 ${
                            isGift ? 'text-green-800' : 
                            isCombo ? 'text-blue-800' :
                            item.promo_id ? 'text-orange-800' :
                            'text-gray-900'
                        }`}>
                            {item.name}
                        </h3>
                        <div className="text-xs text-gray-500 mb-2">
                            {isCombo ? (
                                <span>Gói sản phẩm tiết kiệm</span>
                            ) : (
                                item.options && Object.keys(item.options).length > 0 ? (
                                    Object.entries(item.options).map(([key, value]) => (
                                        <span key={key} className="mr-2">{key}: {value as string}</span>
                                    ))
                                ) : (
                                    <span>{item.name.includes(' - ') ? item.name.split(' - ').slice(1).join(' - ') : 'Tiêu chuẩn'}</span>
                                )
                            )}
                        </div>

                        {/* Product Promotions - BXGY Labels */}
                        {item.product_promotions && item.product_promotions.length > 0 && !isCombo && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {item.product_promotions.map((promo: any, idx: number) => {
                                    const isBXGY = promo.type === 'buy_x_get_y';
                                    return (
                                        <div key={idx} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                                            isBXGY && item.promo_id ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                            <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] text-white ${
                                                isBXGY && item.promo_id ? 'bg-orange-600' : 'bg-blue-600'
                                            }`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </div>
                                            {promo.name}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {isGift && (
                            <div className="mt-2 inline-flex items-center gap-1 text-green-600 font-bold text-[11px] uppercase tracking-wider">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Quà tặng kèm theo
                            </div>
                        )}

                        {isCombo && (
                            <div className="mt-2 inline-flex items-center gap-1 text-blue-600 font-bold text-[11px] uppercase tracking-wider">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                Combo
                            </div>
                        )}

                        {item.promo_id && !isGift && !isCombo && (
                            <div className="mt-2 inline-flex items-center gap-1 text-orange-600 font-bold text-[11px] uppercase tracking-wider">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                Sản phẩm ưu đãi mua kèm
                            </div>
                        )}
                    </div>

                    {/* Delete Button */}
                    {!isGift && (
                        <button
                            onClick={handleDelete}
                            className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors w-fit pt-2 cursor-pointer"
                        >
                            <Trash2 size={14} /> Xóa
                        </button>
                    )}
                </div>

                {/* Center: Quantity */}
                <div className="col-span-4 flex justify-center">
                    {isGift ? (
                        <div className="text-sm font-bold text-gray-600 bg-gray-100 px-4 py-1.5 rounded-full border border-gray-200">
                            x{item.quantity}
                        </div>
                    ) : (
                        <div className="flex items-center border border-gray-300 rounded-full h-9 w-28 bg-white relative">
                            {isUpdating && (
                                <div className="absolute -top-6 left-0 right-0 text-center">
                                    <div className="inline-block animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                </div>
                            )}
                            <button
                                onClick={() => handleQuantityChange(-1)}
                                className="w-9 h-full flex items-center justify-center hover:bg-gray-100 rounded-l-full transition-colors font-medium text-lg"
                                disabled={isUpdating}
                            >-</button>
                            <input
                                type="number"
                                min="1"
                                value={localQuantity}
                                onChange={handleManualQuantityChange}
                                onBlur={handleBlur}
                                className="flex-1 w-full text-center text-sm font-bold border-none focus:ring-0 p-0 appearance-none bg-transparent outline-none"
                                disabled={isUpdating}
                            />
                            <button
                                onClick={() => handleQuantityChange(1)}
                                className="w-9 h-full flex items-center justify-center hover:bg-gray-100 rounded-r-full transition-colors font-medium text-lg"
                                disabled={isUpdating}
                            >+</button>
                        </div>
                    )}
                </div>

                {/* Right: Price */}
                <div className="col-span-3 text-right">
                    <div className={`font-bold text-base ${
                        isGift ? 'text-green-600' : 
                        isCombo ? 'text-blue-600' :
                        item.promo_id ? 'text-orange-600' :
                        'text-gray-900'
                    }`}>
                        {isGift ? 'Miễn phí' : formatPrice(item.is_combo_group ? item.total_price : (item.price * (typeof localQuantity === 'number' ? localQuantity : item.quantity)))}
                    </div>

                    {!isGift && !item.is_combo_group && (typeof localQuantity === 'number' ? localQuantity : item.quantity) > 1 && (
                        <div className="text-[11px] text-gray-500 mt-0.5">
                            ({formatPrice(item.price)}/sp)
                        </div>
                    )}

                    {!item.is_combo_group && ((item.original_price ?? 0) > item.price || isGift) && (
                        <div className="text-xs text-gray-400 line-through mt-1">
                            {formatPrice((item.original_price || item.price) * (typeof localQuantity === 'number' ? localQuantity : item.quantity))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

