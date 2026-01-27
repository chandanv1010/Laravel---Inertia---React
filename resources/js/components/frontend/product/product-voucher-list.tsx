import React, { useState } from 'react';

interface Voucher {
    code: string;
    discount_value: number;      // Giá trị giảm (VND)
    remaining_uses?: number;     // Số lượt còn lại
    min_order_value?: number;    // Đơn tối thiểu
    description?: string;
    color?: string;
}

interface VoucherListProps {
    vouchers: Voucher[];
}

export default function VoucherList({ vouchers }: VoucherListProps) {
    const [hoveredVoucher, setHoveredVoucher] = useState<string | null>(null);

    if (!vouchers || vouchers.length === 0) {
        return null;
    }

    // Format discount value: 100000 -> "100K"
    const formatDiscount = (value: number): string => {
        if (value >= 1000) {
            return Math.floor(value / 1000) + 'K';
        }
        return value.toString();
    };

    // Format price for tooltip
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };

    return (
        <div className="mb-4">
            <div className="flex items-start gap-3">
                {/* Label */}
                <span className="text-sm text-gray-700 font-medium whitespace-nowrap pt-1.5">
                    Mã giảm giá
                </span>

                {/* Voucher Badges */}
                <div className="flex flex-wrap gap-2">
                    {vouchers.map((voucher) => (
                        <div
                            key={voucher.code}
                            className="relative"
                            onMouseEnter={() => setHoveredVoucher(voucher.code)}
                            onMouseLeave={() => setHoveredVoucher(null)}
                        >
                            {/* Voucher Badge with SVG Background */}
                            <span
                                className="inline-flex items-center px-3 py-1.5 rounded text-orange-600 text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                    backgroundImage: 'url(/images/icon-voucher-secondary.svg)',
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center'
                                }}
                            >
                                Giảm {formatDiscount(voucher.discount_value)}
                            </span>

                            {/* Tooltip */}
                            {hoveredVoucher === voucher.code && (
                                <div className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 min-w-[280px]">
                                    {/* Voucher Code */}
                                    <div className="font-semibold text-gray-900 mb-2">
                                        Nhập {voucher.code}
                                        {voucher.remaining_uses !== undefined && (
                                            <span className="text-sm font-normal text-gray-600">
                                                {' '}(còn {voucher.remaining_uses} lượt)
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="text-sm text-gray-700 mb-2">
                                        {voucher.description ||
                                            `Giảm ${formatPrice(voucher.discount_value)} cho đơn từ ${formatPrice(voucher.min_order_value || 0)}`}
                                    </div>

                                    {/* Color (if provided) */}
                                    {voucher.color && (
                                        <div className="text-sm text-gray-600">
                                            Màu sắc: {voucher.color}
                                        </div>
                                    )}

                                    {/* Arrow pointing up */}
                                    <div className="absolute -top-2 left-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Policy note */}
            <div className="mt-3 text-xs italic text-gray-500">
                Không áp dụng chính sách đổi trả
            </div>
        </div>
    );
}
