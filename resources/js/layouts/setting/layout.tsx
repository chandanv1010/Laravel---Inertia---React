import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

type NavItem = {
    title: string;
    href: string;
};

const sidebarNavItems: NavItem[] = [
    { title: 'Cấu hình chung', href: '/backend/setting/general' },
    { title: 'Quản lý thuế', href: '/backend/setting/tax' },
    { title: 'Phương thức thanh toán', href: '/backend/setting/payment-methods' },
    { title: 'Mẫu báo giá', href: '/backend/setting/quote-template' },

];

export default function SettingLayout({ children }: PropsWithChildren) {
    if (typeof window === 'undefined') return null;

    const currentPath = window.location.pathname;

    return (
        <div className="px-4 py-6">
            <Heading title="Setting" description="Quản lý cấu hình hệ thống" />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-64">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${item.href}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': currentPath === item.href,
                                })}
                            >
                                <Link href={item.href}>{item.title}</Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1">
                    <section className="max-w-[1100px] space-y-6">{children}</section>
                </div>
            </div>
        </div>
    );
}

