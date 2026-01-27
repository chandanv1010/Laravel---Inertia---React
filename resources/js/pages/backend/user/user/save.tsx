import { useMemo, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type User, type BreadcrumbItem, type PageConfig } from '@/types';
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
import user from '@/routes/user';
import CustomDatePicker from '@/components/custom-date-picker';
import useFormDateEmitter from '@/hooks/use-form-data-emitter';
import { MultiSelect } from '@/components/custom-multiple-select';
import { UserCatalogue } from '../user_catalogue/save';
import { setPreserveState } from '@/lib/helper';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới Thành Viên',
        href: '/',
    }
];

const pageConfig: PageConfig<User> = {
    heading: 'Quản lý Thành Viên',
}



interface UserSaveProps {
    record?: User,
    userCatalogues: UserCatalogue[]
}
export default function UserSave({record, userCatalogues}: UserSaveProps) {


    const buttonAction = useRef("")
    const isEdit = !!record
    const {
        formDataEmitter,
        handleEmitterChange
    } = useFormDateEmitter()

    const userCatalogueOptions = useMemo(() => {

        return userCatalogues.map(item => ({
            label: item.name,
            value: item.id.toString()
        }))

    }, [userCatalogues]);

   
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
                                    isEdit ? user.update(record.id) : user.store()
                                }
                                method="post"
                                resetOnSuccess={['name', 'canonical', 'description']}
                                 
                                transform={(data) => ({ 
                                    ...data,
                                    ...formDataEmitter,
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
                                                    <Label htmlFor="name" className="mb-[10px]">Tên thành viên</Label>
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
                                                    <Label htmlFor="email" className="mb-[10px]">Email</Label>
                                                    <Input
                                                        id="email"
                                                        type="text"
                                                        name="email"
                                                        autoFocus
                                                        tabIndex={1}
                                                        autoComplete=""
                                                        placeholder=""
                                                        defaultValue={record?.email}
                                                    />
                                                    <InputError message={errors.email} className="mt-[5px]" />
                                                </div>
                                            </div>
                                            {!isEdit && (
                                                <div className="grid grid-cols-2 gap-4 mb-[20px]">
                                                    <div className="col-span-1">
                                                        <Label htmlFor="password" className="mb-[10px]">Mật khẩu</Label>
                                                        <Input
                                                            id="password"
                                                            type="password"
                                                            name="password"
                                                            autoFocus
                                                            tabIndex={1}
                                                            autoComplete=""
                                                            placeholder=""
                                                        />
                                                        <InputError message={errors.password} className="mt-[5px]" />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <Label htmlFor="password_confirm" className="mb-[10px]">Xác nhận Mật khẩu</Label>
                                                        <Input
                                                            id="password_confirm"
                                                            type="password"
                                                            name="password_confirm"
                                                            autoFocus
                                                            tabIndex={1}
                                                            autoComplete=""
                                                            placeholder=""
                                                        />
                                                        <InputError message={errors.password_confirm} className="mt-[5px]" />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-4 mb-[20px]">
                                                <div className="col-span-1">
                                                    <Label htmlFor="address" className="mb-[10px]">Địa chỉ</Label>
                                                    <Input
                                                        id="address"
                                                        type="text"
                                                        name="address"
                                                        autoFocus
                                                        tabIndex={1}
                                                        autoComplete=""
                                                        placeholder=""
                                                        defaultValue={record?.address ?? ''}
                                                    />
                                                    {/* <InputError message={errors.address} className="mt-[5px]" /> */}
                                                </div>
                                                <div className="col-span-1">
                                                    <Label className="mb-[10px]">Ngày Sinh</Label>
                                                    <CustomDatePicker 
                                                        title="Chọn ngày sinh"
                                                        name="birthday"
                                                        defaultValue={record?.birthday}
                                                        onChange={handleEmitterChange}
                                                    />
                                                    {/* <InputError message={errors.birthday} className="mt-[5px]" /> */}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 mb-[20px]">
                                                <div className="col-span-1">
                                                    <Label className="mb-[10px]">Chọn nhóm thành viên</Label>
                                                    <MultiSelect
                                                        options={userCatalogueOptions}
                                                        onValueChange={(values) => handleEmitterChange('user_catalogues', values)}
                                                        defaultValue={record?.user_catalogues.map(item => item.id.toString()) ?? []}
                                                        variant="inverted"
                                                    />
                                                    <InputError message={errors.user_catalogues} className="mt-[5px]" />
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
                                                    defaultValue={record?.description ?? ''}
                                                />
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
