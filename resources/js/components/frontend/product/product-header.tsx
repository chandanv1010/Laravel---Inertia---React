import React, { useState } from 'react';
import { Star, Share2, X } from 'lucide-react';
import {
    Facebook,
    Twitter,
    Linkedin,
    MessageCircle,
    Send
} from 'lucide-react';
import { ClientReviews } from './client-reviews';

interface ProductHeaderProps {
    product: {
        name: string;
        description?: string;
        reviews_count?: number;
        average_rating?: number;
    };
    currentUrl?: string;
}

export default function ProductHeader({ product, currentUrl }: ProductHeaderProps) {
    const [showShareModal, setShowShareModal] = useState(false);

    // Calculate rating - default to 5.0 if no reviews
    const rating = product.average_rating || 5.0;
    const reviewsCount = product.reviews_count || 0;

    // Get current page URL for sharing
    const shareUrl = currentUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const shareTitle = product.name;

    // Social share links
    const shareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`,
    };

    const handleShare = (platform: string) => {
        const link = shareLinks[platform as keyof typeof shareLinks];
        if (link) {
            window.open(link, '_blank', 'width=600,height=400');
        }
        setShowShareModal(false);
    };

    return (
        <>
            <div className="border-b border-gray-200 pb-4 mb-4">
                {/* Product Name */}
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    {product.name}
                </h1>

                {/* Rating and Share */}
                <div className="flex items-center gap-4">
                    {/* Stars */}
                    <ClientReviews
                        averageRating={rating}
                        reviewsCount={reviewsCount}
                        size="lg"
                    />

                    {/* Share Button */}
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors font-medium"
                    >
                        <Share2 size={18} />
                        <span>Chia sẻ</span>
                    </button>
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                    onClick={() => setShowShareModal(false)}
                >
                    <div
                        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            Chia sẻ sản phẩm
                        </h3>

                        {/* Social platforms */}
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => handleShare('facebook')}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                                    <Facebook size={24} className="text-white" />
                                </div>
                                <span className="text-sm text-gray-700">Facebook</span>
                            </button>

                            <button
                                onClick={() => handleShare('twitter')}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center">
                                    <Twitter size={24} className="text-white" />
                                </div>
                                <span className="text-sm text-gray-700">Twitter</span>
                            </button>

                            <button
                                onClick={() => handleShare('linkedin')}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center">
                                    <Linkedin size={24} className="text-white" />
                                </div>
                                <span className="text-sm text-gray-700">LinkedIn</span>
                            </button>

                            <button
                                onClick={() => handleShare('whatsapp')}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                    <MessageCircle size={24} className="text-white" />
                                </div>
                                <span className="text-sm text-gray-700">WhatsApp</span>
                            </button>

                            <button
                                onClick={() => handleShare('telegram')}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                                    <Send size={24} className="text-white" />
                                </div>
                                <span className="text-sm text-gray-700">Telegram</span>
                            </button>
                        </div>

                        {/* Copy link section */}
                        <div className="mt-6 pt-4 border-t">
                            <label className="text-sm text-gray-600 mb-2 block">
                                Hoặc sao chép link
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareUrl);
                                        alert('Đã sao chép link!');
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    Sao chép
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
