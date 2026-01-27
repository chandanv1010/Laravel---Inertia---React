import { Link, usePage } from '@inertiajs/react';
import { MapPin, Phone, Mail } from 'lucide-react';

interface MenuItem {
    id: number;
    name: string;
    url: string;
    target?: string;
    children?: MenuItem[];
}

interface MenuGroup {
    id: number;
    name: string;
    children: MenuItem[];
}

interface Settings {
    website_name?: string;
    website_logo?: string;
    address?: string;
    phone?: string;
    hotline?: string;
    email?: string;
    copyright?: string;
    [key: string]: unknown;
}

interface PageProps {
    settings?: Settings;
    menus?: {
        main?: MenuItem[];
        footer?: MenuGroup[];
    };
    [key: string]: unknown;
}

/**
 * Footer Component
 * Hiển thị thông tin công ty, menu links và copyright
 */
export default function Footer() {
    const { settings, menus } = usePage<PageProps>().props;

    // Settings từ database dùng keys: website_name, website_logo, address, phone, email, copyright
    const companyName = settings?.website_name || 'Marketpro';
    const companyLogo = settings?.website_logo;
    const companyAddress = settings?.address || '';
    const companyPhone = settings?.phone || settings?.hotline || '';
    const companyEmail = settings?.email || '';
    const copyright = settings?.copyright || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`;

    const footerMenus = menus?.footer || [];

    return (
        <footer className="bg-white border-t border-gray-200">
            {/* Main Footer */}
            <div className="container mx-auto px-4 py-12 md:py-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
                    {/* Company Info */}
                    <div className="col-span-2 md:col-span-3 lg:col-span-1 space-y-4">
                        {/* Logo & Name */}
                        <Link href="/" className="flex items-center gap-2">
                            {companyLogo ? (
                                <img
                                    src={companyLogo}
                                    alt={companyName}
                                    className="h-10 w-auto"
                                />
                            ) : (
                                <span className="text-xl font-bold text-[#1a9cb0]">
                                    🛒 {companyName}
                                </span>
                            )}
                        </Link>

                        <p className="text-sm text-gray-500 leading-relaxed">
                            We're Grocery Shop, an innovative team of food suppliers.
                        </p>

                        {/* Address */}
                        {companyAddress && (
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                                <span>{companyAddress}</span>
                            </div>
                        )}

                        {/* Email */}
                        {companyEmail && (
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <a
                                    href={`mailto:${companyEmail}`}
                                    className="text-sm text-[#1a9cb0] hover:underline"
                                >
                                    {companyEmail}
                                </a>
                            </div>
                        )}

                        {/* Phone */}
                        {companyPhone && (
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <a
                                    href={`tel:${companyPhone}`}
                                    className="text-sm text-[#1a9cb0] hover:underline"
                                >
                                    {companyPhone}
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Dynamic Footer Menu Groups */}
                    {footerMenus.map((group) => (
                        <div key={group.id} className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900">
                                {group.name}
                            </h4>
                            <ul className="space-y-2">
                                {group.children?.map((item) => (
                                    <li key={item.id}>
                                        <Link
                                            href={item.url || '#'}
                                            target={item.target || '_self'}
                                            className="text-sm text-gray-500 hover:text-[#1a9cb0] transition-colors"
                                        >
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {/* App Download Section (if no menu groups or as last column) */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900">
                            Shop on The Go
                        </h4>
                        <p className="text-sm text-gray-500">
                            MarketPro App is available. Get it now
                        </p>

                        {/* Store Badges */}
                        <div className="flex flex-col gap-2">
                            <a href="#" className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md text-xs hover:bg-gray-800 transition-colors">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                    <path d="M17.523 2C18.78 2 19.98 2.44 20.9 3.27L15.04 9.13C14.5 9.67 14.5 10.54 15.04 11.07L20.9 16.93C19.97 17.76 18.78 18.2 17.523 18.2H6.478C4.56 18.2 3 16.64 3 14.72V5.48C3 3.56 4.56 2 6.478 2H17.523Z" />
                                </svg>
                                <div>
                                    <div className="text-[10px] opacity-75">GET IT ON</div>
                                    <div className="font-medium">Google Play</div>
                                </div>
                            </a>
                            <a href="#" className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md text-xs hover:bg-gray-800 transition-colors">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                                </svg>
                                <div>
                                    <div className="text-[10px] opacity-75">Download on the</div>
                                    <div className="font-medium">App Store</div>
                                </div>
                            </a>
                        </div>

                        {/* Payment Methods */}
                        <div className="flex items-center gap-2 pt-4">
                            <img src="https://marketpro.template.wowtheme7.com/assets/images/thumbs/method.png" alt="Payment Methods" className="h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright Bar */}
            <div className="border-t border-gray-200">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                        <p dangerouslySetInnerHTML={{ __html: copyright }} />

                        {/* Social Links */}
                        <div className="flex items-center gap-4">
                            <a href="#" className="hover:text-[#1a9cb0] transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                                </svg>
                            </a>
                            <a href="#" className="hover:text-[#1a9cb0] transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                                </svg>
                            </a>
                            <a href="#" className="hover:text-[#1a9cb0] transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
