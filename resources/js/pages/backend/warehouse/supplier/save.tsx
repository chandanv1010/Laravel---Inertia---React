import { useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem, type PageConfig, type IPaginate, User } from '@/types';
import { Head, Form, router } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from "@/components/ui/button"
import { LoaderCircle, Shuffle, Eye } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from "@/components/ui/input"
import InputError from '@/components/input-error';
import { setPreserveState } from '@/lib/helper';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Combobox } from '@/components/ui/combobox';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới nhà cung cấp',
        href: '/',
    }
];

const pageConfig: PageConfig<Supplier> = {
    heading: 'Quản lý nhà cung cấp',
}

export interface Supplier extends IDateTime {
    id: number,
    name: string,
    code: string | null,
    email: string | null,
    website: string | null,
    phone: string | null,
    tax_code: string | null,
    fax: string | null,
    address: string | null,
    responsible_user_id: number | null,
    responsibleUser: User | null,
    publish: string,
    creators: User | null,
}

interface SupplierSaveProps {
    record?: Supplier,
    users?: IPaginate<User> | User[],
}

export default function SupplierSave({ record, users }: SupplierSaveProps) {
    const buttonAction = useRef("")
    const isEdit = !!record
    const [code, setCode] = useState(record?.code || '')
    const [responsibleUserId, setResponsibleUserId] = useState(record?.responsible_user_id?.toString() || '')

    const getActionUrl = () => {
        if (isEdit && record) {
            return `/backend/supplier/${record.id}`
        }
        return '/backend/supplier'
    }

    const generateRandomCode = () => {
        const prefixes = ['NCC', 'SUP', 'VENDOR', 'PROVIDER'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        const randomCode = `${prefix}${randomNum}`;
        setCode(randomCode);
    }

    const userOptions = useMemo(() => {
        // Xử lý cả 2 trường hợp: Collection (type='all') hoặc Paginator
        let usersList: User[] = []
        
        if (users) {
            // Nếu là Paginator (có property data)
            if (users && typeof users === 'object' && 'data' in users && Array.isArray((users as any).data)) {
                usersList = (users as any).data
            }
            // Nếu là Collection (array trực tiếp) - khi type='all', Inertia serialize Collection thành array
            else if (Array.isArray(users)) {
                usersList = users
            }
            // Fallback: thử access như object có data property
            else if (users && typeof users === 'object' && (users as any).data) {
                usersList = Array.isArray((users as any).data) ? (users as any).data : []
            }
        }
        
        // Debug: log để kiểm tra
        console.log('Users data:', users)
        console.log('UsersList:', usersList)
        
        return [
            { label: 'Chọn nhân viên phụ trách', value: '' },
            ...usersList.map(user => ({
                label: user.name,
                value: user.id.toString()
            }))
        ]
    }, [users])

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
                                responsible_user_id: responsibleUserId || null,
                                ...(isEdit ? { _method: 'put' } : {}),
                                save_and_redirect: buttonAction.current,
                            })}
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                        <div className="lg:col-span-9 space-y-6">
                                            <CustomCard title="Thông tin chung">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="name">Tên nhà cung cấp <span className="text-red-500">*</span></Label>
                                                        <Input
                                                            id="name"
                                                            name="name"
                                                            defaultValue={record?.name || ''}
                                                            placeholder="Nhập tên nhà cung cấp"
                                                        />
                                                        <InputError message={errors.name} className="mt-1" />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="code">Mã nhà cung cấp</Label>
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    id="code"
                                                                    name="code"
                                                                    value={code}
                                                                    onChange={(e) => {
                                                                        const upperValue = e.target.value.toUpperCase();
                                                                        setCode(upperValue);
                                                                    }}
                                                                    placeholder="Nhập mã nhà cung cấp"
                                                                    className="uppercase"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={generateRandomCode}
                                                                    className="shrink-0"
                                                                    title="Tạo mã nhà cung cấp ngẫu nhiên"
                                                                >
                                                                    <Shuffle className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <InputError message={errors.code} className="mt-1" />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="phone">Số điện thoại</Label>
                                                            <Input
                                                                id="phone"
                                                                name="phone"
                                                                defaultValue={record?.phone || ''}
                                                                placeholder="Nhập số điện thoại"
                                                            />
                                                            <InputError message={errors.phone} className="mt-1" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="email">Email</Label>
                                                            <Input
                                                                id="email"
                                                                name="email"
                                                                type="email"
                                                                defaultValue={record?.email || ''}
                                                                placeholder="Nhập email"
                                                            />
                                                            <InputError message={errors.email} className="mt-1" />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="tax_code">Mã số thuế</Label>
                                                            <Input
                                                                id="tax_code"
                                                                name="tax_code"
                                                                defaultValue={record?.tax_code || ''}
                                                                placeholder="Nhập mã số thuế"
                                                            />
                                                            <InputError message={errors.tax_code} className="mt-1" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="website">Website</Label>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-muted-foreground">https://</span>
                                                                <Input
                                                                    id="website"
                                                                    name="website"
                                                                    defaultValue={record?.website || ''}
                                                                    placeholder="Nhập website"
                                                                    className="flex-1"
                                                                />
                                                            </div>
                                                            <InputError message={errors.website} className="mt-1" />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="fax">Số fax</Label>
                                                            <Input
                                                                id="fax"
                                                                name="fax"
                                                                defaultValue={record?.fax || ''}
                                                                placeholder="Nhập số fax"
                                                            />
                                                            <InputError message={errors.fax} className="mt-1" />
                                                        </div>
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
                                        </div>

                                        <div className="lg:col-span-3 space-y-6">
                                            {isEdit && record && (
                                                <CustomCard title="Thông tin nhà cung cấp">
                                                    <div className="space-y-4">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="w-full"
                                                            onClick={() => router.get(`/backend/supplier/${record.id}/info`)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Xem thông tin nhà cung cấp
                                                        </Button>
                                                    </div>
                                                </CustomCard>
                                            )}

                                            <CustomCard title="Nhân viên phụ trách">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="responsible_user_id">Nhân viên phụ trách</Label>
                                                        <Combobox
                                                            options={userOptions}
                                                            value={responsibleUserId}
                                                            onValueChange={(value) => setResponsibleUserId(value)}
                                                            placeholder="Chọn nhân viên phụ trách"
                                                            name="responsible_user_id"
                                                        />
                                                        <InputError message={errors.responsible_user_id} className="mt-1" />
                                                    </div>
                                                </div>
                                            </CustomCard>

                                            <CustomCard title="Địa chỉ">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="address">Địa chỉ</Label>
                                                        <Input
                                                            id="address"
                                                            name="address"
                                                            defaultValue={record?.address || ''}
                                                            placeholder="Nhập địa chỉ"
                                                        />
                                                        <InputError message={errors.address} className="mt-1" />
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
                                            {isEdit ? 'Cập nhật' : 'Thêm mới'}
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
