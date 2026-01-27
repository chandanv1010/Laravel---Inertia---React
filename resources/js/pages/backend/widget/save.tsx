import AppLayout from '@/layouts/app-layout';
import CustomPageHeading from '@/components/custom-page-heading';
import { useForm, Link, Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Loader2, Settings2, X, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { dashboard } from '@/routes';
import CustomCard from '@/components/custom-card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Options for each selected category
interface ItemOptions {
    include_children: 'none' | 'direct' | 'all';
    include_items: boolean;
    items_from_children: boolean;
    items_limit: number;
    auto_promotion?: boolean;
}

interface Widget {
    id: number;
    name: string;
    keyword: string;
    description: string | null;
    album: string[] | null;
    model: string | null;
    model_id: number[] | null;
    options: Record<string, ItemOptions> | null; // Key is item ID as string
    content: string | null;
    publish: number;
    created_at: string;
    updated_at: string;
    short_code?: string;
}

interface ModelItem {
    id: number;
    name: string;
    image?: string;
}

interface WidgetSaveProps {
    widget?: Widget;
    availableModels: Record<string, string>;
    selectedItems?: ModelItem[];
}

const defaultItemOptions: ItemOptions = {
    include_children: 'none',
    include_items: false,
    items_from_children: false,
    items_limit: 10,
    auto_promotion: false,
};

export default function WidgetSave({ widget, availableModels, selectedItems = [] }: WidgetSaveProps) {
    const isEdit = !!widget;

    const { data, setData, post, put, processing, errors } = useForm({
        name: widget?.name || '',
        keyword: widget?.keyword || '',
        description: widget?.description || '',
        album: widget?.album || [],
        model: widget?.model || '',
        model_id: widget?.model_id || [],
        options: widget?.options || {} as Record<string, ItemOptions>,
        content: widget?.content || '',
        publish: widget?.publish ?? 2,
    });

    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<ModelItem[]>(selectedItems);
    const [searchResults, setSearchResults] = useState<ModelItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingItems, setLoadingItems] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

    // Global vs Per-Item config toggle
    // Check if options has '_global' key to determine initial mode
    const [usePerItemConfig, setUsePerItemConfig] = useState(() => {
        if (widget?.options && '_global' in widget.options) {
            return false; // Has global config, so per-item is OFF
        }
        return Object.keys(widget?.options || {}).length > 0; // Has per-item configs
    });
    const [globalOptions, setGlobalOptions] = useState<ItemOptions>(() => {
        if (widget?.options && '_global' in widget.options) {
            return widget.options['_global'] as ItemOptions;
        }
        return { ...defaultItemOptions };
    });

    // Fetch items when search term or model changes
    useEffect(() => {
        const fetchItems = async () => {
            if (!data.model) return;

            setLoadingItems(true);
            try {
                const response = await axios.get('/backend/widget/search-model', {
                    params: {
                        model: data.model,
                        term: searchTerm
                    }
                });
                setSearchResults(response.data.results || []);
            } catch (error) {
                console.error("Failed to fetch items", error);
            } finally {
                setLoadingItems(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (data.model) {
                fetchItems();
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, data.model]);

    const handleAddItem = (item: ModelItem) => {
        if (!items.find(i => i.id === item.id)) {
            const newItems = [...items, item];
            setItems(newItems);
            setData('model_id', newItems.map(i => i.id));
            // Add default options for new item if it's a catalogue
            if (data.model.includes('Catalogue')) {
                setData('options', {
                    ...data.options,
                    [item.id]: { ...defaultItemOptions }
                });
            }
        }
        setSearchTerm('');
        setOpen(false);
    };

    const handleRemoveItem = (itemId: number) => {
        const newItems = items.filter(i => i.id !== itemId);
        setItems(newItems);
        setData('model_id', newItems.map(i => i.id));
        // Remove options for this item
        const newOptions = { ...data.options };
        delete newOptions[itemId];
        setData('options', newOptions);
    };

    const updateItemOptions = (itemId: number, key: keyof ItemOptions, value: any) => {
        const currentOptions = data.options[itemId] || { ...defaultItemOptions };
        setData('options', {
            ...data.options,
            [itemId]: {
                ...currentOptions,
                [key]: value
            }
        });
    };

    const getItemOptions = (itemId: number): ItemOptions => {
        return data.options[itemId] || { ...defaultItemOptions };
    };

    const toggleExpanded = (itemId: number) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Handle toggle between global and per-item config
    const handleToggleConfigMode = (checked: boolean) => {
        setUsePerItemConfig(checked);
        if (!checked) {
            // Switching to global mode - save global options
            setData('options', { '_global': globalOptions } as any);
        } else {
            // Switching to per-item mode - apply global to all items
            const perItemOptions: Record<string, ItemOptions> = {};
            items.forEach(item => {
                perItemOptions[item.id] = { ...globalOptions };
            });
            setData('options', perItemOptions);
        }
    };

    // Update global options
    const updateGlobalOption = (key: keyof ItemOptions, value: any) => {
        const newGlobalOptions = { ...globalOptions, [key]: value };
        setGlobalOptions(newGlobalOptions);
        setData('options', { '_global': newGlobalOptions } as any);
    };

    // Apply global settings to all items
    const applyGlobalToAll = () => {
        const perItemOptions: Record<string, ItemOptions> = {};
        items.forEach(item => {
            perItemOptions[item.id] = { ...globalOptions };
        });
        setData('options', perItemOptions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEdit && widget) {
            put(`/backend/widget/${widget.id}`);
        } else {
            post('/backend/widget');
        }
    };

    const breadcrumbs = [
        {
            title: 'Dashboard',
            href: dashboard().url,
        },
        {
            title: 'Quản lý Khối (Widget)',
            href: '/backend/widget',
        },
        {
            title: isEdit ? 'Cập nhật' : 'Thêm mới',
            href: '#',
        }
    ];

    const isCatalogueModel = data.model.includes('Catalogue');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Cập nhật Widget' : 'Thêm mới Widget'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Cập nhật Widget' : 'Thêm mới Widget'}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-6">
                        <div className="col-span-8 space-y-6">
                            <CustomCard title="Thông tin chung" isShowHeader={true}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Tên Widget <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={e => setData('name', e.target.value)}
                                                placeholder="VD: Sản phẩm nổi bật trang chủ"
                                                className="placeholder:text-[13px]"
                                            />
                                            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="keyword">Mã (Keyword) <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="keyword"
                                                value={data.keyword}
                                                onChange={e => setData('keyword', e.target.value)}
                                                className="font-mono placeholder:text-[13px]"
                                                placeholder="VD: home_featured_products"
                                            />
                                            {errors.keyword && <p className="text-red-500 text-xs">{errors.keyword}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Mô tả</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            placeholder="Mô tả ngắn về widget này"
                                            className="placeholder:text-[13px]"
                                        />
                                    </div>
                                </div>
                            </CustomCard>

                            <CustomCard title="Cấu hình Dữ liệu" description="Chọn nguồn dữ liệu cho widget này" isShowHeader={true}>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Loại dữ liệu (Model)</Label>
                                        <Select
                                            value={data.model}
                                            onValueChange={val => {
                                                setData('model', val);
                                                setItems([]);
                                                // @ts-ignore: Inertia useForm type inference issue with arrays
                                                setData('model_id', []);
                                                setData('options', {});
                                                setSearchTerm('');
                                            }}
                                        >
                                            <SelectTrigger className="w-full cursor-pointer">
                                                <SelectValue placeholder="-- Chọn loại dữ liệu --" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(availableModels).map(([key, label]) => (
                                                    <SelectItem key={key} value={key} className="cursor-pointer">{label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {data.model && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>
                                                    {isCatalogueModel ? 'Chọn Danh mục' : 'Chọn Items (Tìm kiếm và chọn nhiều)'}
                                                </Label>
                                                <Popover open={open} onOpenChange={setOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={open}
                                                            className="w-full justify-between font-normal cursor-pointer"
                                                        >
                                                            {isCatalogueModel
                                                                ? "Chọn danh mục..."
                                                                : "Tìm kiếm và chọn item..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[500px] p-0" align="start">
                                                        <Command shouldFilter={false}>
                                                            <CommandInput
                                                                placeholder={isCatalogueModel ? "Tìm danh mục..." : "Gõ để tìm kiếm (hiển thị tối đa 20)..."}
                                                                value={searchTerm}
                                                                onValueChange={setSearchTerm}
                                                                className="h-9 placeholder:text-[13px]"
                                                            />
                                                            <CommandList>
                                                                {loadingItems && <div className="p-4 text-center text-sm"><Loader2 className="animate-spin h-4 w-4 mx-auto" /> Đang tải...</div>}
                                                                {!loadingItems && searchResults.length === 0 && <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>}
                                                                <CommandGroup>
                                                                    {searchResults.map((result) => (
                                                                        <CommandItem
                                                                            key={result.id}
                                                                            value={String(result.id)}
                                                                            onSelect={() => handleAddItem(result)}
                                                                            className="cursor-pointer"
                                                                        >
                                                                            {result.name}
                                                                            <Check
                                                                                className={cn(
                                                                                    "ml-auto h-4 w-4",
                                                                                    items.find(i => i.id === result.id) ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            {/* Auto Promotion Config - Only for Product */}
                                            {data.model.includes('Product') && !data.model.includes('Catalogue') && (
                                                <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-red-50 to-orange-50 mb-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-red-100 p-1.5 rounded-full">
                                                                <Settings2 className="w-4 h-4 text-red-600" />
                                                            </div>
                                                            <Label className="text-sm font-semibold text-red-800">
                                                                Cấu hình Tự động
                                                            </Label>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <Label htmlFor="auto_promotion" className="text-xs cursor-pointer text-red-700 font-medium">
                                                                Tự động lấy sản phẩm khuyến mãi
                                                            </Label>
                                                            <input
                                                                type="checkbox"
                                                                role="switch"
                                                                id="auto_promotion"
                                                                checked={globalOptions.auto_promotion || false}
                                                                onChange={(e) => {
                                                                    updateGlobalOption('auto_promotion', e.target.checked);
                                                                }}
                                                                className="relative w-10 h-5 bg-red-200 rounded-full cursor-pointer transition-colors checked:bg-red-600 appearance-none before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
                                                            />
                                                        </div>
                                                    </div>
                                                    {globalOptions.auto_promotion && (
                                                        <div className="text-xs text-red-600 italic bg-white/50 p-2 rounded">
                                                            Lưu ý: Khi bật chế độ này, Widget sẽ tự động hiển thị các sản phẩm đang có chương trình khuyến mãi (sắp xếp theo thời gian tạo mới nhất).
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Config Mode Toggle - only for Catalogue */}
                                            {isCatalogueModel && items.length > 0 && (
                                                <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Label className="text-sm font-semibold text-blue-800">
                                                                Tùy chọn danh mục
                                                            </Label>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs ${!usePerItemConfig ? 'font-medium text-blue-600' : 'text-gray-400'}`}>
                                                                Chung
                                                            </span>
                                                            <input
                                                                type="checkbox"
                                                                role="switch"
                                                                checked={usePerItemConfig}
                                                                onChange={(e) => handleToggleConfigMode(e.target.checked)}
                                                                className="relative w-10 h-5 bg-gray-200 rounded-full cursor-pointer transition-colors checked:bg-blue-600 appearance-none before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
                                                            />
                                                            <span className={`text-xs ${usePerItemConfig ? 'font-medium text-blue-600' : 'text-gray-400'}`}>
                                                                Riêng từng danh mục
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Global Options Panel - show when NOT per-item */}
                                                    {!usePerItemConfig && (
                                                        <div className="space-y-3 pt-3 border-t border-blue-100">
                                                            <p className="text-xs text-gray-500 italic">Cấu hình này sẽ áp dụng cho tất cả danh mục đã chọn</p>

                                                            {/* Include Children */}
                                                            <div className="flex items-center gap-3">
                                                                <Label className="text-xs w-32 shrink-0">Danh mục con:</Label>
                                                                <Select
                                                                    value={globalOptions.include_children}
                                                                    onValueChange={(val) => updateGlobalOption('include_children', val)}
                                                                >
                                                                    <SelectTrigger className="h-8 text-xs bg-white cursor-pointer">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none" className="text-xs cursor-pointer">Không lấy</SelectItem>
                                                                        <SelectItem value="direct" className="text-xs cursor-pointer">Con trực tiếp</SelectItem>
                                                                        <SelectItem value="all" className="text-xs cursor-pointer">Toàn bộ</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            {/* Include Items */}
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    id="global_include_items"
                                                                    checked={globalOptions.include_items}
                                                                    onChange={(e) => updateGlobalOption('include_items', e.target.checked)}
                                                                    className="w-3 h-3 cursor-pointer"
                                                                />
                                                                <Label htmlFor="global_include_items" className="text-xs cursor-pointer">
                                                                    Lấy bài viết/sản phẩm
                                                                </Label>
                                                            </div>

                                                            {globalOptions.include_items && (
                                                                <>
                                                                    <div className="flex items-center gap-3 ml-5">
                                                                        <input
                                                                            type="checkbox"
                                                                            id="global_items_from_children"
                                                                            checked={globalOptions.items_from_children}
                                                                            onChange={(e) => updateGlobalOption('items_from_children', e.target.checked)}
                                                                            className="w-3 h-3 cursor-pointer"
                                                                        />
                                                                        <Label htmlFor="global_items_from_children" className="text-xs cursor-pointer">
                                                                            Bao gồm từ danh mục con
                                                                        </Label>
                                                                    </div>

                                                                    <div className="flex items-center gap-3 ml-5">
                                                                        <Label className="text-xs">Số lượng:</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            max={100}
                                                                            value={globalOptions.items_limit}
                                                                            onChange={(e) => updateGlobalOption('items_limit', parseInt(e.target.value) || 10)}
                                                                            className="w-20 h-7 text-xs bg-white"
                                                                        />
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Sync button when in per-item mode */}
                                                    {usePerItemConfig && (
                                                        <div className="flex items-center gap-2 pt-2 border-t border-blue-100">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={applyGlobalToAll}
                                                                className="text-xs h-7 cursor-pointer"
                                                            >
                                                                <Copy className="h-3 w-3 mr-1" />
                                                                Đồng bộ cấu hình chung cho tất cả
                                                            </Button>
                                                            <span className="text-xs text-gray-500">
                                                                (Click vào icon ⚙️ để cấu hình riêng từng danh mục)
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Selected Items List with Per-Item Options */}
                                            <div className="space-y-2">
                                                <Label className="text-sm text-gray-600">Đã chọn ({items.length})</Label>
                                                {items.length > 0 ? (
                                                    <div className="space-y-2 border rounded-lg p-2 bg-gray-50 max-h-[500px] overflow-y-auto">
                                                        {items.map((item, index) => (
                                                            <Collapsible
                                                                key={`${item.id}-${index}`}
                                                                open={isCatalogueModel && usePerItemConfig && expandedItems[item.id]}
                                                                onOpenChange={() => isCatalogueModel && usePerItemConfig && toggleExpanded(item.id)}
                                                            >
                                                                <div className="bg-white rounded border shadow-sm">
                                                                    <div className="flex items-center justify-between p-3">
                                                                        <div className="flex items-center gap-3 flex-1">
                                                                            <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium text-gray-500">
                                                                                {index + 1}
                                                                            </span>
                                                                            <span className="font-medium text-sm">{item.name || `ID: ${item.id}`}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            {isCatalogueModel && usePerItemConfig && (
                                                                                <CollapsibleTrigger asChild>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="text-gray-500 hover:text-blue-500 h-8 w-8 p-0 cursor-pointer"
                                                                                    >
                                                                                        {expandedItems[item.id] ? (
                                                                                            <ChevronUp className="h-4 w-4" />
                                                                                        ) : (
                                                                                            <Settings2 className="h-4 w-4" />
                                                                                        )}
                                                                                    </Button>
                                                                                </CollapsibleTrigger>
                                                                            )}
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => handleRemoveItem(item.id)}
                                                                                className="text-gray-400 hover:text-red-500 h-8 w-8 p-0 cursor-pointer"
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Per-Item Options Panel */}
                                                                    {isCatalogueModel && (
                                                                        <CollapsibleContent>
                                                                            <div className="px-3 pb-3 pt-0 space-y-3 border-t bg-blue-50/50">
                                                                                <div className="pt-3 space-y-3">
                                                                                    {/* Include Children */}
                                                                                    <div className="flex items-center gap-3">
                                                                                        <Label className="text-xs w-32 shrink-0">Danh mục con:</Label>
                                                                                        <Select
                                                                                            value={getItemOptions(item.id).include_children}
                                                                                            onValueChange={(val) => updateItemOptions(item.id, 'include_children', val)}
                                                                                        >
                                                                                            <SelectTrigger className="h-8 text-xs bg-white cursor-pointer">
                                                                                                <SelectValue />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                <SelectItem value="none" className="text-xs cursor-pointer">Không lấy</SelectItem>
                                                                                                <SelectItem value="direct" className="text-xs cursor-pointer">Con trực tiếp</SelectItem>
                                                                                                <SelectItem value="all" className="text-xs cursor-pointer">Toàn bộ</SelectItem>
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    </div>

                                                                                    {/* Include Items */}
                                                                                    <div className="flex items-center gap-3">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            id={`include_items_${item.id}`}
                                                                                            checked={getItemOptions(item.id).include_items}
                                                                                            onChange={(e) => updateItemOptions(item.id, 'include_items', e.target.checked)}
                                                                                            className="w-3 h-3 cursor-pointer"
                                                                                        />
                                                                                        <Label htmlFor={`include_items_${item.id}`} className="text-xs cursor-pointer">
                                                                                            Lấy bài viết/sản phẩm
                                                                                        </Label>
                                                                                    </div>

                                                                                    {getItemOptions(item.id).include_items && (
                                                                                        <>
                                                                                            <div className="flex items-center gap-3 ml-5">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    id={`items_from_children_${item.id}`}
                                                                                                    checked={getItemOptions(item.id).items_from_children}
                                                                                                    onChange={(e) => updateItemOptions(item.id, 'items_from_children', e.target.checked)}
                                                                                                    className="w-3 h-3 cursor-pointer"
                                                                                                />
                                                                                                <Label htmlFor={`items_from_children_${item.id}`} className="text-xs cursor-pointer">
                                                                                                    Bao gồm từ danh mục con
                                                                                                </Label>
                                                                                            </div>

                                                                                            <div className="flex items-center gap-3 ml-5">
                                                                                                <Label className="text-xs">Số lượng:</Label>
                                                                                                <Input
                                                                                                    type="number"
                                                                                                    min={1}
                                                                                                    max={100}
                                                                                                    value={getItemOptions(item.id).items_limit}
                                                                                                    onChange={(e) => updateItemOptions(item.id, 'items_limit', parseInt(e.target.value) || 10)}
                                                                                                    className="w-20 h-7 text-xs bg-white"
                                                                                                />
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </CollapsibleContent>
                                                                    )}
                                                                </div>
                                                            </Collapsible>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-gray-500 italic p-4 border border-dashed rounded-lg text-center">
                                                        Chưa có mục nào được chọn
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CustomCard>

                            <CustomCard title="Nội dung HTML (Tùy chọn)" isShowHeader={true}>
                                <div className="space-y-2">
                                    <Label>HTML Tùy chỉnh</Label>
                                    <div className="relative">
                                        <Textarea
                                            value={data.content}
                                            onChange={e => setData('content', e.target.value)}
                                            className="h-60 font-mono text-sm bg-slate-900 text-slate-50 border-slate-700 focus:ring-slate-500 placeholder:text-slate-500"
                                            placeholder="<div>Nội dung HTML...</div>"
                                        />
                                        <div className="absolute top-2 right-2 px-2 py-1 bg-slate-800 text-xs text-slate-400 rounded">
                                            HTML Editor
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Nhập mã HTML nếu bạn muốn hiển thị nội dung tĩnh. Hỗ trợ các thẻ HTML cơ bản.
                                    </p>
                                </div>
                            </CustomCard>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Link href="/backend/widget">
                                    <Button variant="outline" type="button" className="cursor-pointer min-w-[100px]">Hủy</Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 cursor-pointer min-w-[100px]">
                                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Lưu lại
                                </Button>
                            </div>
                        </div>

                        <div className="col-span-4 space-y-6">
                            {(isEdit && widget) ? (
                                <CustomCard title="Thông tin" isShowHeader={true}>
                                    <div className="space-y-4">
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-sm text-gray-500">Trạng thái</span>
                                            <span className={`text-sm font-medium ${data.publish == 2 ? 'text-green-600' : 'text-red-600'}`}>
                                                {data.publish == 2 ? 'Đang hoạt động' : 'Dừng hoạt động'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-sm text-gray-500">Ngày tạo</span>
                                            <span className="text-sm font-medium">{widget.created_at}</span>
                                        </div>
                                    </div>
                                </CustomCard>
                            ) : null}

                            {isEdit && widget.short_code && (
                                <CustomCard title="Shortcode" isShowHeader={true}>
                                    <div className="p-3 bg-slate-100 rounded text-center border border-dashed border-slate-300">
                                        <code className="text-pink-600 font-mono text-sm break-all select-all font-bold">
                                            {widget.short_code}
                                        </code>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-3 cursor-pointer"
                                        onClick={() => {
                                            navigator.clipboard.writeText(widget.short_code || '');
                                            // Show temporary feedback
                                            const btn = document.getElementById('copy-shortcode-btn');
                                            if (btn) {
                                                btn.textContent = '✓ Đã copy!';
                                                setTimeout(() => {
                                                    btn.innerHTML = '<svg class="h-4 w-4 mr-1 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Copy Shortcode';
                                                }, 1500);
                                            }
                                        }}
                                        id="copy-shortcode-btn"
                                    >
                                        <Copy className="h-4 w-4 mr-1" />
                                        Copy Shortcode
                                    </Button>
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        Dán shortcode vào nơi bạn muốn hiển thị widget.
                                    </p>
                                </CustomCard>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
