import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

interface SlideElement {
    id: string;
    type: 'text' | 'button' | 'image' | 'icon' | 'divider' | 'shape' | 'video' | 'html' | 'countdown' | 'badge';
    content: string;
    url?: string;
    target?: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    style: Record<string, string>;
    zIndex: number;
    countdownDuration?: number;
    countdownEndDate?: string;
    // Animation settings
    animation?: {
        type: 'none' | 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'zoomIn' | 'bounce' | 'pulse' | 'slideInLeft' | 'slideInRight';
        duration: number; // in milliseconds
        delay: number; // in milliseconds
        easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
    };
}

// Inject animation keyframes CSS
if (typeof document !== 'undefined' && !document.getElementById('promo-banner-animations')) {
    const style = document.createElement('style');
    style.id = 'promo-banner-animations';
    style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); } 60% { transform: translateY(-5px); } }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
    `;
    document.head.appendChild(style);
}

interface Slide {
    id: number;
    name: string;
    background_image: string;
    background_color?: string;
    background_position_x?: number;
    background_position_y?: number;
    elements: SlideElement[];
    url?: string;
    target?: string;
    end_date?: string;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

function useCountdown(endDate: Date | string): TimeLeft {
    const targetDate = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const calculateTimeLeft = (): TimeLeft => {
        const difference = targetDate.getTime() - Date.now();

        if (difference <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60)
        };
    };

    const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [endDate]);

    return timeLeft;
}

function CountdownDisplay({ endDate, style }: { endDate: Date | string; style?: Record<string, string> }) {
    const timeLeft = useCountdown(endDate);

    const bgColor = '#ffffff';
    const textColor = '#0f172a'; // Slate 900
    const borderColor = 'rgba(255,255,255,0.3)';

    // Style override from props if needed, but defaults are strict to design
    const boxStyle = {
        backgroundColor: bgColor,
        color: textColor,
        minWidth: '40px',
        height: '36px',
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'row' as const,
        alignItems: 'center',
        justifyContent: 'center',
    };

    const TimeBox = ({ value, label }: { value: number; label: string }) => (
        <div style={boxStyle} className="px-3 gap-1">
            <span className="text-[15px] font-bold leading-none">{value}</span>
            <span className="text-[12px] font-medium opacity-70">{label}</span>
        </div>
    );

    const Separator = () => (
        <span className="text-white text-lg font-bold mb-0.5">:</span>
    );

    return (
        <div className="flex items-center gap-2">
            <TimeBox value={timeLeft.days} label="D" />
            <Separator />
            <TimeBox value={timeLeft.hours} label="H" />
            <Separator />
            <TimeBox value={timeLeft.minutes} label="M" />
            <Separator />
            <TimeBox value={timeLeft.seconds} label="S" />
        </div>
    );
}

// Render a slide element - 100% from database
function RenderElement({ element, slideEndDate }: { element: SlideElement; slideEndDate?: string }) {
    // Build animation style if animation is configured
    const animationStyle: React.CSSProperties = {};
    if (element.animation && element.animation.type !== 'none') {
        animationStyle.animation = `${element.animation.type} ${element.animation.duration}ms ${element.animation.easing} ${element.animation.delay}ms forwards`;
    }

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        zIndex: element.zIndex,
        ...Object.fromEntries(
            Object.entries(element.style || {}).map(([k, v]) => [k, v])
        ),
        ...animationStyle,
    };

    switch (element.type) {
        case 'text':
            return (
                <div style={baseStyle} className="flex items-center">
                    {element.content}
                </div>
            );

        case 'button':
            return (
                <Link
                    href={element.url || '#'}
                    style={baseStyle}
                    className="inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                    {element.content}
                    <ArrowRight className="w-4 h-4" />
                </Link>
            );

        case 'countdown':
            // Use slide end_date or calculate from duration
            const endDate = element.countdownEndDate
                || slideEndDate
                || new Date(Date.now() + (element.countdownDuration || 86400) * 1000).toISOString();

            return (
                <div style={{ ...baseStyle, backgroundColor: 'transparent', display: 'flex', alignItems: 'center' }}>
                    <CountdownDisplay endDate={endDate} style={element.style} />
                </div>
            );

        case 'image':
            return (
                <img
                    src={element.content}
                    alt=""
                    style={baseStyle}
                    className="object-cover"
                />
            );

        case 'shape':
            // Shape element - render as styled div
            return (
                <div style={baseStyle} />
            );

        case 'divider':
            // Divider element - render as styled hr
            return (
                <div style={baseStyle} />
            );

        default:
            // Handle any unknown type - fallback to div with content
            if (element.content) {
                return (
                    <div style={baseStyle} className="flex items-center">
                        {element.content}
                    </div>
                );
            }
            return null;
    }
}

// Promotional banner card - 100% data from database, NO fallback
function PromoBannerCard({ slide, bannerWidth, bannerHeight }: {
    slide: Slide;
    bannerWidth: number;
    bannerHeight: number;
}) {
    // Scale factor for responsive display
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / bannerWidth);

    return (
        <div
            className="relative rounded-2xl overflow-hidden group mx-auto"
            style={{
                width: bannerWidth * scale,
                height: bannerHeight * scale,
                maxWidth: '100%',
            }}
        >
            {/* Background from database */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: slide.background_image ? `url(${slide.background_image})` : undefined,
                    backgroundColor: slide.background_color || '#f8f9fa',
                    backgroundSize: 'cover',
                    backgroundPosition: `${slide.background_position_x ?? 50}% ${slide.background_position_y ?? 50}%`,
                }}
            />

            {/* Elements from slide - 100% from database */}
            {slide.elements && slide.elements.length > 0 && (
                <div
                    className="absolute inset-0"
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        width: bannerWidth,
                        height: bannerHeight,
                    }}
                >
                    {slide.elements.map((element) => (
                        <RenderElement
                            key={element.id}
                            element={element}
                            slideEndDate={slide.end_date}
                        />
                    ))}
                </div>
            )}

            {/* Clickable overlay if slide has URL */}
            {slide.url && (
                <Link
                    href={slide.url}
                    className="absolute inset-0 z-50"
                    target={slide.target || '_self'}
                />
            )}
        </div>
    );
}

export default function PromotionalBanners() {
    const { banners: sharedBanners } = usePage<any>().props;

    // Get promo-countdown banner data from database
    const promoBannerData = sharedBanners?.['promo-countdown'];

    // No data = don't render anything
    if (!promoBannerData?.slides?.length) {
        return null;
    }

    const bannerWidth = promoBannerData.width || 800;
    const bannerHeight = promoBannerData.height || 280;

    return (
        <section className="py-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {promoBannerData.slides.map((slide: Slide) => (
                        <PromoBannerCard
                            key={slide.id}
                            slide={slide}
                            bannerWidth={bannerWidth}
                            bannerHeight={bannerHeight}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

// Export for use in other components
export { CountdownDisplay, useCountdown, RenderElement };
export type { Slide, SlideElement, TimeLeft };
