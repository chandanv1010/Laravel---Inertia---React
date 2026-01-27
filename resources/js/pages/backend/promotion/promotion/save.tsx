import { useState, useMemo } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, Form, router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import CustomPageHeading from '@/components/custom-page-heading'
import CustomCard from '@/components/custom-card'
import InputError from '@/components/input-error'
import { type BreadcrumbItem } from '@/types'
import { LoaderCircle, ArrowLeft } from 'lucide-react'
import { setPreserveState } from '@/lib/helper'

interface Promotion {
    id?: number
    code: string
    name: string
    description?: string
    type: 'order_discount' | 'product_discount' | 'combo' | 'buy_x_get_y'
    discount_type?: 'fixed_amount' | 'percentage'
    discount_value?: number
    combo_price?: number
    buy_quantity?: number
    get_quantity?: number
    scope_type?: 'products' | 'variants' | 'catalogue'
    start_date: string
    end_date: string
    usage_limit?: number
    user_limit?: number
    publish: string
    order: number
    // Selected items
    product_ids?: number[]
    product_variant_ids?: number[]
    product_catalogue_ids?: number[]
    // Combo items
    combo_items?: Array<{
        product_id?: number
        product_variant_id?: number
        quantity: number
    }>
    // Buy X Get Y items
    buy_items?: Array<{
        product_id?: number
        product_variant_id?: number
    }>
    get_items?: Array<{
        product_id?: number
        product_variant_id?: number
    }>
}

interface PromotionSaveProps {
    promotion?: Promotion
    type?: 'order_discount' | 'product_discount' | 'combo' | 'buy_x_get_y'
    products?: Array<{ id: number; name: string; sku?: string }>
    productVariants?: Array<{ id: number; name: string; sku?: string; product_id: number }>
    productCatalogues?: Array<{ id: number; name: string }>
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quản lý Marketing', href: '/backend/promotion' },
    { title: 'Quản lý Khuyến Mãi', href: '/backend/promotion/promotion' },
    { title: 'Thêm mới Khuyến Mãi', href: '/' },
]

