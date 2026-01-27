import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Link2, Search, X, Loader2, Languages } from 'lucide-react';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { type Menu, type MenuItem } from './index';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Quản lý Menu', href: '/backend/menu' },
    { title: 'Thêm/Sửa Menu', href: '/' }
];

interface MenuItemTranslation {
    name: string;
    url: string;
}

interface MenuItemFormData {
    id: string;
    name: string;
    url: string;
    target: string;
    icon: string;
    publish: string;
    children: MenuItemFormData[];
    isExpanded?: boolean;
    translations?: Record<number, MenuItemTranslation>; // { langId: { name, url } }
}

interface LinkableItem {
    id: number;
    name: string;
    canonical: string;
    module: string;
    routerable_type: string;
    routerable_id: number;
}

interface Language {
    id: number;
    name: string;
    canonical: string;
    image: string;
}

interface LinkableModule {
    module: string;
    label: string;
    items: LinkableItem[];
}

interface IMenuSaveProps {
    menu: Menu | null;
    menuItems?: MenuItemFormData[];
    linkableModules?: LinkableModule[];
    languages?: Language[];
}

// Sortable Menu Item Component
const SortableMenuItem = ({
    item,
    depth = 0,
    onUpdate,
    onRemove,
    onAddChild,
    onToggleExpand,
    onSelectLink,
    languages = [],
    onOpenTranslation,
}: {
    item: MenuItemFormData;
    depth?: number;
    onUpdate: (updatedItem: MenuItemFormData) => void;
    onRemove: () => void;
    onAddChild: () => void;
    onToggleExpand: () => void;
    onSelectLink: (item: MenuItemFormData) => void;
    languages?: Language[];
    onOpenTranslation?: (item: MenuItemFormData, lang: Language) => void;
}) => {
    const hasChildren = item.children && item.children.length > 0;

    // Filter out Vietnamese (default language)
    const otherLanguages = languages.filter(lang => {
        const canonical = (lang.canonical || '').toLowerCase();
        return !['vi', 'vn', 'vietnamese'].includes(canonical);
    });

    // Sensors for nested DndContext
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        marginLeft: `${depth * 24}px`,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div className={`flex items-center gap-2 p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow mb-2 ${isDragging ? 'ring-2 ring-blue-500' : ''}`}>
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                </div>

                {(hasChildren || depth < 2) && (
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {item.isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                )}

                <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                        <Input
                            placeholder="Tên mục menu"
                            value={item.name || ''}
                            onChange={(e) => onUpdate({ ...item, name: e.target.value })}
                            className="h-9"
                        />
                    </div>
                    <div className="col-span-3">
                        <div className="flex gap-1">
                            <Input
                                placeholder="URL hoặc chọn link"
                                value={item.url || ''}
                                onChange={(e) => onUpdate({ ...item, url: e.target.value })}
                                className="h-9"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectLink(item)}
                                className="h-9 px-2"
                                title="Chọn từ danh sách"
                            >
                                <Link2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="col-span-2">
                        <Select
                            value={item.target}
                            onValueChange={(value) => onUpdate({ ...item, target: value })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_self">Cùng tab</SelectItem>
                                <SelectItem value="_blank">Tab mới</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1 flex justify-center">
                        <Switch
                            checked={item.publish === '2'}
                            onCheckedChange={(checked) => onUpdate({ ...item, publish: checked ? '2' : '1' })}
                        />
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                        {/* Translation Trigger */}
                        {otherLanguages.length > 0 && onOpenTranslation && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-blue-500"
                                        title="Dịch"
                                    >
                                        <Languages className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto py-1 px-2" align="end" side="top">
                                    <div className="flex flex-wrap gap-1.5">
                                        {otherLanguages.map(lang => (
                                            <TooltipProvider key={lang.id}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            onClick={() => onOpenTranslation(item, lang)}
                                                            className="hover:scale-105 transition-transform p-0.5 rounded hover:bg-gray-100 cursor-pointer"
                                                        >
                                                            <img
                                                                src={lang.image}
                                                                alt={lang.name}
                                                                className="w-6 h-auto object-cover cursor-pointer"
                                                                style={{ margin: 0, borderRadius: 0 }}
                                                            />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{lang.name}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                        {depth < 3 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onAddChild}
                                className="h-8 w-8 p-0"
                                title="Thêm mục con"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onRemove}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="Xóa"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Render children with their own DndContext */}
            {item.isExpanded && hasChildren && (
                <div className="ml-6">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => {
                            const { active, over } = event;
                            if (over && active.id !== over.id) {
                                const oldIndex = item.children.findIndex(c => c.id === active.id);
                                const newIndex = item.children.findIndex(c => c.id === over.id);
                                if (oldIndex !== -1 && newIndex !== -1) {
                                    const newChildren = arrayMove(item.children, oldIndex, newIndex);
                                    onUpdate({ ...item, children: newChildren });
                                }
                            }
                        }}
                    >
                        <SortableContext
                            items={item.children.map(c => c.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {item.children.map((child, childIndex) => (
                                <SortableMenuItem
                                    key={child.id}
                                    item={child}
                                    depth={depth + 1}
                                    languages={languages}
                                    onOpenTranslation={onOpenTranslation}
                                    onUpdate={(updatedChild) => {
                                        const newChildren = [...item.children];
                                        newChildren[childIndex] = updatedChild;
                                        onUpdate({ ...item, children: newChildren });
                                    }}
                                    onRemove={() => {
                                        const newChildren = item.children.filter((_, i) => i !== childIndex);
                                        onUpdate({ ...item, children: newChildren });
                                    }}
                                    onAddChild={() => {
                                        const newChildren = [...item.children];
                                        newChildren[childIndex] = {
                                            ...child,
                                            children: [...(child.children || []), createEmptyItem()],
                                            isExpanded: true
                                        };
                                        onUpdate({ ...item, children: newChildren });
                                    }}
                                    onToggleExpand={() => {
                                        const newChildren = [...item.children];
                                        newChildren[childIndex] = { ...child, isExpanded: !child.isExpanded };
                                        onUpdate({ ...item, children: newChildren });
                                    }}
                                    onSelectLink={onSelectLink}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            )}
        </div>
    );
};

const createEmptyItem = (): MenuItemFormData => ({
    id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: '',
    url: '',
    target: '_self',
    icon: '',
    publish: '2',
    children: [],
    isExpanded: true
});

// Link Selection Modal Component
const LinkSelectionPanel = ({
    modules,
    onSelect,
    searchQuery,
    setSearchQuery,
}: {
    modules: LinkableModule[];
    onSelect: (link: LinkableItem) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}) => {
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<LinkableItem[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced search function
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        setHasSearched(true);

        try {
            const response = await fetch(`/backend/menu/search-linkable?search=${encodeURIComponent(query)}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.items || []);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Handle search input with debounce
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!value.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    }, [setSearchQuery, performSearch]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // Group search results by module for display
    const groupedSearchResults = useMemo(() => {
        const moduleLabels: Record<string, string> = {
            'post_catalogues': 'Nhóm Bài Viết',
            'posts': 'Bài Viết',
            'product_catalogues': 'Nhóm Sản Phẩm',
            'products': 'Sản Phẩm',
            'product_brands': 'Thương Hiệu',
        };

        const grouped: Record<string, LinkableItem[]> = {};
        searchResults.forEach(item => {
            if (!grouped[item.module]) {
                grouped[item.module] = [];
            }
            grouped[item.module].push(item);
        });

        return Object.entries(grouped).map(([module, items]) => ({
            module,
            label: moduleLabels[module] || module,
            items,
        }));
    }, [searchResults]);

    // Determine what to display
    const displayModules = hasSearched ? groupedSearchResults : modules;

    return (
        <div className="border rounded-lg bg-white">
            <div className="p-3 border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Tìm kiếm theo URL hoặc tên..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9 h-9 pr-9"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                    )}
                    {searchQuery && !isSearching && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                                setHasSearched(false);
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                            <X className="h-4 w-4 text-gray-400" />
                        </button>
                    )}
                </div>
                {hasSearched && (
                    <p className="text-xs text-muted-foreground mt-2">
                        {isSearching ? 'Đang tìm kiếm...' : `Tìm thấy ${searchResults.length} kết quả`}
                    </p>
                )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
                {displayModules.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        {hasSearched ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu'}
                    </div>
                ) : (
                    <Accordion type="multiple" defaultValue={displayModules.map(m => m.module)}>
                        {displayModules.map((module) => (
                            <AccordionItem key={module.module} value={module.module}>
                                <AccordionTrigger className="px-4 py-2 text-sm font-semibold bg-gray-50 hover:bg-gray-100 cursor-pointer">
                                    {module.label} ({module.items.length})
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {module.items.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => onSelect(item)}
                                                className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-0 transition-colors cursor-pointer"
                                            >
                                                <div className="font-medium text-sm truncate">{item.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{item.canonical}</div>
                                            </button>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </div>
    );
};

export default function MenuSave({ menu, menuItems = [], linkableModules = [], languages = [] }: IMenuSaveProps) {
    const isEdit = !!menu;

    const { data, setData, processing, errors } = useForm({
        name: menu?.name || '',
        code: menu?.code || '',
        position: menu?.position || '',
        description: menu?.description || '',
        publish: menu?.publish || '2',
    });

    const [items, setItems] = useState<MenuItemFormData[]>(
        menuItems.length > 0
            ? menuItems.map(i => ({ ...i, id: i.id?.toString() || createEmptyItem().id, isExpanded: true }))
            : []
    );
    const [selectedItemForLink, setSelectedItemForLink] = useState<MenuItemFormData | null>(null);
    const [linkSearchQuery, setLinkSearchQuery] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    return arrayMove(items, oldIndex, newIndex);
                }
                return items;
            });
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = {
            name: data.name,
            code: data.code,
            position: data.position,
            description: data.description,
            publish: data.publish,
            items: items as any,
        };

        const options = {
            onSuccess: () => {
                router.visit('/backend/menu');
            },
            onError: () => {
                setIsSubmitting(false);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        };

        if (isEdit) {
            router.put(`/backend/menu/${menu.id}`, formData as any, options);
        } else {
            router.post('/backend/menu', formData as any, options);
        }
    };

    const addRootItem = useCallback(() => {
        setItems(prev => [...prev, createEmptyItem()]);
    }, []);

    const updateItem = useCallback((index: number, updatedItem: MenuItemFormData) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = updatedItem;
            return newItems;
        });
    }, []);

    const removeItem = useCallback((index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addChildToItem = useCallback((index: number) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = {
                ...newItems[index],
                children: [...(newItems[index].children || []), createEmptyItem()],
                isExpanded: true
            };
            return newItems;
        });
    }, []);

    const toggleExpand = useCallback((index: number) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], isExpanded: !newItems[index].isExpanded };
            return newItems;
        });
    }, []);

    const handleSelectLink = useCallback((item: MenuItemFormData) => {
        setSelectedItemForLink(item);
        setLinkSearchQuery('');
    }, []);

    const handleLinkSelected = useCallback((link: LinkableItem) => {
        if (!selectedItemForLink) return;

        // Find and update the item
        const updateItemRecursive = (items: MenuItemFormData[]): MenuItemFormData[] => {
            return items.map(item => {
                if (item.id === selectedItemForLink.id) {
                    return {
                        ...item,
                        name: item.name || link.name,
                        url: link.canonical,
                    };
                }
                if (item.children && item.children.length > 0) {
                    return { ...item, children: updateItemRecursive(item.children) };
                }
                return item;
            });
        };

        setItems(updateItemRecursive);
        setSelectedItemForLink(null);
    }, [selectedItemForLink]);

    // Translation Modal State
    const [translationModalOpen, setTranslationModalOpen] = useState(false);
    const [translationItem, setTranslationItem] = useState<MenuItemFormData | null>(null);
    const [translationLang, setTranslationLang] = useState<Language | null>(null);
    const [translationName, setTranslationName] = useState('');
    const [translationUrl, setTranslationUrl] = useState('');

    // Open translation modal for a specific item and language
    const openTranslation = useCallback((item: MenuItemFormData, lang: Language) => {
        setTranslationItem(item);
        setTranslationLang(lang);
        // Get existing translation if any
        const existingTranslation = item.translations?.[lang.id];
        setTranslationName(existingTranslation?.name || '');
        setTranslationUrl(existingTranslation?.url || '');
        setTranslationModalOpen(true);
    }, []);

    // Save translation to item
    const handleSaveTranslation = useCallback(() => {
        if (!translationItem || !translationLang) return;

        // Update the item with the new translation
        const updateItemInTree = (items: MenuItemFormData[]): MenuItemFormData[] => {
            return items.map(item => {
                if (item.id === translationItem.id) {
                    return {
                        ...item,
                        translations: {
                            ...(item.translations || {}),
                            [translationLang.id]: {
                                name: translationName,
                                url: translationUrl,
                            }
                        }
                    };
                }
                if (item.children && item.children.length > 0) {
                    return { ...item, children: updateItemInTree(item.children) };
                }
                return item;
            });
        };

        setItems(updateItemInTree);
        setTranslationModalOpen(false);
        setTranslationItem(null);
        setTranslationLang(null);
    }, [translationItem, translationLang, translationName, translationUrl]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Sửa Menu' : 'Thêm Menu'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Sửa Menu' : 'Thêm Menu Mới'}
                    breadcrumbs={breadcrumbs}
                />

                <form onSubmit={handleSubmit} className="page-container">
                    <div className="grid grid-cols-12 gap-6">
                        {/* Left Column - Menu Info + Link Selection */}
                        <div className="col-span-4">
                            <CustomCard
                                isShowHeader={true}
                                title="Thông tin Menu"
                                description="Thiết lập menu và chọn liên kết"
                            >
                                <div className="space-y-4">
                                    {/* Row 1: Name, Code, Position */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <Label htmlFor="name" className="text-xs">Tên Menu <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                placeholder="VD: Menu Header"
                                                className="mt-1 h-9"
                                            />
                                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="code" className="text-xs">Mã Menu</Label>
                                            <Input
                                                id="code"
                                                value={data.code}
                                                onChange={(e) => setData('code', e.target.value)}
                                                placeholder="header-menu"
                                                className="mt-1 h-9"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="position" className="text-xs">Vị trí</Label>
                                            <Select
                                                value={data.position}
                                                onValueChange={(value) => setData('position', value)}
                                            >
                                                <SelectTrigger className="mt-1 h-9 w-full cursor-pointer">
                                                    <SelectValue placeholder="Chọn" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="header">Header</SelectItem>
                                                    <SelectItem value="footer">Footer</SelectItem>
                                                    <SelectItem value="sidebar">Sidebar</SelectItem>
                                                    <SelectItem value="mobile">Mobile</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Publish toggle */}
                                    <div className="flex items-center justify-between py-2 border-t border-b">
                                        <Label htmlFor="publish" className="text-sm">Kích hoạt menu</Label>
                                        <Switch
                                            id="publish"
                                            checked={data.publish === '2'}
                                            onCheckedChange={(checked) => setData('publish', checked ? '2' : '1')}
                                        />
                                    </div>

                                    {/* Link Selection Panel - Integrated */}
                                    {linkableModules.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-2 text-sm text-gray-700 flex items-center gap-2">
                                                <Link2 className="h-4 w-4" />
                                                {selectedItemForLink
                                                    ? `Chọn link cho: "${selectedItemForLink.name || 'Mục mới'}"`
                                                    : 'Chọn link từ hệ thống'}
                                            </h4>
                                            <LinkSelectionPanel
                                                modules={linkableModules}
                                                onSelect={handleLinkSelected}
                                                searchQuery={linkSearchQuery}
                                                setSearchQuery={setLinkSearchQuery}
                                            />
                                            {selectedItemForLink && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedItemForLink(null)}
                                                    className="mt-2 text-gray-500"
                                                >
                                                    <X className="h-3 w-3 mr-1" /> Hủy chọn
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CustomCard>

                            <div className="flex gap-2 mt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.visit('/backend/menu')}
                                    className="flex-1"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Quay lại
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    {isSubmitting ? 'Đang lưu...' : 'Lưu Menu'}
                                </Button>
                            </div>
                        </div>

                        {/* Right Column - Menu Items with Drag & Drop */}
                        <div className="col-span-8">
                            <CustomCard
                                isShowHeader={true}
                                title="Cấu trúc Menu"
                                description="Kéo thả để sắp xếp, nhấn + để thêm mục con"
                            >
                                {/* Header row */}
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-4 text-sm font-medium text-gray-600">
                                    <div className="w-6"></div>
                                    <div className="w-6"></div>
                                    <div className="flex-1 grid grid-cols-12 gap-2">
                                        <div className="col-span-4">Tên mục</div>
                                        <div className="col-span-3">URL/Liên kết</div>
                                        <div className="col-span-2">Target</div>
                                        <div className="col-span-1 text-center">Hiện</div>
                                        <div className="col-span-2 text-right">Thao tác</div>
                                    </div>
                                </div>

                                {/* Menu Items with DnD */}
                                <div className="min-h-[300px]">
                                    {items.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                            <p className="mb-4">Chưa có mục menu nào</p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={addRootItem}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Thêm mục đầu tiên
                                            </Button>
                                        </div>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext
                                                items={items.map(i => i.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {items.map((item, index) => (
                                                    <SortableMenuItem
                                                        key={item.id}
                                                        item={item}
                                                        languages={languages}
                                                        onOpenTranslation={openTranslation}
                                                        onUpdate={(updatedItem) => updateItem(index, updatedItem)}
                                                        onRemove={() => removeItem(index)}
                                                        onAddChild={() => addChildToItem(index)}
                                                        onToggleExpand={() => toggleExpand(index)}
                                                        onSelectLink={handleSelectLink}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    )}

                                    {items.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addRootItem}
                                            className="mt-4 w-full"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Thêm mục menu
                                        </Button>
                                    )}
                                </div>
                            </CustomCard>
                        </div>
                    </div>
                </form>
            </div>

            {/* Translation Modal */}
            <Dialog open={translationModalOpen} onOpenChange={setTranslationModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {translationLang?.image && (
                                <img src={translationLang.image} alt={translationLang?.name || ''} className="w-6 h-6 object-cover" />
                            )}
                            Dịch: "{translationItem?.name || 'Mục menu'}"
                            <span className="text-sm font-normal text-gray-500">
                                ({translationLang?.name})
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Tên mục (dịch)</Label>
                            <Input
                                value={translationName}
                                onChange={(e) => setTranslationName(e.target.value)}
                                placeholder={`Nhập tên bằng ${translationLang?.name || 'ngôn ngữ khác'}...`}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>URL (dịch)</Label>
                            <Input
                                value={translationUrl}
                                onChange={(e) => setTranslationUrl(e.target.value)}
                                placeholder="URL cho ngôn ngữ này (tùy chọn)"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTranslationModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSaveTranslation}>
                            Lưu bản dịch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout >
    );
}
