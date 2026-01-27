import { useState, useEffect, useCallback, useRef } from "react"
import CustomCard from "@/components/custom-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export interface Attribute {
    id: string
    name: string
    values: string[]
}

interface AttributesSectionProps {
    attributes?: Attribute[]
    onAttributesChange: (attributes: Attribute[]) => void
    errors?: Record<string, string>
}

export function AttributesSection({
    attributes = [],
    onAttributesChange,
    errors
}: AttributesSectionProps) {
    const [localAttributes, setLocalAttributes] = useState<Attribute[]>(attributes)
    const [showContent, setShowContent] = useState(false)

    useEffect(() => {
        setLocalAttributes(attributes)
        if (attributes.length > 0) {
            setShowContent(true)
        }
    }, [attributes])

    const addAttribute = () => {
        const newAttribute: Attribute = {
            id: Date.now().toString(),
            name: "",
            values: []
        }
        const newAttributes = [...localAttributes, newAttribute]
        setLocalAttributes(newAttributes)
        onAttributesChange(newAttributes)
        setShowContent(true)
    }

    const removeAttribute = (index: number) => {
        const newAttributes = localAttributes.filter((_, i) => i !== index)
        setLocalAttributes(newAttributes)
        onAttributesChange(newAttributes)
        if (newAttributes.length === 0) {
            setShowContent(false)
        }
    }

    // Debounce attribute name updates to avoid triggering variants regeneration on every keystroke
    const attributeNameTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
    
    const updateAttributeName = useCallback((index: number, name: string) => {
        // Update local state immediately for responsive UI
        setLocalAttributes(prev => {
            const newAttributes = [...prev]
            newAttributes[index] = { ...newAttributes[index], name }
            return newAttributes
        })
        
        // Clear existing timeout for this attribute
        const existingTimeout = attributeNameTimeoutRef.current.get(index)
        if (existingTimeout) {
            clearTimeout(existingTimeout)
        }
        
        // Debounce the parent notification (triggers variants regeneration)
        const timeoutId = setTimeout(() => {
            setLocalAttributes(prev => {
                const newAttributes = [...prev]
                onAttributesChange(newAttributes)
                return prev // Don't change state, just notify parent
            })
            attributeNameTimeoutRef.current.delete(index)
        }, 500) // 500ms debounce for attribute name
        
        attributeNameTimeoutRef.current.set(index, timeoutId)
    }, [onAttributesChange])

    const addAttributeValue = useCallback((index: number, value: string) => {
        const trimmed = value.trim()
        if (!trimmed) return

        setLocalAttributes(prev => {
            const newAttributes = [...prev]
            if (!newAttributes[index].values.includes(trimmed)) {
                newAttributes[index] = {
                    ...newAttributes[index],
                    values: [...newAttributes[index].values, trimmed]
                }
                onAttributesChange(newAttributes)
            }
            return newAttributes
        })
    }, [onAttributesChange])

    const removeAttributeValue = useCallback((attrIndex: number, valueIndex: number) => {
        setLocalAttributes(prev => {
            const newAttributes = [...prev]
            newAttributes[attrIndex] = {
                ...newAttributes[attrIndex],
                values: newAttributes[attrIndex].values.filter((_, i) => i !== valueIndex)
            }
            onAttributesChange(newAttributes)
            return newAttributes
        })
    }, [onAttributesChange])

    return (
        <CustomCard className="mb-[20px]" data-testid="attributes-section">
            <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-normal">Thuộc tính</h3>
                    {!showContent && (
                        <p className="text-sm text-muted-foreground">
                            Sản phẩm có nhiều thuộc tính khác nhau. Ví dụ: kích thước, màu sắc.
                        </p>
                    )}
                </div>
                {!showContent && (
                    <button
                        type="button"
                        onClick={addAttribute}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        data-testid="attributes-add"
                    >
                        Thêm thuộc tính
                    </button>
                )}
                {showContent && (
                    <button
                        type="button"
                        onClick={() => setShowContent(false)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                        Sắp xếp thuộc tính
                    </button>
                )}
            </div>

            {showContent && (
                <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="grid grid-cols-12 gap-4 mb-2">
                        <div className="col-span-3 font-normal text-sm">Tên thuộc tính</div>
                        <div className="col-span-8 font-normal text-sm">Giá trị</div>
                        <div className="col-span-1"></div>
                    </div>

                    {localAttributes.map((attr, index) => (
                        <div key={attr.id} className="grid grid-cols-12 gap-4 items-center pb-4 border-b last:border-0 border-dashed">
                            <div className="col-span-3">
                                <Input
                                    placeholder="Ví dụ: Kích thước"
                                    value={attr.name}
                                    onChange={(e) => updateAttributeName(index, e.target.value)}
                                    data-testid={`attribute-name-${index}`}
                                />
                            </div>
                            <div className="col-span-8">
                                <AttributeValuesInput
                                    values={attr.values}
                                    onAdd={(val) => addAttributeValue(index, val)}
                                    onRemove={(valIndex) => removeAttributeValue(index, valIndex)}
                                    inputTestId={`attribute-values-${index}`}
                                />
                            </div>
                            <div className="col-span-1 text-right">
                                <button
                                    type="button"
                                    onClick={() => removeAttribute(index)}
                                    className="text-muted-foreground hover:text-red-500 cursor-pointer"
                                    title="Xóa thuộc tính"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addAttribute}
                            className="cursor-pointer"
                            disabled={localAttributes.length >= 3}
                            data-testid="attributes-add-more"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm thuộc tính khác
                        </Button>
                        {localAttributes.length >= 3 && (
                            <span className="ml-3 text-sm text-muted-foreground">Tối đa 3 thuộc tính</span>
                        )}
                    </div>
                </div>
            )}
        </CustomCard>
    )
}

function AttributeValuesInput({
    values,
    onAdd,
    onRemove,
    inputTestId
}: {
    values: string[]
    onAdd: (value: string) => void
    onRemove: (index: number) => void
    inputTestId?: string
}) {
    const [inputValue, setInputValue] = useState("")

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (inputValue.trim()) {
                onAdd(inputValue)
                setInputValue("")
            }
        }
    }

    return (
        <div className="border border-input rounded-md px-3 py-1 flex flex-wrap gap-2 h-9 items-center bg-white transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] shadow-xs">
            {values.map((val, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1 pr-1 py-0.5 text-xs">
                    {val}
                    <span
                        className="ml-1 p-0.5 rounded hover:bg-red-100 cursor-pointer group"
                        onClick={() => onRemove(idx)}
                    >
                        <X className="h-3 w-3 text-gray-400 group-hover:text-red-500" />
                    </span>
                </Badge>
            ))}
            <input
                type="text"
                className="flex-1 outline-none bg-transparent min-w-[120px] text-sm h-full placeholder:text-muted-foreground focus-visible:outline-none"
                placeholder="Nhập ký tự và ấn enter"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                data-testid={inputTestId}
                onBlur={() => {
                    if (inputValue.trim()) {
                        onAdd(inputValue)
                        setInputValue("")
                    }
                }}
            />
        </div>
    )
}
