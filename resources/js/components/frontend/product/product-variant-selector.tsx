import React, { useState, useEffect } from 'react';

interface AttributeValue {
    id: number;
    value: string;
    name: string;
    color_code: string | null;
    order: number;
}

interface AttributeCatalogue {
    id: number;
    name: string;
    type: string | null;
    order: number;
    values: AttributeValue[];
}

interface Variant {
    id: number;
    sku: string;
    retail_price: number;
    stock_quantity: number;
    image?: string;
    album?: string[];
    attributes: Record<string, string>;
}

interface ProductVariantSelectorProps {
    attributeCatalogues: AttributeCatalogue[];
    variants: Variant[];
    onVariantChange: (variant: Variant | null) => void;
    onStockStatusChange?: (allOutOfStock: boolean) => void;
}

export default function ProductVariantSelector({
    attributeCatalogues,
    variants,
    onVariantChange,
    onStockStatusChange
}: ProductVariantSelectorProps) {
    const [selectedAttributes, setSelectedAttributes] = useState<Record<number, number>>({});
    const [currentVariant, setCurrentVariant] = useState<Variant | null>(null);

    // Check if all variants are out of stock
    const allVariantsOutOfStock = variants.every(v => v.stock_quantity <= 0);

    // Initialize: auto-select first AVAILABLE variant
    useEffect(() => {
        if (attributeCatalogues.length === 0 || variants.length === 0) return;

        // Find first variant with stock > 0
        const firstAvailableVariant = variants.find(v => v.stock_quantity > 0);

        if (firstAvailableVariant) {
            // Extract attribute IDs from this variant
            const initialSelections: Record<number, number> = {};

            for (const catalogue of attributeCatalogues) {
                const attributeValue = catalogue.values.find(v =>
                    firstAvailableVariant.attributes[catalogue.name] === v.value
                );
                if (attributeValue) {
                    initialSelections[catalogue.id] = attributeValue.id;
                }
            }

            setSelectedAttributes(initialSelections);
        } else if (!allVariantsOutOfStock) {
            // Fallback: select first value of first attribute
            const firstCatalogue = attributeCatalogues[0];
            if (firstCatalogue.values.length > 0) {
                setSelectedAttributes({ [firstCatalogue.id]: firstCatalogue.values[0].id });
            }
        }
    }, [attributeCatalogues, variants, allVariantsOutOfStock]);

    // Find matching variant and notify stock status
    useEffect(() => {
        const variant = findMatchingVariant(selectedAttributes);
        setCurrentVariant(variant);
        onVariantChange(variant);

        if (onStockStatusChange) {
            onStockStatusChange(allVariantsOutOfStock);
        }
    }, [selectedAttributes, allVariantsOutOfStock]);

    // Find variant that matches selected attributes
    const findMatchingVariant = (selections: Record<number, number>): Variant | null => {
        const selectedValueIds = Object.values(selections);
        if (selectedValueIds.length === 0) return null;

        return variants.find(variant => {
            const variantAttrIds: number[] = [];

            for (const catalogue of attributeCatalogues) {
                const attrValue = catalogue.values.find(v =>
                    variant.attributes[catalogue.name] === v.value
                );
                if (attrValue) {
                    variantAttrIds.push(attrValue.id);
                }
            }

            return selectedValueIds.every(id => variantAttrIds.includes(id));
        }) || null;
    };

    // Check if a value is available (for attributes AFTER the first one)
    const isValueAvailable = (catalogueId: number, valueId: number, isFirstAttribute: boolean): boolean => {
        // First attribute is ALWAYS clickable
        if (isFirstAttribute) return true;

        // For other attributes, check if combination has stock
        const testSelection = {
            ...selectedAttributes,
            [catalogueId]: valueId
        };

        const variant = findMatchingVariant(testSelection);
        return variant !== null && variant.stock_quantity > 0;
    };

    // Get variant image for color swatch
    const getVariantImage = (catalogueId: number, valueId: number): string | null => {
        // Find variant that has this attribute value
        for (const variant of variants) {
            for (const catalogue of attributeCatalogues) {
                if (catalogue.id !== catalogueId) continue;

                const attrValue = catalogue.values.find(v => v.id === valueId);
                if (attrValue && variant.attributes[catalogue.name] === attrValue.value) {
                    return variant.image || null;
                }
            }
        }
        return null;
    };

    // Handle attribute selection with smart fallback
    const handleSelectAttribute = (catalogueId: number, valueId: number) => {
        const newSelection = {
            ...selectedAttributes,
            [catalogueId]: valueId
        };

        // Check if this new selection results in an out-of-stock variant
        const variant = findMatchingVariant(newSelection);

        // If out of stock, try to find an available alternative for other attributes
        if (!variant || variant.stock_quantity <= 0) {
            // Find the catalogue we're changing
            const colorCatalogue = attributeCatalogues.find(c =>
                c.name.toLowerCase().includes('màu') ||
                c.name.toLowerCase().includes('color')
            );

            // If we're selecting a color, try to find an available size
            if (colorCatalogue && catalogueId === colorCatalogue.id) {
                // Try each other attribute value to find an available combination
                for (const catalogue of attributeCatalogues) {
                    if (catalogue.id === catalogueId) continue;

                    for (const value of catalogue.values) {
                        const testSelection = {
                            ...newSelection,
                            [catalogue.id]: value.id
                        };
                        const testVariant = findMatchingVariant(testSelection);
                        if (testVariant && testVariant.stock_quantity > 0) {
                            // Found an available combination!
                            setSelectedAttributes(testSelection);
                            return;
                        }
                    }
                }
            }
        }

        // Default: just set the new selection
        setSelectedAttributes(newSelection);
    };

    // Get display name for selected attribute
    const getSelectedDisplayName = (catalogue: AttributeCatalogue): string => {
        const selectedId = selectedAttributes[catalogue.id];
        if (!selectedId) return '';

        const value = catalogue.values.find(v => v.id === selectedId);
        return value?.name || value?.value || '';
    };

    if (allVariantsOutOfStock) {
        return (
            <div className="mb-4 p-4 bg-gray-50 rounded text-center">
                <p className="text-red-600 font-medium">Sản phẩm hiện đã hết hàng</p>
            </div>
        );
    }

    // Sort catalogues: "Màu Sắc" first, then others
    const sortedCatalogues = [...attributeCatalogues].sort((a, b) => {
        const aIsColor = a.name.toLowerCase().includes('màu') || a.name.toLowerCase().includes('color');
        const bIsColor = b.name.toLowerCase().includes('màu') || b.name.toLowerCase().includes('color');
        if (aIsColor && !bIsColor) return -1;
        if (!aIsColor && bIsColor) return 1;
        return 0;
    });

    return (
        <div className="space-y-4 mb-4">
            {sortedCatalogues.map((catalogue, index) => {
                // Determine if this attribute should show image swatches
                // Priority: "Màu Sắc" (color) attribute, fallback to first attribute
                const colorCatalogue = attributeCatalogues.find(c =>
                    c.name.toLowerCase().includes('màu') ||
                    c.name.toLowerCase().includes('color')
                );
                const isImageAttribute = colorCatalogue
                    ? catalogue.id === colorCatalogue.id
                    : index === 0;

                const selectedValue = getSelectedDisplayName(catalogue);

                return (
                    <div key={catalogue.id}>
                        {/* Label */}
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-900">
                                {catalogue.name}: {selectedValue}
                            </span>
                            {catalogue.type === 'size' && (
                                <a href="#" className="text-xs text-blue-600 hover:underline">
                                    Hướng dẫn chọn size
                                </a>
                            )}
                        </div>

                        {/* Values */}
                        {isImageAttribute ? (
                            // Image attribute (Màu Sắc or fallback to first): show as swatches with variant images
                            <div className="flex flex-wrap gap-2">
                                {catalogue.values.map(value => {
                                    const isSelected = selectedAttributes[catalogue.id] === value.id;
                                    const variantImage = getVariantImage(catalogue.id, value.id);

                                    return (
                                        <button
                                            key={value.id}
                                            onClick={() => handleSelectAttribute(catalogue.id, value.id)}
                                            className={`
                                                w-14 h-10 rounded-full border-2 relative overflow-hidden cursor-pointer
                                                ${isSelected
                                                    ? 'border-blue-600'
                                                    : 'border-gray-300 hover:border-gray-400'}
                                            `}
                                            title={value.name}
                                        >
                                            {variantImage ? (
                                                <img
                                                    src={variantImage}
                                                    alt={value.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full"
                                                    style={{ backgroundColor: value.color_code || '#e5e5e5' }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            // Other attributes: show as buttons with dashed cross-out
                            <div className="flex flex-wrap gap-2">
                                {catalogue.values.map(value => {
                                    const isSelected = selectedAttributes[catalogue.id] === value.id;
                                    const isAvailable = isValueAvailable(catalogue.id, value.id, false);

                                    return (
                                        <button
                                            key={value.id}
                                            onClick={() => isAvailable && handleSelectAttribute(catalogue.id, value.id)}
                                            disabled={!isAvailable}
                                            className={`
                                                min-w-[50px] h-10 px-4 rounded border text-sm font-medium relative overflow-hidden
                                                ${isSelected
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:border-black'}
                                                ${!isAvailable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                            `}
                                        >
                                            {value.name || value.value}

                                            {/* Dashed diagonal cross-out - corner to corner within boundaries */}
                                            {!isAvailable && (
                                                <svg
                                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    {/* Top-left to bottom-right */}
                                                    <line
                                                        x1="0"
                                                        y1="0"
                                                        x2="100%"
                                                        y2="100%"
                                                        stroke="#d1d5db"
                                                        strokeWidth="1.5"
                                                        strokeDasharray="4,4"
                                                    />
                                                    {/* Top-right to bottom-left */}
                                                    <line
                                                        x1="100%"
                                                        y1="0"
                                                        x2="0"
                                                        y2="100%"
                                                        stroke="#d1d5db"
                                                        strokeWidth="1.5"
                                                        strokeDasharray="4,4"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Stock info removed - moved to ProductInfo */}
        </div>
    );
}
