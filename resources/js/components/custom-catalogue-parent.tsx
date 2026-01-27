import { useMemo } from "react";
import { Combobox, ComboboxOption } from "./ui/combobox";
import { Label } from "./ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { ISelectOptionItem } from "@/types";
import { Info } from "lucide-react";
import { useFormContext } from "@/contexts/FormContext";

interface ICustomCatalogueParentProps {
    data: ISelectOptionItem[],
    excludeIds?: string[],
    name: string,
    value?: string,
    className?: string,
    onValueChange?: (value: string) => void
}

export default function CustomCatalogueParent({
    name = 'parent_id',
    value,
    data = [],
    excludeIds,
    className,
    onValueChange
}: ICustomCatalogueParentProps) {
    const { parentId, setParentId } = useFormContext()

    // Convert all data to options (keep original labels with |--- format)
    const options: ComboboxOption[] = useMemo(() => {
        return (data || [])
            .filter(item => !excludeIds?.includes(item.value))
            .map(item => ({
                value: String(item.value),
                label: item.label,
                disabled: false
            }));
    }, [data, excludeIds])

    const handleChange = (newValue: string) => {
        setParentId(Number(newValue))
        if (onValueChange) {
            onValueChange(newValue);
        }
    }

    return (
        <div className={`w-full mb-[20px] ${className ? className : ''}`}>
            <div className="flex items-center gap-1 mb-2">
                <Label className="font-normal block">Danh mục chính</Label>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Chọn danh mục chính cho sản phẩm</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <Combobox
                options={options}
                value={value !== undefined ? value : (parentId ? String(parentId) : '')}
                onValueChange={handleChange}
                placeholder="Chọn Danh Mục Cha"
                searchPlaceholder="Tìm kiếm danh mục..."
                emptyText="Không tìm thấy danh mục nào."
                className={className}
                name={name}
            />
        </div>
    )
}
