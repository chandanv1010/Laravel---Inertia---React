import { useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem, type PageConfig, User } from '@/types';
import { Head, Form } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from "@/components/ui/button"
import { LoaderCircle, Shuffle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from "@/components/ui/input"
import InputError from '@/components/input-error';
import { setPreserveState } from '@/lib/helper';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới Kho Hàng',
        href: '/',
    }
];

const pageConfig: PageConfig<Warehouse> = {
    heading: 'Quản lý Kho Hàng',
}

export interface Warehouse extends IDateTime {
    id: number,
    name: string,
    code: string,
    address: string | null,
    phone: string | null,
    email: string | null,
    manager: string | null,
    description: string | null,
    publish: string,
    creators: User | null,
}

interface WarehouseSaveProps {
    record?: Warehouse,
}

export default function WarehouseSave({ record }: WarehouseSaveProps) {
    const buttonAction = useRef("")
    const isEdit = !!record
    const [code, setCode] = useState(record?.code || '')

    const getActionUrl = () => {
        if (isEdit && record) {
            return `/backend/warehouse/${record.id}`
        }
        return '/backend/warehouse'
    }

    const generateRandomCode = () => {
        const prefixes = ['WH', 'KHO', 'STORE', 'DEPOT'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        const randomCode = `${prefix}${randomNum}`;
        setCode(randomCode);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />
                <div className="page-container">
                    <div className="max-w-[1280px] ml-auto mr-auto">
                        <Form
                            options={{
                                preserveScroll: true,
                                preserveState: setPreserveState,
                            }}
                            action={getActionUrl()}
                            method="post"
                            transform={(data) => ({
                                ...data,
                                code: code || data.code,
                                ...(isEdit ? { _method: 'put' } : {}),
                                save_and_redirect: buttonAction.current,
                            })}
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-6">
                                            <CustomCard title="Thông tin chung">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="code">Mã Kho <span className="text-red-500">*</span></Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                id="code"
                                                                name="code"
                                                                value={code}
                                                                onChange={(e) => {
                                                                    const upperValue = e.target.value.toUpperCase();
                                                                    setCode(upperValue);
                                                                }}
                                                                placeholder="VD: MAIN, HN01"
                                                                className="uppercase"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={generateRandomCode}
                                                                className="shrink-0"
                                                                title="Tạo mã kho ngẫu nhiên"
                                                            >
                                                                <Shuffle className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <InputError message={errors.code} className="mt-1" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="name">Tên Kho <span className="text-red-500">*</span></Label>
                                                        <Input
                                                            id="name"
                                                            name="name"
                                                            defaultValue={record?.name || ''}
                                                            placeholder="Nhập tên kho hàng"
                                                        />
                                                        <InputError message={errors.name} className="mt-1" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="publish">Trạng thái</Label>
                                                        <Select 
                                                            name="publish" 
                                                            defaultValue={record?.publish || '2'}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn trạng thái" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="2">Hoạt động</SelectItem>
                                                                <SelectItem value="1">Ngừng hoạt động</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <InputError message={errors.publish} className="mt-1" />
                                                    </div>
                                                </div>
                                            </CustomCard>

                                            <CustomCard title="Thông tin quản lý">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="manager">Người quản lý</Label>
                                                        <Input
                                                            id="manager"
                                                            name="manager"
                                                            defaultValue={record?.manager || ''}
                                                            placeholder="Tên người quản lý"
                                                        />
                                                        <InputError message={errors.manager} className="mt-1" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="description">Mô tả / Ghi chú</Label>
                                                        <Textarea
                                                            id="description"
                                                            name="description"
                                                            defaultValue={record?.description || ''}
                                                            placeholder="Mô tả về kho hàng"
                                                            rows={4}
                                                        />
                                                        <InputError message={errors.description} className="mt-1" />
                                                    </div>
                                                </div>
                                            </CustomCard>
                                        </div>

                                        <div className="space-y-6">
                                            <CustomCard title="Thông tin liên hệ">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="address">Địa chỉ</Label>
                                                        <Input
                                                            id="address"
                                                            name="address"
                                                            defaultValue={record?.address || ''}
                                                            placeholder="Địa chỉ kho hàng"
                                                        />
                                                        <InputError message={errors.address} className="mt-1" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="phone">Số điện thoại</Label>
                                                        <Input
                                                            id="phone"
                                                            name="phone"
                                                            defaultValue={record?.phone || ''}
                                                            placeholder="Số điện thoại liên hệ"
                                                        />
                                                        <InputError message={errors.phone} className="mt-1" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="email">Email</Label>
                                                        <Input
                                                            id="email"
                                                            name="email"
                                                            type="email"
                                                            defaultValue={record?.email || ''}
                                                            placeholder="Email liên hệ"
                                                        />
                                                        <InputError message={errors.email} className="mt-1" />
                                                    </div>
                                                </div>
                                            </CustomCard>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 mt-6">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => window.history.back()}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="w-[150px] cursor-pointer"
                                            disabled={processing}
                                            onClick={() => (buttonAction.current = '')}
                                        >
                                            {processing && (
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                            )}
                                            {isEdit ? 'Cập nhật' : 'Tạo mới'}
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="w-[150px] cursor-pointer bg-blue-500"
                                            disabled={processing}
                                            onClick={() => (buttonAction.current = 'redirect')}
                                        >
                                            {processing && (
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                            )}
                                            Lưu và quay lại
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
