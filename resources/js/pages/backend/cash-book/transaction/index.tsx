import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate, type PageConfig } from '@/types';
import { Head, Link } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle, Receipt, Banknote, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import CustomTable from '@/components/custom-table';
import React, { useMemo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import CustomPagination from '@/components/custom-pagination';
import { Badge } from '@/components/ui/badge';
import CustomActiveFilters from '@/components/custom-active-filters';
import TransactionStats, { type Stats } from './components/transaction-stats';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define Types
interface CashTransaction {
    id: number
    transaction_code: string
    transaction_type: 'receipt' | 'payment' | 'transfer'
    payment_method: 'cash' | 'bank'
    amount: number
    transaction_date: string
    reason?: {
        id: number
        name: string
    }
    store?: {
        id: number
        name: string
    }
    recipient_store?: {
        id: number
        name: string
    }
    partner_name?: string
    reference_code?: string
    user_id?: number
    publish: string
    order: number
    created_at: string
}

interface Store {
    value: string | number
    label: string
}

interface ICashTransactionIndexProps {
    transactions: IPaginate<CashTransaction>
    stores?: Store[]
    stats: Stats
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Sổ quỹ',
        href: '/backend/cash-book/transaction',
    }
];

// Helper functions for formatting
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
}

const getTypeLabel = (type: string) => {
    switch (type) {
        case 'receipt': return 'Phiếu thu'
        case 'payment': return 'Phiếu chi'
        case 'transfer': return 'Chuyển quỹ'
        default: return type
    }
}

const getBadgeClassName = (type: string) => {
    switch (type) {
        case 'receipt':
            return 'bg-green-100 text-green-700 hover:bg-green-100'
        case 'payment':
            return 'bg-red-100 text-red-700 hover:bg-red-100'
        case 'transfer':
            return 'bg-blue-100 text-blue-700 hover:bg-blue-100'
        default:
            return ''
    }
}

const pageConfig: PageConfig<CashTransaction> = {
    module: 'cash-book/transaction', // Ensure route is correct: backend/cash-book/transaction
    heading: 'Sổ quỹ',
    cardHeading: 'Danh sách phiếu thu chi',
    cardDescription: 'Quản lý dòng tiền, phiếu thu, phiếu chi và chuyển quỹ.',
    filters: [
        {
            key: 'perpage',
            placeholder: 'Chọn số bản ghi',
            defaulValue: '20',
            options: ['20', '30', '40', '50', '60', '80', '100'].map(item => ({
                label: `${item} bản ghi`,
                value: item
            })),
            className: 'w-[180px]',
            type: 'single'
        }
    ],
    columns: [
        { key: 'transaction_code', label: 'Mã phiếu', className: 'w-[120px] text-center' },
        { key: 'transaction_date', label: 'Ngày', className: 'w-[100px] text-center' },
        { key: 'amount', label: 'Số tiền', className: 'text-right w-[150px]' },
        { key: 'partner_name', label: 'Đối tượng', className: 'text-left' },
        { key: 'reason', label: 'Lý do', className: 'text-left' },
        { key: 'store', label: 'Chi nhánh', className: 'text-center' },
        { key: 'recipient_store', label: 'Chi nhánh nhận', className: 'text-center' },
        { key: 'transaction_type', label: 'Loại', className: 'text-center w-[100px]' },
    ],
}


