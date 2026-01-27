import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ProductCatalogue {
    id: number
    name: string
    code?: string
    image?: string
    lft?: number
    rgt?: number
    parent_id?: number
    level?: number
}

// Declare route function to avoid TS errors
declare function route(name?: string, params?: any, absolute?: boolean): string;

interface CategorySelectionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (selectedCatalogues: ProductCatalogue[]) => void
    initialSelectedIds?: number[]
    preloadedCatalogues?: ProductCatalogue[]
}

export function CategorySelectionModal({
    open,
    onOpenChange,
    onConfirm,
    initialSelectedIds = [],
    preloadedCatalogues = []
}: CategorySelectionModalProps) {
    const [keyword, setKeyword] = useState("")
    const [catalogues, setCatalogues] = useState<ProductCatalogue[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds)
    const debouncedKeyword = useDebounce(keyword, 500)

    // Helper function to format catalogues with hierarchical indentation
    const formatCataloguesWithIndent = useCallback((catalogueList: any[]): ProductCatalogue[] => {
        return catalogueList.map((c: any) => {
            const name = c.current_language?.name || c.name || '';
            // Add indent for hierarchy levels with |---
            const indent = c.level && c.level > 1 ? '|---'.repeat(c.level - 1) + ' ' : '';
            return {
                id: c.id,
                name: indent + name,
                code: c.code,
                image: c.image,
                lft: c.lft,
                rgt: c.rgt,
                parent_id: c.parent_id,
                level: c.level
            };
        });
    }, []);

    const getCookie = useCallback((name: string): string => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
        return '';
    }, []);

    const apiFetch = useCallback(async (url: string, init: RequestInit = {}) => {
        const method = (init.method || "GET").toUpperCase();
        const includeContentType = method !== "GET" && method !== "HEAD";

        const headers: Record<string, string> = {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            ...(init.headers as Record<string, string> || {}),
        };

        if (includeContentType && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const csrfToken = getCookie('XSRF-TOKEN');
        if (csrfToken) {
            headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken);
        }

        const response = await fetch(url, {
            credentials: 'same-origin',
            ...init,
            headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }, [getCookie]);

    useEffect(() => {
        if (open) {
            setSelectedIds(initialSelectedIds)
            // Format preloaded catalogues with indent
            if (preloadedCatalogues.length > 0 && !keyword) {
                setCatalogues(formatCataloguesWithIndent(preloadedCatalogues))
            } else {
                fetchCatalogues()
            }
        }
    }, [open])

    useEffect(() => {
        if (open) {
            if (keyword) {
                fetchCatalogues()
            } else if (preloadedCatalogues.length > 0) {
                setCatalogues(formatCataloguesWithIndent(preloadedCatalogues))
            } else {
                fetchCatalogues()
            }
        }
    }, [debouncedKeyword])

    const fetchCatalogues = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                keyword: debouncedKeyword || '',
                per_page: '100',
                publish: '2',
            });

            const response = await apiFetch(`/backend/product_catalogue?${params.toString()}`);
            const data = response.data || []
            setCatalogues(data.map((c: any) => {
                const name = c.current_language?.name || c.name || '';
                // Nếu có level, thêm indent để hiển thị phân cấp với ký hiệu |---
                const indent = c.level && c.level > 1 ? '|---'.repeat(c.level - 1) + ' ' : '';
                return {
                    id: c.id,
                    name: indent + name,
                    code: c.code,
                    image: c.image,
                    lft: c.lft,
                    rgt: c.rgt,
                    parent_id: c.parent_id,
                    level: c.level
                };
            }))
        } catch (error) {
            console.error("Failed to fetch catalogues", error)
            setCatalogues([])
        } finally {
            setLoading(false)
        }
    }

    // Tìm tất cả danh mục con cháu chắt của một danh mục (sử dụng nested set)
    const getAllDescendants = (catalogueId: number): number[] => {
        const catalogue = catalogues.find(c => c.id === catalogueId)
        if (!catalogue || catalogue.lft === undefined || catalogue.rgt === undefined) {
            return []
        }

        // Tìm tất cả danh mục có lft > catalogue.lft và rgt < catalogue.rgt
        const descendants = catalogues
            .filter(c =>
                c.lft !== undefined &&
                c.rgt !== undefined &&
                c.lft > catalogue.lft! &&
                c.rgt < catalogue.rgt!
            )
            .map(c => c.id)

        return descendants
    }

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => {
            const isCurrentlySelected = prev.includes(id)

            if (isCurrentlySelected) {
                // Nếu đang bỏ chọn: bỏ chọn danh mục này và tất cả con cháu
                const descendants = getAllDescendants(id)
                return prev.filter(i => i !== id && !descendants.includes(i))
            } else {
                // Nếu đang chọn: chọn danh mục này và tất cả con cháu
                const descendants = getAllDescendants(id)
                return [...prev, id, ...descendants]
            }
        })
    }

    const handleConfirm = () => {
        const selectedObjects = catalogues.filter(c => selectedIds.includes(c.id))
        onConfirm(selectedObjects)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="!max-w-[1100px] !w-[1100px] max-h-[90vh] flex flex-col overflow-hidden !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]"
                style={{
                    left: '50% !important',
                    top: '50% !important',
                    transform: 'translate(-50%, -50%) !important',
                    width: '1100px !important',
                    maxWidth: '1100px !important',
                    marginLeft: '0 !important',
                    marginTop: '0 !important'
                } as React.CSSProperties}
            >
                <DialogHeader>
                    <DialogTitle>Chọn danh mục sản phẩm</DialogTitle>
                    <DialogDescription>
                        Tìm kiếm theo tên danh mục. Khi chọn một danh mục, tất cả danh mục con sẽ được chọn tự động.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative my-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm theo tên danh mục..."
                        className="pl-8"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-hidden border rounded-md">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-2">
                                {catalogues.map(cat => (
                                    <div
                                        key={cat.id}
                                        className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 cursor-pointer"
                                        onClick={() => toggleSelection(cat.id)}
                                    >
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.includes(cat.id)}
                                                onCheckedChange={() => toggleSelection(cat.id)}
                                            />
                                        </div>
                                        <div className="h-10 w-10 rounded bg-slate-100 flex-shrink-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                            {cat.image ? (
                                                <img src={cat.image} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-slate-400">
                                                    <Search className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium">{cat.name}</div>
                                            {cat.code && <div className="text-sm text-muted-foreground">{cat.code}</div>}
                                        </div>
                                    </div>
                                ))}
                                {catalogues.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground">
                                        Không tìm thấy danh mục nào
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
                        Áp dụng ({selectedIds.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
