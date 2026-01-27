import React from 'react';
import { Head, Link } from '@inertiajs/react';

export default function NotFound() {
    return (
        <>
            <Head title="Không tìm thấy trang - 404" />
            <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
                <div className="mb-8">
                    <svg
                        className="w-64 h-64 text-gray-200"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-6">Không tìm thấy trang</h2>
                <p className="text-gray-500 mb-8 max-w-md">
                    Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
                </p>
                <Link
                    href="/"
                    className="px-6 py-3 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition-colors"
                >
                    Về trang chủ
                </Link>
            </div>
        </>
    );
}
