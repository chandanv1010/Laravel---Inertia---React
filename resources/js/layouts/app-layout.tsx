import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { type SharedData } from '@/types';
import { Toaster } from "@/components/ui/sonner"
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {

    const { flash } = usePage<SharedData>().props
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {

        if (flash?.success) toast.success('Thông báo từ hệ thống', {
            description: flash.success,
            id: 'success'
        })
        if (flash?.error) toast.error('Thông báo từ hệ thống', {
            description: flash.error,
            id: 'error'
        })
        if (flash?.warning) toast.warning('Thông báo từ hệ thống', {
            description: flash.warning,
            id: 'warning'
        })
        if (flash?.info) toast.info('Thông báo từ hệ thống', {
            description: flash.info,
            id: 'info'
        })
    }, [flash])


    useEffect(() => {
        let loadingTimeout: NodeJS.Timeout | null = null;

        const handleStart = (event: { detail: { visit: { method: string; }; }; }) => {
            if (event.detail.visit.method === 'get') {
                // Debounce: Only show loading if request takes more than 250ms
                loadingTimeout = setTimeout(() => {
                    setIsLoading(true);
                }, 250);
            }
        };
        const handleFinish = (event: { detail: { visit: { method: string; }; }; }) => {
            if (event.detail.visit.method === 'get') {
                // Clear timeout if request finished before 250ms
                if (loadingTimeout) {
                    clearTimeout(loadingTimeout);
                    loadingTimeout = null;
                }
                setIsLoading(false);
            }
        };

        const unsubscribeStart = router.on('start', handleStart);
        const unsubscribeFinish = router.on('finish', handleFinish);

        return () => {
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
            }
            unsubscribeStart();
            unsubscribeFinish();
        };

    }, []);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            <div className="relative">
                {children}
                <Toaster richColors position="top-right" />
                {isLoading &&
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-block/40 z-10">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                }
            </div>

        </AppLayoutTemplate>
    )
};
