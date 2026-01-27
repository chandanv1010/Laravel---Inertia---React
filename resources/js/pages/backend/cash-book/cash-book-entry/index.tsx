import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { User, type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { filter } from '@/constants/filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import CustomPagination from '@/components/custom-pagination';
import useTable from '@/hooks/use-table';
import CustomBulkAction from '@/components/custom-bulk-action';
import CustomActiveFilters from '@/components/custom-active-filters';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Sổ quỹ',
        href: '/',
    }
];

interface CashBookEntry {
    id: number;
    code: string | null;
    entry_type: 'income' | 'expense' | 'transfer';
    amount: number;
    description: string | null;
    category: string | null;
    from_account_id: number | null;
    from_account?: { id: number; bank_name: string; account_number: string } | null;
    to_account_id: number | null;
    to_account?: { id: number; bank_name: string; account_number: string } | null;
    reference: string | null;
    entry_date: string;
    status: 'draft' | 'completed' | 'cancelled';
    created_at: string;
    creators?: User | null;
}

interface Statistics {
    total_income: number;
    total_expense: number;
    total_transfer: number;
    balance: number;
}

const pageConfig: PageConfig<CashBookEntry> = {
    module: 'cash-book',
    heading: 'Sổ quỹ',
    cardHeading: 'Bảng quản lý sổ quỹ',
    cardDescription: 'Quản lý thu, chi và chuyển quỹ nội bộ',
    filters: [...filter],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[60px] text-center' },
        { key: 'code', label: 'Mã phiếu', className: 'w-[140px] text-left' },
        { key: 'entry_date', label: 'Ngày', className: 'w-[120px] text-left' },
        { key: 'entry_type', label: 'Loại', className: 'w-[120px] text-center' },
        { key: 'description', label: 'Mô tả', className: 'w-[200px] text-left' },
        { key: 'amount', label: 'Số tiền', className: 'w-[150px] text-right' },
        { key: 'account', label: 'Tài khoản', className: 'w-[180px] text-center' },
        { key: 'status', label: 'Trạng thái', className: 'w-[120px] text-center' },
        { key: 'creator', label: 'Người tạo', className: 'w-[130px] text-center', sortable: false },
    ],
}

