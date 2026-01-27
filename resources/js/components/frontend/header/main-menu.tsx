/**
 * Main Menu Component
 * 
 * Renders the main navigation menu with dropdown support for nested items.
 * Uses buildMenuUrl helper to append .html to internal links.
 * External links (http/https) are preserved as-is.
 */

import { ChevronDown, ChevronRight, Phone } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { buildMenuUrl } from '@/lib/url-helper';

interface MenuItem {
    id: number;
    name: string;
    url: string | null;
    target: string;
    icon?: string | null;
    children: MenuItem[];
}

interface Props {
    className?: string;
}

export default function MainMenu({ className = '' }: Props) {
    const { menus, settings } = usePage<any>().props;
    const [openMenu, setOpenMenu] = useState<number | null>(null);

    const menuItems: MenuItem[] = menus?.main || [];
    const hotline = settings?.hotline || '';
    const urlType = settings?.url_type || 'slug';

    const getMenuHref = (url: string | null) => buildMenuUrl(url, urlType);

    if (menuItems.length === 0) {
        return (
            <nav className={`flex items-center gap-6 ${className}`}>
                <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
                    Trang chủ
                </Link>
                <Link href="/san-pham.html" className="text-sm font-medium hover:text-primary transition-colors">
                    Sản phẩm
                </Link>
                <Link href="/bai-viet.html" className="text-sm font-medium hover:text-primary transition-colors">
                    Tin tức
                </Link>
                <Link href="/lien-he.html" className="text-sm font-medium hover:text-primary transition-colors">
                    Liên hệ
                </Link>
                {hotline && (
                    <div className="ml-auto hidden xl:flex items-center text-sm font-bold text-foreground gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="text-primary">Hotline:</span>
                        <span>{hotline}</span>
                    </div>
                )}
            </nav>
        );
    }

    return (
        <div className={`flex items-center justify-between w-full ${className}`}>
            <nav className="flex items-center gap-1">
                {menuItems.map((item) => (
                    <div
                        key={item.id}
                        className="relative"
                        onMouseEnter={() => setOpenMenu(item.id)}
                        onMouseLeave={() => setOpenMenu(null)}
                    >
                        {item.children.length > 0 ? (
                            <>
                                <Link
                                    href={getMenuHref(item.url)}
                                    target={item.target}
                                    className="flex items-center gap-1 text-sm font-medium h-9 px-3 rounded-md hover:bg-gray-100 transition-colors"
                                >
                                    {item.name}
                                    <ChevronDown className="h-3 w-3" />
                                </Link>

                                <div
                                    className={`
                                        absolute left-0 top-full w-[220px] bg-white border rounded-md shadow-lg z-50
                                        transition-all duration-150 ease-out
                                        ${openMenu === item.id
                                            ? 'opacity-100 translate-y-0 visible'
                                            : 'opacity-0 translate-y-2 invisible'
                                        }
                                    `}
                                >
                                    <ul className="py-1">
                                        {item.children.map((child, idx) => (
                                            <li
                                                key={child.id}
                                                className={idx !== item.children.length - 1 ? 'border-b border-gray-100' : ''}
                                            >
                                                {child.children.length > 0 ? (
                                                    <div className="group relative">
                                                        <Link
                                                            href={getMenuHref(child.url)}
                                                            target={child.target}
                                                            className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                                                        >
                                                            {child.name}
                                                            <ChevronRight className="h-3 w-3 text-gray-400" />
                                                        </Link>
                                                        <div className="invisible group-hover:visible absolute left-full top-0 w-[200px] bg-white border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-150 z-50">
                                                            <ul className="py-1">
                                                                {child.children.map((subChild, subIdx) => (
                                                                    <li
                                                                        key={subChild.id}
                                                                        className={subIdx !== child.children.length - 1 ? 'border-b border-gray-100' : ''}
                                                                    >
                                                                        <Link
                                                                            href={getMenuHref(subChild.url)}
                                                                            target={subChild.target}
                                                                            className="block px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            {subChild.name}
                                                                        </Link>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        href={getMenuHref(child.url)}
                                                        target={child.target}
                                                        className="block px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                                                    >
                                                        {child.name}
                                                    </Link>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <Link
                                href={getMenuHref(item.url)}
                                target={item.target}
                                className="inline-flex items-center justify-center text-sm font-medium h-9 px-3 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                {item.name}
                            </Link>
                        )}
                    </div>
                ))}
            </nav>

            {hotline && (
                <div className="hidden xl:flex items-center text-sm font-bold text-foreground gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="text-primary">Hotline:</span>
                    <a href={`tel:${hotline}`} className="hover:text-primary transition-colors">
                        {hotline}
                    </a>
                </div>
            )}
        </div>
    );
}
