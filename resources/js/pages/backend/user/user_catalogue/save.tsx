import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ScrollArea } from "@/components/ui/scroll-area"
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import user_catalogue from '@/routes/user_catalogue';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Permission } from '@/pages/backend/permission/permission/save';
import { setPreserveState } from '@/lib/helper';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới nhóm thành viên',
        href: '/',
    }
];

const pageConfig: PageConfig<UserCatalogue> = {
    heading: 'Quản lý nhóm thành viên',
}

interface IPermissionModule {
    title: string,
    permissions: Permission[]
}

interface IGroupPermissions {
    [key: string]: IPermissionModule
}

const getModuleTitle = (module: string): string => {
    const moduleTitle: Record<string, string> = {
        'permission': 'Quản lý quyền',
        'user_catalogue': 'Quyền nhóm thành viên',
        'user' : 'Quyền Thành Viên',
        'log': 'Log Hệ Thống',
        'post': 'Quản lý Bài Viết',
        'post_catalogue': 'Quản lý Nhóm Bài Viết',
        'language': 'Quản lý Ngôn Ngữ'
    }

    return moduleTitle[module] || module
}


export interface UserCatalogue extends IDateTime{
    id: number,
    name: string,
    canonical: string,
    description: string,
    publish: string,
    creators: User,
    permissions: Permission[]
}
interface UserCatalogueSaveProps {
    record?: UserCatalogue,
    permissions: Permission[]
}
export default function UserCatalogueSave({record, permissions}: UserCatalogueSaveProps) {

    const buttonAction = useRef("")
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
    const [permissionCount, setPermissionCount] = useState<{selected: number, total: number}>({ selected: 0, total: 0 });
    const isEdit = !!record

    useEffect(() => {
        if(isEdit && record.permissions){
            const permissionId = record.permissions.map(p => p.id)
            setSelectedPermissions(permissionId)
        }
        
    }, [isEdit, record])

    const permissionGroup = useMemo<IGroupPermissions>(() => {
        if(!permissions) return {}
        const result = permissions.reduce((acc: IGroupPermissions, permission: Permission) => {
            const module = permission.canonical.split(':')[0]
            if(!acc[module]){
                acc[module] = {
                    title: getModuleTitle(module),
                    permissions: []
                }
            }
            acc[module].permissions.push(permission)
            return acc
        }, {})

        return result

    }, [permissions])

    const handlePermissionChange = (permissionId: number, checked: boolean) => {
        console.log(permissionId, checked);
        
        if(checked){
            setSelectedPermissions(prev => [...prev, permissionId])
        }else{
            const currentSelected = [...selectedPermissions]
            const newSelected = currentSelected.filter(id => id !== permissionId)
            setSelectedPermissions(newSelected)
        }
    }

    const handleModulePermissionChange = (permissions: Permission[], checked: boolean) => {
        const currentPermissions = [...selectedPermissions]
        let newPermissions: number[]
        const modulePermissionId = permissions.map(permission => permission.id)
        if(checked){
            newPermissions = [...currentPermissions, ...modulePermissionId]
        }else{
            newPermissions = currentPermissions.filter(id => !modulePermissionId.includes(id))
        }
        setSelectedPermissions(newPermissions)
    }

    const isModuleSelected = (permissions: Permission[]): boolean => {
        return permissions.every(permission => selectedPermissions.includes(permission.id))
    }

    const handleCancleSelectedAllPermission = () => {
        setSelectedPermissions([])
    }

    const handleSelectedAllPermission = () => {
        const permissionIds = permissions.map(permission => permission.id)
        setSelectedPermissions(permissionIds)
    }

    useEffect(() => {
        setPermissionCount(prev => ({...prev, total: permissions.length}))
    }, [permissions])

    useEffect(() => {
        setPermissionCount(prev => ({...prev, selected: selectedPermissions.length}))
    }, [selectedPermissions])


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
                                    isEdit ? user_catalogue.update(record.id) : user_catalogue.store()
                                }
                                method="post"
                                resetOnSuccess={['name', 'canonical', 'description', 'permissions']}
                                 
                                transform={(data) => ({ 
                                    ...data,
                                    permissions: selectedPermissions,
                                    ...(isEdit ? {_method: 'put'} : {}), 
                                    save_and_redirect: buttonAction.current,
                                })}
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <CustomCard
                                            isShowHeader={true}
                                            title="Thông tin chung"
                                            description="Nhập đầy đủ các thông tin trong các trường dưới dây"
                                            className="mb-[20px]"
                                        >
                                            <div className="grid grid-cols-2 gap-4 mb-[20px]">
                                                <div className="col-span-1">
                                                    <Label htmlFor="email" className="mb-[10px]">Tên nhóm thành viên</Label>
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
                                            </div>
                                            
                                            
                                        </CustomCard>
                                        <CustomCard
                                            isShowHeader={true}
                                            title="Lựa chọn quyền của nhóm thành viên"
                                            description="Lựa chọn ít nhất 1 quyền cho nhóm thành viên bằng cách tích chọn các ô lựa chọn dưới dây"
                                        >
                                            <div className="flex justify-between items-center mb-[20px]">
                                                <div className="text-sm text-blue-600">
                                                    Đã chọn: <span>{permissionCount.selected}</span>/<span>{permissionCount.total}</span> quyền
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        type="button"
                                                        variant={`ghost`}
                                                        onClick={handleCancleSelectedAllPermission}
                                                        className="text-gray-600 hover:text-gray-900 text-sm cursor-pointer"
                                                    >Bỏ chọn tất cả</Button>
                                                     <Button
                                                        type="button"
                                                        variant={`ghost`}
                                                        onClick={handleSelectedAllPermission}
                                                        className="text-blue-600 hover:text-blue-900 text-sm cursor-pointer"
                                                    >Chọn tất cả</Button>
                                                </div>
                                            </div>
                                            <InputError message={errors.permissions} className="mt-[5px]" />

                                            <ScrollArea className="h-[500px] pr-[15px]">
                                                <Accordion
                                                    type="multiple"
                                                    className="w-full"
                                                    defaultValue={["permission"]}
                                                >
                                                    {Object.entries(permissionGroup).map(([moduleKey, module]) => (
                                                        <AccordionItem 
                                                            key={moduleKey}
                                                            value={moduleKey}
                                                            className="border rounded-tl-[10px] rounded-tr-[10px]  mb-[15px] data-[state-open]:pb-[15px]"
                                                        >
                                                            <div className="flex w-full relative">
                                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-2">
                                                                    <Checkbox 
                                                                        id={`module-${moduleKey}`}
                                                                        className="size-4 rounded-[3px] cursor-pointer"
                                                                        checked={isModuleSelected(module.permissions)}
                                                                        onCheckedChange={(checked) => handleModulePermissionChange(module.permissions, checked === true)}
                                                                    />
                                                                </div>
                                                                <AccordionTrigger className='w-full  py-3 pl-12 pr-4 hover:bg-slate-50 hover:no-underline items-center'>
                                                                    <Label 
                                                                        htmlFor={`module-${moduleKey}`}
                                                                        className="text-blue font-normal cursor-pointer"
                                                                    >{module.title}</Label>
                                                                </AccordionTrigger>
                                                            </div>
                                                            <AccordionContent className="flex flex-col gap-4 text-balance px-4 py-2 border-t border-gray-200 border-b">
                                                                <div className="grid grid-cols-3 pl-10">

                                                                    {module.permissions.map(permission => (
                                                                        <div className="flex items-center space-x-2 mb-2" key={permission.id}>
                                                                            <Checkbox 
                                                                                id={`moduleKey-${permission.id}`}
                                                                                name="permissions[]"
                                                                                value={permission.id}
                                                                                checked={selectedPermissions.includes(permission.id)}
                                                                                className="size-4 rounded-[3px] cursor-pointer"
                                                                                onCheckedChange={(checked) => handlePermissionChange(permission.id, checked === true)} 
                                                                            />
                                                                            <Label
                                                                                htmlFor={`moduleKey-${permission.id}`}
                                                                                className="text-sm font-normal cursor-pointer"
                                                                            >   
                                                                                {permission.name}
                                                                            </Label>
                                                                        </div>
                                                                    ))}

                                                                    
                                                                </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    ))}
                                                </Accordion>
                                            </ScrollArea>

                                        </CustomCard>
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
