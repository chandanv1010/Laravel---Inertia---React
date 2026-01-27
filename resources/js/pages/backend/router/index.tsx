import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import CustomFilter from '@/components/custom-filter';
import { filter } from '@/constants/filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import React from 'react';
import CustomActiveFilters from '@/components/custom-active-filters';
import { TableRow, TableCell } from '@/components/ui/table';
import CustomPagination from '@/components/custom-pagination';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState } from 'react';
import { RedirectModal } from './components/redirect-modal';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý Router',
        href: '/backend/router',
    }
];

interface Router {
    id: number;
    module: string;
    canonical: string;
    routerable_id: number;
    routerable_type: string;
    next_component: string;
    controller: string;
    language_id?: number;
    created_at: string;
    updated_at: string;
    routerable?: {
        id: number;
        name?: string;
    };
    redirect?: string;
    redirect_type?: number;
}

const pageConfig: PageConfig<Router> = {
    module: 'router',
    heading: 'Quản lý Router',
    cardHeading: 'Bảng quản lý danh sách Router',
    cardDescription: 'Xem và quản lý các router trong hệ thống',
    filters: [
        ...filter,
        {
            key: 'module',
            placeholder: 'Chọn module',
            defaulValue: '0',
            options: [],
            type: 'single'
        },
        {
            key: 'language_id',
            placeholder: 'Chọn ngôn ngữ',
            defaulValue: '0',
            options: [],
            type: 'single'
        }
    ],
    columns: [
        { key: 'id', label: 'ID', className: 'w-[60px]', sortable: true },
        { key: 'module', label: 'Module', className: 'w-[120px]', sortable: true },
        { key: 'canonical', label: 'Canonical', className: 'w-[300px]', sortable: true },
        { key: 'routerable_id', label: 'Routerable ID', className: 'w-[120px]', sortable: true },
        { key: 'routerable_type', label: 'Routerable Type', className: 'w-[200px]', sortable: false },
        { key: 'redirect', label: 'Redirect', className: 'w-[150px] text-center', sortable: false },
        { key: 'created_at', label: 'Ngày tạo', className: 'w-[150px] text-center', sortable: true },
    ],
}

const TableRowComponent = React.memo(({
    item,
    onRedirectClick
}: {
    item: Router;
    onRedirectClick: (item: Router) => void;
}) => {
    return (
        <TableRow key={item.id}>
            <TableCell className="whitespace-nowrap">{item.id}</TableCell>
            <TableCell>
                <Badge variant="secondary">{item.module}</Badge>
            </TableCell>
            <TableCell className="max-w-[300px] truncate" title={item.canonical}>
                {item.canonical}
            </TableCell>
            <TableCell className="whitespace-nowrap text-center">{item.routerable_id}</TableCell>
            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={item.routerable_type}>
                {item.routerable_type.split('\\').pop()}
            </TableCell>
            <TableCell className="text-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 gap-1 px-2 ${item.redirect ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => onRedirectClick(item)}
                    title={item.redirect ? `Redirected (${item.redirect_type}) to: ${item.redirect}` : 'Configure Redirect'}
                >
                    <Shuffle className="h-4 w-4" />
                    {item.redirect && <span className="text-xs font-medium">{item.redirect_type || 301}</span>}
                </Button>
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                {item.created_at ? format(new Date(item.created_at), 'dd/MM/yyyy') : ''}
            </TableCell>
        </TableRow>
    );
});

interface IRouterIndexProps {
    modules: Array<{ value: string, label: string }>;
    languages?: Array<{ id: number, name: string, image: string }>;
    records: IPaginate<Router>;
}

export default function RouterIndex({ modules, languages = [], records }: IRouterIndexProps) {
    const { request } = usePage().props as { request?: Record<string, unknown> };

    // Thêm module options và language options vào filters
    const routerFilters = React.useMemo(() => {
        // Chỉ lấy các filter cơ bản
        const baseFilters = pageConfig.filters || [];

        // Tìm và update filter module nếu có
        const moduleFilterIndex = baseFilters.findIndex(f => f.key === 'module');
        if (moduleFilterIndex !== -1 && modules.length > 0) {
            baseFilters[moduleFilterIndex].options = [
                { label: 'Tất cả module', value: '0' },
                ...modules
            ];
        }

        // Update filter language nếu có
        const languageFilterIndex = baseFilters.findIndex(f => f.key === 'language_id');
        if (languageFilterIndex !== -1 && languages.length > 0) {
            baseFilters[languageFilterIndex].options = [
                { label: 'Tất cả ngôn ngữ', value: '0' },
                ...languages.map(l => ({ label: l.name, value: l.id.toString() }))
            ];
        }

        return baseFilters;
    }, [modules, languages]);

    const { filters } = useFilter({
        defaultFilters: routerFilters,
    });

    const [redirectModalOpen, setRedirectModalOpen] = useState(false);
    const [selectedRouter, setSelectedRouter] = useState<Router | null>(null);

    const handleRedirectClick = (item: Router) => {
        setSelectedRouter(item);
        setRedirectModalOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
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
                                    <CustomFilter
                                        filters={filters}
                                    />
                                </div>
                            </div>
                            <CustomActiveFilters filters={filters} />
                        </div>

                        <CustomTable
                            data={records.data}
                            columns={pageConfig.columns ?? []}
                            render={(item: Router) => (
                                <TableRowComponent
                                    key={item.id}
                                    item={item}
                                    onRedirectClick={handleRedirectClick}
                                />
                            )}
                        />
                    </CustomCard>
                </div>
            </div>

            <RedirectModal
                open={redirectModalOpen}
                onOpenChange={setRedirectModalOpen}
                item={selectedRouter}
            />
        </AppLayout>
    );
}
