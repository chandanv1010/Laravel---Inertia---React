
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import {  User, type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { filter } from '@/constants/filter';
// import { useEffect, useMemo } from 'react';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import { PostCatalogue } from './save';
import React, {  } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import CustomPagination from '@/components/custom-pagination';
import CustomConfirmDelete from '@/components/custom-confirm-delete';
import { type SwitchState } from '@/hooks/use-switch';
import useTable from '@/hooks/use-table';
import CustomBulkAction from '@/components/custom-bulk-action';
import { postType } from '@/constants/filter';
import CustomOrderInput from '@/components/custom-order-input';
import CustomActiveFilters from '@/components/custom-active-filters';
import CustomRobotsBadge from '@/components/custom-robots-badge';
import CustomLanguageFlags from '@/components/custom-language-flags';


const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý ',
        href: '/',
    }
];


const pageConfig: PageConfig<PostCatalogue> = {
    module: 'post_catalogue',
    heading: 'Quản lý Nhóm Bài Viết',
    cardHeading: 'Bảng quản lý danh sách Nhóm Bài Viết',
    cardDescription: 'Quản lý thông tin danh sách Nhóm Bài Viết, sử dụng các chức năng để lọc dữ liệu vv...',
    filters: [...filter],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[60px] text-center' },
        { key: 'id', label: 'ID', className: 'w-[40px] text-center' },
        { key: 'name', label: 'Tên nhóm', className: 'w-[25%]' },
        { key: 'type', label: 'Loại Tin', className: 'text-center' },
        { key: 'robots', label: 'Google Index', className: 'text-center w-[120px]' },
        { key: 'order', label: 'Thứ tự', className: 'text-center w-[80px]' },
        { key: 'languages', label: 'Ngôn ngữ', className: 'text-center' },
        { key: 'creator', label: 'Người tạo', className: 'text-center' },
        { key: 'created_at', label: 'Ngày tạo', className: 'text-center' },
        { key: 'updated_at', label: 'Ngày sửa', className: 'text-center' },
        { key: 'publish', label: 'Trạng thái', className: 'text-center' },
        { key: 'actions', label: 'Thao tác', className: 'w-[120px] text-center' },
    ],
    switches: ['publish'],
}

type SwitchField = NonNullable<typeof pageConfig.switches>[number]

const TableRowComponent = React.memo(({
    item,
    switches,
    checked,
    onSwitchChange,
    onCheckItem,
    onRobotsChange,
    robotsLoading,
    robotsValues,
    languages
}: {
    item: PostCatalogue,
    switches: SwitchState<SwitchField>,
    checked: boolean,
    onSwitchChange: (id: number, field: SwitchField, currentValue: string) => void,
    onCheckItem: (id: number, checked: boolean) => void,
    onRobotsChange: (id: number, currentValue: string) => void,
    robotsLoading: Record<number, boolean>,
    robotsValues: Record<number, string>,
    languages: Array<{id: number, name: string, canonical: string, image: string}>
}) => {

    const effectivePublish = switches[item.id]?.values.publish ?? item.publish
    const loading = switches[item.id]?.loading ?? false

    return (
        <TableRow key={item.id} className={`cursor-pointer ${checked ? 'bg-[#ffc]' : ''}`}>
            <TableCell className='w-[60px]'>
                <div className="flex items-center justify-center">
                    <Input 
                        type="checkbox" 
                        className="size-4 cursor-pointer" 
                        checked={checked}
                        onChange={e => onCheckItem(item.id, e.target.checked)}
                    />
                </div>
            </TableCell>
            <TableCell className="text-center">{item.id}</TableCell>
            <TableCell>
                {item.level > 0 && '|-----'.repeat(item.level - 1)}
                {item.current_language.name}
            </TableCell>
            <TableCell className="text-center">{postType.find(p => p.value === item.type)?.label}</TableCell>
            <TableCell className="text-center">
                <div className="flex justify-center">
                    <CustomRobotsBadge
                        robots={robotsValues[item.id] ?? item.robots}
                        loading={robotsLoading[item.id]}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!robotsLoading[item.id]) {
                                const currentValue = robotsValues[item.id] ?? item.robots ?? 'index'
                                onRobotsChange(item.id, currentValue)
                            }
                        }}
                    />
                </div>
            </TableCell>
            <TableCell className="text-center">
                <div className="flex justify-center">
                    <CustomOrderInput
                        id={item.id}
                        module={pageConfig.module || ''}
                        currentValue={item.order}
                    />
                </div>
            </TableCell>
            <TableCell className="text-center">
                <CustomLanguageFlags 
                    languages={languages || []}
                    translatedLanguageIds={item.translated_language_ids || []}
                    postId={item.id}
                    module="post_catalogue"
                    variant="table"
                />
            </TableCell>
            <TableCell className="text-center">{item.creators.name}</TableCell>
            <TableCell className="text-center">{item.created_at}</TableCell>
            <TableCell className="text-center">{item.updated_at}</TableCell>
            <TableCell className="text-center">
                <div className="flex justify-center">
                    <Switch 
                        className="cursor-pointer" 
                        checked={effectivePublish === '2'} 
                        onCheckedChange={() => onSwitchChange(item.id, "publish", effectivePublish)}
                        disabled={loading}
                    />
                </div>
            </TableCell>
            <TableCell className="text-center">
                <div className="flex items-center justify-center space-x-1">
                    <Link href={`/backend/${pageConfig.module}/${item.id}/edit`}>
                        <Button type='button' className="size-7 p-0 bg-[#0088FF] cursor-pointer rounded-[5px]">
                            <Edit />
                        </Button>
                    </Link>
                    <CustomConfirmDelete
                        id={item.id}
                        module={pageConfig.module}
                    >
                        <Button type='button' className="size-7 p-0 bg-[#ed5565] cursor-pointer rounded-[5px]">
                            <Trash2 />
                        </Button>
                    </CustomConfirmDelete>
                </div>
            </TableCell>
        </TableRow>
    )
})


