import { router } from '@inertiajs/react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import CustomPagination from '@/components/custom-pagination'

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
}

interface TransactionTableProps {
    transactions: {
        data: CashTransaction[]
        current_page: number
        last_page: number
        per_page: number
        total: number
        links: { url: string | null; label: string; active: boolean }[]
    }
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
}

const getTypeLabel = (type: string) => {
    switch (type) {
        case 'receipt':
            return 'Phiếu thu'
        case 'payment':
            return 'Phiếu chi'
        case 'transfer':
            return 'Chuyển quỹ'
        default:
            return type
    }
}

const getTypeBadgeVariant = (type: string) => {
    switch (type) {
        case 'receipt':
            return 'default'
        case 'payment':
            return 'destructive'
        case 'transfer':
            return 'secondary'
        default:
            return 'default'
    }
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
    const handleView = (id: number) => {
        router.visit(`/backend/cash-book/transaction/${id}`)
    }

    const handleEdit = (id: number) => {
        router.visit(`/backend/cash-book/transaction/${id}/edit`)
    }

    const handleDelete = (id: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa phiếu này?')) {
            router.delete(`/backend/cash-book/transaction/${id}`, {
                preserveScroll: true,
            })
        }
    }

    if (transactions.data.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
                <p>Chưa có phiếu nào</p>
                <p className="text-sm mt-2">Nhấn "Tạo phiếu" để tạo phiếu mới</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Mã phiếu</TableHead>
                            <TableHead className="font-semibold">Ngày ghi nhận</TableHead>
                            <TableHead className="font-semibold">Tên đối tượng</TableHead>
                            <TableHead className="font-semibold">Lý do thu chi</TableHead>
                            <TableHead className="font-semibold">Mã chứng từ gốc</TableHead>
                            <TableHead className="font-semibold text-right">Số tiền</TableHead>
                            <TableHead className="font-semibold text-center">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.data.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium text-blue-600">
                                            {transaction.transaction_code}
                                        </span>
                                        <Badge
                                            variant={getTypeBadgeVariant(transaction.transaction_type)}
                                            className="w-fit text-xs"
                                        >
                                            {getTypeLabel(transaction.transaction_type)}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {formatDate(transaction.transaction_date)}
                                </TableCell>
                                <TableCell>
                                    {transaction.transaction_type === 'transfer' ? (
                                        <div className="text-sm">
                                            <div>{transaction.store?.name}</div>
                                            <div className="text-muted-foreground">
                                                → {transaction.recipient_store?.name}
                                            </div>
                                        </div>
                                    ) : transaction.partner_name ? (
                                        <span>{transaction.partner_name}</span>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {transaction.reason?.name || '-'}
                                </TableCell>
                                <TableCell>
                                    {transaction.reference_code || '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`font-semibold ${transaction.transaction_type === 'receipt'
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                        }`}>
                                        {transaction.transaction_type === 'receipt' ? '+' : '-'}
                                        {formatCurrency(transaction.amount)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleView(transaction.id)}
                                            className="h-8 w-8"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(transaction.id)}
                                            className="h-8 w-8"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(transaction.id)}
                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <CustomPagination
                links={transactions.links as any}
                currentPage={transactions.current_page}
            />
        </div>
    )
}
