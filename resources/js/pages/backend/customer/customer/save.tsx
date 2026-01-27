import { useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem, type PageConfig, User } from '@/types';
import { Head, Form } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from "@/components/ui/button"
import { LoaderCircle, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from "@/components/ui/input"
import InputError from '@/components/input-error';
import { setPreserveState } from '@/lib/helper';
import CustomDatePicker from '@/components/custom-date-picker';
import useFormDateEmitter from '@/hooks/use-form-data-emitter';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from '@/components/ui/alert';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới Khách hàng',
        href: '/',
    }
];

const pageConfig: PageConfig<Customer> = {
    heading: 'Quản lý Khách Hàng',
}

export interface Customer extends IDateTime {
    id: number,
    last_name: string,
    first_name: string,
    email: string,
    phone: string | null,
    date_of_birth: string | null,
    gender: 'male' | 'female' | 'other' | null,
    receive_promotional_emails: boolean,
    shipping_last_name: string | null,
    shipping_first_name: string | null,
    shipping_company: string | null,
    shipping_phone: string | null,
    shipping_country: string | null,
    shipping_postal_code: string | null,
    shipping_province: string | null,
    shipping_district: string | null,
    shipping_ward: string | null,
    shipping_address: string | null,
    use_new_address_format: boolean,
    customer_catalogue_id: number | null,
    customer_catalogue: { id: number, name: string } | null,
    notes: string | null,
    publish: string,
    creators: User,
}

interface CustomerSaveProps {
    record?: Customer,
    catalogues: Array<{ value: number, label: string }>
}

