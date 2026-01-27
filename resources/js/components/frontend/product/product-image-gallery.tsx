import React, { useState, useEffect } from 'react';

interface ProductImageGalleryProps {
    images: string[];
    productName: string;
}

export default function ProductImageGallery({ images = [], productName }: ProductImageGalleryProps) {
    const [selectedImage, setSelectedImage] = useState<string>('');

    useEffect(() => {
        if (images && images.length > 0) {
            setSelectedImage(images[0]);
        }
    }, [images]);

    if (!images || images.length === 0) {
        return (
            <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center text-gray-400">
                No Image
            </div>
        );
    }

    return (
        <div className="flex gap-4 h-[500px]">
            {/* Thumbnails - Vertical Scroll */}
            <div className="w-20 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
                {images.map((img, index) => (
                    <div
                        key={index}
                        className={`
                            border-2 rounded-lg cursor-pointer overflow-hidden aspect-square
                            ${selectedImage === img ? 'border-red-500' : 'border-transparent hover:border-gray-300'}
                        `}
                        onMouseEnter={() => setSelectedImage(img)}
                        onClick={() => setSelectedImage(img)}
                    >
                        <img
                            src={img}
                            alt={`${productName} thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}
            </div>

            {/* Main Image */}
            <div className="flex-1 bg-white rounded-lg overflow-hidden flex items-center justify-center border border-gray-100 relative group">
                <img
                    src={selectedImage}
                    alt={productName}
                    className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
            </div>
        </div>
    );
}
