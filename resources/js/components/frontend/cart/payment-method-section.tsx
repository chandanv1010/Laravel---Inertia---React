import React, { useState } from 'react';
import { CreditCard, Wallet, Banknote, Truck } from 'lucide-react';

interface PaymentMethodSectionProps {
    selectedMethod: string;
    onMethodChange: (method: string) => void;
    selectedOnlineMethod?: string;
    onOnlineMethodChange?: (method: string) => void;
}

export default function PaymentMethodSection({
    selectedMethod = 'cod',
    onMethodChange,
    selectedOnlineMethod = '',
    onOnlineMethodChange
}: PaymentMethodSectionProps) {
    // We lift state up, so no local state ideally, but we can default if not provided (though props are better)


    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h2 className="text-xl font-bold mb-6">Hình thức thanh toán</h2>

            <div className="space-y-4">

                {/* 1. Online Payment (ZaloPay, ShopeePay, Cards...) - Redesigned */}
                <div
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedMethod === 'online' ? 'border-blue-600 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => onMethodChange && onMethodChange('online')}
                >
                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center">
                            <input
                                type="radio"
                                name="payment_method"
                                value="online"
                                checked={selectedMethod === 'online'}
                                onChange={() => onMethodChange && onMethodChange('online')}
                                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-600"
                            />
                        </div>
                        {/* Logo/Icon Area */}
                        <div className="flex-shrink-0 w-12 h-12 bg-white rounded border border-gray-100 flex items-center justify-center">
                            <img src="/images/icon-payment-online.png" className="w-8 h-8 object-contain" alt="Online" />
                        </div>

                        <div className="flex-1">
                            <div className="font-bold text-gray-900 text-base">Thanh toán Online</div>
                            <div className="text-sm text-gray-500 mt-0.5">Hỗ trợ mọi hình thức thanh toán</div>

                            {/* Card Icons Row */}
                            <div className="flex gap-2 mt-2">
                                <img src="/images/icon-visa.png" className="h-4 object-contain" alt="Visa" />
                                <img src="/images/icon-mastercard.png" className="h-4 object-contain" alt="Mastercard" />
                                <span className="text-[10px] font-bold text-green-600 px-1 border border-green-200 rounded">Napas</span>
                            </div>
                        </div>
                    </div>

                    {/* Sub options - If Active */}
                    {selectedMethod === 'online' && (
                        <div className="mt-4 pl-16 grid grid-cols-1 gap-3 animate-fade-in-down">
                            <div className="text-sm text-gray-500 italic mb-1">Chọn cổng thanh toán:</div>
                            <div className="flex flex-wrap gap-3">
                                {['VNPAY', 'SEAPAY', 'PAYPAL'].map((gateway) => (
                                    <button
                                        key={gateway}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOnlineMethodChange && onOnlineMethodChange(gateway);
                                        }}
                                        className={`
                                            px-4 py-2 rounded-lg border text-sm font-bold transition-all flex items-center gap-2
                                            ${selectedOnlineMethod === gateway ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                                        `}
                                    >
                                        {gateway}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Apple Pay Removed as requested */}


                {/* 3. Bank Transfer */}
                <div
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedMethod === 'bank_transfer' ? 'border-blue-600 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => onMethodChange && onMethodChange('bank_transfer')}
                >
                    <div className="flex items-center gap-4">
                        <input
                            type="radio"
                            name="payment_method"
                            value="bank_transfer"
                            checked={selectedMethod === 'bank_transfer'}
                            onChange={() => onMethodChange && onMethodChange('bank_transfer')}
                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-600"
                        />
                        <div className="flex-shrink-0 w-12 h-12 bg-white rounded border border-gray-100 flex items-center justify-center">
                            <Banknote className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 text-base">Chuyển khoản ngân hàng</div>
                        </div>
                    </div>

                    {selectedMethod === 'bank_transfer' && (
                        <div className="mt-4 pl-0 md:pl-16">
                            <div className="p-4 bg-white rounded border border-gray-200 shadow-sm text-sm">
                                <p className="font-bold text-gray-800 mb-3 border-b pb-2">THÔNG TIN CHUYỂN KHOẢN</p>
                                <div className="space-y-2 text-gray-700">
                                    <div className="flex justify-between">
                                        <span>Ngân hàng:</span>
                                        <span className="font-bold">MB Bank (Quân Đội)</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                        <span>Số tài khoản:</span>
                                        <span className="font-mono font-bold text-blue-600 text-lg tracking-wider">9999 8888 6666</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Chủ tài khoản:</span>
                                        <span className="font-bold uppercase">NGUYEN VAN A</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-yellow-50 p-2 rounded border border-yellow-100">
                                        <span>Nội dung CK:</span>
                                        <span className="font-bold text-red-600">SDT_HOTEN</span>
                                    </div>
                                </div>
                                <div className="mt-3 text-xs text-gray-500 italic">
                                    * Lưu ý: Đơn hàng sẽ được xử lý sau khi kế toán xác nhận thanh toán.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. COD */}
                <div
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedMethod === 'cod' ? 'border-blue-600 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => onMethodChange && onMethodChange('cod')}
                >
                    <div className="flex items-center gap-4">
                        <input
                            type="radio"
                            name="payment_method"
                            value="cod"
                            checked={selectedMethod === 'cod'}
                            onChange={() => onMethodChange && onMethodChange('cod')}
                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-600"
                        />
                        <div className="flex-shrink-0 w-12 h-12 bg-white rounded border border-gray-100 flex items-center justify-center">
                            <Truck className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 text-base">Thanh toán khi nhận hàng (COD)</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}
