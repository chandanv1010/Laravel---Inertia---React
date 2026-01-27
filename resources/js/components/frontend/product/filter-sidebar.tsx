import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/currency-input';

export interface AttributeItem {
    id: number;
    name: string;
    value?: string;
    color_code?: string;
}

export interface AttributeGroup {
    id: number;
    name: string;
    attributes: AttributeItem[];
}

export interface Filter {
    price_range: {
        min: number;
        max: number;
    };
    sort_options: Array<{ value: string; label: string }>;
    attribute_groups: AttributeGroup[];
}

export interface CategoryItem {
    id: number;
    parent_id?: number | null;
    name: string;
    canonical: string;
    image?: string;
    icon?: string;
    product_count?: number;
    depth?: number;
}

interface FilterSidebarProps {
    allCategories: CategoryItem[],
    selectedCategories: number[],
    toggleCategory: (id: number) => void,
    minPrice: number | undefined,
    setMinPrice: (val: number | undefined) => void,
    maxPrice: number | undefined,
    setMaxPrice: (val: number | undefined) => void,
    filters: Filter,
    selectedAttributes: Record<number, number[]>,
    toggleAttribute: (groupId: number, attrId: number) => void,
}

export const FilterSidebar = ({
    allCategories,
    selectedCategories,
    toggleCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    filters,
    selectedAttributes,
    toggleAttribute,
}: FilterSidebarProps) => {
    return (
        <div className="space-y-6">
            {allCategories.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-3">Danh mục</h3>
                    <ul className="space-y-1">
                        {allCategories.map((cat) => (
                            <li key={cat.id}>
                                <div
                                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded"
                                    style={{ paddingLeft: `${(cat.depth || 0) * 16}px` }}
                                    onClick={() => toggleCategory(cat.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={Array.isArray(selectedCategories) && selectedCategories.includes(cat.id)}
                                            onCheckedChange={() => toggleCategory(cat.id)}
                                            className="mt-[2px]"
                                        />
                                        <span
                                            className={`text-sm select-none transition-colors ${cat.depth === 0 ? 'font-medium text-gray-900' : 'text-gray-600'}`}
                                        >
                                            {cat.name}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-400">({cat.product_count || 0})</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Lọc theo giá</h3>
                <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                        <CurrencyInput
                            value={minPrice}
                            onValueChange={setMinPrice}
                            placeholder="0"
                            className="h-9 text-sm flex-1"
                        />
                        <span className="text-gray-400">-</span>
                        <CurrencyInput
                            value={maxPrice}
                            onValueChange={setMaxPrice}
                            placeholder="10.000.000"
                            className="h-9 text-sm flex-1"
                        />
                    </div>
                </div>
            </div>

            {filters.attribute_groups?.map((group) => (
                <div key={group.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-3">{group.name}</h3>
                    <div className="space-y-2">
                        {group.attributes.map((attr) => (
                            <div
                                key={attr.id}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                onClick={() => toggleAttribute(group.id, attr.id)}
                            >
                                <Checkbox
                                    checked={(selectedAttributes[group.id] || []).includes(attr.id)}
                                    onCheckedChange={() => toggleAttribute(group.id, attr.id)}
                                />
                                {attr.color_code && (
                                    <span
                                        className="w-4 h-4 rounded-full border border-gray-300"
                                        style={{ backgroundColor: attr.color_code }}
                                    />
                                )}
                                <span className="text-sm text-gray-600 select-none">{attr.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