const TableRowComponent = React.memo(({
    item,
    checked,
    onCheckItem
}: {
    item: CashBookEntry,
    checked: boolean,
    onCheckItem: (id: number, checked: boolean) => void
}) => {

    const getEntryTypeBadge = (type: string) => {
        const typeMap: Record<string, { label: string; className: string }> = {
            'income': { label: 'Thu', className: 'bg-green-100 text-green-700' },
            'expense': { label: 'Chi', className: 'bg-red-100 text-red-700' },
            'transfer': { label: 'Chuyển quỹ', className: 'bg-blue-100 text-blue-700' },
        };
        return typeMap[type] || { label: type, className: 'bg-gray-100 text-gray-700' };
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'draft': { label: 'Nháp', className: 'bg-gray-100 text-gray-700' },
            'completed': { label: 'Hoàn thành', className: 'bg-green-100 text-green-700' },
            'cancelled': { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
        };
        return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return '0₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getAccountLabel = () => {
        if (item.entry_type === 'transfer') {
            if (item.from_account && item.to_account) {
                return `${item.from_account.bank_name} → ${item.to_account.bank_name}`;
            }
            return '-';
        } else if (item.entry_type === 'income' && item.to_account) {
            return item.to_account.bank_name + (item.to_account.account_number ? ` - ${item.to_account.account_number}` : '');
        } else if (item.entry_type === 'expense' && item.from_account) {
            return item.from_account.bank_name + (item.from_account.account_number ? ` - ${item.from_account.account_number}` : '');
        }
        return '-';
    };

    const entryType = getEntryTypeBadge(item.entry_type);
    const status = getStatusBadge(item.status);

    return (
        <TableRow key={item.id} className={`cursor-pointer ${checked ? 'bg-[#ffc]' : ''}`}>
            <TableCell className='w-[60px] text-center align-middle'>
                <div className="flex justify-center items-center">
                    <Input 
                        type="checkbox" 
                        className="size-4 cursor-pointer" 
                        checked={checked}
                        onChange={e => onCheckItem(item.id, e.target.checked)}
                    />
                </div>
            </TableCell>
            <TableCell className="w-[140px] text-left">
                {item.code ? (
                    <Link 
                        href={`/backend/cash-book/${item.id}/edit`}
                        className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        {item.code}
                    </Link>
                ) : (
                    <span className="font-semibold">-</span>
                )}
            </TableCell>
            <TableCell className="w-[120px] text-left">
                <span className="text-sm">{item.entry_date || '-'}</span>
            </TableCell>
            <TableCell className="w-[120px] text-center">
                <Badge className={entryType.className}>
                    {entryType.label}
                </Badge>
            </TableCell>
            <TableCell className="w-[200px] text-left">
                <span className="text-sm">{item.description || '-'}</span>
            </TableCell>
            <TableCell className="w-[150px] text-right">
                <span className={`font-medium ${item.entry_type === 'income' ? 'text-green-600' : item.entry_type === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                    {item.entry_type === 'expense' ? '-' : ''}{formatCurrency(item.amount)}
                </span>
            </TableCell>
            <TableCell className="w-[180px] text-center">
                <span className="text-sm">{getAccountLabel()}</span>
            </TableCell>
            <TableCell className="w-[120px] text-center">
                <Badge className={status.className}>
                    {status.label}
                </Badge>
            </TableCell>
            <TableCell className="w-[130px] text-center">{item.creators?.name || '-'}</TableCell>
        </TableRow>
    )
})

interface CashBookEntryIndexProps {
    records: IPaginate<CashBookEntry>;
    statistics: Statistics;
    request?: any;
}

export default function CashBookEntryIndex({ records, statistics, request }: CashBookEntryIndexProps) {
    const { filters, handleFilterChange, clearFilters } = useFilter();
    const { checkedItems, handleCheckAll, handleCheckItem, clearChecked } = useTable<CashBookEntry>(records?.data || []);

    const handleFilter = () => {
        router.get('/backend/cash-book', filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return '0₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
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
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <CustomCard title="Tổng thu">
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(statistics?.total_income || 0)}
                            </div>
                        </CustomCard>

                        <CustomCard title="Tổng chi">
                            <div className="text-2xl font-bold text-red-600">
                                {formatCurrency(statistics?.total_expense || 0)}
                            </div>
                        </CustomCard>

                        <CustomCard title="Chuyển quỹ">
                            <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency(statistics?.total_transfer || 0)}
                            </div>
                        </CustomCard>

                        <CustomCard title="Số dư">
                            <div className={`text-2xl font-bold ${(statistics?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(statistics?.balance || 0)}
                            </div>
                        </CustomCard>
                    </div>

                    <CustomCard
                        title={pageConfig.cardHeading}
                        description={pageConfig.cardDescription}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => router.get('/backend/cash-book/create?type=income')}
                                        className="bg-green-500 hover:bg-green-600"
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Tạo phiếu thu
                                    </Button>
                                    <Button
                                        onClick={() => router.get('/backend/cash-book/create?type=expense')}
                                        className="bg-red-500 hover:bg-red-600"
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Tạo phiếu chi
                                    </Button>
                                    <Button
                                        onClick={() => router.get('/backend/cash-book/create?type=transfer')}
                                        variant="outline"
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Chuyển quỹ
                                    </Button>
                                </div>
                            </div>

                            <CustomFilter
                                filters={pageConfig.filters}
                                onFilterChange={handleFilterChange}
                                onClear={clearFilters}
                                onApply={handleFilter}
                            />

                            <CustomActiveFilters
                                filters={filters}
                                onRemoveFilter={handleFilterChange}
                                onClearAll={clearFilters}
                            />

                            <CustomTable
                                columns={pageConfig.columns}
                                data={records?.data || []}
                                renderRow={(item) => (
                                    <TableRowComponent
                                        key={item.id}
                                        item={item}
                                        checked={checkedItems.includes(item.id)}
                                        onCheckItem={handleCheckItem}
                                    />
                                )}
                                onSelectAll={handleCheckAll}
                                selectedCount={checkedItems.length}
                                totalCount={records?.data?.length || 0}
                            />

                            {checkedItems.length > 0 && (
                                <CustomBulkAction
                                    selectedCount={checkedItems.length}
                                    onClear={clearChecked}
                                />
                            )}

                            {records && records.data && records.data.length > 0 && (
                                <CustomPagination
                                    currentPage={records.current_page || 1}
                                    lastPage={records.last_page || 1}
                                    perPage={records.per_page || 15}
                                    total={records.total || 0}
                                    onPageChange={(page) => {
                                        handleFilterChange('page', page.toString());
                                        handleFilter();
                                    }}
                                />
                            )}
                        </div>
                    </CustomCard>
                </div>
            </div>
        </AppLayout>
    );
}

