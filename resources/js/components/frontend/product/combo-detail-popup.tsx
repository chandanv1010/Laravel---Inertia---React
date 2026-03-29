import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Package, CheckCircle2 } from 'lucide-react';

interface ComboProduct {
    id: number;
    variant_id: number | null;
    name: string;
    image: string;
    retail_price: number;
    sku: string;
}

interface Combo {
    id: number;
    name: string;
    description?: string;
    combo_price: number;
    image?: string;
    combo_products: ComboProduct[];
}

interface ComboDetailPopupProps {
    isOpen: boolean;
    onClose: () => void;
    combo: Combo | null;
    onAddToCart: (combo: Combo) => void;
}

const ComboDetailPopup: React.FC<ComboDetailPopupProps> = ({ isOpen, onClose, combo, onAddToCart }) => {
    if (!combo) return null;

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-0 text-left align-middle shadow-2xl transition-all">
                                {/* Header */}
                                <div className="relative p-6 border-b bg-gradient-to-r from-gray-50 to-white">
                                    <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 pr-8">
                                        Chi tiết gói Combo: <span className="text-primary">{combo.name}</span>
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={20} />
                                    </button>
                                    {combo.description && (
                                        <p className="mt-2 text-sm text-gray-500 italic">
                                            {combo.description}
                                        </p>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        <Package size={16} className="text-primary" />
                                        Danh sách sản phẩm trong combo
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {combo.combo_products.map((item, index) => (
                                            <div 
                                                key={`${item.id}-${item.variant_id}-${index}`}
                                                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-primary/5 transition-all group"
                                            >
                                                <div className="w-20 h-20 flex-shrink-0 bg-white border rounded-lg overflow-hidden relative">
                                                    <img 
                                                        src={item.image} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                                                    />
                                                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl">
                                                        x1
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                                                        {item.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-tighter">SKU: {item.sku}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-gray-400">giá lẻ:</span>
                                                            <span className="text-sm font-bold text-gray-700">
                                                                {formatPrice(item.retail_price)}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                                            Sẵn hàng
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="hidden sm:block">
                                                    <CheckCircle2 size={24} className="text-gray-100 group-hover:text-primary/20 transition-colors" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-center sm:text-left">
                                        <span className="block text-sm text-gray-500 font-medium">Giá trọn bộ Combo:</span>
                                        <span className="text-2xl font-black text-red-600">
                                            {formatPrice(combo.combo_price)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            onAddToCart(combo);
                                            onClose();
                                        }}
                                        className="w-full sm:w-auto px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark hover:-translate-y-0.5 transition-all active:scale-95"
                                    >
                                        Thêm combo vào giỏ hàng
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ComboDetailPopup;
