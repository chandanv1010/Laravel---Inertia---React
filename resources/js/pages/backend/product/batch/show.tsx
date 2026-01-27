import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import CustomCard from "@/components/custom-card"
import { Head, Link, router } from "@inertiajs/react"
import { ArrowDown, ArrowUp, Calendar as CalendarIcon, ChevronDown, Pencil, ArrowRightLeft } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { format, isValid, parseISO, startOfDay, endOfDay, subDays, subWeeks, subMonths, subYears } from "date-fns"
import { useCallback, useState, useMemo, useEffect } from "react"
import { DateRange } from "react-day-picker"
import { getCsrfHeaders } from "@/lib/helper"

type WarehouseOption = { value: string; label: string }

type WarehouseDistribution = {
  warehouse_id: number | null
  warehouse_name: string
  stock_quantity: number
  batch_id: number
}

type Batch = {
  id: number
  code: string
  product_id: number
  product_variant_id?: number | null
  product_name?: string | null
  variant_name?: string | null
  manufactured_at: string | null
  expired_at: string | null
  warehouse_id: number | null
  stock_quantity: number
  total_stock?: number // Tổng số lượng ở tất cả các kho
  warehouse_distribution?: WarehouseDistribution[] // Phân bổ số lượng theo từng kho
  is_default: boolean
  created_at: string | null
  is_variant_batch?: boolean
}

type StockLog = {
  id: number
  change_stock: number
  before_stock: number
  after_stock: number
  reason: string | null
  transaction_type?: string
  warehouse_id?: number | null
  warehouse_name?: string | null
  transfer_info?: {
    type: 'in' | 'out'
    from_warehouse_id: number
    from_warehouse_name: string
    to_warehouse_id: number
    to_warehouse_name: string
  } | null
  created_at: string | null
  user: {
    id: number
    name: string
    email: string
  } | null
}

