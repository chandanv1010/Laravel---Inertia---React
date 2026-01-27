import { useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem, type PageConfig, User } from '@/types';
import { Head, Form } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import CustomNotice from '@/components/custom-notice';
import { Button } from "@/components/ui/button"
import { LoaderCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from "@/components/ui/input"
import InputError from '@/components/input-error';
import permission from '@/routes/permission';
import { setPreserveState } from '@/lib/helper';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới Quyền hệ thống',
        href: '/',
    }
];

const pageConfig: PageConfig<Permission> = {
    heading: 'Quản lý Quyền hệ thống',
}

export interface Permission extends IDateTime{
    id: number,
    name: string,
    description: string,
    publish: string,
    canonical: string,
    creators: User
}
interface PermissionSaveProps {
    record?: Permission,
}
export default function PermissionSave({record}: PermissionSaveProps) {

    const buttonAction = useRef("")
    const isEdit = !!record

  
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading 
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />
                <div className="page-container">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-5">
                            <CustomNotice />
                        </div>
                        <div className="col-span-7">
                            <Form 
                                options={{
                                    preserveScroll: true,
                                    preserveState: setPreserveState,
                                }}  
                                action={
                                    isEdit ? permission.update(record.id) : permission.store()
                                }
                                method="post"
                                resetOnSuccess={['name', 'canonical', 'description']}
                                 
                                transform={(data) => ({ 
                                    ...data,
                                    ...(isEdit ? {_method: 'put'} : {}), 
                                    save_and_redirect: buttonAction.current
                                })}
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <CustomCard
                                            isShowHeader={true}
                                            title="Thông tin chung"
                                            description="Nhập đầy đủ các thông tin trong các trường dưới dây"
                                        >
                                            <div className="grid grid-cols-2 gap-4 mb-[20px]">
                                                <div className="col-span-1">
                                                    <Label htmlFor="email" className="mb-[10px]">Tiêu đề</Label>
                                                    <Input
                                                        id="name"
                                                        type="text"
                                                        name="name"
                                                        autoFocus
                                                        tabIndex={1}
                                                        autoComplete=""
                                                        placeholder=""
                                                        defaultValue={record?.name}
                                                    />
                                                    <InputError message={errors.name} className="mt-[5px]" />
                                                </div>
                                                <div className="col-span-1">
                                                    <Label htmlFor="canonical" className="mb-[10px]">Từ khóa</Label>
                                                    <Input
                                                        id="canonical"
                                                        type="text"
                                                        name="canonical"
                                                        autoFocus
                                                        tabIndex={1}
                                                        autoComplete=""
                                                        placeholder=""
                                                        defaultValue={record?.canonical}
                                                    />
                                                    <InputError message={errors.canonical} className="mt-[5px]" />
                                                </div>
                                            </div>
                                            <div>
                                                <Label htmlFor="description" className="mb-[10px]">Mô tả ngắn</Label>
                                                <Textarea 
                                                    name="description"
                                                    className="h-[168px]"
                                                    autoFocus
                                                    tabIndex={1}
                                                    autoComplete=""
                                                    placeholder=""
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
                                                        tabIndex={4}
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
                                    </>
                                )}
                            </Form>
                        </div>
                    </div>
                </div>
                
            </div>
        </AppLayout>
    );
}