export default function PromotionSave({ 
    promotion, 
    type: initialType,
    products = [], 
    productVariants = [],
    productCatalogues = []
}: PromotionSaveProps) {
    const isEdit = !!promotion

    // Ưu tiên type từ promotion (khi edit), sau đó từ props (khi create), mặc định là order_discount
    const [type, setType] = useState<Promotion['type']>(
        promotion?.type || initialType || 'order_discount'
    )
    const [discountType, setDiscountType] = useState<Promotion['discount_type']>(promotion?.discount_type || 'percentage')
    const [scopeType, setScopeType] = useState<Promotion['scope_type']>(promotion?.scope_type || 'products')

    const formatDateForInput = (date?: string) => {
        if (!date) return ''
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Cập nhật Khuyến Mãi' : 'Thêm mới Khuyến Mãi'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading 
                    heading={isEdit ? 'Cập nhật Khuyến Mãi' : 'Thêm mới Khuyến Mãi'}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <Form
                        action={isEdit ? `/backend/promotion/promotion/${promotion.id}` : '/backend/promotion/promotion'}
                        method={isEdit ? 'put' : 'post'}
                        options={{
                            preserveScroll: true,
                            preserveState: setPreserveState,
                        }}
                        transform={(data) => ({
                            ...data,
                            ...(isEdit ? { _method: 'put' } : {}),
                        })}
                    >
                        {({ processing, errors }) => (
                            <div className="max-w-[1400px] ml-auto mr-auto">
                                <div className="mb-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.get('/backend/promotion/promotion')}
                                        className="mb-4"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Quay lại
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Phần bên trái - Form chính */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Thông tin cơ bản */}
                                        <CustomCard isShowHeader={true} title="Thông tin cơ bản">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="code">
                                                        Mã khuyến mãi <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="code"
                                                        name="code"
                                                        defaultValue={promotion?.code}
                                                        placeholder="VD: KM001"
                                                        required
                                                    />
                                                    <InputError message={errors.code} className="mt-1" />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="name">
                                                        Tên chương trình <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                        defaultValue={promotion?.name}
                                                        placeholder="Nhập tên chương trình khuyến mãi"
                                                        required
                                                    />
                                                    <InputError message={errors.name} className="mt-1" />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="description">Mô tả</Label>
                                                    <textarea
                                                        id="description"
                                                        name="description"
                                                        defaultValue={promotion?.description}
                                                        placeholder="Nhập mô tả chương trình khuyến mãi"
                                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        rows={4}
                                                    />
                                                    <InputError message={errors.description} className="mt-1" />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="type">
                                                        Loại khuyến mãi <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Select
                                                        name="type"
                                                        value={type}
                                                        onValueChange={(value) => setType(value as Promotion['type'])}
                                                        disabled={isEdit}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Chọn loại khuyến mãi" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="order_discount">Giảm giá đơn hàng</SelectItem>
                                                            <SelectItem value="product_discount">Giảm giá sản phẩm</SelectItem>
                                                            <SelectItem value="buy_x_get_y">Mua X Tặng Y</SelectItem>
                                                            <SelectItem value="combo">Mua Combo</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <InputError message={errors.type} className="mt-1" />
                                                </div>
                                            </div>
                                        </CustomCard>

                                        {/* Cấu hình khuyến mãi */}
                                        <CustomCard isShowHeader={true} title="Cấu hình khuyến mãi">
                                            {(type === 'order_discount' || type === 'product_discount') && (
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="discount_type">
                                                            Loại giảm giá <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Select
                                                            name="discount_type"
                                                            value={discountType}
                                                            onValueChange={(value) => setDiscountType(value as Promotion['discount_type'])}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn loại giảm giá" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="fixed_amount">Giảm số tiền cố định</SelectItem>
                                                                <SelectItem value="percentage">Giảm theo phần trăm</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <InputError message={errors.discount_type} className="mt-1" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="discount_value">
                                                            {discountType === 'fixed_amount' ? 'Số tiền giảm (VNĐ)' : 'Phần trăm giảm (%)'} 
                                                            <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Input
                                                            id="discount_value"
                                                            name="discount_value"
                                                            type="number"
                                                            defaultValue={promotion?.discount_value}
                                                            placeholder={discountType === 'fixed_amount' ? 'VD: 50000' : 'VD: 20'}
                                                            min="0"
                                                            max={discountType === 'percentage' ? '100' : undefined}
                                                            required
                                                        />
                                                        <InputError message={errors.discount_value} className="mt-1" />
                                                    </div>
                                                </div>
                                            )}

                                            {type === 'combo' && (
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="combo_price">
                                                            Giá combo cố định (VNĐ) <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Input
                                                            id="combo_price"
                                                            name="combo_price"
                                                            type="number"
                                                            defaultValue={promotion?.combo_price}
                                                            placeholder="VD: 500000"
                                                            min="0"
                                                            required
                                                        />
                                                        <InputError message={errors.combo_price} className="mt-1" />
                                                        <p className="text-sm text-muted-foreground">
                                                            Giá cố định cho toàn bộ combo
                                                        </p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Sản phẩm trong combo</Label>
                                                        <p className="text-sm text-muted-foreground mb-2">
                                                            Chọn sản phẩm và số lượng cho combo (sẽ được cấu hình ở phần Phạm vi áp dụng)
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {type === 'buy_x_get_y' && (
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="buy_quantity">
                                                            Số lượng mua <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Input
                                                            id="buy_quantity"
                                                            name="buy_quantity"
                                                            type="number"
                                                            defaultValue={promotion?.buy_quantity}
                                                            placeholder="VD: 2"
                                                            min="1"
                                                            required
                                                        />
                                                        <InputError message={errors.buy_quantity} className="mt-1" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="get_quantity">
                                                            Số lượng tặng <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Input
                                                            id="get_quantity"
                                                            name="get_quantity"
                                                            type="number"
                                                            defaultValue={promotion?.get_quantity}
                                                            placeholder="VD: 1"
                                                            min="1"
                                                            required
                                                        />
                                                        <InputError message={errors.get_quantity} className="mt-1" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Sản phẩm mua và tặng</Label>
                                                        <p className="text-sm text-muted-foreground mb-2">
                                                            Chọn sản phẩm cần mua và sản phẩm được tặng (sẽ được cấu hình ở phần Phạm vi áp dụng)
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </CustomCard>

                                        {/* Phạm vi áp dụng */}
                                        <CustomCard isShowHeader={true} title="Phạm vi áp dụng">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="scope_type">
                                                        Loại phạm vi <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Select
                                                        name="scope_type"
                                                        value={scopeType}
                                                        onValueChange={(value) => setScopeType(value as Promotion['scope_type'])}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Chọn loại phạm vi" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="products">Sản phẩm đơn lẻ</SelectItem>
                                                            <SelectItem value="variants">Phiên bản sản phẩm</SelectItem>
                                                            <SelectItem value="catalogue">Danh mục sản phẩm</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <InputError message={errors.scope_type} className="mt-1" />
                                                </div>

                                                {scopeType === 'products' && (
                                                    <div className="space-y-2">
                                                        <Label>Chọn sản phẩm</Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Tính năng chọn sản phẩm sẽ được triển khai sau
                                                        </p>
                                                    </div>
                                                )}

                                                {scopeType === 'variants' && (
                                                    <div className="space-y-2">
                                                        <Label>Chọn phiên bản sản phẩm</Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Tính năng chọn phiên bản sản phẩm sẽ được triển khai sau
                                                        </p>
                                                    </div>
                                                )}

                                                {scopeType === 'catalogue' && (
                                                    <div className="space-y-2">
                                                        <Label>Chọn danh mục sản phẩm</Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Tính năng chọn danh mục sản phẩm sẽ được triển khai sau
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </CustomCard>
                                    </div>

                                    {/* Phần bên phải - Sidebar */}
                                    <div className="lg:col-span-1">
                                        <CustomCard isShowHeader={true} title="Cài đặt">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="start_date">
                                                        Ngày bắt đầu <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="start_date"
                                                        name="start_date"
                                                        type="datetime-local"
                                                        defaultValue={formatDateForInput(promotion?.start_date)}
                                                        required
                                                    />
                                                    <InputError message={errors.start_date} className="mt-1" />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="end_date">
                                                        Ngày kết thúc <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="end_date"
                                                        name="end_date"
                                                        type="datetime-local"
                                                        defaultValue={formatDateForInput(promotion?.end_date)}
                                                        required
                                                    />
                                                    <InputError message={errors.end_date} className="mt-1" />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="order">Thứ tự</Label>
                                                    <Input
                                                        id="order"
                                                        name="order"
                                                        type="number"
                                                        defaultValue={promotion?.order || 0}
                                                        min="0"
                                                    />
                                                    <InputError message={errors.order} className="mt-1" />
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="publish"
                                                        name="publish"
                                                        defaultChecked={promotion?.publish === '2' || !promotion}
                                                        onCheckedChange={(checked) => {
                                                            const input = document.getElementById('publish') as HTMLInputElement
                                                            if (input) {
                                                                input.value = checked ? '2' : '1'
                                                            }
                                                        }}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        id="publish"
                                                        name="publish"
                                                        value={promotion?.publish || '2'}
                                                    />
                                                    <Label htmlFor="publish" className="cursor-pointer">
                                                        Kích hoạt
                                                    </Label>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="usage_limit">Giới hạn số lần sử dụng</Label>
                                                    <Input
                                                        id="usage_limit"
                                                        name="usage_limit"
                                                        type="number"
                                                        defaultValue={promotion?.usage_limit}
                                                        placeholder="Để trống = không giới hạn"
                                                        min="0"
                                                    />
                                                    <InputError message={errors.usage_limit} className="mt-1" />
                                                    <p className="text-sm text-muted-foreground">
                                                        Số lần tối đa chương trình có thể được sử dụng
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="user_limit">Giới hạn số lần/người dùng</Label>
                                                    <Input
                                                        id="user_limit"
                                                        name="user_limit"
                                                        type="number"
                                                        defaultValue={promotion?.user_limit}
                                                        placeholder="Để trống = không giới hạn"
                                                        min="0"
                                                    />
                                                    <InputError message={errors.user_limit} className="mt-1" />
                                                    <p className="text-sm text-muted-foreground">
                                                        Số lần tối đa mỗi người dùng có thể sử dụng
                                                    </p>
                                                </div>
                                            </div>
                                        </CustomCard>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.get('/backend/promotion/promotion')}
                                    >
                                        Hủy
                                    </Button>
                                    <Button type="submit" disabled={processing} className="bg-blue-500 hover:bg-blue-600">
                                        {processing && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
                                        {isEdit ? 'Cập nhật' : 'Tạo mới'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form>
                </div>
            </div>
        </AppLayout>
    )
}

