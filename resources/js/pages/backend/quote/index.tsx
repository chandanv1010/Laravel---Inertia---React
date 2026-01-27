import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, FileText, Download, Edit, Trash, FileDown } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Báo giá', href: '/backend/quotes' },
];

export default function QuoteIndex({ quotes, filters }: { quotes: any, filters: any }) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/backend/quotes', { search }, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa báo giá này?')) {
            router.delete(`/backend/quotes/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quản lý Báo giá" />

            <div className="flex items-center justify-between mb-6">
                <HeadingSmall
                    title="Báo giá"
                    description="Quản lý danh sách báo giá gửi khách hàng"
                />
                <Button asChild>
                    <Link href="/backend/quotes/create">
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo báo giá
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Danh sách báo giá</CardTitle>
                    <form onSubmit={handleSearch} className="flex relative max-w-sm w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo mã hoặc tên khách hàng..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã báo giá</TableHead>
                                    <TableHead>Khách hàng</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead>Tổng tiền</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotes.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            Không tìm thấy báo giá nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    quotes.data.map((quote: any) => (
                                        <TableRow key={quote.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/backend/quotes/${quote.id}/edit`} className="hover:underline text-blue-600">
                                                    {quote.code}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{quote.customer_name}</span>
                                                    {quote.customer_phone && (
                                                        <span className="text-xs text-muted-foreground">{quote.customer_phone}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{new Date(quote.created_at).toLocaleDateString('vi-VN')}</TableCell>
                                            <TableCell className="font-medium">
                                                {formatCurrency(quote.final_amount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={quote.status === 'accepted' ? 'default' : 'secondary'}>
                                                    {quote.status_label || quote.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <FileDown className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <a href={`/backend/quotes/${quote.id}/export-pdf`} target="_blank" className="cursor-pointer">
                                                                    <FileText className="mr-2 h-4 w-4" />
                                                                    Xuất PDF
                                                                </a>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <a href={`/backend/quotes/${quote.id}/export-word`} target="_blank" className="cursor-pointer">
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    Xuất Word
                                                                </a>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" asChild>
                                                        <Link href={`/backend/quotes/${quote.id}/edit`}>
                                                            <Edit className="h-4 w-4" />
                                                        </Link>
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500"
                                                        onClick={() => handleDelete(quote.id)}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </AppLayout>
    );
}
