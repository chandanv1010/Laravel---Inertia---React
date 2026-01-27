import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ShippingInfoSection() {
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
                                placeholder="Ví dụ: Nguyễn Văn A"
                                className="flex-1 !h-10 px-4 border rounded-r-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none border-gray-300 transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại</label>
                        <input
                            type="tel"
                            placeholder="Ví dụ: 0987654321"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none border-gray-300 transition-colors"
                        />
                    </div>
                </div>

                {/* Row 2: Email */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        placeholder="support@coolmate.me"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none border-gray-300 transition-colors"
                    />
                </div>

                {/* Row 3: Address */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ (Số nhà, đường...)</label>
                    <input
                        type="text"
                        placeholder="Ví dụ: 103 Vạn Phúc, Hà Đông"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none border-gray-300 transition-colors"
                    />
                </div>

                {/* Row 4: City Selection (Only City as requested) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tỉnh / Thành phố</label>
                    <Select>
                        <SelectTrigger className="w-full focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="Chọn Tỉnh/Thành" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hanoi">Hà Nội</SelectItem>
                            <SelectItem value="hcm">TP Hồ Chí Minh</SelectItem>
                            <SelectItem value="danang">Đà Nẵng</SelectItem>
                            <SelectItem value="other">Khác</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Row 5: Note */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú thêm</label>
                    <textarea
                        rows={3}
                        placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                        className="w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none border-gray-300 resize-none transition-colors"
                    ></textarea>
                </div>
            </div>
        </div>
    );
}
