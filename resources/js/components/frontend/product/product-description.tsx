import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ProductDescriptionProps {
    content: string; // HTML from CKEditor
}

export default function ProductDescription({ content }: ProductDescriptionProps) {
    const [showModal, setShowModal] = useState(false);

    if (!content) return null;

    return (
        <>
            <div className="mb-4">
                <h2 className="text-lg font-normal text-blue-600 mb-2">
                    Mô tả sản phẩm
                </h2>
                <div className="relative">
                    <div
                        className="prose prose-sm max-w-none text-gray-700 line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 cursor-pointer"
                    >
                        Xem thêm
                    </button>
                </div>
            </div>

            {/* Full Description Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>

                        {/* Title */}
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            Mô tả sản phẩm
                        </h2>

                        {/* Full Content */}
                        <div
                            className="prose prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
