import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import SettingLayout from '@/layouts/setting/layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Mẫu báo giá', href: '/backend/setting/quote-template' },
];

export default function QuoteTemplateSettingPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mẫu báo giá" />
            <SettingLayout>
                <HeadingSmall title="Mẫu báo giá" description="Khung cấu hình (sẽ triển khai sau)" />
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Mẫu báo giá</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Mục này đang là khung. Khi bạn chốt template (logo, footer, điều khoản), mình sẽ lưu vào settings và render PDF/print.
                    </CardContent>
                </Card>
            </SettingLayout>
        </AppLayout>
    );
}

