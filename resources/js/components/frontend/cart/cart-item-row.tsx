import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
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

    // Sync from prop to local when prop changes (e.g. from server update or initial load)
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
        const newQty = localQuantity + delta;
        if (newQty < 1) return;
        setLocalQuantity(newQty);
        setIsUpdating(true);
        debouncedUpdate(item.row_id, newQty, () => setIsUpdating(false));
    };

    const handleManualQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow empty string for better typing experience
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
        <div className="p-4 flex gap-4 group hover:bg-gray-50 transition-colors items-center">
            {/* Checkbox */}
            <div className="flex-shrink-0">
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
            </div>

            {/* Content Grid */}
            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                {/* Left: Info & Delete */}
                <div className="col-span-5 flex flex-col justify-between h-full py-1">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{item.name}</h3>
                        <div className="text-xs text-gray-500 mb-2">
                            {item.options && Object.keys(item.options).length > 0 ? (
                                Object.entries(item.options).map(([key, value]) => (
                                    <span key={key} className="mr-2">{key}: {value as string}</span>
                                ))
                            ) : (
                                <span>{item.name.includes(' - ') ? item.name.split(' - ').slice(1).join(' - ') : 'Tiêu chuẩn'}</span>
                            )}
                        </div>
                    </div>

                    {/* Delete Button */}
                    <button
                        onClick={() => removeFromCart(item.row_id)}
                        className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors w-fit pt-2 cursor-pointer"
                    >
                        <Trash2 size={14} /> Xóa
                    </button>
                </div>

                {/* Center: Quantity */}
                <div className="col-span-4 flex justify-center">
                    <div className="flex items-center border border-gray-300 rounded-full h-9 w-28 bg-white">
                        <button
                            onClick={() => handleQuantityChange(-1)}
                            className="w-9 h-full flex items-center justify-center hover:bg-gray-100 rounded-l-full transition-colors font-medium text-lg"
                        >-</button>
                        <input
                            type="number"
                            min="1"
                            value={localQuantity}
                            onChange={handleManualQuantityChange}
                            onBlur={handleBlur}
                            className="flex-1 w-full text-center text-sm font-bold border-none focus:ring-0 p-0 appearance-none bg-transparent outline-none"
                        />
                        <button
                            onClick={() => handleQuantityChange(1)}
                            className="w-9 h-full flex items-center justify-center hover:bg-gray-100 rounded-r-full transition-colors font-medium text-lg"
                        >+</button>
                    </div>
                </div>

                {/* Right: Price */}
                <div className="col-span-3 text-right relative">
                    {isUpdating && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-end pr-4 z-10">
                            <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                        </div>
                    )}
                    <div className="font-bold text-gray-900 text-base">
                        {formatPrice(item.price * (typeof localQuantity === 'number' ? localQuantity : item.quantity))}
                    </div>

                    {item.quantity > 1 && (
                        <div className="text-[11px] text-gray-500 mt-0.5">
                            ({formatPrice(item.price)}/sp)
                        </div>
                    )}

                    {(item.original_price ?? 0) > item.price && (
                        <div className="text-xs text-gray-400 line-through mt-1">
                            {formatPrice((item.original_price ?? 0) * (typeof localQuantity === 'number' ? localQuantity : item.quantity))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
