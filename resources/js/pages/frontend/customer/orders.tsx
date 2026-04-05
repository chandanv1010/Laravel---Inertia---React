import React from 'react';
import CustomerLayout from '@/layouts/customer-layout';
import { PackageSearch, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function Orders() {
    return (
        <CustomerLayout title="Đơn hàng của tôi">
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in zoom-in-95 duration-500">
                {/* Icon Container */}
                <div className="relative mb-8">
                    <div className="w-32 h-32 rounded-full bg-emerald-50 flex items-center justify-center">
                        <PackageSearch className="w-16 h-16 text-emerald-600" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-white shadow-flat border border-gray-100 flex items-center justify-center animate-bounce">
                        <ShoppingBag className="w-6 h-6 text-emerald-700" />
                    </div>
                </div>

                {/* Text Content */}
                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
                    Chưa có đơn hàng nào
                </h3>
                <p className="text-gray-500 font-medium max-w-sm mb-10 leading-relaxed">
                    Có vẻ như bạn chưa thực hiện giao dịch nào. <br /> 
                    Hãy bắt đầu mua sắm để lấp đầy danh sách này nhé!
                </p>

                {/* CTA Button */}
                <Link
                    href="/"
                    className="group flex items-center justify-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 hover:shadow-flat transition-all duration-300"
                >
                    <span>Khám phá sản phẩm</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </CustomerLayout>
    );
}
