import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, User2, Settings, Notebook, Package, Container, Tag, Ticket, ArrowLeftRight, Book, Menu } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Thành Viên',
        href: '#',
        icon: User2,
        // isActive: true,
        items: [
            {
                title: 'Nhóm Thành Viên',
                url: '/backend/user_catalogue'
            },
            {
                title: 'Thành Viên',
                url: '/backend/user'
            },
            {
                title: 'Quyền',
                url: '/backend/permission'
            }
        ]

    },
    {
        title: 'Cấu Hình Chung',
        href: '#',
        icon: Settings,
        // isActive: true,
        items: [
            {
                title: 'Ngôn Ngữ',
                url: '/backend/language'
            },
            {
                title: 'Cài đặt',
                url: '/backend/setting/general'
            },
            {
                title: 'Log',
                url: '/backend/log'
            },
            {
                title: 'Router',
                url: '/backend/router'
            },
            {
                title: 'Menu',
                url: '/backend/menu'
            },
            {
                title: 'Banner & Slide',
                url: '/backend/banner'
            },
            {
                title: 'Quản lý Khối (Widget)',
                url: '/backend/widget'
            },
            {
                title: 'Đánh Giá',
                url: '/backend/review'
            }
        ]

    },
    {
        title: 'Bài Viết',
        href: '#',
        icon: Notebook,
        // isActive: true,
        items: [
            {
                title: 'Nhóm Bài Viết',
                url: '/backend/post_catalogue'
            },
            {
                title: 'Bài Viết',
                url: '/backend/post'
            }
        ]

    },
    {
        title: 'Sản Phẩm',
        href: '#',
        icon: Package,
        // isActive: true,
        items: [
            {
                title: 'Nhóm Sản Phẩm',
                url: '/backend/product_catalogue'
            },
            {
                title: 'Sản Phẩm',
                url: '/backend/product'
            },
            {
                title: 'Thương Hiệu',
                url: '/backend/product_brand'
            },
            {
                title: 'Phiên Bản Sản Phẩm',
                url: '/backend/product_variant'
            },

        ]

    },
    {
        title: 'Kho',
        href: '#',
        icon: Container,
        items: [
            {
                title: 'Quản lý Kho',
                url: '/backend/warehouse'
            },
            {
                title: 'Nhà cung cấp',
                url: '/backend/supplier'
            },
            {
                title: 'Nhập hàng',
                url: '/backend/import-order'
            },
            {
                title: 'Trả hàng NCC',
                url: '/backend/return-import-order'
            }
        ]
    },
    {
        title: 'Khách Hàng',
        href: '#',
        icon: User2,
        items: [
            {
                title: 'Nhóm Khách Hàng',
                url: '/backend/customer_catalogue'
            },
            {
                title: 'Khách Hàng',
                url: '/backend/customer'
            }
        ]
    },
    {
        title: 'Marketing',
        href: '#',
        icon: Tag,
        items: [
            {
                title: 'Khuyến Mãi',
                url: '/backend/promotion/promotion'
            },
            {
                title: 'Voucher',
                url: '/backend/voucher/voucher'
            }
        ]
    },
    {
        title: 'Sổ Quỹ',
        href: '/backend/cash-book/transaction',
        icon: Book,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
