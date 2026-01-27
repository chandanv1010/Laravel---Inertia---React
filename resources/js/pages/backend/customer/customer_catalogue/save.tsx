import { useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem, type PageConfig, User } from '@/types';
import { Head, Form } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from "@/components/ui/button"
import { LoaderCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from "@/components/ui/input"
import InputError from '@/components/input-error';
import { setPreserveState } from '@/lib/helper';
import { router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới Nhóm Khách Hàng',
        href: '/',
    }
];

const pageConfig: PageConfig<CustomerCatalogue> = {
    heading: 'Quản lý Nhóm Khách Hàng',
}

export interface CustomerCatalogue extends IDateTime {
    id: number,
    name: string,
    description: string,
    order: number,
    publish: string,
    creators: User,
}

interface CustomerCatalogueSaveProps {
    record?: CustomerCatalogue,
}

export default function CustomerCatalogueSave({ record }: CustomerCatalogueSaveProps) {
    const buttonAction = useRef("")
    const isEdit = !!record

    const getActionUrl = () => {
        if (isEdit && record) {
            return `/backend/customer_catalogue/${record.id}`
        }
        return '/backend/customer_catalogue'
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
                            resetOnSuccess={['name', 'description', 'order']}
                            transform={(data) => ({
                                ...data,
                                order: data.order ? Number(data.order) : 0,
                                publish: data.publish || '2',
                                ...(isEdit ? { _method: 'put' } : {}),
                                save_and_redirect: buttonAction.current
                            })}
                        >
                            {({ processing, errors }) => (
                                <CustomCard
                                    isShowHeader={true}
                                    title="Thông tin chung"
                                    description="Nhập đầy đủ các thông tin trong các trường dưới đây"
                                    className="mb-[20px]"
                                >
                                    <div className="grid grid-cols-2 gap-4 mb-[20px]">
                                        <div className="col-span-1">
                                            <Label htmlFor="name" className="mb-[10px]">Tên nhóm khách hàng</Label>
                                            <Input
                                                id="name"
                                                type="text"
                                                name="name"
                                                autoFocus
                                                tabIndex={1}
                                                autoComplete=""
                                                placeholder="Nhập tên nhóm khách hàng"
                                                defaultValue={record?.name}
                                            />
                                            <InputError message={errors.name} className="mt-[5px]" />
                                        </div>
                                        <div className="col-span-1">
                                            <Label htmlFor="order" className="mb-[10px]">Thứ tự</Label>
                                            <Input
                                                id="order"
                                                type="number"
                                                name="order"
                                                tabIndex={2}
                                                autoComplete=""
                                                placeholder="0"
                                                defaultValue={record?.order || 0}
                                            />
                                            <InputError message={errors.order} className="mt-[5px]" />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="description" className="mb-[10px]">Mô tả</Label>
                                        <Textarea
                                            name="description"
                                            className="h-[168px]"
                                            tabIndex={3}
                                            autoComplete=""
                                            placeholder="Nhập mô tả"
                                            defaultValue={record?.description}
                                        />
                                        <InputError message={errors.description} className="mt-[5px]" />
                                    </div>

                                    <div className="mt-[20px]">
                                        <div className="flex space-x-2">
                                            <Button
                                                type="submit"
                                                className="mt-4 w-[150px] cursor-pointer"
                                                tabIndex={4}
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
                                                className="mt-4 w-[150px] cursor-pointer bg-blue-500"
                                                tabIndex={5}
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
                                </CustomCard>
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
