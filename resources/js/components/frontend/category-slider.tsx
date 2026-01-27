import { usePage, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { buildCategoryUrl } from '@/lib/url-helper';
import GenericSlider from '@/components/frontend/sliders/generic-slider';

interface Category {
    id: number;
    name: string;
    image: string;
    canonical?: string | null;
    product_count: number;
}

interface Props {
    categories?: Category[];
}

export default function CategorySlider({ categories: propCategories }: Props) {
    const { widgets, settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(1200);

    const preferredItemWidth = 160;
    const categories: Category[] = propCategories || widgets?.categorySlider || [];

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.parentElement?.offsetWidth || 1200);
            }
        };

        const observer = new ResizeObserver(updateWidth);
        const parent = containerRef.current?.parentElement;
        if (parent) {
            observer.observe(parent);
            updateWidth();
        }

        // Initial check if ref is not yet attached but parent exists (rare)
        if (!parent) updateWidth();

        return () => observer.disconnect();
    }, []);

    // Calculate items per view based on real container width
    const itemsPerView = Math.max(2, Math.floor(containerWidth / preferredItemWidth));

    if (categories.length === 0) return null;

    // Abbreviate long names: "Thực Phẩm Đông Lạnh" -> "TP Đông Lạnh"
    const abbreviateName = (name: string): string => {
        const words = name.split(' ');
        if (words.length >= 3 && name.length > 18) {
            const abbrev = words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
            return abbrev + ' ' + words.slice(2).join(' ');
        }
        return name;
    };

    const renderCategoryItem = (cat: Category) => (
        <Link
            href={buildCategoryUrl(cat.canonical, urlType)}
            className="flex-shrink-0 flex flex-col items-center group h-full justify-start pt-2"
        >
            {/* Circular Container */}
            <div className="w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-full bg-[#e8f9e9] flex items-center justify-center mb-4 overflow-hidden transition-transform duration-300 group-hover:shadow-lg">
                <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-20 h-20 md:w-24 md:h-24 object-contain transition-transform duration-300 group-hover:scale-110"
                />
            </div>

            {/* Category Name */}
            <h6 className="text-sm font-semibold text-[#121535] text-center line-clamp-2 mb-1 group-hover:text-[#1c799b] transition-colors px-2">
                {abbreviateName(cat.name)}
            </h6>

            {/* Product Count */}
            <span className="text-xs text-[#999999]">
                {cat.product_count}+ Products
            </span>
        </Link>
    );

    return (
        <div ref={containerRef} className="relative mt-12 mb-12">
            {/* Category Slider Content */}

            {/* Category Slider Content */}
            <div className="pb-4 pt-8">
                <GenericSlider
                    items={categories}
                    renderItem={renderCategoryItem}
                    itemsPerView={itemsPerView}
                    gap={0}
                    autoplay={true}
                    autoplayInterval={4000}
                    loop={true}
                    showArrows={true}
                />
            </div>
        </div>
    );
}
