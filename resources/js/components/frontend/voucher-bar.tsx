import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Gift, Copy, Check } from 'lucide-react';

interface VoucherBarProps {
    voucher?: {
        id: number;
        code: string;
        name: string;
        discount_text: string;
        discount_type: string;
        discount_value: number;
        description?: string;
    } | null;
}

/**
 * Thanh hiển thị voucher khuyến mãi
 * Hiển thị trên trang chủ với nền xanh dương nhạt
 */
export default function VoucherBar({ voucher: propVoucher }: VoucherBarProps) {
    const { widgets } = usePage<any>().props;
    const voucher = propVoucher || widgets?.activeVoucher;
    const [copied, setCopied] = useState(false);

    if (!voucher) {
        return null;
    }

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(voucher.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Không thể copy mã:', err);
        }
    };

    return (
        <section className="py-4 bg-gradient-to-r from-cyan-50 to-teal-50 border-y border-cyan-100">
            <div className="container mx-auto px-4">
                <div className="flex flex-wrap items-center justify-center gap-4 text-center">
                    {/* Icon và text chính */}
                    <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-teal-600" />
                        <span className="text-sm md:text-base text-gray-700">
                            Giảm giá đặc biệt cho <span className="font-semibold text-teal-700">đơn hàng đầu tiên</span>
                        </span>
                    </div>

                    {/* Nút copy mã */}
                    <button
                        onClick={handleCopyCode}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold text-sm rounded-full hover:bg-teal-700 transition-colors"
                    >
                        <span>{voucher.code}</span>
                        {copied ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </button>

                    {/* Mô tả giảm giá */}
                    <span className="text-sm text-gray-600">
                        Sử dụng mã để được giảm <span className="font-semibold text-teal-700">{voucher.discount_text}</span> cho đơn hàng
                    </span>
                </div>
            </div>
        </section>
    );
}
