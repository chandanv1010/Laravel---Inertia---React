import { ProductSelectionModal as BaseProductSelectionModal } from "@/components/product-selection-modal"

interface Product {
    id: number;
    name: string;
    sku: string;
    image?: string | null;
    album?: string[];
    retail_price?: number;
    wholesale_price?: number;
    price?: number;
    variants?: Array<{
        id: number;
        name?: string;
        sku: string;
        price?: number;
        retail_price?: number;
        wholesale_price?: number;
        attributes?: Record<string, string>;
        image?: string;
    }>;
}

interface ProductVariant {
    id: number
    name: string
    sku: string
    price?: number
    image?: string
    productId?: number
    productName?: string
}

interface ProductSelectionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (selectedProducts: ProductVariant[]) => void
    initialSelectedIds?: number[]
    initialSelectedProducts?: Array<any>
    title?: string
    description?: string
    preloadedProducts?: Product[]
    preloadedCatalogues?: Array<{ id: number; name: string; level?: number }>
}

export function ProductSelectionModal({
    open,
    onOpenChange,
    onConfirm,
    initialSelectedIds = [],
    initialSelectedProducts = [],
    title,
    description,
    preloadedProducts,
    preloadedCatalogues
}: ProductSelectionModalProps) {
    return (
        <BaseProductSelectionModal
            open={open}
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
            initialSelectedIds={initialSelectedIds}
            initialSelectedProducts={initialSelectedProducts}
            title={title || "Chọn sản phẩm"}
            description={description || "Tìm kiếm theo tên sản phẩm hoặc phiên bản"}
            showPrice={true}
            priceLabel="Giá bán"
            preloadedProducts={preloadedProducts}
            preloadedCatalogues={preloadedCatalogues}
        />
    )
}
