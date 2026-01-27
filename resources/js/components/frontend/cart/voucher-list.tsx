import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Ticket, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface Voucher {
    code: string;
    name: string;
    description: string;
    condition_text?: string;
    is_eligible: boolean;
    ineligible_reason: string;
    discount_amount: number;
    discount_type: string;
    min_order_value: number;
    end_date?: string;
}

export default function VoucherList() {
    const { cartTotal, cartItems, applyVoucher } = useCart();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchVouchers = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/cart/vouchers');
                if (response.data.status === 'success') {
                    setVouchers(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch vouchers', error);
            } finally {
                setLoading(false);
            }
        };

        if (cartItems.length > 0) {
            fetchVouchers();
        } else {
            setVouchers([]);
        }
    }, [cartTotal, cartItems.length]);

    const handleApply = (code: string) => {
        setInputCode(code);
        handleApplyVoucher(code);
    };

    const handleApplyVoucher = async (codeToApply: string = inputCode) => {
        if (!codeToApply) return;

        setApplying(true);
        setMessage(null);
        try {
            await applyVoucher(codeToApply);
            setMessage({ type: 'success', text: 'Áp dụng mã giảm giá thành công!' });
            // Optionally refresh vouchers to update eligibility status? 
            // The context refreshCart might handle totals, but local vouchers state might need update if it depends on new total.
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Không thể áp dụng mã giảm giá';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setApplying(false);
        }
    };

    const formatDiscount = (amount: number, type: string) => {
        if (type === 'percentage') {
            return `Giảm ${amount}%`;
        }
        if (type === 'free') {
            return 'Tặng quà';
        }
        return `Giảm ${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
    };

    return (
        <div className="space-y-3">
            {/* Voucher List Content */}
            <div className="mb-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-1 -mr-2 space-y-3">
                {loading && <div className="text-center text-xs text-gray-400 py-4">Đang tải mã ưu đãi...</div>}

                {!loading && vouchers.length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-4">Chưa có mã ưu đãi nào.</div>
                )}

                {!loading && vouchers.map((voucher) => (
                    <div
                        key={voucher.code}
                        className={`
                                relative border rounded-lg p-0 overflow-hidden flex transition-all
                                ${voucher.is_eligible
                                ? 'bg-white border-blue-100 hover:border-blue-300 group'
                                : 'bg-gray-50 border-gray-200 opacity-80'
                            }
                            `}
                        style={{ minWidth: '320px' }}
                    >
                        {/* Left: Code Section */}
                        <div
                            className={`
                                    w-36 flex flex-col items-center justify-center border-r border-dashed p-3 text-center flex-shrink-0
                                    ${voucher.is_eligible ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-300'}
                                    cursor-pointer
                                `}
                            onClick={() => voucher.is_eligible && handleApply(voucher.code)}
                        >
                            <span className={`text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${voucher.is_eligible ? 'text-blue-700' : 'text-gray-500'}`} title={voucher.code}>
                                {voucher.code}
                            </span>
                            <span className="text-[10px] text-gray-500 mt-1 font-medium whitespace-nowrap">
                                {formatDiscount(voucher.discount_amount, voucher.discount_type)}
                            </span>
                        </div>

                        {/* Middle: Info */}
                        <div className="flex-1 p-3 flex flex-col justify-center relative min-h-[90px]">
                            {/* Cutouts */}
                            <div className="absolute -left-1.5 top-1/2 -mt-1.5 w-3 h-3 bg-white rounded-full border border-inherit border-r-0 border-b-0 -rotate-45"></div>
                            <div className="absolute -right-1.5 top-1/2 -mt-1.5 w-3 h-3 bg-white rounded-full border border-inherit border-l-0 border-t-0 -rotate-45"></div>

                            <div className={`text-sm font-medium ${voucher.is_eligible ? 'text-gray-800' : 'text-gray-500'} line-clamp-2`}>
                                {voucher.description || voucher.name}
                            </div>

                            <div className="flex items-center justify-between mt-2">
                                {voucher.end_date && (
                                    <div className="text-[10px] text-gray-400">
                                        HSD: {voucher.end_date}
                                    </div>
                                )}

                                {/* Condition / Details Link */}
                                {voucher.condition_text && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 ml-auto z-10 relative">
                                                Điều kiện <ChevronDown size={10} />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-3 text-xs z-50 bg-white border shadow-md rounded-md">
                                            <p className="font-bold mb-1 text-gray-800">Điều kiện áp dụng:</p>
                                            <p className="text-gray-600 leading-relaxed">{voucher.condition_text}</p>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>

                            {voucher.is_eligible ? (
                                <div
                                    className="text-xs text-blue-600 mt-1.5 font-bold cursor-pointer hover:underline w-fit"
                                    onClick={() => handleApply(voucher.code)}
                                >
                                    Áp dụng ngay
                                </div>
                            ) : (
                                <div className="text-[10px] text-red-500 mt-1.5 flex items-start gap-1 bg-red-50 p-1.5 rounded">
                                    <Info size={12} className="flex-shrink-0 mt-0.5" />
                                    <span>{voucher.ineligible_reason}</span>
                                </div>
                            )}
                        </div>

                        {/* Checkmark for selection */}
                        {voucher.is_eligible && inputCode === voucher.code && (
                            <div className="w-6 flex items-center justify-center bg-blue-50 text-blue-600 border-l border-blue-100 flex-shrink-0">
                                ✓
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Message Feedback */}
            {message && (
                <div className={`text-xs px-3 py-2 rounded mb-3 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? '✓' : '!'} {message.text}
                </div>
            )}

            {/* Input Area */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Nhập mã giảm giá"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyVoucher();
                    }}
                    className="w-full pl-4 pr-24 py-3 border rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none border-gray-300 text-sm transition-all"
                />
                <button
                    onClick={() => handleApplyVoucher()}
                    disabled={applying || !inputCode}
                    className={`absolute right-1 top-1 bottom-1 bg-black text-white px-5 rounded-md font-bold text-sm hover:bg-gray-800 transition-colors uppercase ${applying || !inputCode ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {applying ? '...' : 'ÁP DỤNG'}
                </button>
            </div>
        </div>
    );
}
