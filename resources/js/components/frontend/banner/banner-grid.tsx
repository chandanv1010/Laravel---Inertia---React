import { usePage } from '@inertiajs/react';
import { BannerItem, BannerSlide } from './banner-item';

interface BannerData {
    id: number;
    name: string;
    slides: BannerSlide[];
}

interface Props {
    bannerCode?: string;
}

export function BannerGrid({ bannerCode = 'home-banner' }: Props) {
    const { banners } = usePage<any>().props;

    const banner: BannerData | null = banners?.[bannerCode] || null;
    const slides = banner?.slides || [];

    if (slides.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {slides.slice(0, 4).map((slide) => (
                <BannerItem key={slide.id} slide={slide} />
            ))}
        </div>
    );
}
