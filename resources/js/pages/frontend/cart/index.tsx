import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import FrontendLayout from '@/layouts/frontend-layout';
import ShippingInfoSection from '@/components/frontend/cart/shipping-info-section';
import PaymentMethodSection from '@/components/frontend/cart/payment-method-section';
import CartSidebar from '@/components/frontend/cart/cart-sidebar';
import { ChevronLeft } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';

export default function CheckoutPage({ promoProducts = [] }: { promoProducts?: any[] }) {
    const { finalTotal, voucherCode } = useCart();
    const [paymentMethod, setPaymentMethod] = useState('cod');
    const [onlineMethod, setOnlineMethod] = useState('');

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const getPaymentMethodLabel = () => {
        switch (paymentMethod) {
            case 'cod': return 'Thanh toán khi nhận hàng (COD)';
            case 'bank_transfer': return 'Chuyển khoản ngân hàng';
            case 'online': return onlineMethod ? `Thanh toán Online (${onlineMethod})` : 'Thanh toán Online';
            default: return 'Chưa chọn';
        }
    };

    return (
        <FrontendLayout
            title="Thanh toán - Giỏ hàng"
            seo={{ meta_robots: 'noindex' }}
        >
            <div className="bg-gray-50 min-h-screen pb-24 md:pb-12 pt-8">
                <div className="max-w-[1400px] mx-auto px-4">

                    {/* Header Simple */}
                    <div className="flex items-center gap-2 mb-8 text-gray-500 hover:text-primary transition-colors w-fit">
                        <Link href="/" className="flex items-center gap-1">
                            <ChevronLeft size={20} />
                            <span>Tiếp tục mua sắm</span>
                        </Link>
                    </div>

                    <h1 className="text-2xl font-bold mb-8 text-gray-900">Giỏ hàng & Thanh toán</h1>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                        {/* LEFT COLUMN: 50% */}
                        <div>
                            <ShippingInfoSection />
                            <PaymentMethodSection
                                selectedMethod={paymentMethod}
                                onMethodChange={setPaymentMethod}
                                selectedOnlineMethod={onlineMethod}
                                onOnlineMethodChange={setOnlineMethod}
                            />

                            {/* Policy Text (Footer Col Left) */}
                            <div className="text-center md:text-left text-sm text-gray-500 mt-8 mb-8">
                                Nếu bạn không hài lòng với sản phẩm của chúng tôi? Bạn hoàn toàn có thể trả lại sản phẩm. <br className="hidden md:block" />
                                <Link href="/doi-tra" className="text-blue-600 font-medium hover:underline">Tìm hiểu thêm tại đây</Link>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: 50% - Sticky */}
                        <div className="lg:sticky lg:top-8">
                            <CartSidebar promoProducts={promoProducts} />
                        </div>
                    </div>
                </div>

                {/* Sticky Bottom Bar (Mostly for Mobile or Emphasis) */}
                <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg p-4 z-50 md:hidden">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">Thành tiền:</span>
                        <span className="text-xl font-bold text-red-600">{formatPrice(finalTotal || 0)}</span>
                    </div>
                    <button className="w-full bg-black text-white py-3 rounded-xl font-bold text-lg hover:bg-gray-800 uppercase tracking-wide">
                        ĐẶT HÀNG
                    </button>
                </div>

                {/* Desktop Sticky Bottom Bar */}
                <div className="hidden md:block fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40">
                    <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            {/* Payment Method Preview */}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded">
                                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div className="text-sm">
                                    <div className="text-gray-500">Phương thức thanh toán</div>
                                    <div className="font-medium text-gray-900">{getPaymentMethodLabel()}</div>
                                </div>
                            </div>

                            <div className="hidden lg:block w-px h-10 bg-gray-200"></div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded">
                                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                    </svg>
                                </div>
                                <div className="text-sm">
                                    <div className="text-gray-500">Voucher</div>
                                    <div className="font-medium text-gray-900">{voucherCode || 'Chưa áp dụng'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Tổng thanh toán</div>
                                <div className="text-2xl font-bold text-primary">{formatPrice(finalTotal || 0)}</div>
                            </div>
                            <button className="bg-black text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-800 uppercase tracking-wide hover:shadow-lg transition-transform active:scale-95">
                                ĐẶT HÀNG
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </FrontendLayout>
    );
}
