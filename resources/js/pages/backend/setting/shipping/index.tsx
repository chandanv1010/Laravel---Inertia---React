import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import SettingLayout from '@/layouts/setting/layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cấu hình vận chuyển', href: '/backend/setting/shipping' },
];

export default function ShippingSettingPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cấu hình vận chuyển" />
            <SettingLayout>
                <HeadingSmall title="Cấu hình vận chuyển" description="Khung cấu hình (sẽ triển khai sau)" />
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Cấu hình vận chuyển</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Mục này đang là khung. Khi bạn cần hãng vận chuyển/fee rule, mình sẽ triển khai theo settings + service riêng.
                    </CardContent>
                </Card>
            </SettingLayout>
        </AppLayout>
    );
}

