import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, useForm, router } from '@inertiajs/react';
import { Plus, Trash, Save, ArrowLeft, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import InputError from '@/components/input-error';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Báo giá', href: '/backend/quotes' },
];

interface QuoteItem {
    id?: number;
    product_id: string; // Combobox uses string values
    product_sku: string;
    product_name: string;
    quantity: number;
    price: number;
    discount: number;
    total: number;
}

interface PageProps {
    quote?: any;
    customers: any[];
    products: any[];
    templates: any[];
}

export default function QuoteForm({ quote, customers, products, templates }: PageProps) {
    const isEditing = !!quote;

    // Transform data for Select/Combobox
    const customerOptions = customers.map(c => ({
        value: c.id.toString(),
        label: `${c.name} - ${c.phone || 'N/A'}`
    }));

    const productOptions = products.map(p => ({
        value: p.id.toString(),
        label: `${p.name} (${formatCurrency(p.price)})`
    }));

    const templateOptions = templates.map(t => ({
        value: t.id.toString(),
        label: t.name
    }));

    const { data, setData, post, put, processing, errors } = useForm({
        customer_id: quote?.customer_id?.toString() || '',
        customer_name: quote?.customer_name || '',
        customer_email: quote?.customer_email || '',
        customer_phone: quote?.customer_phone || '',
        customer_address: quote?.customer_address || '',
        template_id: quote?.template_id?.toString() || (templates.length > 0 ? templates[0].id.toString() : ''),
        expire_date: quote?.expire_date || '',
        note: quote?.note || '',
        status: quote?.status || 'draft',
        tax_amount: quote?.tax_amount || 0,
        items: quote?.items ? quote.items.map((item: any) => ({
            ...item,
            product_id: item.product_id?.toString() || ''
        })) : [
            { product_id: '', product_sku: '', product_name: '', quantity: 1, price: 0, discount: 0, total: 0 }
        ] as QuoteItem[]
    });

    // Auto-fill customer info when selected
    const handleCustomerChange = (id: string) => {
        const customer = customers.find(c => c.id.toString() === id);
        if (customer) {
            setData(data => ({
                ...data,
                customer_id: id,
                customer_name: customer.name,
                customer_phone: customer.phone,
                customer_email: customer.email,
                customer_address: customer.address || '',
            }));
        }
    };

    // Auto-fill product info when selected
    const handleProductChange = (index: number, id: string) => {
        const product = products.find(p => p.id.toString() === id);
        if (product) {
            const newItems = [...data.items];
            newItems[index] = {
                ...newItems[index],
                product_id: id,
                product_sku: product.sku,
                product_name: product.name,
                price: parseFloat(product.price),
                total: parseFloat(product.price) * newItems[index].quantity
            };
            setData('items', newItems);
            // Recalculate totals handled by effect
        }
    };

    const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Recalc line total
        if (['quantity', 'price', 'discount'].includes(field)) {
            const qty = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity;
            const price = field === 'price' ? parseFloat(value) || 0 : newItems[index].price;
            const discount = field === 'discount' ? parseFloat(value) || 0 : newItems[index].discount;
            newItems[index].total = (qty * price) - discount;
        }

        setData('items', newItems);
    };

    const addItem = () => {
        setData('items', [...data.items, { product_id: '', product_sku: '', product_name: '', quantity: 1, price: 0, discount: 0, total: 0 }]);
    };

    const removeItem = (index: number) => {
        if (data.items.length > 1) {
            const newItems = data.items.filter((_, i) => i !== index);
            setData('items', newItems);
        }
    };

    // Derived totals
    const totalAmount = data.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const finalAmount = totalAmount + (parseFloat(data.tax_amount?.toString() || '0'));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            put(`/backend/quotes/${quote.id}`);
        } else {
            post('/backend/quotes');
        }
    };

    return (
        <AppLayout breadcrumbs={[...breadcrumbs, { title: isEditing ? `Sửa báo giá ${quote.code}` : 'Tạo mới', href: '#' }]}>
            <Head title={isEditing ? 'Sửa báo giá' : 'Tạo báo giá'} />

            <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-6">
                    <HeadingSmall
                        title={isEditing ? `Cập nhật báo giá: ${quote.code}` : 'Tạo báo giá mới'}
                        description="Nhập thông tin khách hàng và sản phẩm để tạo báo giá"
                    />
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => window.history.back()}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Quay lại
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            Lưu báo giá
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Customer & General Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Thông tin khách hàng</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Chọn khách hàng</Label>
                                    <Combobox
                                        options={customerOptions}
                                        value={data.customer_id}
                                        onValueChange={handleCustomerChange}
                                        placeholder="Chọn khách hàng..."
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Tên khách hàng *</Label>
                                    <Input
                                        value={data.customer_name}
                                        onChange={e => setData('customer_name', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={errors.customer_name} />
                                </div>
                                <div>
                                    <Label>Số điện thoại</Label>
                                    <Input
                                        value={data.customer_phone}
                                        onChange={e => setData('customer_phone', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        value={data.customer_email}
                                        onChange={e => setData('customer_email', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Địa chỉ</Label>
                                    <Textarea
                                        value={data.customer_address}
                                        onChange={e => setData('customer_address', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Thông tin chung</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Mẫu báo giá</Label>
                                    <Combobox
                                        options={templateOptions}
                                        value={data.template_id}
                                        onValueChange={val => setData('template_id', val)}
                                        placeholder="Chọn mẫu..."
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Ngày hết hạn</Label>
                                    <Input
                                        type="date"
                                        value={data.expire_date}
                                        onChange={e => setData('expire_date', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Trạng thái</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                                        value={data.status}
                                        onChange={e => setData('status', e.target.value)}
                                    >
                                        <option value="draft">Nháp</option>
                                        <option value="sent">Đã gửi</option>
                                        <option value="accepted">Đã chốt</option>
                                        <option value="rejected">Bị từ chối</option>
                                        <option value="expired">Hết hạn</option>
                                    </select>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Products & Totals */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Chi tiết sản phẩm</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[30%]">Sản phẩm</TableHead>
                                                <TableHead className="w-[15%]">SL</TableHead>
                                                <TableHead className="w-[20%]">Đơn giá</TableHead>
                                                <TableHead className="w-[15%]">Chiết khấu</TableHead>
                                                <TableHead className="w-[15%] text-right">Thành tiền</TableHead>
                                                <TableHead className="w-[5%]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <div className="space-y-2 min-w-[200px]">
                                                            <Combobox
                                                                options={productOptions}
                                                                value={item.product_id}
                                                                onValueChange={(val) => handleProductChange(index, val)}
                                                                placeholder="Tìm sản phẩm..."
                                                            />
                                                            <Input
                                                                value={item.product_name}
                                                                onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                                                placeholder="Tên sản phẩm hiển thị"
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={item.price}
                                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={item.discount}
                                                            onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {formatCurrency(item.total)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeItem(index)}
                                                            disabled={data.items.length === 1}
                                                            className="h-8 w-8 text-red-500"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="p-4 border-t">
                                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Thêm dòng
                                    </Button>
                                    <InputError message={errors.items} className="mt-2" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Tổng kết & Ghi chú</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Ghi chú báo giá</Label>
                                        <Textarea
                                            value={data.note}
                                            onChange={e => setData('note', e.target.value)}
                                            className="mt-2 h-32"
                                            placeholder="Ghi chú thêm, điều khoản thanh toán..."
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Tổng tiền hàng:</span>
                                            <span className="font-medium">{formatCurrency(totalAmount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Thuế (VAT/Khác):</span>
                                            <div className="w-32">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-right"
                                                    value={data.tax_amount}
                                                    onChange={e => setData('tax_amount', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-base font-bold pt-4 border-t">
                                            <span>Thành tiền:</span>
                                            <span className="text-blue-600">{formatCurrency(finalAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