export default function CustomerSave({ record, catalogues = [] }: CustomerSaveProps) {
    const buttonAction = useRef("")
    const isEdit = !!record
    const [useNewAddress, setUseNewAddress] = useState(record?.use_new_address_format ?? true)
    const [receivePromotionalEmails, setReceivePromotionalEmails] = useState(record?.receive_promotional_emails ?? false)
    const {
        formDataEmitter,
        handleEmitterChange
    } = useFormDateEmitter()

    const catalogueOptions = useMemo(() => {
        return catalogues.map(item => ({
            label: item.label,
            value: item.value.toString()
        }))
    }, [catalogues]);

    const getActionUrl = () => {
        if (isEdit && record) {
            return `/backend/customer/${record.id}`
        }
        return '/backend/customer'
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
                            resetOnSuccess={['last_name', 'first_name', 'email', 'phone', 'date_of_birth', 'gender', 'receive_promotional_emails', 'shipping_last_name', 'shipping_first_name', 'shipping_company', 'shipping_phone', 'shipping_country', 'shipping_postal_code', 'shipping_province', 'shipping_district', 'shipping_ward', 'shipping_address', 'use_new_address_format', 'customer_catalogue_id', 'notes']}
                            transform={(data) => ({
                                ...data,
                                ...formDataEmitter,
                                use_new_address_format: useNewAddress,
                                receive_promotional_emails: receivePromotionalEmails,
                                publish: data.publish || record?.publish || '2',
                                ...(isEdit ? { _method: 'put' } : {}),
                                save_and_redirect: buttonAction.current
                            })}
                        >
                            {({ processing, errors }) => (
                                <div className="grid grid-cols-12 gap-6">
                                    <div className="col-span-9 space-y-6">
                                        {/* Thông tin cơ bản */}
                                        <CustomCard
                                            isShowHeader={true}
                                            title="Thông tin cơ bản"
                                            description="Nhập đầy đủ các thông tin trong các trường dưới đây"
                                        >
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <Label htmlFor="last_name" className="mb-2">Họ</Label>
                                                    <Input
                                                        id="last_name"
                                                        name="last_name"
                                                        placeholder="Nhập họ"
                                                        defaultValue={record?.last_name}
                                                    />
                                                    <InputError message={errors.last_name} className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label htmlFor="first_name" className="mb-2">Tên</Label>
                                                    <Input
                                                        id="first_name"
                                                        name="first_name"
                                                        placeholder="Nhập tên"
                                                        defaultValue={record?.first_name}
                                                    />
                                                    <InputError message={errors.first_name} className="mt-1" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <Label htmlFor="email" className="mb-2">Email</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        name="email"
                                                        placeholder="Nhập email"
                                                        defaultValue={record?.email}
                                                    />
                                                    <InputError message={errors.email} className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label htmlFor="phone" className="mb-2">Số điện thoại</Label>
                                                    <Input
                                                        id="phone"
                                                        name="phone"
                                                        placeholder="Nhập số điện thoại"
                                                        defaultValue={record?.phone || ''}
                                                    />
                                                    <InputError message={errors.phone} className="mt-1" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <Label className="mb-2">Ngày sinh</Label>
                                                    <CustomDatePicker
                                                        title="Ngày sinh"
                                                        name="date_of_birth"
                                                        dateFormat="yyyy-MM-dd"
                                                        defaultValue={record?.date_of_birth || null}
                                                        onChange={handleEmitterChange}
                                                    />
                                                    <InputError message={errors.date_of_birth} className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label className="mb-2">Giới tính</Label>
                                                    <div className="h-10 flex items-center">
                                                        <RadioGroup
                                                            name="gender"
                                                            defaultValue={record?.gender || undefined}
                                                            className="flex gap-6"
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="male" id="gender-male" />
                                                                <Label htmlFor="gender-male" className="cursor-pointer mb-0">Nam</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="female" id="gender-female" />
                                                                <Label htmlFor="gender-female" className="cursor-pointer mb-0">Nữ</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="other" id="gender-other" />
                                                                <Label htmlFor="gender-other" className="cursor-pointer mb-0">Khác</Label>
                                                            </div>
                                                        </RadioGroup>
                                                    </div>
                                                    <InputError message={errors.gender} className="mt-1" />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="receive_promotional_emails"
                                                        name="receive_promotional_emails"
                                                        checked={receivePromotionalEmails}
                                                        onCheckedChange={setReceivePromotionalEmails}
                                                    />
                                                    <Label htmlFor="receive_promotional_emails" className="cursor-pointer">
                                                        Nhận email quảng cáo
                                                    </Label>
                                                </div>
                                                <InputError message={errors.receive_promotional_emails} className="mt-1" />
                                            </div>
                                        </CustomCard>

                                        {/* Địa chỉ nhận hàng */}
                                        <CustomCard
                                            isShowHeader={true}
                                            title="Địa chỉ nhận hàng"
                                        >


                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <Label htmlFor="shipping_last_name" className="mb-2">Họ</Label>
                                                    <Input
                                                        id="shipping_last_name"
                                                        name="shipping_last_name"
                                                        placeholder="Nhập họ"
                                                        defaultValue={record?.shipping_last_name || ''}
                                                    />
                                                    <InputError message={errors.shipping_last_name} className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label htmlFor="shipping_first_name" className="mb-2">Tên</Label>
                                                    <Input
                                                        id="shipping_first_name"
                                                        name="shipping_first_name"
                                                        placeholder="Nhập tên"
                                                        defaultValue={record?.shipping_first_name || ''}
                                                    />
                                                    <InputError message={errors.shipping_first_name} className="mt-1" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <Label htmlFor="shipping_company" className="mb-2">Công ty</Label>
                                                    <Input
                                                        id="shipping_company"
                                                        name="shipping_company"
                                                        placeholder="Nhập tên công ty"
                                                        defaultValue={record?.shipping_company || ''}
                                                    />
                                                    <InputError message={errors.shipping_company} className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label htmlFor="shipping_phone" className="mb-2">Số điện thoại</Label>
                                                    <Input
                                                        id="shipping_phone"
                                                        name="shipping_phone"
                                                        placeholder="Nhập số điện thoại"
                                                        defaultValue={record?.shipping_phone || ''}
                                                    />
                                                    <InputError message={errors.shipping_phone} className="mt-1" />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <Label htmlFor="shipping_address" className="mb-2">Địa chỉ cụ thể</Label>
                                                <Input
                                                    id="shipping_address"
                                                    name="shipping_address"
                                                    placeholder="Nhập địa chỉ"
                                                    defaultValue={record?.shipping_address || ''}
                                                />
                                                <InputError message={errors.shipping_address} className="mt-1" />
                                            </div>
                                        </CustomCard>

                                        <div className="flex space-x-2">
                                            <Button
                                                type="submit"
                                                className="w-[150px] cursor-pointer"
                                                disabled={processing}
                                                onClick={() => (buttonAction.current = '')}
                                            >
                                                {processing && (
                                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                                )}
                                                Lưu lại
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
                                                Lưu lại và đóng
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="col-span-3 space-y-6">
                                        {/* Nhóm khách hàng và Ghi chú */}
                                        <CustomCard
                                            isShowHeader={true}
                                            title="Thông tin bổ sung"
                                        >
                                            <div className="mb-4">
                                                <Label htmlFor="customer_catalogue_id" className="mb-2">Nhóm khách hàng</Label>
                                                <Select
                                                    name="customer_catalogue_id"
                                                    defaultValue={record?.customer_catalogue_id?.toString() || ''}
                                                >
                                                    <SelectTrigger className="w-full cursor-pointer">
                                                        <SelectValue placeholder="Chọn nhóm khách hàng" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {catalogueOptions.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <InputError message={errors.customer_catalogue_id} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label htmlFor="notes" className="mb-2">Ghi chú</Label>
                                                <Textarea
                                                    id="notes"
                                                    name="notes"
                                                    className="h-[168px]"
                                                    placeholder="Nhập ghi chú"
                                                    defaultValue={record?.notes || ''}
                                                />
                                                <InputError message={errors.notes} className="mt-1" />
                                            </div>
                                        </CustomCard>
                                    </div>
                                </div>
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