type LogsPaginated = {
  data: StockLog[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export default function BatchShow({
  batch,
  warehouses,
  logs,
  request,
}: {
  batch: Batch
  warehouses: WarehouseOption[]
  logs: LogsPaginated
  request?: {
    transaction_types?: string[]
    created_at?: { between?: string }
    perpage?: number
    page?: number
    default_transaction_type?: string
  }
}) {
  const [localBatch, setLocalBatch] = useState<Batch>(batch)
  
  // Update localBatch when batch prop changes (from Inertia reload)
  useEffect(() => {
    setLocalBatch(batch)
  }, [batch])
  const [savingDates, setSavingDates] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [openAdjust, setOpenAdjust] = useState(false)
  const [adjustingBatchId, setAdjustingBatchId] = useState<number | null>(null)
  const [adjustingWarehouseId, setAdjustingWarehouseId] = useState<string>("")
  const [adjustingWarehouseName, setAdjustingWarehouseName] = useState<string>("")
  const [delta, setDelta] = useState("0")
  const [newStock, setNewStock] = useState(String(batch.stock_quantity ?? 0))
  const [reason, setReason] = useState("Thực tế")
  const [savingStock, setSavingStock] = useState(false)
  const [openFilterType, setOpenFilterType] = useState(false)
  
  // Transfer modal states
  const [openTransfer, setOpenTransfer] = useState(false)
  const [transferFromWarehouseId, setTransferFromWarehouseId] = useState<string>("")
  const [transferWarehouseId, setTransferWarehouseId] = useState<string>("")
  const [transferQuantity, setTransferQuantity] = useState<string>("")
  const [transferReason, setTransferReason] = useState("Chuyển kho")
  const [transferring, setTransferring] = useState(false)
  const [openFilterTime, setOpenFilterTime] = useState(false)
  
  // Reset showCustomDatePicker when popover closes
  const handleFilterTimeOpenChange = (open: boolean) => {
    setOpenFilterTime(open)
    if (!open) {
      setShowCustomDatePicker(false)
    }
  }
  // Get default transaction type from request or batch type
  const defaultTransactionType = request?.default_transaction_type || (batch.is_variant_batch ? 'variant' : 'product')

  // Initialize filterTypes from request
  const initialFilterTypes = useMemo(() => {
    const types: Record<string, boolean> = {
      product: false,
      variant: false,
      sale: false,
      purchase: false,
      transfer: false,
      import_file: false,
      purchase_order: false,
    }
    if (request?.transaction_types && request.transaction_types.length > 0) {
      request.transaction_types.forEach((t) => {
        if (t in types) types[t] = true
      })
    } else {
      // Default to appropriate type based on batch
      types[defaultTransactionType] = true
    }
    return types
  }, [request?.transaction_types, defaultTransactionType])

  const [filterTypes, setFilterTypes] = useState<Record<string, boolean>>(initialFilterTypes)

  // Parse date range from request
  const initialDateRange = useMemo<DateRange | undefined>(() => {
    if (request?.created_at?.between) {
      const dates = request.created_at.between.split(',')
      if (dates.length === 2) {
        const from = parseISO(dates[0].trim())
        const to = parseISO(dates[1].trim())
        if (isValid(from) && isValid(to)) {
          return { from, to }
        }
      }
    }
    return undefined
  }, [request?.created_at?.between])

  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange)
  const [perPage, setPerPage] = useState<number>(request?.perpage || 20)
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)

  // Apply filters
  const applyFilters = () => {
    const selectedTypes = Object.entries(filterTypes)
      .filter(([, checked]) => checked)
      .map(([key]) => key)

    const params: Record<string, string | string[] | number> = {}
    // Always send transaction_types, default based on batch type
    if (selectedTypes.length > 0) {
      params.transaction_types = selectedTypes
    } else {
      params.transaction_types = [defaultTransactionType]
    }
    if (dateRange?.from && dateRange?.to) {
      params['created_at[between]'] = `${format(dateRange.from, 'yyyy-MM-dd')},${format(dateRange.to, 'yyyy-MM-dd')}`
    }
    if (perPage) {
      params.perpage = perPage
    }
    // Reset to first page when applying filters
    params.page = 1

    router.get(`/backend/product-batches/${batch.id}/detail`, params, {
      preserveState: false,
      preserveScroll: false,
    })
  }

  // Check if current dateRange matches a preset
  const getActiveTimeFilterLabel = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null

    const now = new Date()
    const from = dateRange.from
    const to = dateRange.to

    // Helper to check if dates match (only date, ignore time)
    const datesMatch = (d1: Date, d2: Date) => {
      return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    }

    // Hôm nay
    if (datesMatch(from, startOfDay(now)) && datesMatch(to, endOfDay(now))) {
      return "Hôm nay"
    }

    // Hôm qua
    const yesterday = subDays(now, 1)
    if (datesMatch(from, startOfDay(yesterday)) && datesMatch(to, endOfDay(yesterday))) {
      return "Hôm qua"
    }

    // 7 ngày qua
    const sevenDaysAgo = subDays(now, 7)
    if (datesMatch(from, startOfDay(sevenDaysAgo)) && datesMatch(to, endOfDay(now))) {
      return "7 ngày qua"
    }

    // 30 ngày qua
    const thirtyDaysAgo = subDays(now, 30)
    if (datesMatch(from, startOfDay(thirtyDaysAgo)) && datesMatch(to, endOfDay(now))) {
      return "30 ngày qua"
    }

    // Tuần trước
    const lastWeekStart = startOfDay(subWeeks(now, 1))
    const lastWeekEnd = endOfDay(subDays(lastWeekStart, 7))
    if (datesMatch(from, lastWeekStart) && datesMatch(to, lastWeekEnd)) {
      return "Tuần trước"
    }

    // Tuần này
    const thisWeekStart = startOfDay(subWeeks(now, 0))
    if (datesMatch(from, thisWeekStart) && datesMatch(to, endOfDay(now))) {
      return "Tuần này"
    }

    // Tháng trước
    const lastMonthStart = startOfDay(subMonths(now, 1))
    const lastMonthEnd = endOfDay(subDays(lastMonthStart, 30))
    if (datesMatch(from, lastMonthStart) && datesMatch(to, lastMonthEnd)) {
      return "Tháng trước"
    }

    // Tháng này
    const thisMonthStart = startOfDay(subMonths(now, 0))
    if (datesMatch(from, thisMonthStart) && datesMatch(to, endOfDay(now))) {
      return "Tháng này"
    }

    // Năm trước
    const lastYearStart = startOfDay(subYears(now, 1))
    const lastYearEnd = endOfDay(subDays(lastYearStart, 365))
    if (datesMatch(from, lastYearStart) && datesMatch(to, lastYearEnd)) {
      return "Năm trước"
    }

    // Năm nay
    const thisYearStart = startOfDay(subYears(now, 0))
    if (datesMatch(from, thisYearStart) && datesMatch(to, endOfDay(now))) {
      return "Năm nay"
    }

    // If doesn't match any preset, it's custom
    return "Tùy chọn"
  }, [dateRange])

  // Handle time filter quick select
  const handleTimeFilter = (type: string) => {
    const now = new Date()
    let range: DateRange | undefined

    switch (type) {
      case 'Hôm nay': {
        range = { from: startOfDay(now), to: endOfDay(now) }
        break
      }
      case 'Hôm qua': {
        const yesterday = subDays(now, 1)
        range = { from: startOfDay(yesterday), to: endOfDay(yesterday) }
        break
      }
      case '7 ngày qua': {
        range = { from: startOfDay(subDays(now, 7)), to: endOfDay(now) }
        break
      }
      case '30 ngày qua': {
        range = { from: startOfDay(subDays(now, 30)), to: endOfDay(now) }
        break
      }
      case 'Tuần trước': {
        const lastWeekStart = startOfDay(subWeeks(now, 1))
        const lastWeekEnd = endOfDay(subDays(lastWeekStart, 7))
        range = { from: lastWeekStart, to: lastWeekEnd }
        break
      }
      case 'Tuần này': {
        range = { from: startOfDay(subWeeks(now, 0)), to: endOfDay(now) }
        break
      }
      case 'Tháng trước': {
        const lastMonthStart = startOfDay(subMonths(now, 1))
        const lastMonthEnd = endOfDay(subDays(lastMonthStart, 30))
        range = { from: lastMonthStart, to: lastMonthEnd }
        break
      }
      case 'Tháng này': {
        range = { from: startOfDay(subMonths(now, 0)), to: endOfDay(now) }
        break
      }
      case 'Năm trước': {
        const lastYearStart = startOfDay(subYears(now, 1))
        const lastYearEnd = endOfDay(subDays(lastYearStart, 365))
        range = { from: lastYearStart, to: lastYearEnd }
        break
      }
      case 'Năm nay': {
        range = { from: startOfDay(subYears(now, 0)), to: endOfDay(now) }
        break
      }
      default:
        return
    }

    if (range && range.from && range.to) {
      setDateRange(range)
      const params: Record<string, string | string[] | number> = {}
      const selectedTypes = Object.entries(filterTypes)
        .filter(([, checked]) => checked)
        .map(([key]) => key)
      if (selectedTypes.length > 0) {
        params.transaction_types = selectedTypes
      } else {
        params.transaction_types = [defaultTransactionType]
      }
      params['created_at[between]'] = `${format(range.from, 'yyyy-MM-dd')},${format(range.to, 'yyyy-MM-dd')}`
      if (perPage) {
        params.perpage = perPage
      }

      router.get(`/backend/product-batches/${batch.id}/detail`, params, {
        preserveState: false,
        preserveScroll: false,
      })
      setOpenFilterTime(false)
    }
  }

  const apiFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const method = (init.method || "GET").toUpperCase()
    const includeContentType = method !== "GET" && method !== "HEAD"
    
    const headers = getCsrfHeaders(
      init.headers as Record<string, string> || {},
      includeContentType
    )

    return fetch(url, { credentials: "same-origin", ...init, headers })
  }, [])

  const parseDate = (v: string | null) => {
    if (!v) return undefined
    const d = parseISO(v)
    return isValid(d) ? d : undefined
  }

  const saveDates = async (patch: { manufactured_at?: string | null; expired_at?: string | null }) => {
    setSavingDates(true)
    try {
      await apiFetch(`/backend/product-batches/${localBatch.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
      setLocalBatch((prev) => ({ ...prev, ...patch }))
      setDirty(false)
    } finally {
      setSavingDates(false)
    }
  }

  const saveAll = async () => {
    await saveDates({
      manufactured_at: localBatch.manufactured_at ?? null,
      expired_at: localBatch.expired_at ?? null,
    })
    window.location.reload()
  }

  const openAdjustModal = (batchId?: number, warehouseId?: string, warehouseName?: string, currentStock?: number) => {
    // Nếu không truyền params, dùng batch hiện tại
    const targetBatchId = batchId ?? localBatch.id
    const targetWarehouseId = warehouseId ?? String(localBatch.warehouse_id ?? "")
    const targetWarehouseName = warehouseName ?? warehouses.find(w => String(w.value) === targetWarehouseId)?.label ?? ""
    const current = currentStock ?? Number(localBatch.stock_quantity ?? 0)
    
    setAdjustingBatchId(targetBatchId)
    setAdjustingWarehouseId(targetWarehouseId)
    setAdjustingWarehouseName(targetWarehouseName)
    setDelta("0")
    setNewStock(String(current))
    setReason("Thực tế")
    setOpenAdjust(true)
  }

  const submitAdjust = async () => {
    const n = Number(newStock)
    if (Number.isNaN(n) || n < 0) return
    if (!adjustingBatchId) return
    if (!adjustingWarehouseId) {
      alert("Vui lòng chọn kho để điều chỉnh tồn kho.")
      return
    }
    
    setSavingStock(true)
    try {
      await apiFetch(`/backend/product-batches/${adjustingBatchId}`, {
        method: "PATCH",
        body: JSON.stringify({ 
          stock_quantity: n, 
          warehouse_id: Number(adjustingWarehouseId),
          reason 
        }),
      })
      
      setOpenAdjust(false)
      
      // Reload page để cập nhật warehouse_distribution và logs
      const params: Record<string, string | string[] | number> = {}
      const selectedTypes = Object.entries(filterTypes)
        .filter(([, checked]) => checked)
        .map(([key]) => key)
      if (selectedTypes.length > 0) {
        params.transaction_types = selectedTypes
      } else {
        params.transaction_types = [defaultTransactionType]
      }
      if (dateRange?.from && dateRange?.to) {
        params['created_at[between]'] = `${format(dateRange.from, 'yyyy-MM-dd')},${format(dateRange.to, 'yyyy-MM-dd')}`
      }
      if (perPage) {
        params.perpage = perPage
      }
      if (logs.current_page) {
        params.page = logs.current_page
      }
      
      router.reload({
        preserveState: false,
        preserveScroll: false,
        data: params,
      })
    } finally {
      setSavingStock(false)
    }
  }

  const openTransferModal = () => {
    // Mặc định chọn kho có số lượng > 0 đầu tiên (hoặc kho hiện tại nếu có số lượng)
    const availableWarehouse = localBatch.warehouse_distribution?.find(d => d.stock_quantity > 0)
    setTransferFromWarehouseId(availableWarehouse ? String(availableWarehouse.warehouse_id ?? "") : String(localBatch.warehouse_id ?? ""))
    setTransferWarehouseId("")
    setTransferQuantity("")
    setTransferReason("Chuyển kho")
    setOpenTransfer(true)
  }

  const submitTransfer = async () => {
    const quantity = Number(transferQuantity)
    if (Number.isNaN(quantity) || quantity <= 0) {
      alert("Vui lòng nhập số lượng hợp lệ.")
      return
    }
    if (!transferFromWarehouseId) {
      alert("Vui lòng chọn kho chuyển từ.")
      return
    }
    if (!transferWarehouseId) {
      alert("Vui lòng chọn kho chuyển đến.")
      return
    }
    // Kiểm tra số lượng tại kho nguồn
    const fromDist = localBatch.warehouse_distribution?.find(d => String(d.warehouse_id ?? "") === transferFromWarehouseId)
    const availableStock = fromDist?.stock_quantity ?? 0
    if (quantity > availableStock) {
      alert(`Số lượng chuyển không được vượt quá tồn kho tại kho nguồn (${availableStock}).`)
      return
    }
    if (transferFromWarehouseId === transferWarehouseId) {
      alert("Không thể chuyển đến cùng kho.")
      return
    }

    setTransferring(true)
    try {
      const response = await apiFetch(`/backend/product-batches/${localBatch.id}/transfer`, {
        method: "POST",
        body: JSON.stringify({
          from_warehouse_id: transferFromWarehouseId ? Number(transferFromWarehouseId) : null,
          to_warehouse_id: Number(transferWarehouseId),
          quantity: quantity,
          reason: transferReason,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setOpenTransfer(false)
        // Reload page to refresh batch data and logs
        router.reload({
          preserveState: false,
          preserveScroll: false,
        })
      } else {
        alert(data.message || "Có lỗi xảy ra khi chuyển kho.")
      }
    } catch (error) {
      alert("Có lỗi xảy ra khi chuyển kho.")
    } finally {
      setTransferring(false)
    }
  }

  return (
    <AppLayout breadcrumbs={[{ title: "Dashboard", href: "/backend" }, { title: "Chi tiết lô", href: "#" }]}>
      <Head title={`Lô ${localBatch.code}`} />

      <div className="max-w-[1280px] ml-auto mr-auto mt-4 space-y-4">
        <CustomCard isShowHeader={false} className="shadow-sm">
          <div className="flex items-center gap-2">
            <div className="text-lg font-medium">{localBatch.code}</div>
            {localBatch.is_default && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Default
              </span>
            )}
          </div>
        </CustomCard>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6">
            <CustomCard isShowHeader={false} className="shadow-sm">
              <div className="font-medium mb-3">Thông tin lô</div>

              <div className="text-sm text-muted-foreground mb-3">
                {batch.is_variant_batch ? (
                  <>
                    Thuộc phiên bản:{" "}
                    <Link 
                      href={`/backend/product/${localBatch.product_id}/variants/${batch.product_variant_id}`} 
                      className="text-blue-600 hover:underline"
                    >
                      {batch.variant_name || `#${batch.product_variant_id}`}
                    </Link>
                  </>
                ) : (
                  <>
                    Thuộc sản phẩm:{" "}
                    <Link href={`/backend/product/${localBatch.product_id}/edit`} className="text-blue-600 hover:underline">
                      {localBatch.product_name || `#${localBatch.product_id}`}
                    </Link>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block text-sm font-normal">Ngày sản xuất</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={savingDates}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {parseDate(localBatch.manufactured_at) ? format(parseDate(localBatch.manufactured_at)!, "dd/MM/yyyy") : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parseDate(localBatch.manufactured_at)}
                        onSelect={(d) => {
                          setLocalBatch((prev) => ({ ...prev, manufactured_at: d ? format(d, "yyyy-MM-dd") : null }))
                          setDirty(true)
                        }}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="mb-1 block text-sm font-normal">Hạn sử dụng</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={savingDates}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {parseDate(localBatch.expired_at) ? format(parseDate(localBatch.expired_at)!, "dd/MM/yyyy") : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parseDate(localBatch.expired_at)}
                        onSelect={(d) => {
                          setLocalBatch((prev) => ({ ...prev, expired_at: d ? format(d, "yyyy-MM-dd") : null }))
                          setDirty(true)
                        }}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CustomCard>
          </div>

          <div className="col-span-6">
            {/* NOTE: Use !pt-0 to make CustomCard remove side padding; we add padding only for the title row */}
            <CustomCard isShowHeader={false} className="!pt-0 shadow-sm">
              <div className="px-[20px] pt-[20px] pb-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">Thông tin kho</div>
                  {localBatch.total_stock !== undefined && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Tổng tồn kho: <span className="font-medium text-foreground">{localBatch.total_stock}</span>
                    </div>
                  )}
                </div>
                {localBatch.total_stock !== undefined && localBatch.total_stock > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openTransferModal}
                    className="h-8 px-3 text-xs"
                  >
                    <ArrowRightLeft className="mr-1 h-3 w-3" />
                    Chuyển kho
                  </Button>
                )}
              </div>

              <div className="border-t">
                <div className="grid grid-cols-12 gap-3 text-xs font-medium bg-muted/50 px-[20px] py-3 border-b">
                  <div className="col-span-8">Kho lưu trữ</div>
                  <div className="col-span-4 text-right">Tồn kho</div>
                </div>

                {(warehouses || []).map((w) => {
                  // Tìm phân bổ số lượng cho kho này từ warehouse_distribution
                  const distribution = localBatch.warehouse_distribution?.find(
                    (d) => String(d.warehouse_id ?? "") === String(w.value)
                  )
                  const qty = distribution ? distribution.stock_quantity : 0
                  const batchId = distribution?.batch_id
                  
                  return (
                    <div
                      key={w.value}
                      className="grid grid-cols-12 gap-3 items-center px-[20px] py-4 border-b last:border-b-0"
                    >
                      <div className="col-span-8 text-sm">{w.label}</div>
                      <div className="col-span-4 text-right">
                        {qty > 0 && batchId ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-7 rounded-md px-2 text-[12px] font-normal text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
                            onClick={() => openAdjustModal(batchId, String(w.value), w.label, qty)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {qty}
                              <Pencil className="h-2 w-2 text-slate-500" />
                            </span>
                          </Button>
                        ) : (
                          <span className="text-sm">{qty}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CustomCard>
          </div>

          <div className="col-span-12">
            <CustomCard isShowHeader={false} className="!pt-0 shadow-sm">
              <div className="px-[20px] pt-[20px] pb-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Lịch sử thay đổi tồn kho của lô</div>

                  <div className="flex items-center gap-2">
                  <Popover open={openFilterType} onOpenChange={setOpenFilterType}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="h-8 px-3 text-[12px] font-normal">
                        Loại giao dịch <ChevronDown className="ml-2 h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-3" align="end">
                      <div className="space-y-2">
                        {[
                          { key: "product", label: "Sản phẩm" },
                          { key: "variant", label: "Phiên bản" },
                          { key: "sale", label: "Bán hàng" },
                          { key: "purchase", label: "Nhập hàng" },
                          { key: "transfer", label: "Chuyển kho" },
                          { key: "import_file", label: "Nhập file" },
                          { key: "purchase_order", label: "Đặt hàng nhập" },
                        ].map((t) => (
                          <label key={t.key} className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                            <Checkbox
                              checked={!!filterTypes[t.key]}
                              onCheckedChange={(v) => setFilterTypes((prev) => ({ ...prev, [t.key]: !!v }))}
                            />
                            <span>{t.label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3">
                        <Button type="button" className="w-full h-9" onClick={() => {
                          applyFilters()
                          setOpenFilterType(false)
                        }}>
                          Lọc
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover open={openFilterTime} onOpenChange={handleFilterTimeOpenChange}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="h-8 px-3 text-[12px] font-normal">
                        Thời gian <ChevronDown className="ml-2 h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-3" align="end">
                      {!showCustomDatePicker ? (
                        <>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "Hôm nay",
                          "Hôm qua",
                          "7 ngày qua",
                          "30 ngày qua",
                          "Tuần trước",
                          "Tuần này",
                          "Tháng trước",
                          "Tháng này",
                          "Năm trước",
                          "Năm nay",
                          "Tùy chọn",
                            ].map((label) => {
                              const isActive = getActiveTimeFilterLabel === label
                              return (
                                <Button 
                                  key={label} 
                                  type="button" 
                                  variant={isActive ? "default" : "outline"}
                                  className="h-8 text-[12px] font-normal"
                                  onClick={() => {
                                    if (label === "Tùy chọn") {
                                      setShowCustomDatePicker(true)
                                      return
                                    }
                                    handleTimeFilter(label)
                                  }}
                                >
                            {label}
                          </Button>
                              )
                            })}
                      </div>
                        </>
                      ) : (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">Khoảng thời gian tùy chọn:</div>
                          <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={(range) => setDateRange(range)}
                            numberOfMonths={1}
                          />
                          <div className="mt-3 flex gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="flex-1 h-8 text-[12px]"
                              onClick={() => {
                                setShowCustomDatePicker(false)
                                setDateRange(undefined)
                              }}
                            >
                              Hủy
                            </Button>
                            <Button 
                              type="button" 
                              className="flex-1 h-8 text-[12px]"
                              onClick={() => {
                                if (dateRange?.from && dateRange?.to) {
                                  const params: Record<string, string | string[] | number> = {}
                                  const selectedTypes = Object.entries(filterTypes)
                                    .filter(([, checked]) => checked)
                                    .map(([key]) => key)
                                  if (selectedTypes.length > 0) {
                                    params.transaction_types = selectedTypes
                                  } else {
                                    params.transaction_types = [defaultTransactionType]
                                  }
                                  params['created_at[between]'] = `${format(dateRange.from, 'yyyy-MM-dd')},${format(dateRange.to, 'yyyy-MM-dd')}`
                                  if (perPage) {
                                    params.perpage = perPage
                                  }
                                  router.get(`/backend/product-batches/${batch.id}/detail`, params, {
                                    preserveState: false,
                                    preserveScroll: false,
                                  })
                                  setShowCustomDatePicker(false)
                                  setOpenFilterTime(false)
                                }
                              }}
                              disabled={!dateRange?.from || !dateRange?.to}
                            >
                              Áp dụng
                        </Button>
                      </div>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                </div>
              </div>

              <div className="border-t">
                <div className="grid grid-cols-12 gap-3 text-xs font-medium bg-muted/50 px-[20px] py-3 border-b">
                  <div className="col-span-2">Thời gian</div>
                  <div className="col-span-2">Giao dịch</div>
                  <div className="col-span-2">Hành động</div>
                  <div className="col-span-2 text-right">Số lượng</div>
                  <div className="col-span-2">Thay đổi bởi</div>
                  <div className="col-span-2 text-right">Tồn kho</div>
                </div>

                {logs.data.length === 0 ? (
                  <div className="text-sm text-muted-foreground px-[20px] py-4">Chưa có lịch sử.</div>
                ) : (
                  logs.data.map((l) => {
                    const up = l.change_stock > 0
                    const down = l.change_stock < 0
                    const transactionTypeLabels: Record<string, string> = {
                      product: "Sản phẩm",
                      variant: "Phiên bản",
                      sale: "Bán hàng",
                      purchase: "Nhập hàng",
                      transfer: "Chuyển kho",
                      import: "Nhập hàng",
                      export: "Xuất hàng",
                      return: "Trả hàng",
                      adjust: "Điều chỉnh",
                      import_file: "Nhập file",
                      purchase_order: "Đặt hàng nhập",
                    }
                    const transactionTypeLabel = transactionTypeLabels[l.transaction_type || 'product'] || l.transaction_type || 'Sản phẩm'
                    return (
                      <div key={l.id} className="grid grid-cols-12 gap-3 items-center px-[20px] py-3 border-b last:border-b-0">
                        <div className="col-span-2 text-sm">{l.created_at || "-"}</div>
                        <div className="col-span-2 text-sm text-muted-foreground">Loại: {transactionTypeLabel}</div>
                        <div className="col-span-2 text-sm">Điều chỉnh tồn kho</div>
                        <div className="col-span-2 text-right text-sm">
                          <div className="inline-flex items-center gap-1 justify-end">
                            {up && <ArrowUp className="h-4 w-4 text-emerald-600" />}
                            {down && <ArrowDown className="h-4 w-4 text-red-600" />}
                            <span className={up ? "text-emerald-700 font-medium" : down ? "text-red-700 font-medium" : "text-gray-700"}>
                              {up ? '+' : ''}{l.change_stock}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground">{l.user?.name || "-"}</div>
                        <div className="col-span-2 text-right text-sm">
                          {l.transaction_type === 'transfer' && l.transfer_info ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-1 justify-end cursor-pointer">
                                  {up && <ArrowUp className="h-4 w-4 text-emerald-600" />}
                                  {down && <ArrowDown className="h-4 w-4 text-red-600" />}
                                  <span className={up ? "text-emerald-700" : down ? "text-red-700" : ""}>
                                    {l.after_stock}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent 
                                className="!max-w-[300px] !p-3 !bg-gray-900 !text-white !border-0 !shadow-xl z-50 [&>svg]:!fill-gray-900"
                                side="left"
                              >
                                <div className="space-y-2 text-sm text-white">
                                  <div className="font-semibold mb-2 text-white">Chi tiết chuyển kho</div>
                                  {l.transfer_info.type === 'out' ? (
                                    <>
                                      <div className="text-xs text-gray-200">
                                        <span className="font-medium text-red-300">Kho giảm:</span> {l.transfer_info.from_warehouse_name}
                                      </div>
                                      <div className="text-xs text-gray-200">
                                        <span className="font-medium text-emerald-300">Kho tăng:</span> {l.transfer_info.to_warehouse_name}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-xs text-gray-200">
                                        <span className="font-medium text-red-300">Kho giảm:</span> {l.transfer_info.from_warehouse_name}
                                      </div>
                                      <div className="text-xs text-gray-200">
                                        <span className="font-medium text-emerald-300">Kho tăng:</span> {l.transfer_info.to_warehouse_name}
                                      </div>
                                    </>
                                  )}
                                  <div className="pt-2 border-t border-gray-700 text-xs text-gray-300">
                                    Số lượng: {Math.abs(l.change_stock)}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="inline-flex items-center gap-1 justify-end">
                              {up && <ArrowUp className="h-4 w-4 text-emerald-600" />}
                              {down && <ArrowDown className="h-4 w-4 text-red-600" />}
                              <span className={up ? "text-emerald-700" : down ? "text-red-700" : ""}>
                                {l.after_stock}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}

                <div className="flex items-center justify-between px-[20px] py-3 text-sm text-muted-foreground">
                  <div>
                    Từ {logs.from || 0} đến {logs.to || 0} trên tổng {logs.total}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span>Hiển thị</span>
                      <select 
                        className="h-8 border rounded-md px-2 bg-white" 
                        value={perPage}
                        onChange={(e) => {
                          const newPerPage = Number(e.target.value)
                          setPerPage(newPerPage)
                          const params: Record<string, string | string[] | number> = {}
                          const selectedTypes = Object.entries(filterTypes)
                            .filter(([, checked]) => checked)
                            .map(([key]) => key)
                          if (selectedTypes.length > 0) {
                            params.transaction_types = selectedTypes
                          } else {
                            params.transaction_types = [defaultTransactionType]
                          }
                          if (dateRange?.from && dateRange?.to) {
                            params['created_at[between]'] = `${format(dateRange.from, 'yyyy-MM-dd')},${format(dateRange.to, 'yyyy-MM-dd')}`
                          }
                          params.perpage = newPerPage
                          params.page = 1 // Reset to first page when changing perpage
                          router.get(`/backend/product-batches/${batch.id}/detail`, params, {
                            preserveState: false,
                            preserveScroll: false,
                          })
                        }}
                      >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                      </select>
                      <span>Kết quả</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-8 w-8 px-0" 
                        disabled={logs.current_page === 1}
                        onClick={() => {
                          const params: Record<string, string | string[] | number> = {}
                          const selectedTypes = Object.entries(filterTypes)
                            .filter(([, checked]) => checked)
                            .map(([key]) => key)
                          if (selectedTypes.length > 0) {
                            params.transaction_types = selectedTypes
                          } else {
                            params.transaction_types = [defaultTransactionType]
                          }
                          if (dateRange?.from && dateRange?.to) {
                            params['created_at[between]'] = `${format(dateRange.from, 'yyyy-MM-dd')},${format(dateRange.to, 'yyyy-MM-dd')}`
                          }
                          params.perpage = perPage
                          params.page = logs.current_page - 1
                          router.get(`/backend/product-batches/${batch.id}/detail`, params, {
                            preserveState: false,
                            preserveScroll: false,
                          })
                        }}
                      >
                        ‹
                      </Button>
                      <Button type="button" className="h-8 w-8 px-0">
                        {logs.current_page}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-8 w-8 px-0" 
                        disabled={logs.current_page >= logs.last_page}
                        onClick={() => {
                          const params: Record<string, string | string[] | number> = {}
                          const selectedTypes = Object.entries(filterTypes)
                            .filter(([, checked]) => checked)
                            .map(([key]) => key)
                          if (selectedTypes.length > 0) {
                            params.transaction_types = selectedTypes
                          } else {
                            params.transaction_types = [defaultTransactionType]
                          }
                          if (dateRange?.from && dateRange?.to) {
                            params['created_at[between]'] = `${format(dateRange.from, 'yyyy-MM-dd')},${format(dateRange.to, 'yyyy-MM-dd')}`
                          }
                          params.perpage = perPage
                          params.page = logs.current_page + 1
                          router.get(`/backend/product-batches/${batch.id}/detail`, params, {
                            preserveState: false,
                            preserveScroll: false,
                          })
                        }}
                      >
                        ›
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CustomCard>

            {/* Save button - below table, aligned to right */}
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={() => void saveAll()} disabled={!dirty || savingDates || savingStock} className="min-w-[88px]">
                Lưu
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={openAdjust} onOpenChange={setOpenAdjust}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
            <DialogDescription className="sr-only">
              Điều chỉnh tồn kho của lô {localBatch.code} tại {adjustingWarehouseName || 'kho hiện tại'}.
            </DialogDescription>
          </DialogHeader>

          {adjustingWarehouseName && (
            <div className="mb-4 p-2 bg-muted rounded text-sm">
              <span className="font-medium">Kho:</span> {adjustingWarehouseName}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-sm font-normal">Điều chỉnh</Label>
              <Input
                type="number"
                value={delta}
                onChange={(e) => {
                  const v = e.target.value
                  setDelta(v)
                  const base = Number(newStock) || 0
                  const d = Number(v || 0)
                  if (!Number.isNaN(d)) setNewStock(String(Math.max(0, base + d)))
                }}
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm font-normal">Tồn kho mới</Label>
              <Input
                type="number"
                value={newStock}
                onChange={(e) => {
                  const v = e.target.value
                  setNewStock(v)
                  const base = Number(newStock) || 0
                  const n = Number(v || 0)
                  if (!Number.isNaN(n)) setDelta(String(n - base))
                }}
              />
            </div>
          </div>

          <div className="mt-3">
            <Label className="mb-1 block text-sm font-normal">Lý do</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Thực tế" />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpenAdjust(false)} disabled={savingStock}>
              Hủy
            </Button>
            <Button type="button" onClick={submitAdjust} disabled={savingStock}>
              Lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Chuyển kho</DialogTitle>
            <DialogDescription className="sr-only">Chuyển tồn kho từ kho hiện tại sang kho khác.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {localBatch.warehouse_distribution && localBatch.warehouse_distribution.filter(d => d.stock_quantity > 0).length > 1 ? (
              <div>
                <Label className="mb-1 block text-sm font-normal">
                  Kho chuyển từ <span className="text-red-500">*</span>
                </Label>
                <Select value={transferFromWarehouseId} onValueChange={setTransferFromWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kho chuyển từ" />
                  </SelectTrigger>
                  <SelectContent>
                    {localBatch.warehouse_distribution
                      .filter(d => d.stock_quantity > 0)
                      .map((d) => (
                        <SelectItem key={String(d.warehouse_id ?? "")} value={String(d.warehouse_id ?? "")}>
                          {d.warehouse_name} ({d.stock_quantity})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="mb-1 block text-sm font-normal">
                  Kho chuyển từ
                </Label>
                <Input
                  value={localBatch.warehouse_distribution?.find(d => String(d.warehouse_id ?? "") === transferFromWarehouseId)?.warehouse_name || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}

            <div>
              <Label className="mb-1 block text-sm font-normal">
                Kho chuyển đến <span className="text-red-500">*</span>
              </Label>
              <Select value={transferWarehouseId} onValueChange={setTransferWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kho chuyển đến" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter(w => String(w.value) !== transferFromWarehouseId)
                    .map((w) => (
                      <SelectItem key={w.value} value={w.value}>
                        {w.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-sm font-normal">
                Số lượng chuyển <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                max={(() => {
                  const fromDist = localBatch.warehouse_distribution?.find(d => String(d.warehouse_id ?? "") === transferFromWarehouseId)
                  return fromDist?.stock_quantity ?? localBatch.stock_quantity ?? 0
                })()}
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                placeholder="Nhập số lượng"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tồn kho tại kho nguồn: {(() => {
                  const fromDist = localBatch.warehouse_distribution?.find(d => String(d.warehouse_id ?? "") === transferFromWarehouseId)
                  return fromDist?.stock_quantity ?? localBatch.stock_quantity ?? 0
                })()}
              </p>
            </div>

            <div>
              <Label className="mb-1 block text-sm font-normal">Lý do</Label>
              <Input
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="VD: Chuyển kho"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenTransfer(false)}
              disabled={transferring}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={submitTransfer}
              disabled={transferring || !transferWarehouseId || !transferQuantity || Number(transferQuantity) <= 0}
            >
              {transferring ? "Đang chuyển..." : "Chuyển kho"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
  )
}