interface IPostCatalogueIndexProps {
    users: User[],
    records: IPaginate<PostCatalogue>,
    languages?: Array<{id: number, name: string, canonical: string, image: string}>
}
export default function PostCatalogueIndex({users, records, languages = []}: IPostCatalogueIndexProps) {

    const { filters } = useFilter({users, defaultFilters: pageConfig.filters})
    const {
        switches, 
        isAllChecked,
        selectedIds,
        handleSwitchChange,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds,
        handleRobotsChange,
        robotsLoading,
        robotsValues
     } = useTable<PostCatalogue>({pageConfig, records: records.data})
   

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl  page-wrapper">
                <CustomPageHeading 
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <CustomCard
                        isShowHeader={true}
                        title={pageConfig.cardHeading}
                        description={pageConfig.cardDescription}
                        isShowFooter={true}
                        footerChildren={
                            <CustomPagination 
                                links={records.links}
                                currentPage={records.current_page}
                            />
                        }
                    >
                        <div className="flex items-center justify-between mb-[10px]">
                            <div className="flex items-center justify-center">
                                {selectedIds.length > 0 &&  
                                    <CustomBulkAction 
                                        className="mr-[10px]"
                                        module={pageConfig.module!}
                                        selectedIds={selectedIds}
                                        setSelectedIds={setSelectedIds}
                                        actions={[
                                            {
                                                label: 'Bật Google Index',
                                                run: (ids: number[], module: string) => {
                                                    if(ids.length){
                                                        router.patch(`/backend/${module}`, {
                                                            ids: ids,
                                                            robots: 'index'
                                                        }, {
                                                            only: ['records', 'flash'],
                                                            preserveScroll: true,
                                                            preserveState: true
                                                        })
                                                    }
                                                }
                                            },
                                            {
                                                label: 'Tắt Google Index',
                                                run: (ids: number[], module: string) => {
                                                    if(ids.length){
                                                        router.patch(`/backend/${module}`, {
                                                            ids: ids,
                                                            robots: 'noindex'
                                                        }, {
                                                            only: ['records', 'flash'],
                                                            preserveScroll: true,
                                                            preserveState: true
                                                        })
                                                    }
                                                }
                                            }
                                        ]}
                                    />
                                }
                                <CustomFilter 
                                    filters={filters}
                                />
                            </div>
                            <Link href={`/backend/${pageConfig.module}/create`}>
                                <Button className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                    <PlusCircle />
                                    Thêm bản ghi mới
                                </Button>
                            </Link>
                        </div>
                        <CustomActiveFilters filters={filters} />
                        <CustomTable 
                            data={records.data}
                            columns={[
                                {
                                    key: 'checkbox',
                                    label: (
                                        <Input 
                                            type="checkbox"
                                            className="size-4 cursor-pointer"
                                            checked={isAllChecked}
                                            onChange={(e) => handleCheckAll(e.target.checked)}
                                        />
                                    ),
                                    className: 'w-[60px] text-center'
                                },
                                ...(pageConfig.columns ?? []).filter(c => c.key !== 'checkbox')
                            ]}
                            render={(item: PostCatalogue) => 
                                <TableRowComponent 
                                    key={item.id}
                                    item={item}
                                    switches={switches}
                                    checked={selectedIds.includes(item.id)}
                                    onSwitchChange={handleSwitchChange}
                                    onCheckItem={handleCheckItem}
                                    onRobotsChange={handleRobotsChange}
                                    robotsLoading={robotsLoading}
                                    robotsValues={robotsValues}
                                    languages={languages}
                                />
                            }
                        />
                        
                    </CustomCard>
                </div>
            </div>
        </AppLayout>
    );
}
