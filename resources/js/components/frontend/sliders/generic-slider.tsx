/**
 * GenericSlider Component
 * 
 * A reusable slider component that renders items passed via props.
 * Supports configurable itemsPerView, autoplay, loop, and navigation arrows.
 */

import React, { useRef, useState, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GenericSliderProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => ReactNode;
    itemsPerView?: number;        // Number of items visible at once (default: 6)
    gap?: number;                 // Gap between items in pixels (default: 16)
    autoplay?: boolean;           // Enable auto-scroll (default: false)
    autoplayInterval?: number;    // Milliseconds between auto-scrolls (default: 4000)
    loop?: boolean;               // Loop to start when reaching end (default: true)
    showArrows?: boolean;         // Show left/right arrows (default: true)
    className?: string;           // Container custom class
    arrowClassName?: string;      // Custom class for arrow buttons
}

export interface GenericSliderHandle {
    scrollTo: (direction: 'left' | 'right') => void;
}

const GenericSlider = React.forwardRef<GenericSliderHandle, GenericSliderProps<any>>((
    {
        items,
        renderItem,
        itemsPerView = 6,
        gap = 16,
        autoplay = false,
        autoplayInterval = 4000,
        loop = true,
        showArrows = true,
        className = '',
        arrowClassName = '',
    },
    ref
) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    // Calculate item width dynamically based on container and itemsPerView
    // Formula: (containerWidth - (itemsPerView - 1) * gap) / itemsPerView
    const itemWidth = containerWidth > 0
        ? (containerWidth - (itemsPerView - 1) * gap) / itemsPerView
        : 180; // Fallback

    const maxIndex = Math.max(0, items.length - itemsPerView);

    // Update container width on resize
    useEffect(() => {
        if (!containerRef.current) return;

        const updateWidth = () => {
            if (containerRef.current) {
                // Get content width (excluding padding)
                const paddingLeft = parseFloat(getComputedStyle(containerRef.current).paddingLeft) || 0;
                const paddingRight = parseFloat(getComputedStyle(containerRef.current).paddingRight) || 0;
                const contentWidth = containerRef.current.offsetWidth - paddingLeft - paddingRight;
                setContainerWidth(contentWidth);
            }
        };

        const observer = new ResizeObserver(updateWidth);
        observer.observe(containerRef.current);
        updateWidth();

        return () => observer.disconnect();
    }, []);

    // Autoplay logic
    useEffect(() => {
        if (!autoplay || items.length <= itemsPerView) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => {
                if (prev >= maxIndex) {
                    return loop ? 0 : prev;
                }
                return prev + 1;
            });
        }, autoplayInterval);

        return () => clearInterval(interval);
    }, [autoplay, autoplayInterval, items.length, maxIndex, itemsPerView, loop]);

    // Navigation handler - scroll by full page (itemsPerView items)
    const scrollTo = (direction: 'left' | 'right') => {
        const step = itemsPerView; // Scroll by full page

        if (direction === 'left') {
            if (currentIndex <= 0) {
                setCurrentIndex(loop ? maxIndex : 0);
            } else {
                setCurrentIndex(Math.max(0, currentIndex - step));
            }
        } else {
            if (currentIndex >= maxIndex) {
                setCurrentIndex(loop ? 0 : maxIndex);
            } else {
                setCurrentIndex(Math.min(maxIndex, currentIndex + step));
            }
        }
    };

    // Expose scrollTo to parent
    React.useImperativeHandle(ref, () => ({
        scrollTo
    }));

    if (items.length === 0) return null;

    const translateX = currentIndex * (itemWidth + gap);

    return (
        <div ref={containerRef} className={`relative group ${className}`}>
            {/* Left Arrow - Default internal arrows */}
            {showArrows && (loop || currentIndex > 0) && (
                <button
                    onClick={() => scrollTo('left')}
                    className={`absolute -left-8 group-hover:left-0 top-1/2 -translate-y-1/2 z-50 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out opacity-0 invisible group-hover:opacity-100 group-hover:visible border border-gray-100 hover:border-[#1c799b] text-gray-600 hover:text-[#1c799b] cursor-pointer ${arrowClassName}`}
                    aria-label="Previous"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}

            {/* Right Arrow - Default internal arrows */}
            {showArrows && (loop || currentIndex < maxIndex) && (
                <button
                    onClick={() => scrollTo('right')}
                    className={`absolute -right-8 group-hover:right-0 top-1/2 -translate-y-1/2 z-50 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out opacity-0 invisible group-hover:opacity-100 group-hover:visible border border-gray-100 hover:border-[#1c799b] text-gray-600 hover:text-[#1c799b] cursor-pointer ${arrowClassName}`}
                    aria-label="Next"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            )}

            {/* Slider Container */}
            <div className="overflow-hidden">
                <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{
                        transform: `translateX(-${translateX}px)`,
                        gap: `${gap}px`,
                    }}
                >
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className="flex-shrink-0"
                            style={{ width: `${itemWidth}px` }}
                        >
                            {renderItem(item, index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default GenericSlider;

