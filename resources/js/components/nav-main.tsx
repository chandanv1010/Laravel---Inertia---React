import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';




import { ChevronRight, ChevronDown } from 'lucide-react';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const { url } = page
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({})
    const initializedRef = useRef(false)
    
    // Chỉ khởi tạo một lần khi component mount - mở item active hiện tại
    useEffect(() => {
        if (!initializedRef.current) {
            const newOpenItems: Record<string, boolean> = {}
            items.forEach((item, index) => {
                if(item.items){
                    // Kiểm tra xem URL có match với bất kỳ subItem nào không
                    const isActiveBySubItem = item.items.some(subItem => url.startsWith(subItem.url))
                    
                    // Đặc biệt cho "Cấu Hình Chung": mở nếu URL bắt đầu bằng /backend/setting/ (bao gồm payment-methods, tax, etc.)
                    const isActiveBySetting = item.title === 'Cấu Hình Chung' && url.startsWith('/backend/setting/')
                    
                    // Đặc biệt cho "Cấu Hình Chung": mở nếu URL bắt đầu bằng /backend/payment-methods
                    const isActiveByPayment = item.title === 'Cấu Hình Chung' && url.startsWith('/backend/payment-methods')
                    
                    // Đặc biệt cho "Cấu Hình Chung": mở nếu URL bắt đầu bằng /backend/language, /backend/log, /backend/router
                    const isActiveByOther = item.title === 'Cấu Hình Chung' && (
                        url.startsWith('/backend/language') || 
                        url.startsWith('/backend/log') || 
                        url.startsWith('/backend/router')
                    )
                    
                    if(isActiveBySubItem || isActiveBySetting || isActiveByPayment || isActiveByOther){
                        newOpenItems[index.toString()] = true
                    }
                }
            })
            setOpenItems(newOpenItems)
            initializedRef.current = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Chỉ chạy một lần khi mount, không phụ thuộc vào url hay items
    
    // Cập nhật lại khi URL thay đổi để tự động mở menu tương ứng
    useEffect(() => {
        const newOpenItems: Record<string, boolean> = {}
        items.forEach((item, index) => {
            if(item.items){
                // Kiểm tra xem URL có match với bất kỳ subItem nào không
                const isActiveBySubItem = item.items.some(subItem => url.startsWith(subItem.url))
                
                // Đặc biệt cho "Cấu Hình Chung": mở nếu URL bắt đầu bằng /backend/setting/ (bao gồm payment-methods, tax, etc.)
                const isActiveBySetting = item.title === 'Cấu Hình Chung' && url.startsWith('/backend/setting/')
                
                // Đặc biệt cho "Cấu Hình Chung": mở nếu URL bắt đầu bằng /backend/payment-methods
                const isActiveByPayment = item.title === 'Cấu Hình Chung' && url.startsWith('/backend/payment-methods')
                
                // Đặc biệt cho "Cấu Hình Chung": mở nếu URL bắt đầu bằng /backend/language, /backend/log, /backend/router
                const isActiveByOther = item.title === 'Cấu Hình Chung' && (
                    url.startsWith('/backend/language') || 
                    url.startsWith('/backend/log') || 
                    url.startsWith('/backend/router')
                )
                
                // Đặc biệt cho "Marketing": mở nếu URL bắt đầu bằng /backend/promotion
                const isActiveByPromotion = item.title === 'Marketing' && url.startsWith('/backend/promotion')
                
                if(isActiveBySubItem || isActiveBySetting || isActiveByPayment || isActiveByOther || isActiveByPromotion){
                    newOpenItems[index.toString()] = true
                }
            }
        })
        setOpenItems(newOpenItems)
    }, [url, items])

    const toggleNav = (index: string) => {
        setOpenItems(prev => {
            // Nếu click vào mục đã mở, không làm gì (không toggle)
            if (prev[index]) {
                return prev
            }
            // Nếu click vào mục khác, đóng tất cả và mở mục mới
            return {
                [index]: true
            }
        })
    }

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item, index) => {
                    const isOpen = openItems[index.toString()] || false
                    let isActive = false
                    if (item.items) {
                        isActive = item.items.some(subItem => {
                            if (url.startsWith(subItem.url)) {
                                return true
                            }
                            // Đặc biệt cho "Cấu Hình Chung": active nếu URL bắt đầu bằng /backend/setting/
                            if (item.title === 'Cấu Hình Chung' && url.startsWith('/backend/setting/')) {
                                return true
                            }
                            // Đặc biệt cho "Cấu Hình Chung": active nếu URL bắt đầu bằng /backend/payment-methods
                            if (item.title === 'Cấu Hình Chung' && url.startsWith('/backend/payment-methods')) {
                                return true
                            }
                            // Đặc biệt cho "Cấu Hình Chung": active nếu URL bắt đầu bằng /backend/language, /backend/log, /backend/router
                            if (item.title === 'Cấu Hình Chung' && (
                                url.startsWith('/backend/language') || 
                                url.startsWith('/backend/log') || 
                                url.startsWith('/backend/router')
                            )) {
                                return true
                            }
                            // Đặc biệt cho "Marketing": active nếu URL bắt đầu bằng /backend/promotion
                            if (item.title === 'Marketing' && url.startsWith('/backend/promotion')) {
                                return true
                            }
                            return false
                        })
                    } else {
                        isActive = url === item.href
                    }  


                    return (
                        <SidebarMenuItem key={item.title}>
                            {item.items && item.items.length > 0 
                                ? (
                                    <Collapsible
                                        open={isOpen}
                                        // onOpenChange={() => toggleNav(index.toString())}
                                        className="cursor-pointer"
                                    >
                                        <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                            isActive={isActive}
                                            tooltip={{ children: item.title }}
                                            onClick={() => toggleNav(index.toString())}
                                            className="cursor-pointer"
                                        >
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                            {isOpen ? <ChevronDown className="ml-auto transition-transform duration-200 group-date-[state-open]/collapsible:rotate-90" /> : <ChevronRight className="ml-auto transition-transform duration-200 group-date-[state-open]/collapsible:rotate-90"></ChevronRight>}
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent 
                                        className="CollapsibleContent"
                                    >
                                        <SidebarMenuSub>
                                            {item.items?.map((subItem) => (
                                                <SidebarMenuSubItem key={subItem.title}>
                                                    <SidebarMenuSubButton asChild>
                                                        {/* <a href={subItem.url}><span>{subItem.title}</span></a> */}
                                                        <Link href={subItem.url}><span>{subItem.title}</span></Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                    </Collapsible>
                                )
                                : (
                                    <SidebarMenuButton
                                        asChild
                                        isActive={page.url.startsWith(
                                            typeof item.href === 'string'
                                                ? item.href
                                                : item.href.url,
                                        )}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href} prefetch>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                )}
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}


