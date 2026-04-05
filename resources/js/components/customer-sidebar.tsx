import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { Link, usePage } from '@inertiajs/react';
import { User, Package, Lock, LogOut, LayoutDashboard, ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

import { SharedData } from '@/types';

export function CustomerSidebar() {
    const { url, props } = usePage<SharedData>();
    const { auth } = props;
    const customer = auth?.customer;
    const { state } = useSidebar();

    const navItems = [
        {
            title: 'Quay lại website',
            url: '/',
            icon: Home,
            isExternal: true,
        },
        {
            title: 'Thông tin cá nhân',
            url: '/customer/profile',
            icon: User,
        },
        {
            title: 'Đơn hàng của tôi',
            url: '/customer/orders',
            icon: Package,
        },
        {
            title: 'Đổi mật khẩu',
            url: '/customer/change-password',
            icon: Lock,
        },
    ];

    return (
        <Sidebar collapsible="icon" className="border-r border-zinc-200/60 shadow-none">
            <SidebarHeader className="p-4 border-b border-zinc-50 bg-white">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1C8EB8] text-white font-black shadow-sm">
                        {customer?.first_name?.charAt(0) || 'C'}
                    </div>
                    {state !== 'collapsed' && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="truncate text-sm font-bold text-slate-900 capitalize">
                                {customer?.last_name} {customer?.first_name}
                            </span>
                            <span className="truncate text-xs text-slate-500 font-medium lowercase">
                                {customer?.email}
                            </span>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className="p-2">
                <SidebarMenu>
                    {navItems.map((item) => {
                        const isActive = url === item.url;
                        return (
                            <SidebarMenuItem key={item.url}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    tooltip={item.title}
                                    className={cn(
                                        "h-11 rounded-md transition-all duration-200",
                                        isActive 
                                            ? "bg-[#1C8EB8]/10 text-[#1C8EB8] font-bold shadow-none" 
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <Link href={item.url}>
                                        <item.icon className="h-4.5 w-4.5" />
                                        <span className="text-[13px] tracking-tight">{item.title}</span>
                                        {isActive && state !== 'collapsed' && (
                                            <div className="ml-auto w-1 h-4 bg-[#1C8EB8] rounded-full" />
                                        )}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-2 border-t border-zinc-100">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="h-11 rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        >
                            <Link href="/signout" method="post" as="button" className="w-full">
                                <LogOut className="h-4.5 w-4.5" />
                                <span className="text-[13px] font-bold">Đăng xuất</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
