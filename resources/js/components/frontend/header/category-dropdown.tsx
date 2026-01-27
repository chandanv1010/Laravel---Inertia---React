import { ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { usePage, Link } from '@inertiajs/react';
import { buildCategoryUrl } from '@/lib/url-helper';

interface Category {
    id: number;
    name: string;
    level: number;
    image?: string | null;
    canonical?: string | null;
}

const DEFAULT_CATEGORY_IMAGE = '/category-1.png';

export default function CategoryDropdown() {
    const { categories, settings } = usePage<any>().props;
    const [isOpen, setIsOpen] = useState(false);

    // Get URL type from settings (default to slug)
    const urlType = settings?.url_type || 'slug';

    // Safety check if categories is undefined
    const safeCategories: Category[] = Array.isArray(categories) ? categories : [];

    // Get only top-level categories for grid display
    const topLevelCategories = safeCategories.filter(c => c.level === 1);

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    className="justify-between bg-emerald-500 hover:bg-emerald-600 text-white h-11 px-4 gap-2 cursor-pointer"
                    style={{ borderRadius: '5px' }}
                >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="font-medium">Danh mục Sản phẩm</span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[440px] p-4"
                align="start"
                sideOffset={8}
                style={{ borderRadius: '5px' }}
            >
                <div className="max-h-[400px] overflow-y-auto">
                    {/* Grid layout for categories with images */}
                    {topLevelCategories.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                            {topLevelCategories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    href={buildCategoryUrl(cat.canonical, urlType)}
                                    className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                    <div className="w-10 h-10 mb-2 flex items-center justify-center">
                                        <img
                                            src={cat.image || DEFAULT_CATEGORY_IMAGE}
                                            alt={cat.name}
                                            className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = DEFAULT_CATEGORY_IMAGE;
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-center font-medium text-gray-700 group-hover:text-emerald-600 line-clamp-2">
                                        {cat.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                            Không có danh mục
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
