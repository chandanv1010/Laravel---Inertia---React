import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
// import { useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem, type PageConfig } from '@/types';
import { Head, Form } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { CardTitle, CardHeader } from '@/components/ui/card';
// import CustomNotice from '@/components/custom-notice';
import { Button } from "@/components/ui/button"
import { LoaderCircle, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
// import { Input } from "@/components/ui/input"
// import InputError from '@/components/input-error';
import product from '@/routes/product';
import { setPreserveState } from '@/lib/helper';
// import EditorPage from '@/components/editor';
import { FormProvider, useFormContext } from '@/contexts/FormContext';
import CustomAlbum from '@/components/custom-album';
// import CustomAlbumDirectUpload from '@/components/custom-album-direct-upload';
import CustomCatalogueParent from '@/components/custom-catalogue-parent';
import type { TParentCatalogue } from '@/types';
import { Combobox } from '@/components/ui/combobox';
import CustomFeaturedImage from '@/components/custom-featured-image';
import CustomSeoOptions from '@/components/custom-seo-options';
import CustomSeoScores from '@/components/custom-seo-scores';
import usePageSetup from '@/hooks/use-page-setup';
import { MultiSelect } from '@/components/custom-multiple-select';
import { ProductBasicInfo } from './components/product-basic-info';
import { PricingSection } from './components/pricing-section';
import { TagsInput } from './components/tags-input';
import { InventoryInfo } from './components/inventory-info';
import { ShippingInfo } from './components/shipping-info';
import { AttributesSection, Attribute } from './components/attributes-section';
import { VariantsSection, ProductVariant } from './components/variants-section';
import { SeoSection } from './components/seo-section';
import CustomGeneralCollapsible from '@/components/custom-general-collapsible';
import { WarehouseStock } from './components/warehouse-stock-manager';
import { StockHistory } from './components/stock-history';
import type { FormDataConvertible } from '@inertiajs/core'

declare global {
    interface Window {
        __product_save_initialized_id?: number
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới Sản Phẩm',
        href: '/',
    }
];

const pageConfig: PageConfig<Product> = {
    heading: 'Quản lý Sản Phẩm',
}

export interface Product extends IDateTime {
    id: number,
    product_catalogue_id: number,
    product_brand_id?: number,
    publish: string,
    image: string,
    album?: string[],
    order?: number,
    robots?: string,
    // Language fields - flat structure
    name?: string,
    description?: string,
    content?: string,
    canonical?: string,
    meta_title?: string,
    meta_keyword?: string,
    meta_description?: string,
    // Creator fields - flat structure
    creator_id?: number,
    creator_name?: string,
    // Product catalogues
    product_catalogues?: Array<{ id: number, name: string }>,
    // Translation status
    translated_language_ids?: number[],
    // Stock and variant info
    stock_quantity?: number,
    variant_count?: number,
    // New fields
    sku?: string,
    barcode?: string,
    unit?: string,
    retail_price?: number,
    wholesale_price?: number,
    management_type?: 'basic' | 'imei' | 'batch',
    track_inventory?: boolean,
    allow_negative_stock?: boolean,
    low_stock_alert?: number,
    pricing_tiers?: Array<{ min_quantity: number, max_quantity: number | null, price: number }>,
    tags?: string[],
    apply_tax?: boolean,
    sale_tax_rate?: number,
    attributes?: Attribute[],
    variants?: ProductVariant[],
    warehouse_stocks?: WarehouseStock[],
    expired_warning_days?: number,
    // Gallery settings
    gallery_style?: string,
    image_aspect_ratio?: string,
    image_object_fit?: string
}

interface ProductSaveProps {
    record?: Product,
    catalogues: TParentCatalogue,
    brands?: Array<{ value: string, label: string }>
    warehouses?: Array<{ value: string | number, label: string }>
    tax?: {
        enabled: boolean
        price_includes_tax: boolean
        default_tax_on_sale: boolean
        default_tax_on_purchase: boolean
        sale_tax_rate: number
        purchase_tax_rate: number
    }
}
export default function ProductSave({ record, catalogues, brands = [], warehouses = [], tax }: ProductSaveProps) {

    const {
        initData
    } = usePageSetup<Product>({ record })

    console.log(record);


    const [images, setImages] = useState<string[]>(record?.album || [])
    const [productCatalogues, setProductCatalogues] = useState<string[]>(
        record?.product_catalogues?.map(c => String(c.id)) || []
    )
    const [productCatalogueId, setProductCatalogueId] = useState<string>(
        record?.product_catalogue_id ? String(record.product_catalogue_id) : ''
    )
    const [productBrandId, setProductBrandId] = useState<string>((record?.product_brand_id || '').toString())
    const [attributes, setAttributes] = useState<Attribute[]>(record?.attributes || [])
    const [variants, setVariants] = useState<ProductVariant[]>(record?.variants || [])
    // When user deletes a generated variant combination, keep it excluded (so it won't be auto-regenerated)
    const [excludedVariantKeys, setExcludedVariantKeys] = useState<Set<string>>(new Set())
    const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>(
        record?.warehouse_stocks || (warehouses[0]?.value ? [{
            warehouse_id: warehouses[0].value,
            stock_quantity: 0,
            storage_location: undefined
        }] : [])
    )
    type ManagementType = 'basic' | 'imei' | 'batch'
    const toManagementType = (v: unknown): ManagementType => {
        return v === 'basic' || v === 'imei' || v === 'batch' ? v : 'basic'
    }
    const [managementType, setManagementType] = useState<ManagementType>(toManagementType(record?.management_type))
    const [trackInventory, setTrackInventory] = useState<boolean>(record?.track_inventory ?? true)
    const [allowNegativeStock, setAllowNegativeStock] = useState<boolean>(record?.allow_negative_stock ?? false)
    const [lowStockAlert, setLowStockAlert] = useState<number>(record?.low_stock_alert ?? 0)
    const [expiredWarningDays, setExpiredWarningDays] = useState<number>(record?.expired_warning_days ?? 1)
    const [stockHistoryRefreshTrigger, setStockHistoryRefreshTrigger] = useState<number>(0)
    const [pricingRetail, setPricingRetail] = useState<number>(record?.retail_price ?? 0)
    const [pricingWholesale, setPricingWholesale] = useState<number>(record?.wholesale_price ?? 0)
    const [pricingTiers, setPricingTiers] = useState<Array<{ min_quantity: number; max_quantity: number | null; price: number }>>(record?.pricing_tiers || [])
    const [tagsDefault, setTagsDefault] = useState<string[]>(record?.tags || [])
    const taxPriceIncludes = !!tax?.price_includes_tax

    const availableCatalogues = useMemo(() => {
        // Backend đã trả về array với format [{value, label}] giữ nguyên thứ tự lft asc
        return Array.isArray(catalogues) ? catalogues : []
    }, [catalogues])

    // Ensure "Danh mục phụ" only contains valid option values (avoid MultiSelect warning)
    const allowedCatalogueValues = useMemo(() => {
        const all = new Set(
            (availableCatalogues || [])
                .map((c: { value: string | number }) => String(c.value))
                .filter((v) => v !== "0")
        )
        // Danh mục phụ không được trùng danh mục chính
        if (productCatalogueId) all.delete(String(productCatalogueId))
        return all
    }, [availableCatalogues, productCatalogueId])

    const normalizeProductCatalogues = useCallback(
        (values: string[] | undefined | null) => {
            const arr = (values || []).map(String).filter(Boolean)
            const uniq = Array.from(new Set(arr))
            return uniq.filter((v) => allowedCatalogueValues.has(v))
        },
        [allowedCatalogueValues]
    )

    // Ensure submit always uses latest state (avoid stale closure on fast interactions)
    const attributesRef = useRef<Attribute[]>(attributes)
    const variantsRef = useRef<ProductVariant[]>(variants)
    const warehouseStocksRef = useRef<WarehouseStock[]>(warehouseStocks)
    const managementTypeRef = useRef<'basic' | 'imei' | 'batch'>(managementType)
    const trackInventoryRef = useRef<boolean>(trackInventory)
    const allowNegativeStockRef = useRef<boolean>(allowNegativeStock)
    const lowStockAlertRef = useRef<number>(lowStockAlert)
    const expiredWarningDaysRef = useRef<number>(expiredWarningDays)


    useEffect(() => {
        managementTypeRef.current = managementType
    }, [managementType])
    useEffect(() => {
        lowStockAlertRef.current = lowStockAlert
    }, [lowStockAlert])
    useEffect(() => {
        expiredWarningDaysRef.current = expiredWarningDays
    }, [expiredWarningDays])


    const handleTrackInventoryChange = useCallback((v: boolean) => {
        trackInventoryRef.current = v
        setTrackInventory(v)
    }, [])

    const handleAllowNegativeStockChange = useCallback((v: boolean) => {
        allowNegativeStockRef.current = v
        setAllowNegativeStock(v)
    }, [])

    useEffect(() => {
        attributesRef.current = attributes
    }, [attributes])

    useEffect(() => {
        variantsRef.current = variants
    }, [variants])

    useEffect(() => {
        warehouseStocksRef.current = warehouseStocks
    }, [warehouseStocks])

    useEffect(() => {
        trackInventoryRef.current = trackInventory
    }, [trackInventory])

    useEffect(() => {
        allowNegativeStockRef.current = allowNegativeStock
    }, [allowNegativeStock])

    // Debug: Log brands để kiểm tra
    useEffect(() => {
        if (brands.length > 0) {
            console.log('Brands loaded:', brands)
        } else {
            console.log('No brands available')
        }
    }, [brands])

    // Prefill data when editing (record loaded/changed)
    useEffect(() => {
        // IMPORTANT:
        // Inertia can re-create `record` object on re-render/validation errors.
        // We only want to initialize when switching to a different record.id,
        // otherwise we'd overwrite local edits (e.g. deleted variants).
        if (!record?.id) return
        if (window.__product_save_initialized_id === record.id) return
        window.__product_save_initialized_id = record.id

        setImages(record.album || [])
        setProductCatalogueId(record.product_catalogue_id ? String(record.product_catalogue_id) : '')
        setProductBrandId((record.product_brand_id || '').toString())
        setProductCatalogues(
            normalizeProductCatalogues(record.product_catalogues?.map(c => String(c.id)) || [])
        )
        setAttributes(record.attributes || [])
        setVariants(record.variants || [])
        setManagementType(toManagementType(record.management_type))
        trackInventoryRef.current = record.track_inventory ?? true
        allowNegativeStockRef.current = record.allow_negative_stock ?? false
        setTrackInventory(trackInventoryRef.current)
        setAllowNegativeStock(allowNegativeStockRef.current)
        setLowStockAlert(record.low_stock_alert ?? 0)
        setPricingRetail(record.retail_price ?? 0)
        setPricingWholesale(record.wholesale_price ?? 0)
        setPricingTiers(record.pricing_tiers || [])
        setTagsDefault(record.tags || [])
        // Warehouse stocks: always use data from database if available
        // If record has warehouse_stocks (even if empty array), use it
        // Otherwise, initialize with default warehouse if in create mode
        if (record?.warehouse_stocks && Array.isArray(record.warehouse_stocks)) {
            // Use data from database
            setWarehouseStocks(record.warehouse_stocks)
        } else if (!record?.id && warehouses[0]?.value) {
            // Only initialize default for create mode
            setWarehouseStocks([{
                warehouse_id: warehouses[0].value,
                stock_quantity: 0,
                storage_location: undefined
            }])
        } else {
            // Edit mode but no warehouse_stocks from DB - initialize empty
            setWarehouseStocks([])
        }
        // Reset excluded keys when switching product
        setExcludedVariantKeys(new Set())
    }, [record?.id])

    // Sync warehouseStocks when record.warehouse_stocks changes (e.g., after stock adjustment)
    // Use ref to track previous value and avoid infinite loops
    const prevWarehouseStocksRef = useRef<string>('')
    useEffect(() => {
        if (record?.warehouse_stocks && Array.isArray(record.warehouse_stocks)) {
            const newStocksStr = JSON.stringify(record.warehouse_stocks)
            // Only update if the data actually changed
            if (prevWarehouseStocksRef.current !== newStocksStr) {
                setWarehouseStocks(record.warehouse_stocks)
                prevWarehouseStocksRef.current = newStocksStr
            }
        } else if (!record?.warehouse_stocks && prevWarehouseStocksRef.current !== '') {
            // Reset if warehouse_stocks is removed
            setWarehouseStocks([])
            prevWarehouseStocksRef.current = ''
        }
    }, [record?.warehouse_stocks])

    useEffect(() => {
        // When options/main catalogue changes, drop invalid secondary selections
        setProductCatalogues((prev) => normalizeProductCatalogues(prev))
    }, [normalizeProductCatalogues])

    const handleLoadDemo = useCallback(() => {
        const seed = Date.now()

        // Side states
        setImages([
            'https://picsum.photos/seed/' + seed + '/800/800',
            'https://picsum.photos/seed/' + (seed + 1) + '/800/800',
        ])

        // Catalogues / brand (best-effort)
        const firstCatalogue = availableCatalogues?.[0]?.value
        if (firstCatalogue) setProductCatalogueId(String(firstCatalogue))
        const firstBrand = brands?.[0]?.value
        if (firstBrand) setProductBrandId(String(firstBrand))

        const multi = (availableCatalogues || []).slice(0, 2).map((c) => String(c.value))
        setProductCatalogues(normalizeProductCatalogues(multi))

        // Pricing
        setPricingRetail(199000)
        setPricingWholesale(149000)
        setPricingTiers([
            { min_quantity: 2, max_quantity: 9, price: 139000 },
            { min_quantity: 10, max_quantity: null, price: 129000 },
        ])

        // Tags
        setTagsDefault([`DemoTag-${seed}`, 'DemoTag-A', 'DemoTag-B'])

        // Inventory
        handleTrackInventoryChange(true)
        handleAllowNegativeStockChange(true)
        setManagementType('batch')
        setWarehouseStocks(
            warehouses?.[0]?.value
                ? [
                    {
                        warehouse_id: warehouses[0].value,
                        stock_quantity: 25,
                        storage_location: 'A-01-01',
                    },
                ]
                : []
        )

        // Attributes + variants
        const attrs: Attribute[] = [
            { id: String(seed) + '-a', name: 'Màu', values: ['Đỏ', 'Xanh'] },
            { id: String(seed) + '-b', name: 'Size', values: ['S', 'M'] },
        ]
        setAttributes(attrs)
        // Let generator run, but also prefill variant fields immediately for common combos
        const combos: Array<Record<string, string>> = []
        for (const color of attrs[0].values) {
            for (const size of attrs[1].values) {
                combos.push({ Màu: color, Size: size })
            }
        }
        setVariants(
            combos.map((c, idx) => ({
                id: String(seed) + '-' + idx,
                sku: `DEMO-${seed}-${idx}`,
                retail_price: 199000,
                wholesale_price: 149000,
                cost_price: 99000,
                stock_quantity: 10 + idx,
                attributes: c,
            }))
        )
        setExcludedVariantKeys(new Set())
    }, [
        availableCatalogues,
        brands,
        handleAllowNegativeStockChange,
        handleTrackInventoryChange,
        normalizeProductCatalogues,
        warehouses,
    ])

    // const sessionId = useMemo(() => {
    //     return record?.id ? `product_catalogue-${record.id}` : `product_catalogue-${Date.now()}`
    // }, [record?.id])

    const buttonAction = useRef("")
    const isEdit = !!record

    const handleAlbumImagesChange = useCallback((urls: string[]) => {
        setImages(urls)
    }, [])

    const attributeNames = useMemo(() => attributes.map(a => a.name), [attributes])

    const getVariantKey = useCallback((attrs: Record<string, string>) => {
        return Object.entries(attrs)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join('|')
    }, [])

    const handleVariantRemove = useCallback((variant: ProductVariant) => {
        if (!variant?.attributes) return
        const key = getVariantKey(variant.attributes)
        setExcludedVariantKeys(prev => {
            const next = new Set(prev)
            next.add(key)
            return next
        })
    }, [getVariantKey])

    // Generate variants when attributes change - optimized with debouncing and memoization
    const attributesKey = useMemo(() => {
        return JSON.stringify(attributes.map(a => ({
            name: a.name,
            values: [...a.values].sort() // Sort for consistent comparison
        })))
    }, [attributes])

    const prevHadAttributesRef = useRef(false)
    const lastAttributesNamesRef = useRef<string[]>([])

    useEffect(() => {
        // If editing and server already provided variants, derive attributes from variants so UI can render consistently.
        if (isEdit && attributes.length === 0 && variants.length > 0) {
            const map: Record<string, Set<string>> = {}
            for (const v of variants) {
                const attrs = v.attributes || {}
                for (const [k, val] of Object.entries(attrs)) {
                    const key = String(k)
                    const value = String(val || '')
                    if (!key || !value) continue
                    if (!map[key]) map[key] = new Set<string>()
                    map[key].add(value)
                }
            }
            const derived = Object.entries(map).map(([name, set]) => ({
                id: Date.now().toString() + Math.random(),
                name,
                values: Array.from(set.values()),
            }))
            if (derived.length > 0) {
                setAttributes(derived)
            }
        }

        if (attributes.length === 0) {
            // Only clear variants if user previously had attributes and now removed them.
            if (prevHadAttributesRef.current) {
                setVariants([])
            }
            prevHadAttributesRef.current = false
            return
        }
        prevHadAttributesRef.current = true

        // Check if all attributes have values
        const validAttributes = attributes.filter(a => a.name && a.values.length > 0)
        if (validAttributes.length === 0) return

        // Debounce: Only regenerate after user stops typing (500ms delay for better performance)
        const timeoutId = setTimeout(() => {
            // Generate Cartesian product of attribute values
            const generateCartesianProduct = (attrs: Attribute[], index: number = 0, current: Record<string, string> = {}): Record<string, string>[] => {
                if (index === attrs.length) {
                    return [current]
                }
                const attr = attrs[index]
                const result: Record<string, string>[] = []
                if (attr.values.length === 0) {
                    return []
                }

                for (const value of attr.values) {
                    result.push(...generateCartesianProduct(attrs, index + 1, { ...current, [attr.name]: value }))
                }
                return result
            }

            const combinations = generateCartesianProduct(validAttributes)

            setVariants(prevVariants => {
                const isSubsetMatch = (variantAttrs: Record<string, string>, combo: Record<string, string>) => {
                    for (const [k, v] of Object.entries(variantAttrs || {})) {
                        if (combo[k] !== v) return false
                    }
                    return true
                }

                // Prefer matching the most specific variants first
                const candidates = [...prevVariants].sort((a, b) => {
                    const al = Object.keys(a.attributes || {}).length
                    const bl = Object.keys(b.attributes || {}).length
                    return bl - al
                })
                const used = new Set<string>()

                const next = combinations
                    .filter(combo => !excludedVariantKeys.has(getVariantKey(combo)))
                    .map(combo => {
                        // Exact match first
                        const exactKey = getVariantKey(combo)
                        const exact = candidates.find(v => getVariantKey(v.attributes) === exactKey)
                        if (exact) {
                            used.add(String(exact.id ?? exactKey))
                            return { ...exact, attributes: combo }
                        }

                        // Subset match (handles "edit product -> add a new attribute" without losing loaded variants)
                        const subset = candidates.find(v => {
                            const idKey = String(v.id ?? getVariantKey(v.attributes))
                            if (used.has(idKey)) return false
                            return isSubsetMatch(v.attributes, combo)
                        })
                        if (subset) {
                            used.add(String(subset.id ?? getVariantKey(subset.attributes)))
                            return { ...subset, attributes: combo }
                        }

                        // New variant for new combination
                        return {
                            id: Date.now().toString() + Math.random(),
                            sku: '',
                            retail_price: record?.retail_price || 0,
                            wholesale_price: record?.wholesale_price ?? 0,
                            cost_price: 0,
                            stock_quantity: 0,
                            attributes: combo
                        }
                    })

                // Track latest attribute names snapshot (helps debugging / future enhancements)
                lastAttributesNamesRef.current = validAttributes.map(a => a.name)

                return next
            })
        }, 500) // 500ms debounce delay for better performance

        return () => clearTimeout(timeoutId)
    }, [attributesKey, excludedVariantKeys, getVariantKey, record?.retail_price, record?.wholesale_price])


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />
                <div className="page-container">
                    <FormProvider initData={initData}>

                        <Form
                            options={{
                                preserveScroll: true,
                                preserveState: setPreserveState,
                            }}
                            action={
                                isEdit ? product.update(record.id).url : product.store().url
                            }
                            method="post"
                            resetOnSuccess={['name', 'canonical', 'description', 'meta_title', 'meta_keyword', 'meta_description', 'description', 'content', 'images']}

                            transform={(data) => {
                                const transformed = {
                                    ...data,
                                    ...(isEdit ? { _method: 'put' } : {}),
                                    album: [...images],
                                    management_type: managementTypeRef.current,
                                    track_inventory: trackInventoryRef.current ? 1 : 0,
                                    allow_negative_stock: allowNegativeStockRef.current ? 1 : 0,
                                    low_stock_alert: lowStockAlertRef.current ? Number(lowStockAlertRef.current) : 0,
                                    expired_warning_days: expiredWarningDaysRef.current ? Number(expiredWarningDaysRef.current) : 0,
                                    // Normalize optional foreign keys (avoid sending empty string -> validation fails)
                                    product_catalogue_id: productCatalogueId ? Number(productCatalogueId) : null,
                                    product_brand_id: productBrandId ? Number(productBrandId) : null,

                                    product_catalogues: (productCatalogues || []).filter(Boolean),
                                    attributes: attributesRef.current, // runtime is OK; cast for Inertia typing
                                    variants: variantsRef.current,
                                    warehouse_stocks: warehouseStocksRef.current,
                                    save_and_redirect: buttonAction.current,
                                }
                                return transformed as unknown as Record<string, FormDataConvertible>
                            }}
                        >
                            {({ processing, errors }) => (
                                <div className="max-w-[1280px] ml-auto mr-auto">
                                    <div className="grid grid-cols-12 gap-4">
                                        <div className="col-span-9">
                                            {/* Thông tin chung - first */}
                                            <CustomGeneralCollapsible
                                                name={record?.name}
                                                description={record?.description}
                                                content={record?.content}
                                                errors={errors}
                                                className="mb-[20px]"
                                                onLoadDemo={isEdit ? undefined : handleLoadDemo}
                                            />

                                            {/* Thông tin cơ bản - second */}
                                            <CustomCard
                                                isShowHeader={true}
                                                title="Thông tin cơ bản"
                                                className="mb-[20px]"
                                            >
                                                <ProductBasicInfo
                                                    sku={record?.sku}
                                                    barcode={record?.barcode}
                                                    unit={record?.unit}
                                                    errors={errors}
                                                />
                                            </CustomCard>

                                            {/* Giá sản phẩm - third */}
                                            <CustomCard
                                                isShowHeader={true}
                                                title="Giá sản phẩm"
                                                className="mb-[20px]"
                                            >
                                                <PricingSection
                                                    retailPrice={pricingRetail}
                                                    wholesalePrice={pricingWholesale}
                                                    pricingTiers={pricingTiers}
                                                    applyTax={record?.apply_tax}
                                                    forceTaxIncluded={taxPriceIncludes}
                                                    errors={errors}
                                                />
                                            </CustomCard>
                                            <CustomAlbum
                                                data={record?.album}
                                                onDataChange={handleAlbumImagesChange}
                                            />

                                            {/* Thông tin kho - chỉ hiển thị nếu không có variants */}
                                            {(!variants || variants.length === 0) ? (
                                                <CustomCard
                                                    isShowHeader={true}
                                                    title="Thông tin kho"
                                                    className="mb-[20px] mt-[20px]"
                                                    isShowFooter={managementType !== 'batch' && isEdit && (!variants || variants.length === 0)}
                                                    footerClassName="!p-0 block"
                                                    footerChildren={
                                                        record?.id ? (
                                                            <StockHistory
                                                                key={`stock-history-${record.id}-${stockHistoryRefreshTrigger}`}
                                                                productId={record.id}
                                                                warehouses={warehouses}
                                                                refreshTrigger={stockHistoryRefreshTrigger}
                                                            />
                                                        ) : undefined
                                                    }
                                                >
                                                    <InventoryInfo
                                                        trackInventory={trackInventory}
                                                        trackInventorySaved={record?.track_inventory}
                                                        allowNegativeStock={allowNegativeStock}
                                                        onTrackInventoryChange={handleTrackInventoryChange}
                                                        onAllowNegativeStockChange={handleAllowNegativeStockChange}
                                                        lowStockAlert={lowStockAlert}
                                                        onLowStockAlertChange={setLowStockAlert}
                                                        warehouses={warehouses}
                                                        warehouseStocks={warehouseStocks}
                                                        onWarehouseStocksChange={setWarehouseStocks}
                                                        productId={record?.id}
                                                        isEdit={isEdit}
                                                        managementType={managementType}
                                                        onManagementTypeChange={setManagementType}
                                                        expiredWarningDays={expiredWarningDays}
                                                        onExpiredWarningDaysChange={setExpiredWarningDays}
                                                        onStockHistoryRefresh={() => {
                                                            console.log('onStockHistoryRefresh called in save.tsx, incrementing trigger')
                                                            // Use functional update to ensure we always increment
                                                            // Add a tiny fraction to ensure uniqueness and force React to see it as a change
                                                            setStockHistoryRefreshTrigger(prev => {
                                                                const baseValue = Math.floor(prev) + 1
                                                                const fraction = (Date.now() % 1000) / 1000000 // Tiny fraction for uniqueness
                                                                const newValue = baseValue + fraction
                                                                console.log('Stock history refresh trigger updated from', prev, 'to', newValue)
                                                                return newValue
                                                            })
                                                        }}
                                                    />
                                                </CustomCard>
                                            ) : (
                                                <CustomCard
                                                    isShowHeader={true}
                                                    title="Thông tin tồn kho"
                                                    className="mb-[20px] mt-[20px]"
                                                >
                                                    <div className="space-y-4">
                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                            <div className="flex items-start gap-3">
                                                                <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-medium text-blue-900 mb-1">
                                                                        Sản phẩm có phiên bản
                                                                    </p>
                                                                    <p className="text-sm text-blue-800">
                                                                        Sản phẩm này có <strong>{variants.length} phiên bản</strong>.
                                                                        Quản lý thông tin kho được thực hiện riêng cho từng phiên bản.
                                                                        Vui lòng click vào <strong>tên phiên bản</strong> trong bảng bên dưới để quản lý tồn kho chi tiết.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="border-t pt-4">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium">Tổng tồn kho tất cả phiên bản:</span>
                                                                <span className="text-lg font-semibold">
                                                                    {variants.reduce((sum, v) => {
                                                                        // Sum from warehouse_stocks if available, otherwise use stock_quantity
                                                                        if (v.warehouse_stocks && Array.isArray(v.warehouse_stocks) && v.warehouse_stocks.length > 0) {
                                                                            return sum + v.warehouse_stocks.reduce((stockSum, ws) => stockSum + (ws.stock_quantity || 0), 0)
                                                                        }
                                                                        return sum + (v.stock_quantity || 0)
                                                                    }, 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CustomCard>
                                            )}

                                            {/* Vận chuyển */}
                                            <CustomCard
                                                isShowHeader={true}
                                                title="Vận chuyển"
                                                className="mb-[20px]"
                                            >
                                                <ShippingInfo />
                                            </CustomCard>

                                            {/* Thuộc tính */}
                                            <AttributesSection
                                                attributes={attributes}
                                                onAttributesChange={setAttributes}
                                                errors={errors}
                                            />

                                            {/* Phiên bản */}
                                            <VariantsSection
                                                variants={variants}
                                                onVariantsChange={setVariants}
                                                onVariantRemove={handleVariantRemove}
                                                attributeNames={attributeNames}
                                                warehouses={warehouses}
                                                defaultWarehouseId={warehouses[0]?.value}
                                                productId={record?.id}
                                                managementType={managementType}
                                            />

                                            {/* SEO - Collapsible */}
                                            <SeoSection record={record} errors={errors} />

                                            {/* Sticky save buttons at bottom */}
                                            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
                                                <div className="max-w-[1280px] mx-auto px-4 py-3">
                                                    <div className="flex space-x-2 justify-end">
                                                        <Button
                                                            type="submit"
                                                            className="w-[150px] cursor-pointer"
                                                            data-testid="product-save"
                                                            tabIndex={4}
                                                            disabled={processing}
                                                            onClick={() => (buttonAction.current = '')}
                                                        >
                                                            {processing && (
                                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                            )}
                                                            Lưu lại
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            className="w-[150px] cursor-pointer bg-blue-500"
                                                            data-testid="product-save-close"
                                                            tabIndex={4}
                                                            disabled={processing}
                                                            // Ensure redirect flag is set before submit event fires
                                                            onMouseDown={() => (buttonAction.current = 'redirect')}
                                                            onClick={() => (buttonAction.current = 'redirect')}
                                                        >
                                                            {processing && (
                                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                            )}
                                                            Lưu lại và đóng
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <CustomCard
                                                isShowHeader={false}
                                                className="mb-[25px]"
                                            >
                                                <CustomCatalogueParent
                                                    name="product_catalogue_id"
                                                    data={availableCatalogues}
                                                    value={productCatalogueId}
                                                    onValueChange={setProductCatalogueId}
                                                />
                                                <div className="mb-[20px]">
                                                    <Label className="font-normal mb-2 block">Thương hiệu</Label>
                                                    <Combobox
                                                        options={brands.map(b => ({
                                                            value: String(b.value),
                                                            label: b.label,
                                                            disabled: false
                                                        }))}
                                                        value={productBrandId}
                                                        onValueChange={(val) => setProductBrandId(val)}
                                                        placeholder="Chọn thương hiệu"
                                                        searchPlaceholder="Tìm kiếm thương hiệu..."
                                                        emptyText="Không tìm thấy thương hiệu nào."
                                                        name="product_brand_id"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="font-normal mb-2 block">Danh mục phụ</Label>
                                                    <MultiSelect
                                                        options={
                                                            availableCatalogues.map(item => ({
                                                                value: String(item.value),
                                                                label: item.label.replace(/\|-----/g, '')
                                                            })).filter(item => item.value !== '0' && item.value !== productCatalogueId)}
                                                        onValueChange={(values) => setProductCatalogues(normalizeProductCatalogues(values))}
                                                        defaultValue={normalizeProductCatalogues(productCatalogues)}
                                                        variant="inverted"
                                                        placeholder="Chọn Danh Mục Phụ"
                                                    />
                                                </div>
                                            </CustomCard>

                                            <CustomCard
                                                isShowHeader={true}
                                                title="Ảnh Đại Diện"
                                                className="mb-[25px]"
                                            >
                                                <CustomFeaturedImage
                                                    value={record?.image}
                                                />
                                            </CustomCard>

                                            <CustomCard
                                                isShowHeader={true}
                                                title="Cấu hình chung"
                                                className="mb-[25px]"
                                            >
                                                <CustomSeoOptions
                                                    order={record?.order?.toString()}
                                                    hidden={['type']}
                                                    initialGalleryStyle={record?.gallery_style}
                                                    initialImageAspectRatio={record?.image_aspect_ratio}
                                                    initialImageObjectFit={record?.image_object_fit}
                                                />
                                            </CustomCard>

                                            <CustomCard
                                                isShowHeader={true}
                                                title="Tag"
                                                className="mb-[20px]"
                                                headerChildren={
                                                    <CardHeader className="border-b gap-0">
                                                        <div className="flex items-center justify-between pb-[15px]">
                                                            <CardTitle className="uppercase">Tag</CardTitle>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const event = new CustomEvent('open-tags-list')
                                                                    window.dispatchEvent(event)
                                                                }}
                                                                className="text-xs text-blue-500 hover:text-blue-700 hover:underline font-normal cursor-pointer"
                                                            >
                                                                Danh sách tags
                                                            </button>
                                                        </div>
                                                    </CardHeader>
                                                }
                                            >
                                                <TagsInput
                                                    defaultTags={tagsDefault}
                                                    onOpenTagsList={() => { }}
                                                />
                                            </CustomCard>

                                            <CustomCard
                                                isShowHeader={true}
                                                title="Kênh bán hàng"
                                                className="mb-[20px]"
                                            >
                                                <p className="text-sm text-muted-foreground">Chức năng đang phát triển...</p>
                                            </CustomCard>

                                            <CustomCard
                                                isShowHeader={true}
                                                title="Thông Tin Về SEO"
                                                className="mb-[20px]"
                                            >
                                                <CustomSeoScores />
                                            </CustomCard>

                                        </div>
                                    </div>
                                </div>
                            )}
                        </Form>
                    </FormProvider>
                </div>

            </div>
        </AppLayout>
    );
}

// Helper component to sync FormContext values to refs
// Must be inside FormProvider to access context
function GallerySettingsSync({
    imageAspectRatioRef,
    galleryStyleRef,
    imageObjectFitRef
}: {
    imageAspectRatioRef: React.MutableRefObject<string>
    galleryStyleRef: React.MutableRefObject<string>
    imageObjectFitRef: React.MutableRefObject<string>
}) {
    const { imageAspectRatio, galleryStyle, imageObjectFit } = useFormContext()

    useEffect(() => {
        imageAspectRatioRef.current = imageAspectRatio
    }, [imageAspectRatio, imageAspectRatioRef])

    useEffect(() => {
        galleryStyleRef.current = galleryStyle
    }, [galleryStyle, galleryStyleRef])

    useEffect(() => {
        imageObjectFitRef.current = imageObjectFit
    }, [imageObjectFit, imageObjectFitRef])

    return null
}

