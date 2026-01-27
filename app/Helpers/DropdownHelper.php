<?php

namespace App\Helpers;

use Illuminate\Support\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DropdownHelper
{
    /**
     * Transform collection/paginator to dropdown format
     * Tự động xử lý multiple language và non-multiple language models
     * 
     * @param Collection|LengthAwarePaginator $items
     * @param array $options Optional configuration:
     *   - 'valueKey' => 'id' (default: 'id')
     *   - 'labelKey' => 'name' (default: 'name', ignored if multiple language detected)
     *   - 'isMultipleLanguage' => true/false (default: auto-detect)
     *   - 'languageRelation' => 'current_languages' (default: 'current_languages')
     *   - 'fallbackRelation' => 'languages' (default: 'languages')
     * @return array Array of ['value' => string, 'label' => string]
     */
    public static function transform($items, array $options = []): array
    {
        $valueKey = $options['valueKey'] ?? 'id';
        $labelKey = $options['labelKey'] ?? 'name';
        $isMultipleLanguage = $options['isMultipleLanguage'] ?? null; // null = auto-detect
        $languageRelation = $options['languageRelation'] ?? 'current_languages';
        $fallbackRelation = $options['fallbackRelation'] ?? 'languages';

        // Convert paginator to collection if needed
        if ($items instanceof LengthAwarePaginator) {
            // LengthAwarePaginator có property items() trả về array
            $collection = collect($items->items());
        } elseif ($items instanceof Collection) {
            $collection = $items;
        } else {
            // Convert to collection if it's an array or other iterable
            $collection = collect($items);
        }

        // Auto-detect multiple language if not specified
        if ($isMultipleLanguage === null && $collection->isNotEmpty()) {
            $firstItem = $collection->first();
            // Check if model has these relation methods
            if (method_exists($firstItem, $languageRelation) || method_exists($firstItem, $fallbackRelation)) {
                // Try to check if relation is loaded or can be accessed
                try {
                    if (method_exists($firstItem, $languageRelation)) {
                        $testRelation = $firstItem->{$languageRelation};
                        // If relation returns collection with pivot, it's multiple language
                        if (is_object($testRelation) && method_exists($testRelation, 'first')) {
                            $firstLang = $testRelation->first();
                            if ($firstLang && isset($firstLang->pivot)) {
                                $isMultipleLanguage = true;
                            }
                        }
                    }
                    if ($isMultipleLanguage === null && method_exists($firstItem, $fallbackRelation)) {
                        $testRelation = $firstItem->{$fallbackRelation};
                        if (is_object($testRelation) && method_exists($testRelation, 'first')) {
                            $firstLang = $testRelation->first();
                            if ($firstLang && isset($firstLang->pivot)) {
                                $isMultipleLanguage = true;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    // If relation not loaded, assume it might be multiple language if methods exist
                    $isMultipleLanguage = true;
                }
            }
            
            // Default to false if still null
            if ($isMultipleLanguage === null) {
                $isMultipleLanguage = false;
            }
        }

        return $collection->map(function ($item) use (
            $valueKey, 
            $labelKey, 
            $isMultipleLanguage, 
            $languageRelation, 
            $fallbackRelation
        ) {
            // Get value
            $value = self::getNestedValue($item, $valueKey);
            
            // Get label
            if ($isMultipleLanguage) {
                $label = self::getNameFromMultipleLanguage(
                    $item, 
                    $languageRelation, 
                    $fallbackRelation
                );
            } else {
                $label = self::getNestedValue($item, $labelKey) ?? '';
            }

            return [
                'value' => (string)$value,
                'label' => (string)$label,
            ];
        })->toArray();
    }

    /**
     * Get name from multiple language relation
     */
    private static function getNameFromMultipleLanguage(
        $item, 
        string $languageRelation, 
        string $fallbackRelation
    ): string {
        // Try current_languages first - check if relation is loaded
        if (method_exists($item, $languageRelation)) {
            try {
                $languages = $item->{$languageRelation};
                // Check if it's a relation that returns collection
                if ($languages && (is_a($languages, Collection::class) || method_exists($languages, 'isNotEmpty'))) {
                    if ($languages->isNotEmpty()) {
                        $language = $languages->first();
                        if ($language && isset($language->pivot) && isset($language->pivot->name)) {
                            return $language->pivot->name ?? '';
                        }
                    }
                }
            } catch (\Exception $e) {
                // Relation not loaded or error, continue to fallback
            }
        }

        // Fallback to languages relation
        if (method_exists($item, $fallbackRelation)) {
            try {
                $languages = $item->{$fallbackRelation};
                if ($languages && (is_a($languages, Collection::class) || method_exists($languages, 'isNotEmpty'))) {
                    if ($languages->isNotEmpty()) {
                        $language = $languages->first();
                        if ($language && isset($language->pivot) && isset($language->pivot->name)) {
                            return $language->pivot->name ?? '';
                        }
                    }
                }
            } catch (\Exception $e) {
                // Relation not loaded or error
            }
        }

        return '';
    }

    /**
     * Get nested value from object/array using dot notation
     */
    private static function getNestedValue($item, string $key)
    {
        if (is_array($item)) {
            return data_get($item, $key);
        }

        if (is_object($item)) {
            // Try direct property access first
            if (isset($item->{$key})) {
                return $item->{$key};
            }
            
            // Try dot notation
            return data_get($item, $key);
        }

        return null;
    }
}
