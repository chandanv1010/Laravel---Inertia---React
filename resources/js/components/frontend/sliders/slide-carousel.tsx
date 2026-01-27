import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePage, Link } from '@inertiajs/react';

interface SlideElement {
    id: string;
    type: 'text' | 'image' | 'button' | 'icon' | 'divider' | 'shape' | 'video' | 'html';
    content?: string;
    src?: string;
    url?: string;
    target?: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    style?: Record<string, any>;
    animation?: any;
    zIndex?: number;
    iconName?: string;
    shapeType?: string;
    groupId?: string;
}

interface Slide {
    id: number;
    name: string;
    background_image: string | null;
    background_color: string;
    elements: SlideElement[];
    url: string | null;
    target: string;
}

interface Banner {
    id: number;
    name: string;
    code: string;
    width: number;
    height: number;
    slides: Slide[];
}

interface Props {
    bannerCode?: string; // default: 'home_slider'
    height?: string;
}

export default function SlideCarousel({ bannerCode = 'home_slider', height = '500px' }: Props) {
    const { banners } = usePage<any>().props;
    const [current, setCurrent] = useState(0);

    const banner: Banner | null = banners?.[bannerCode] || null;
    const slides = banner?.slides || [];

    const next = () => {
        if (slides.length > 0) {
            setCurrent((prev) => (prev + 1) % slides.length);
        }
    };

    const prev = () => {
        if (slides.length > 0) {
            setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
        }
    };

    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    if (!banner || slides.length === 0) {
        // Fallback placeholder
        return (
            <div
                className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center"
                style={{ height }}
            >
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-slate-600 mb-2">Welcome to Our Store</h2>
                    <p className="text-slate-500">Discover amazing products</p>
                    <Link href="/san-pham">
                        <Button className="mt-4 rounded-full px-8">
                            Shop Now
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Calculate scale factor based on banner width vs container width
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current && banner?.width) {
                const containerWidth = containerRef.current.offsetWidth;
                const newScale = containerWidth / banner.width;
                setScale(newScale);
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [banner?.width]);

    // Helper to render icon by name
    const renderIcon = (iconName?: string, color?: string) => {
        const iconStyle = { color: color || 'currentColor' };
        switch (iconName) {
            case 'star':
                return (
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" style={iconStyle}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                );
            case 'heart':
                return (
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" style={iconStyle}>
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                );
            case 'sparkles':
                return (
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" style={iconStyle}>
                        <path d="M9.5 3l1.5 4.5L16 9l-5 1.5-1.5 4.5-1.5-4.5L3 9l5-1.5L9.5 3zm9 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
                    </svg>
                );
            case 'circle':
                return (
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" style={iconStyle}>
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                );
            case 'check':
                return (
                    <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" style={iconStyle}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'x':
                return (
                    <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" style={iconStyle}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case 'arrow':
                return (
                    <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={iconStyle}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                );
            default:
                // Fallback to star
                return (
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" style={iconStyle}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                );
        }
    };

    // Helper to render shape by type
    const renderShape = (shapeType?: string, bgColor?: string, borderRadius?: string) => {
        const style: React.CSSProperties = {
            backgroundColor: bgColor || '#3b82f6',
            width: '100%',
            height: '100%',
        };

        switch (shapeType) {
            case 'rectangle':
                return <div className="w-full h-full" style={{ ...style, borderRadius: borderRadius || '0px' }} />;
            case 'circle':
                return <div className="w-full h-full" style={{ ...style, borderRadius: '50%' }} />;
            case 'ellipse':
                return <div className="w-full h-full" style={{ ...style, borderRadius: '50%' }} />;
            case 'triangle':
                return (
                    <div className="w-full h-full" style={{ backgroundColor: 'transparent' }}>
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            <polygon points="50,0 100,100 0,100" fill={bgColor || '#3b82f6'} />
                        </svg>
                    </div>
                );
            case 'line':
                return (
                    <div className="w-full h-full flex items-center">
                        <div className="w-full h-0.5" style={{ backgroundColor: bgColor || '#3b82f6' }} />
                    </div>
                );
            case 'arrow':
                return (
                    <svg viewBox="0 0 100 50" className="w-full h-full">
                        <polygon points="0,15 70,15 70,0 100,25 70,50 70,35 0,35" fill={bgColor || '#3b82f6'} />
                    </svg>
                );
            case 'star':
                return (
                    <svg viewBox="0 0 24 24" className="w-full h-full" fill={bgColor || '#3b82f6'}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                );
            case 'polygon':
                return (
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <polygon points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25" fill={bgColor || '#3b82f6'} />
                    </svg>
                );
            default:
                return <div className="w-full h-full" style={{ ...style, borderRadius: borderRadius || '50%' }} />;
        }
    };

    // Calculate dynamic height based on aspect ratio
    const containerHeight = banner ? 'auto' : height;

    return (
        <div className="relative group">
            <div
                ref={containerRef}
                className="relative w-full overflow-hidden rounded-t-2xl rounded-b-none"
                style={{
                    // When banner is available, use aspect-ratio for proper scaling
                    // Otherwise fall back to provided height
                    height: banner ? undefined : height,
                    aspectRatio: banner ? `${banner?.width}/${banner?.height}` : undefined
                }}
            >
                {slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className={cn(
                            "absolute inset-0 transition-all duration-700 ease-in-out transform",
                            index === current ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10 pointer-events-none"
                        )}
                        style={{
                            backgroundColor: slide.background_color || '#f0f9ff',
                            backgroundImage: slide.background_image ? `url(${slide.background_image})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        {/* Render slide link if exists */}
                        {slide.url ? (
                            <Link
                                href={slide.url}
                                target={slide.target || '_self'}
                                className="absolute inset-0 z-10"
                            />
                        ) : null}

                        {/* Render elements from canvas editor - scaled proportionally */}
                        {slide.elements && slide.elements.map((element) => (
                            <div
                                key={element.id}
                                className="absolute"
                                style={{
                                    left: element.position.x * scale,
                                    top: element.position.y * scale,
                                    width: element.size.width * scale,
                                    height: element.size.height * scale,
                                    zIndex: element.zIndex || 10,
                                }}
                            >
                                {/* Text element */}
                                {element.type === 'text' && (
                                    <div
                                        style={{
                                            fontSize: `calc(${element.style?.fontSize || '16px'} * ${scale})`,
                                            fontWeight: element.style?.fontWeight,
                                            fontStyle: element.style?.fontStyle,
                                            fontFamily: element.style?.fontFamily,
                                            lineHeight: element.style?.lineHeight,
                                            letterSpacing: element.style?.letterSpacing,
                                            color: element.style?.color,
                                            backgroundColor: element.style?.backgroundColor,
                                            textAlign: element.style?.textAlign as any,
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span style={{ width: '100%' }}>{element.content}</span>
                                    </div>
                                )}

                                {/* Image element - uses content for src */}
                                {element.type === 'image' && element.content && (
                                    <img
                                        src={element.content}
                                        alt=""
                                        className="w-full h-full object-contain"
                                    />
                                )}

                                {/* Button element - uses configured backgroundColor */}
                                {element.type === 'button' && (
                                    <div
                                        className="w-full h-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-90"
                                        style={{
                                            backgroundColor: element.style?.backgroundColor || '#3b82f6',
                                            color: element.style?.color || '#ffffff',
                                            borderRadius: element.style?.borderRadius || '8px',
                                            fontSize: `calc(${element.style?.fontSize || '16px'} * ${scale})`,
                                            fontWeight: element.style?.fontWeight,
                                        }}
                                    >
                                        {element.content}
                                    </div>
                                )}

                                {/* Icon element */}
                                {element.type === 'icon' && (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {renderIcon(element.iconName || element.content, element.style?.color)}
                                    </div>
                                )}

                                {/* Divider element */}
                                {element.type === 'divider' && (
                                    <div
                                        className="w-full h-full"
                                        style={{ backgroundColor: element.style?.backgroundColor || '#ffffff' }}
                                    />
                                )}

                                {/* Shape element */}
                                {element.type === 'shape' && (
                                    renderShape(element.shapeType, element.style?.backgroundColor, element.style?.borderRadius)
                                )}

                                {/* Video element - placeholder */}
                                {element.type === 'video' && (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}

                                {/* HTML element */}
                                {element.type === 'html' && (
                                    <div
                                        className="w-full h-full overflow-hidden"
                                        dangerouslySetInnerHTML={{ __html: element.content || '' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                ))}

                {/* Navigation dots */}
                {slides.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrent(idx)}
                                className={cn(
                                    "w-2.5 h-2.5 rounded-full transition-all",
                                    idx === current ? "bg-white w-8 shadow-lg" : "bg-white/50"
                                )}
                            />
                        ))}
                    </div>
                )}

                {/* Arrow controls */}
                {slides.length > 1 && (
                    <>
                        <button
                            onClick={prev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/70 hover:bg-white shadow-md transition-all z-20"
                        >
                            <ChevronLeft className="w-6 h-6 text-slate-700" />
                        </button>
                        <button
                            onClick={next}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/70 hover:bg-white shadow-md transition-all z-20"
                        >
                            <ChevronRight className="w-6 h-6 text-slate-700" />
                        </button>
                    </>
                )}
            </div>


            {/* Scroll Down Icon - positioned on the TIP of the bulge */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[35px] z-[999]">
                <div className="w-[60px] h-[60px] md:w-[84px] md:h-[84px] rounded-full bg-[#1c799b] border-[5px] border-white flex items-center justify-center shadow-lg cursor-pointer hover:bg-[#155a75] transition-colors group">
                    <div className="flex flex-col items-center animate-scroll-down">
                        {/* 3 Dashes (Gach) */}
                        <div className="flex flex-col items-center gap-1 mb-1">
                            <div className="w-[2px] h-[5px] bg-white rounded-full opacity-60" />
                            <div className="w-[2px] h-[5px] bg-white rounded-full opacity-80" />
                            <div className="w-[2px] h-[5px] bg-white rounded-full" />
                        </div>
                        {/* Arrows */}
                        <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-white -mb-2" />
                        <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
}
