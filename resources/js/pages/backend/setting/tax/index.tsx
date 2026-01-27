import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingLayout from '@/layouts/setting/layout';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type TaxSetting = {
    enabled: boolean;
    price_includes_tax: boolean;
    default_tax_on_sale: boolean;
    default_tax_on_purchase: boolean;
    sale_tax_rate: number;
    purchase_tax_rate: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Thuế', href: '/backend/setting/tax' },
];

export default function TaxSettingPage({ tax }: { tax: TaxSetting }) {
    const { errors }: any = usePage().props;
    // UI should enable/disable fields immediately when toggling "enabled"
    const [enabled, setEnabled] = useState(!!tax.enabled);
    const disabled = !enabled;
    const helperText = useMemo(
        () => 'Bạn có thể thiết lập riêng mức thuế cho nhập hàng và bán hàng, hỗ trợ chính xác đến 2 chữ số thập phân.',
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Thuế" />

            <SettingLayout>
                <div className="flex items-center justify-between mb-4">
                    <HeadingSmall title="Thuế" description="Cấu hình thuế áp dụng trong hệ thống" />
                </div>

                <div className="mb-4 rounded-md border bg-blue-50 px-4 py-3 text-sm">
                    <div className="font-medium">Cập nhật cấu hình thuế linh hoạt</div>
                    <div className="text-muted-foreground">{helperText}</div>
                </div>

                <Form
                    action="/backend/setting/tax"
                    method="post"
                    options={{ preserveScroll: true }}
                    className="space-y-4"
                >
                    {({ processing }) => (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Cấu hình chung</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="enabled"
                                            name="enabled"
                                            defaultChecked={tax.enabled}
                                            onCheckedChange={(v) => setEnabled(!!v)}
                                        />
                                        <div className="mt-[-2px]">
                                            <Label htmlFor="enabled" className="cursor-pointer">
                                                Quản lý thông tin thuế của cửa hàng
                                            </Label>
                                            <div className="text-sm text-muted-foreground">
                                                Áp dụng cho giao dịch tạo từ trang quản trị
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="price_includes_tax"
                                            name="price_includes_tax"
                                            defaultChecked={tax.price_includes_tax}
                                            disabled={disabled}
                                        />
                                        <div className="mt-[-2px]">
                                            <Label
                                                htmlFor="price_includes_tax"
                                                className={`cursor-pointer ${disabled ? 'opacity-50' : ''}`}
                                            >
                                                Giá đã bao gồm thuế
                                            </Label>
                                            <div className="text-sm text-muted-foreground">
                                                Giá bán sản phẩm trong đơn đã bao gồm giá trị thuế.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id="default_tax_on_sale"
                                                name="default_tax_on_sale"
                                                defaultChecked={tax.default_tax_on_sale}
                                                disabled={disabled}
                                            />
                                            <div className="mt-[-2px]">
                                                <Label
                                                    htmlFor="default_tax_on_sale"
                                                    className={`cursor-pointer ${disabled ? 'opacity-50' : ''}`}
                                                >
                                                    Mặc định tính thuế khi bán hàng
                                                </Label>
                                                <div className="text-sm text-muted-foreground">
                                                    Áp dụng mặc định khi tạo đơn bán.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id="default_tax_on_purchase"
                                                name="default_tax_on_purchase"
                                                defaultChecked={tax.default_tax_on_purchase}
                                                disabled={disabled}
                                            />
                                            <div className="mt-[-2px]">
                                                <Label
                                                    htmlFor="default_tax_on_purchase"
                                                    className={`cursor-pointer ${disabled ? 'opacity-50' : ''}`}
                                                >
                                                    Mặc định tính thuế khi nhập hàng
                                                </Label>
                                                <div className="text-sm text-muted-foreground">
                                                    Áp dụng mặc định khi tạo phiếu nhập.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Thuế chung</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="purchase_tax_rate">Thuế nhập hàng *</Label>
                                        <div className="relative mt-2">
                                            <Input
                                                id="purchase_tax_rate"
                                                name="purchase_tax_rate"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                defaultValue={tax.purchase_tax_rate ?? 0}
                                                disabled={disabled}
                                                className="pr-10"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                %
                                            </span>
                                        </div>
                                        <InputError message={errors?.purchase_tax_rate} className="mt-2" />
                                    </div>

                                    <div>
                                        <Label htmlFor="sale_tax_rate">Thuế bán hàng *</Label>
                                        <div className="relative mt-2">
                                            <Input
                                                id="sale_tax_rate"
                                                name="sale_tax_rate"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                defaultValue={tax.sale_tax_rate ?? 0}
                                                disabled={disabled}
                                                className="pr-10"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                %
                                            </span>
                                        </div>
                                        <InputError message={errors?.sale_tax_rate} className="mt-2" />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end">
                                <Button disabled={processing} className="cursor-pointer">
                                    Lưu cấu hình
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </SettingLayout>
        </AppLayout>
    );
}

