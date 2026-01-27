import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface SlideElement {
    id: string;
    type: string;
    content: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    style: {
        fontSize?: string;
        fontWeight?: string;
        color?: string;
        backgroundColor?: string;
        textAlign?: string;
    };
    zIndex: number;
}

export interface BannerSlide {
    id: number;
    name: string;
    background_image: string | null;
    background_color: string;
    elements: SlideElement[];
    url: string | null;
    target: string;
}

interface BannerItemProps {
    slide: BannerSlide;
    className?: string;
}

export function BannerItem({ slide, className = '' }: BannerItemProps) {
    // Extract title, subtitle, and price from elements
    const titleElement = slide.elements?.find(el => el.id?.includes('title'));
    const subtitleElement = slide.elements?.find(el => el.id?.includes('subtitle'));
    const priceElement = slide.elements?.find(el => el.id?.includes('price'));

    return (
        <Link
            href={slide.url || '/san-pham'}
            target={slide.target || '_self'}
            className={`
                relative overflow-hidden rounded-2xl flex flex-col justify-start
                h-[200px] group cursor-pointer transition-all duration-300
                hover:shadow-lg hover:-translate-y-1
                ${className}
            `}
            style={{
                backgroundColor: slide.background_color || '#f5f5f5',
                backgroundImage: slide.background_image ? `url(${slide.background_image})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center right',
            }}
        >
            {/* Content overlay */}
            <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                <div>
                    {/* Title */}
                    {titleElement && (
                        <h3
                            className="font-semibold leading-tight mb-0.5"
                            style={{
                                fontSize: titleElement.style?.fontSize || '16px',
                                color: titleElement.style?.color || '#1e3a5f',
                            }}
                        >
                            {titleElement.content}
                        </h3>
                    )}

                    {/* Subtitle */}
                    {subtitleElement && (
                        <h4
                            className="font-bold leading-tight"
                            style={{
                                fontSize: subtitleElement.style?.fontSize || '22px',
                                color: subtitleElement.style?.color || '#dc2626',
                            }}
                        >
                            {subtitleElement.content}
                        </h4>
                    )}

                    {/* Price */}
                    {priceElement && (
                        <p
                            className="mt-2 text-sm"
                            style={{
                                color: priceElement.style?.color || '#374151',
                            }}
                        >
                            {priceElement.content}
                        </p>
                    )}
                </div>

                {/* Shop Now Button */}
                <Button
                    variant="default"
                    size="sm"
                    className="w-fit bg-teal-600 hover:bg-teal-700 text-white rounded-full px-4 py-2 text-xs font-medium group-hover:bg-teal-700 transition-colors"
                >
                    Shop Now <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
            </div>
        </Link>
    );
}
