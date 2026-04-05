import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ShippingInfoSectionProps {
    customer?: any;
    errors: any;
}

export default function ShippingInfoSection({ customer, errors }: ShippingInfoSectionProps) {
    const fullName = customer ? `${customer.last_name || ''} ${customer.first_name || ''}`.trim() : '';

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                Thông tin vận chuyển
            </h2>

            <div className="space-y-5">
                {/* Row 1: Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên</label>
                        <div className="flex items-center">
                            <Select defaultValue="anh">
                                <SelectTrigger className="w-[90px] !h-10 rounded-r-none border-r-0 focus:ring-1 focus:ring-primary bg-gray-50 focus:ring-inset border-gray-300">
                                    <SelectValue placeholder="Danh xưng" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="anh">Anh</SelectItem>
                                    <SelectItem value="chi">Chị</SelectItem>
                                </SelectContent>
                            </Select>
                            <input
                                type="text"
                                name="full_name"
                                placeholder="Ví dụ: Nguyễn Văn A"
                                defaultValue={fullName}
                                className={`flex-1 !h-10 px-4 border rounded-r-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors ${errors.full_name ? 'border-red-500' : 'border-gray-300'}`}
                            />
                        </div>
                        {errors.full_name && <div className="text-red-500 text-xs mt-1">{errors.full_name}</div>}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại</label>
                        <input
                            type="tel"
                            name="phone"
                            placeholder="Ví dụ: 0987654321"
                            defaultValue={customer?.phone || ''}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.phone && <div className="text-red-500 text-xs mt-1">{errors.phone}</div>}
                    </div>
                </div>

                {/* Email (Optional in request but pre-fill if available) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        name="email"
                        placeholder="support@coolmate.me"
                        defaultValue={customer?.email || ''}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors border-gray-300`}
                    />
                </div>

                {/* Row 3: Address */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ (Số nhà, đường...)</label>
                    <input
                        type="text"
                        name="address"
                        placeholder="Ví dụ: 103 Vạn Phúc, Hà Đông"
                        defaultValue={customer?.shipping_address || ''}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.address && <div className="text-red-500 text-xs mt-1">{errors.address}</div>}
                </div>

                {/* Row 5: Note */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú thêm</label>
                    <textarea
                        rows={3}
                        name="notes"
                        placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                        className="w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none border-gray-300 resize-none transition-colors"
                    ></textarea>
                </div>
            </div>
        </div>
    );
}