const TableRowComponent = React.memo(({
    item
}: {
    item: CashTransaction
}) => {
    // Determine color for amount
    const amountClass = item.transaction_type === 'receipt' ? 'text-green-600' :
        item.transaction_type === 'payment' ? 'text-red-600' : 'text-blue-600';
    const amountPrefix = item.transaction_type === 'receipt' ? '+' : item.transaction_type === 'payment' ? '-' : '';

    return (
        <TableRow key={item.id} className="cursor-pointer">
            <TableCell className="text-center">
                <Link href={`/backend/cash-book/transaction/${item.id}/edit`} className="font-medium text-blue-600 hover:underline">
                    {item.transaction_code}
                </Link>
                {item.reference_code && <div className="text-xs text-muted-foreground">{item.reference_code}</div>}
            </TableCell>
            <TableCell className="text-center">
                {formatDate(item.transaction_date)}
            </TableCell>
            <TableCell className="text-right font-normal">
                <span className={amountClass}>
                    {amountPrefix}{formatCurrency(item.amount)}
                </span>
                <div className="text-xs text-muted-foreground uppercase">{item.payment_method === 'cash' ? 'Tiền mặt' : 'Ngân hàng'}</div>
            </TableCell>
            <TableCell className="text-left">
                {item.partner_name || '-'}
            </TableCell>
            <TableCell className="text-left">
                {item.reason?.name || '-'}
            </TableCell>
            <TableCell className="text-center">
                {item.store?.name || '-'}
            </TableCell>
            <TableCell className="text-center">
                {item.transaction_type === 'transfer' ? (item.recipient_store?.name || '-') : '-'}
            </TableCell>
            <TableCell className="text-center">
                <Badge className={getBadgeClassName(item.transaction_type)}>
                    {getTypeLabel(item.transaction_type)}
                </Badge>
            </TableCell>
        </TableRow>
    )
})

export default function Index({ transactions, stores, stats }: ICashTransactionIndexProps) {
    // Helper to generate filters including dynamic options
    const filters = useMemo(() => {
        const baseFilters = [...(pageConfig.filters || [])];

        // Add Transaction Type filter
        baseFilters.push({
            key: 'transaction_type',
            placeholder: 'Loại phiếu',
            defaulValue: '0',
            options: [
                { label: 'Tất cả loại phiếu', value: '0' },
                { label: 'Phiếu thu', value: 'receipt' },
                { label: 'Phiếu chi', value: 'payment' },
                { label: 'Chuyển quỹ', value: 'transfer' },
            ],
            type: 'single'
        });

        // Add Store filter
        if (stores && Array.isArray(stores) && stores.length > 0) {
            baseFilters.push({
                key: 'store_id',
                placeholder: 'Chi nhánh',
                defaulValue: '0',
                options: [
                    { label: 'Tất cả chi nhánh', value: '0' },
                    ...stores.map((s: Store) => ({ 
                        label: s.label || '', 
                        value: String(s.value || '') 
                    }))
                ],
                type: 'single'
            });
        }

        return baseFilters;
    }, [stores]);


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <div className="mb-4">
                        <TransactionStats stats={stats} />
                    </div>
                    <CustomCard
                        isShowHeader={true}
                        title={pageConfig.cardHeading}
                        description={pageConfig.cardDescription}
                        isShowFooter={true}
                        footerChildren={
                            <CustomPagination
                                links={transactions.links}
                                currentPage={transactions.current_page}
                            />
                        }
                    >
                        <div className="flex items-center justify-between mb-[10px]">
                            <div className="flex items-center justify-center">
                                <CustomFilter
                                    filters={filters}
                                    dateRangePicker={{
                                        title: 'Thời gian',
                                        name: 'transaction_date',
                                        defaultValue: { from: '', to: '' } // Can handle default from URL if needed
                                    }}
                                />
                            </div>

                            {/* Create Button Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Tạo phiếu
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <Link href="/backend/cash-book/transaction/create-receipt">
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Receipt className="mr-2 h-4 w-4" />
                                            <span>Phiếu thu</span>
                                        </DropdownMenuItem>
                                    </Link>
                                    <Link href="/backend/cash-book/transaction/create-payment">
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Banknote className="mr-2 h-4 w-4" />
                                            <span>Phiếu chi</span>
                                        </DropdownMenuItem>
                                    </Link>
                                    <Link href="/backend/cash-book/transaction/create-transfer">
                                        <DropdownMenuItem className="cursor-pointer">
                                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                                            <span>Chuyển quỹ</span>
                                        </DropdownMenuItem>
                                    </Link>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CustomActiveFilters filters={filters} />
                        <CustomTable
                            data={transactions.data}
                            columns={pageConfig.columns ?? []}
                            render={(item: CashTransaction) =>
                                <TableRowComponent
                                    key={item.id}
                                    item={item}
                                />
                            }
                        />
                    </CustomCard>
                </div>
            </div>
        </AppLayout>
    );
}
