import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselSlideProps<T> {
    /** Array of items to display in the carousel */
    items: T[];
    /** Render function for each item */
    renderItem: (item: T, index: number) => ReactNode;
    /** Number of items to show per slide on different screen sizes */
    slidesPerView?: {
        mobile?: number;
        tablet?: number;
        desktop?: number;
    };
    /** Gap between items in pixels */
    gap?: number;
    /** Show navigation arrows */
    showArrows?: boolean;
    /** Show navigation dots */
    showDots?: boolean;
    /** Enable autoplay */
    autoplay?: boolean;
    /** Autoplay interval in ms */
    autoplayInterval?: number;
    /** Custom class for container */
    className?: string;
    /** Custom class for item wrapper */
    itemClassName?: string;
    /** Title for the section */
    title?: string;
    /** Link for "View All" */
    viewAllLink?: string;
    /** View all link text */
    viewAllText?: string;
}

export default function CarouselSlide<T>({
    items,
    renderItem,
    slidesPerView = { mobile: 1, tablet: 3, desktop: 5 },
    gap = 24,
    showArrows = true,
    showDots = true,
    autoplay = false,
    autoplayInterval = 5000,
    className = '',
    itemClassName = '',
    title,
    viewAllLink,
    viewAllText = 'Xem tất cả',
}: CarouselSlideProps<T>) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visibleItems, setVisibleItems] = useState(slidesPerView.desktop || 5);

    // Calculate visible items based on window width
    useEffect(() => {
        const updateVisibleItems = () => {
            const width = window.innerWidth;
            if (width < 640) {
                setVisibleItems(slidesPerView.mobile || 1);
            } else if (width < 1024) {
                setVisibleItems(slidesPerView.tablet || 3);
            } else {
                setVisibleItems(slidesPerView.desktop || 5);
            }
        };

        updateVisibleItems();
        window.addEventListener('resize', updateVisibleItems);
        return () => window.removeEventListener('resize', updateVisibleItems);
    }, [slidesPerView]);

    const maxIndex = Math.max(0, items.length - visibleItems);

    const next = useCallback(() => {
        setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
    }, [maxIndex]);

    const prev = useCallback(() => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }, []);

    const goToSlide = useCallback((index: number) => {
        setCurrentIndex(Math.min(Math.max(0, index), maxIndex));
    }, [maxIndex]);

    // Autoplay
    useEffect(() => {
        if (!autoplay || items.length <= visibleItems) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => {
                if (prev >= maxIndex) return 0;
                return prev + 1;
            });
        }, autoplayInterval);

        return () => clearInterval(timer);
    }, [autoplay, autoplayInterval, maxIndex, visibleItems, items.length]);

    // Calculate number of dots
    const totalDots = Math.max(1, items.length - visibleItems + 1);

    if (items.length === 0) {
        return null;
    }

    return (
        <div className={cn('relative', className)}>
            {/* Header */}
            {(title || viewAllLink) && (
                <div className="flex items-center justify-between mb-6">
                    {title && (
                        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                    )}
                    {viewAllLink && (
                        <a
                            href={viewAllLink}
                            className="text-primary hover:underline font-medium"
                        >
                            {viewAllText}
                        </a>
                    )}
                </div>
            )}

            {/* Carousel Container */}
            <div className="relative overflow-hidden">
                {/* Items Track */}
                <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{
                        gap: `${gap}px`,
                        transform: `translateX(-${currentIndex * (100 / visibleItems + (gap / (100 / visibleItems)))}%)`,
                    }}
                >
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className={cn('flex-shrink-0', itemClassName)}
                            style={{
                                width: `calc((100% - ${gap * (visibleItems - 1)}px) / ${visibleItems})`,
                            }}
                        >
                            {renderItem(item, index)}
                        </div>
                    ))}
                </div>

                {/* Arrow Navigation */}
                {showArrows && items.length > visibleItems && (
                    <>
                        <button
                            onClick={prev}
                            disabled={currentIndex === 0}
                            className={cn(
                                "absolute left-0 top-1/2 -translate-y-1/2 z-10",
                                "p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all",
                                "disabled:opacity-30 disabled:cursor-not-allowed"
                            )}
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-700" />
                        </button>
                        <button
                            onClick={next}
                            disabled={currentIndex >= maxIndex}
                            className={cn(
                                "absolute right-0 top-1/2 -translate-y-1/2 z-10",
                                "p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all",
                                "disabled:opacity-30 disabled:cursor-not-allowed"
                            )}
                        >
                            <ChevronRight className="w-5 h-5 text-slate-700" />
                        </button>
                    </>
                )}
            </div>

            {/* Dots Navigation */}
            {showDots && items.length > visibleItems && (
                <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: totalDots }).map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => goToSlide(idx)}
                            className={cn(
                                "w-2.5 h-2.5 rounded-full transition-all",
                                idx === currentIndex
                                    ? "bg-primary w-6"
                                    : "bg-slate-300 hover:bg-slate-400"
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
