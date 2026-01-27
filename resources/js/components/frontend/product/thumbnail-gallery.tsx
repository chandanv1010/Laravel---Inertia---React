import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, FreeMode, EffectFade } from 'swiper/modules';
import { Swiper as SwiperClass } from 'swiper/types';
import { PlayCircle, QrCode } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/free-mode';
import 'swiper/css/effect-fade';

import { cn } from '@/lib/utils';

interface ThumbnailGalleryProps {
    images: string[];
    productName: string;
    galleryStyle?: 'vertical' | 'horizontal';
    aspectRatio?: string; // e.g., "16:9", "1:1"
    video?: string; // Embed code (iframe) or Video URL
    qrCode?: string; // QR Code Image URL
    imageObjectFit?: 'cover' | 'scale-down' | 'auto' | 'contain'; // Object fit style
}

const parseAspectRatio = (ratio: string) => {
    // Default to square if invalid
    if (!ratio) return { w: 1, h: 1 };
    const parts = ratio.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
        return { w: parts[0], h: parts[1] };
    }
    return { w: 1, h: 1 };
};

export default function ThumbnailGallery({
    images = [],
    productName,
    galleryStyle = 'vertical',
    aspectRatio = '1:1',
    video,
    qrCode,
    imageObjectFit = 'contain'
}: ThumbnailGalleryProps) {
    const [thumbsSwiper, setThumbsSwiper] = useState<SwiperClass | null>(null);
    const [slides, setSlides] = useState<{ type: 'image' | 'video' | 'qr', src: string, id: string }[]>([]);

    // Calculate aspect ratio string for inline styles
    const ratioDimensions = parseAspectRatio(aspectRatio);
    const aspectRatioCSS = `${ratioDimensions.w} / ${ratioDimensions.h}`;

    // Map field value to CSS object-fit
    const objectFitStyle = imageObjectFit === 'scale-down' ? 'scale-down' :
        imageObjectFit === 'cover' ? 'cover' :
            imageObjectFit === 'auto' ? 'fill' : // 'auto' maps to 'fill' 
                'contain'; // default

    // Prepare slides data
    useEffect(() => {
        const newSlides: { type: 'image' | 'video' | 'qr', src: string, id: string }[] = [];

        // 1. Video (First Item)
        if (video) {
            newSlides.push({ type: 'video', src: video, id: 'video-main' });
        }

        // 2. Images
        images.forEach((img, idx) => {
            if (img) {
                newSlides.push({ type: 'image', src: img, id: `img-${idx}` });
            }
        });

        // 3. QR Code (Last Item)
        if (qrCode) {
            newSlides.push({ type: 'qr', src: qrCode, id: 'qr-code' });
        }

        setSlides(newSlides);
    }, [images, video, qrCode]);

    if (slides.length === 0) {
        return (
            <div className="bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 rounded-lg" style={{ aspectRatio: aspectRatioCSS }}>
                <span className="text-sm">No Preview</span>
            </div>
        );
    }

    const isVertical = galleryStyle === 'vertical';

    return (
        <div className={cn(
            "group/gallery w-full relative",
            isVertical ? "flex flex-row gap-4 items-start" : "flex flex-col gap-4"
        )}> {/* Use Flexbox for vertical layout */}
            {/* THUMBNAILS (Left for Vertical, Bottom for Horizontal) */}
            <div className={cn(
                "transition-opacity duration-300",
                isVertical ? "w-16 h-full flex-shrink-0" : "w-full order-2 mt-4"
            )}>
                <Swiper
                    onSwiper={setThumbsSwiper}
                    direction={isVertical ? 'vertical' : 'horizontal'}
                    spaceBetween={10}
                    slidesPerView={isVertical ? 'auto' : 5} // Use 5 for horizontal, auto for vertical loop if needed, but let's stick to simple
                    freeMode={true}
                    watchSlidesProgress={true}
                    modules={[FreeMode, Navigation, Thumbs]}
                    style={isVertical ? { height: '500px' } : undefined} // Fix height for vertical slider to prevent expansion
                    className={cn(
                        "w-full",
                        isVertical ? "h-[500px]" : "h-auto", // Explicit height for vertical mode
                        "thumbnail-swiper"
                    )}
                    breakpoints={!isVertical ? {
                        320: { slidesPerView: 4 },
                        480: { slidesPerView: 5 },
                        768: { slidesPerView: 5 },
                        1024: { slidesPerView: 6 },
                    } : {
                        // Vertical breakpoints if any
                        0: { slidesPerView: 5, direction: 'vertical' }
                    }}
                >
                    {slides.map((slide) => (
                        <SwiperSlide key={`thumb-${slide.id}`} className={cn(
                            "cursor-pointer rounded-md overflow-hidden border-2 border-transparent transition-all box-border block h-auto",
                            isVertical ? "!w-full !h-16 mb-2 last:mb-0" : "", // Fix width/height for vertical slides
                            "hover:border-blue-400 opacity-60 [&.swiper-slide-thumb-active]:opacity-100 [&.swiper-slide-thumb-active]:border-blue-600"
                        )}
                            style={isVertical ? { width: '100%', height: '64px' } : {}}
                        >
                            {/* ✅ FIXED: Thumbnails display naturally without background */}
                            {slide.type === 'video' ? (
                                <div className="w-full h-full flex items-center justify-center bg-black/5 text-gray-700 rounded-sm">
                                    <PlayCircle size={20} />
                                </div>
                            ) : slide.type === 'qr' ? (
                                <div className="w-full h-full flex items-center justify-center bg-white p-1 rounded-sm">
                                    <QrCode size={18} className="text-gray-800" />
                                </div>
                            ) : (
                                <img src={slide.src} alt="Thumb" className="w-full h-full object-cover rounded-sm" />
                            )}
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>

            {/* MAIN GALLERY - Natural aspect ratio */}
            <div className={cn(
                "relative overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm z-10",
                isVertical ? "flex-1" : "w-full",
                "product-gallery-swiper" // Add custom class for styling
            )}>
                {/* ✅ FIXED: Removed aspect ratio constraint */}
                <Swiper
                    style={{
                        // @ts-ignore
                        '--swiper-navigation-color': '#fff',
                        '--swiper-navigation-size': '20px',
                        width: '100%',
                        height: 'auto'
                    }}
                    spaceBetween={0}
                    navigation={true}
                    thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                    modules={[FreeMode, Navigation, Thumbs, EffectFade]}
                    effect={'slide'}
                    speed={500}
                    className="h-full w-full product-main-swiper"
                >
                    {slides.map((slide) => (
                        <SwiperSlide key={`main-${slide.id}`} className="bg-white">
                            {/* ✅ FIXED: Image determines height naturally */}
                            <div className="w-full relative bg-gray-50">
                                {slide.type === 'video' ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                        {/* Detect if iframe or raw video */}
                                        {slide.src.includes('<iframe') || slide.src.includes('<embed') ? (
                                            <div
                                                className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                                                dangerouslySetInnerHTML={{ __html: slide.src }}
                                            />
                                        ) : (
                                            <video
                                                controls
                                                className="w-full h-full object-contain"
                                                src={slide.src}
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        )}
                                    </div>
                                ) : slide.type === 'qr' ? (
                                    <div className="flex flex-col items-center justify-center p-8 bg-white h-full w-full">
                                        <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Quét mã sản phẩm</p>
                                        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-lg">
                                            <img src={slide.src} alt="QR Code" className="max-w-[200px] max-h-[200px] object-contain" />
                                        </div>
                                    </div>
                                ) : (
                                    <img
                                        src={slide.src}
                                        alt={productName}
                                        className="w-full h-auto"
                                        style={{ objectFit: objectFitStyle }}
                                    />
                                )}
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </div>
    );
}
