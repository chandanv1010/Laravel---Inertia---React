import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { X, Loader2, Search } from "lucide-react"
import { useState, KeyboardEvent, useEffect, useRef } from "react"
import axios from "axios"
import tagsRoutes from '@/routes/tags';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface TagsInputProps {
    defaultTags?: string[]
    name?: string
    placeholder?: string
    onOpenTagsList?: () => void
}

interface TagSuggestion {
    id: number
    name: string
}

export function TagsInput({ defaultTags = [], name = "tags", placeholder = "Tìm kiếm hoặc thêm mới", onOpenTagsList }: TagsInputProps) {
    const [tags, setTags] = useState<string[]>(defaultTags)
    const [inputValue, setInputValue] = useState("")
    const [showPopup, setShowPopup] = useState(false)

    useEffect(() => {
        const handleOpenTagsList = () => {
            setShowPopup(true)
        }
        window.addEventListener('open-tags-list', handleOpenTagsList)
        return () => {
            window.removeEventListener('open-tags-list', handleOpenTagsList)
        }
    }, [])

    // Sync from props when editing / demo loading
    useEffect(() => {
        setTags(Array.isArray(defaultTags) ? defaultTags : [])
    }, [defaultTags])
    const [searchValue, setSearchValue] = useState("")
    const [availableTags, setAvailableTags] = useState<TagSuggestion[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (showPopup) {
            fetchAllTags()
        }
    }, [showPopup])

    useEffect(() => {
        if (showPopup && searchValue) {
            const timeout = setTimeout(() => {
                searchTags(searchValue)
            }, 300)
            return () => clearTimeout(timeout)
        } else if (showPopup && !searchValue) {
            fetchAllTags()
        }
    }, [searchValue, showPopup])

    const fetchAllTags = async () => {
        setIsLoading(true)
        try {
            const url = tagsRoutes.search().url
            const response = await axios.get(url, {
                params: { q: '' }
            })
            setAvailableTags(response.data || [])
        } catch (error) {
            console.error("Failed to fetch tags", error)
            setAvailableTags([])
        } finally {
            setIsLoading(false)
        }
    }

    const searchTags = async (query: string) => {
        setIsLoading(true)
        try {
            const url = tagsRoutes.search().url
            const response = await axios.get(url, {
                params: { q: query }
            })
            setAvailableTags(response.data || [])
        } catch (error) {
            console.error("Failed to search tags", error)
            setAvailableTags([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addTag(inputValue)
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1)
        }
    }

    const addTag = (text: string) => {
        const trimmed = text.trim()
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed])
            setInputValue("")
            inputRef.current?.focus()
        }
    }

    const removeTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index))
    }

    const toggleTag = (tagName: string) => {
        if (tags.includes(tagName)) {
            setTags(tags.filter(t => t !== tagName))
        } else {
            setTags([...tags, tagName])
        }
    }

    const sortedTags = [...availableTags].sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.name.localeCompare(b.name)
        } else {
            return b.name.localeCompare(a.name)
        }
    })

    const handleConfirm = () => {
        setShowPopup(false)
        setSearchValue("")
    }

    return (
        <div ref={wrapperRef} className="relative">
            <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value)
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="h-8 font-normal mb-2"
                data-testid="tags-input"
            />
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="gap-1 pr-1 py-1 font-normal">
                            {tag}
                            <span
                                className="ml-1 p-0.5 rounded hover:bg-red-100 cursor-pointer group"
                                onClick={() => removeTag(index)}
                            >
                                <X className="h-3 w-3 text-gray-400 group-hover:text-red-500" />
                            </span>
                            <input
                                type="hidden"
                                name={`${name}[${index}]`}
                                value={tag}
                            />
                        </Badge>
                    ))}
                </div>
            )}

            <Dialog open={showPopup} onOpenChange={(open) => {
                setShowPopup(open)
                if (open && onOpenTagsList) {
                    onOpenTagsList()
                }
            }}>
                <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-normal">Danh sách tag</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder={placeholder}
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className="pl-10 font-normal"
                                    data-testid="tags-search"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="font-normal"
                            >
                                ↑↓ {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                            </Button>
                        </div>

                        {tags.length > 0 && (
                            <div>
                                <h4 className="text-sm mb-2 font-normal">Những tag được chọn</h4>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="gap-1 pr-1 py-1 font-normal bg-blue-100 text-blue-800">
                                            {tag}
                                            <span
                                                className="ml-1 p-0.5 rounded hover:bg-red-100 cursor-pointer group"
                                                onClick={() => removeTag(index)}
                                            >
                                                <X className="h-3 w-3 text-blue-600 group-hover:text-red-500" />
                                            </span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            {isLoading ? (
                                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Đang tìm kiếm...
                                </div>
                            ) : sortedTags.length > 0 ? (
                                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                                    {sortedTags.map((tag) => (
                                        <div
                                            key={tag.id}
                                            className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                                            onClick={() => toggleTag(tag.name)}
                                        >
                                            <Checkbox
                                                checked={tags.includes(tag.name)}
                                                onCheckedChange={() => toggleTag(tag.name)}
                                            />
                                            <span className="font-normal">{tag.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="text-4xl mb-2">🔍</div>
                                    <p className="text-sm font-normal text-muted-foreground mb-1">
                                        Cửa hàng của bạn chưa có tag nào
                                    </p>
                                    <p className="text-xs font-normal text-muted-foreground">
                                        Thêm mới tag để quản lý danh sách tag của bạn
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPopup(false)} className="font-normal">
                            Hủy
                        </Button>
                        <Button onClick={handleConfirm} className="font-normal" data-testid="tags-confirm">
                            Xác nhận
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
