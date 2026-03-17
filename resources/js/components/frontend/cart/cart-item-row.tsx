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
    }, [item.quantity]);

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

    return (
        <div className={`p-4 flex gap-4 group transition-colors items-center ${item.is_gift ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}>
            {/* Checkbox */}
            <div className="flex-shrink-0">
                {!item.is_gift && (
                    <label className="relative flex items-center justify-center cursor-pointer p-1">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={isSelected}
                            onChange={() => onSelect(item.row_id)}
                        />
                        <div className="w-[20px] h-[20px] border-2 border-blue-600 rounded-[4px] bg-white flex items-center justify-center peer-checked:border-blue-600 transition-all shrink-0 leading-none">
                            <div className={`w-3 h-3 bg-blue-600 rounded-[2px] transition-transform transform ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}></div>
                        </div>
                    </label>
                )}
                {item.is_gift && (
                    <div className="w-[20px] h-[20px] flex items-center justify-center text-green-600">
                        <Gift size={18} />
                    </div>
                )}
            </div>

            {/* Image */}
            <div className="w-24 h-32 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden border border-gray-200 relative">
                <img
                    src={item.image || '/images/placeholder.png'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image';
                        e.currentTarget.onerror = null;
                    }}
                />
                {item.is_gift && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md shadow-sm">
                        GIFT
                    </div>
                )}
            </div>

            {/* Content Grid */}
            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                {/* Left: Info & Delete */}
                <div className="col-span-5 flex flex-col justify-between h-full py-1">
                    <div>
                        <h3 className={`font-bold text-sm line-clamp-2 mb-1 ${item.is_gift ? 'text-green-800' : 'text-gray-900'}`}>
                            {item.name}
                        </h3>
                        <div className="text-xs text-gray-500 mb-2">
                            {item.options && Object.keys(item.options).length > 0 ? (
                                Object.entries(item.options).map(([key, value]) => (
                                    <span key={key} className="mr-2">{key}: {value as string}</span>
                                ))
                            ) : (
                                <span>{item.name.includes(' - ') ? item.name.split(' - ').slice(1).join(' - ') : 'Tiêu chuẩn'}</span>
                            )}
                        </div>

                        {/* Product Promotions - BXGY Labels */}
                        {item.product_promotions && item.product_promotions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {item.product_promotions.map((promo: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-medium border border-blue-100">
                                        <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center text-[8px] text-white">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        {promo.name}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {item.is_gift && (
                            <div className="mt-2 inline-flex items-center gap-1 text-green-600 font-bold text-[11px] uppercase tracking-wider">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Quà tặng kèm theo
                            </div>
                        )}
                    </div>

                    {/* Delete Button */}
                    {!item.is_gift && (
                        <button
                            onClick={() => removeFromCart(item.row_id)}
                            className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors w-fit pt-2 cursor-pointer"
                        >
                            <Trash2 size={14} /> Xóa
                        </button>
                    )}
                </div>

                {/* Center: Quantity */}
                <div className="col-span-4 flex justify-center">
                    {item.is_gift ? (
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
                    <div className={`font-bold text-base ${item.is_gift ? 'text-green-600' : 'text-gray-900'}`}>
                        {item.is_gift ? 'Miễn phí' : formatPrice(item.price * (typeof localQuantity === 'number' ? localQuantity : item.quantity))}
                    </div>

                    {!item.is_gift && item.quantity > 1 && (
                        <div className="text-[11px] text-gray-500 mt-0.5">
                            ({formatPrice(item.price)}/sp)
                        </div>
                    )}

                    {((item.original_price ?? 0) > item.price || item.is_gift) && (
                        <div className="text-xs text-gray-400 line-through mt-1">
                            {formatPrice((item.original_price || item.price) * (typeof localQuantity === 'number' ? localQuantity : item.quantity))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

