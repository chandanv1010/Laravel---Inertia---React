
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import product from '@/routes/product';
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
import { Product } from './save';
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import CustomPagination from '@/components/custom-pagination';
import CustomConfirmDelete from '@/components/custom-confirm-delete';
import { type SwitchState } from '@/hooks/use-switch';
import useTable from '@/hooks/use-table';
import CustomBulkAction from '@/components/custom-bulk-action';
import CustomOrderInput from '@/components/custom-order-input';
import CustomActiveFilters from '@/components/custom-active-filters';
import CustomCatalogueBadges from '@/components/custom-catalogue-badges';
import CustomRobotsBadge from '@/components/custom-robots-badge';
import CustomLanguageFlags from '@/components/custom-language-flags';

function toThumb(url: string, opts: { w: number; h?: number }) {
    if (!url) return ''
    // Don't touch data/blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) return url

    // Only generate thumbnails for images stored in our system under /userfiles/*
    // If the image is on another domain (CDN/remote), keep original URL (no /thumb).
    try {
        const parsed = new URL(url, window.location.origin)
        // external domain => keep as-is (no thumbnail)
        if (parsed.origin !== window.location.origin && !parsed.pathname.startsWith('/userfiles/')) {
            return url
        }
        // system upload => use pathname to avoid host mismatch (localhost vs 127.0.0.1)
        if (parsed.pathname.startsWith('/userfiles/')) {
            url = parsed.pathname
        } else {
            // same-origin but not /userfiles => don't proxy
            return url
        }
    } catch {
        // If it's not a valid URL and not a /userfiles path, don't proxy
        if (!url.startsWith('/userfiles/')) return url
    }
    const params = new URLSearchParams()
    params.set('src', url)
    params.set('w', String(opts.w))
    if (opts.h) params.set('h', String(opts.h))
    params.set('fit', 'crop')
    params.set('q', '80')
    return `/thumb?${params.toString()}`
}


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


const pageConfig: PageConfig<Product> = {
    module: 'product',
    heading: 'Quản lý Sản Phẩm',
    cardHeading: 'Bảng quản lý danh sách Sản Phẩm',
    cardDescription: 'Quản lý thông tin danh sách Sản Phẩm, sử dụng các chức năng để lọc dữ liệu vv...',
    filters: [...filter],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[50px]', sortable: false },
        { key: 'id', label: 'ID', className: 'w-[40px]', sortable: true },
        { key: 'info', label: 'Thông tin sản phẩm', className: 'w-[35%]', sortable: false },
        { key: 'stock', label: 'Có thể bán', className: 'w-[120px] text-center', sortable: false },
        { key: 'order', label: 'Thứ tự', className: 'w-[100px] text-center', sortable: true },
        { key: 'languages', label: 'Ngôn ngữ', className: 'text-center w-[150px]', sortable: false },
        { key: 'robots', label: 'Google Index', className: 'text-center w-[120px]', sortable: true },
        { key: 'publish', label: 'Trạng thái', className: 'text-center', sortable: true },
        { key: 'actions', label: 'Thao tác', className: 'w-[120px] text-center', sortable: false },
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
    item: Product,
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
            <TableCell className='font-medium w-[50px] whitespace-nowrap'>
                <Input 
                    type="checkbox" 
                    className="size-4 cursor-pointer" 
                    checked={checked}
                    onChange={e => onCheckItem(item.id, e.target.checked)}
                />
            </TableCell>
            <TableCell className="whitespace-nowrap">{item.id}</TableCell>
            <TableCell>
                <div className="flex items-start gap-3">
                    {/* Ảnh demo bên trái - tỉ lệ 16:9 */}
                    <div className="w-20 h-12 flex-shrink-0 rounded-md overflow-hidden bg-muted aspect-video">
                        <img 
                            src={toThumb(item.image || '', { w: 150, h: 50 })}
                            srcSet={`${toThumb(item.image || '', { w: 80, h: 50 })} 80w, ${toThumb(item.image || '', { w: 150, h: 50 })} 150w`}
                            sizes="80px"
                            loading="lazy"
                            decoding="async"
                            alt={item.name || 'Product image'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                            }}
                        />
                        <div className="w-full h-full hidden items-center justify-center bg-muted text-muted-foreground text-xs font-medium">
                            {String(item.name || 'N/A').charAt(0).toUpperCase()}
                        </div>
                    </div>
                    {/* Tiêu đề và danh mục bên phải */}
                    <div className="flex-1 min-w-0">
                        <div className="font-light text-sm mb-2 line-clamp-2">
                            {item.name || 'N/A'}
                        </div>
                        {/* Danh mục dưới dạng tags */}
                        <CustomCatalogueBadges 
                            catalogues={item.product_catalogues || []} 
                            catalogueFieldName="product_catalogue_id"
                        />
                    </div>
                </div>
            </TableCell>
            {/* Có thể bán - Stock quantity */}
            <TableCell className="text-center whitespace-nowrap">
                <div className="flex flex-col items-center">
                    <span className="text-blue-600 font-medium">{item.stock_quantity ?? 0}</span>
                    {(item.variant_count ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground">({item.variant_count} phiên bản)</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-center">
                <CustomOrderInput
                    id={item.id}
                    module={pageConfig.module || ''}
                    currentValue={item.order}
                />
            </TableCell>
            <TableCell className="text-center">
                <CustomLanguageFlags 
                    languages={languages || []}
                    translatedLanguageIds={item.translated_language_ids || []}
                    postId={item.id}
                    module={pageConfig.module || 'product'}
                />
            </TableCell>
            <TableCell className="text-center">
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
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <Switch 
                    className="cursor-pointer" 
                    checked={effectivePublish === '2'} 
                    onCheckedChange={() => onSwitchChange(item.id, "publish", effectivePublish)}
                    disabled={loading}
                />
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <div className="flex items-center justify-center space-x-1">
                    <Link href={product.edit(item.id).url}>
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


interface IProductIndexProps {
    users: User[],
    records: IPaginate<Product>,
    catalogues?: Array<{value: string, label: string}>,
    languages?: Array<{id: number, name: string, canonical: string, image: string}>
}
export default function ProductIndex({users, records, catalogues = [], languages = []}: IProductIndexProps) {

    const { filters } = useFilter({
        users, 
        defaultFilters: pageConfig.filters,
        catalogues: catalogues.length > 0 ? catalogues : undefined,
        catalogueFieldName: 'product_catalogue_id' // Sử dụng product_catalogue_id cho products
    })
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
     } = useTable<Product>({pageConfig, records: records.data})
    


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
                        <div className="flex flex-col mb-[10px]">
                            <div className="flex items-center justify-between">
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
                        </div>
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
                                    className: 'w-[50px]'
                                },
                                ...(pageConfig.columns ?? []).filter(c => c.key !== 'checkbox')
                            ]}
                            render={(item: Product) => 
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

