import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import { RenderElement } from '@/components/frontend/promotional-banners';
import type { SlideElement } from '@/components/frontend/promotional-banners';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface BannerSlide {
    id: number;
    background_image: string;
    background_color: string;
    background_position_x?: number;
    background_position_y?: number;
    elements: SlideElement[];
    url?: string;
    button_link?: string;
    target?: string;
    end_date?: string | null;
}

interface Banner {
    id: number;
    name: string;
    code: string;
    width?: number;
    height?: number;
    slides: BannerSlide[];
}

interface ClientBannerProps {
    banner: Banner | null;
    className?: string;
    style?: React.CSSProperties;
    autoScale?: boolean;
    slideIndex?: number; // Force display specific slide index (for non-slider usage)
}

export default function ClientBanner({
    banner,
    className = "",
    style,
    autoScale = true,
    slideIndex
}: ClientBannerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Default dimensions if not set
    const bannerWidth = banner?.width || 1200;
    const bannerHeight = banner?.height || 400;

    // Calculate scale
    useEffect(() => {
        if (!autoScale) {
            setScale(1);
            return;
        }

        const calculateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                // Avoid division by zero
                setScale(containerWidth / (bannerWidth || 1));
            }
        };

        calculateScale();
        const observer = new ResizeObserver(calculateScale);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        // Also listen to window resize as backup
        window.addEventListener('resize', calculateScale);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', calculateScale);
        };
    }, [bannerWidth, autoScale]);

    if (!banner || !banner.slides || banner.slides.length === 0) {
        return null;
    }

    // Render a single slide content
    const renderSlideContent = (slide: BannerSlide) => (
        <div
            className="relative w-full h-full overflow-hidden"
            style={{
                // If autoScale, we don't set fixed height here, the aspect ratio comes from parent/container
                // or we rely on the container aspect ratio. 
                // But for the background to show correctly, we might need height 100%.
            }}
        >
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: slide.background_image ? `url(${slide.background_image})` : undefined,
                    backgroundColor: slide.background_color || 'transparent',
                    backgroundSize: 'cover',
                    backgroundPosition: `${slide.background_position_x ?? 50}% ${slide.background_position_y ?? 50}%`,
                }}
            />

            {/* Elements - Scaled */}
            {slide.elements && Array.isArray(slide.elements) && slide.elements.length > 0 && (
                <div
                    className="absolute top-0 left-0 origin-top-left"
                    style={{
                        width: bannerWidth,
                        height: bannerHeight, // Fixed dimensions as per config
                        transform: `scale(${scale})`,
                        // We need to pointer-events-none for the container so it doesn't block clicks,
                        // unless elements have pointer-events-auto
                        pointerEvents: 'none',
                    }}
                >
                    <div className="relative w-full h-full pointer-events-auto">
                        {slide.elements.map((element) => (
                            <RenderElement
                                key={element.id}
                                element={element}
                                slideEndDate={slide.end_date || undefined}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Clickable Overlay */}
            {(slide.url || slide.button_link) && (
                <Link
                    href={slide.url || slide.button_link || '#'}
                    className="absolute inset-0 z-10"
                    target={slide.target || '_self'}
                />
            )}
        </div>
    );

    // If specific index requested or only 1 slide -> Render Static
    if (slideIndex !== undefined || banner.slides.length === 1) {
        const slide = banner.slides[slideIndex || 0];
        if (!slide) return null;

        return (
            <div
                ref={containerRef}
                className={`relative overflow-hidden ${className}`}
                style={{
                    // Enforce aspect ratio to match banner dimensions
                    aspectRatio: `${bannerWidth} / ${bannerHeight}`,
                    ...style
                }}
            >
                {renderSlideContent(slide)}
            </div>
        );
    }

    // Multiple slides -> Render Slider
    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden group ${className}`}
            style={{
                aspectRatio: `${bannerWidth} / ${bannerHeight}`,
                ...style
            }}
        >
            <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={0}
                slidesPerView={1}
                navigation={{
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                }}
                pagination={{ clickable: true }}
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                }}
                loop={true}
                className="w-full h-full"
            >
                {banner.slides.map((slide) => (
                    <SwiperSlide key={slide.id}>
                        {renderSlideContent(slide)}
                    </SwiperSlide>
                ))}

                {/* Custom Navigation Buttons */}
                <div className="swiper-button-prev !w-11 !h-11 !bg-white !text-gray-800 !rounded-full !shadow-lg after:!content-[''] hover:!bg-primary hover:!text-white transition-all !z-10 opacity-0 group-hover:opacity-100 duration-300 flex items-center justify-center -translate-x-4 group-hover:translate-x-0">
                    <ChevronLeft className="w-5 h-5 ml-[-2px]" strokeWidth={1.5} />
                </div>
                <div className="swiper-button-next !w-11 !h-11 !bg-white !text-gray-800 !rounded-full !shadow-lg after:!content-[''] hover:!bg-primary hover:!text-white transition-all !z-10 opacity-0 group-hover:opacity-100 duration-300 flex items-center justify-center translate-x-4 group-hover:translate-x-0">
                    <ChevronRight className="w-5 h-5 mr-[-2px]" strokeWidth={1.5} />
                </div>
            </Swiper>
        </div>
    );
}
