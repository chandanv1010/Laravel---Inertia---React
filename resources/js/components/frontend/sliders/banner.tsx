import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { usePage, Link } from '@inertiajs/react';

interface Slide {
    id: number;
    name: string;
    background_image: string | null;
    background_color: string;
    elements: any[];
    url: string | null;
    target: string;
}

interface BannerData {
    id: number;
    name: string;
    slides: Slide[];
}

interface Props {
    bannerCode?: string; // 'promo' by default
}

// Color themes for fallback
const colorThemes = [
    { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', hover: 'group-hover:text-indigo-600' },
    { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', hover: 'group-hover:text-orange-600' },
    { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600', hover: 'group-hover:text-green-600' },
    { bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-600', hover: 'group-hover:text-pink-600' },
];

export default function Banner({ bannerCode = 'promo' }: Props) {
    const { banners } = usePage<any>().props;

    const banner: BannerData | null = banners?.[bannerCode] || null;
    const slides = banner?.slides || [];

    if (slides.length === 0) {
        // Fallback static banners
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: 'Tasty Snack', subtitle: 'Snack for\nEveryday', theme: 0 },
                    { title: 'Breakfast', subtitle: 'Healthy\nMorning', theme: 1 },
                    { title: 'Fresh', subtitle: 'Veggies\n& Fruits', theme: 2 },
                ].map((item, idx) => {
                    const theme = colorThemes[item.theme];
                    return (
                        <Link
                            key={idx}
                            href="/san-pham"
                            className={`relative overflow-hidden rounded-xl ${theme.bg} p-6 flex flex-col justify-center h-[200px] border ${theme.border} group cursor-pointer`}
                        >
                            <div className="z-10 relative">
                                <span className={`${theme.text} font-bold text-sm tracking-wide uppercase mb-2 block`}>
                                    {item.title}
                                </span>
                                <h3 className="text-2xl font-bold text-slate-800 mb-4 whitespace-pre-line">
                                    {item.subtitle}
                                </h3>
                                <Button variant="link" className={`p-0 text-slate-600 ${theme.hover} transition-colors`}>
                                    Shop Now <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </Link>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {slides.slice(0, 4).map((slide, idx) => {
                const theme = colorThemes[idx % colorThemes.length];

                return (
                    <Link
                        key={slide.id}
                        href={slide.url || '/san-pham'}
                        target={slide.target || '_self'}
                        className={`relative overflow-hidden rounded-xl p-6 flex flex-col justify-center h-[200px] border group cursor-pointer ${theme.border}`}
                        style={{
                            backgroundColor: slide.background_color || undefined,
                            backgroundImage: slide.background_image ? `url(${slide.background_image})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="z-10 relative">
                            <span className={`${theme.text} font-bold text-sm tracking-wide uppercase mb-2 block`}>
                                {slide.name}
                            </span>
                            <Button variant="link" className={`p-0 text-slate-600 ${theme.hover} transition-colors`}>
                                Shop Now <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>

                        {/* Overlay for better text readability when background image exists */}
                        {slide.background_image && (
                            <div className="absolute inset-0 bg-white/30 group-hover:bg-white/40 transition-colors" />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
