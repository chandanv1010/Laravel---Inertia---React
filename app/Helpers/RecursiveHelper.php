<?php

namespace App\Helpers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * RecursiveHelper - Xử lý đệ quy cho các model có cấu trúc cây (parent-child)
 */
class RecursiveHelper
{
    /**
     * Lấy tất cả ID con của một node (bao gồm cả chính nó)
     * Sử dụng cho: ProductCatalogue, PostCatalogue, HotelCatalogue, etc.
     * 
     * @param string $modelClass Class name của model (e.g. ProductCatalogue::class)
     * @param int $parentId ID của node cha
     * @param string $parentColumn Tên cột parent (mặc định: parent_id)
     * @param string $publishColumn Tên cột publish (mặc định: publish)
     * @param int $publishValue Giá trị publish hợp lệ (mặc định: 2)
     */
    public static function getAllChildIds(
        string $modelClass, 
        int $parentId, 
        string $parentColumn = 'parent_id',
        string $publishColumn = 'publish',
        int $publishValue = 2
    ): array {
        // Fetch all categories (filtered by basic publish status) - cached if possible
        // We use a static cache key based on model class to avoid repeated queries within same request
        static $allNodesCache = [];
        
        $cacheKey = $modelClass . '_' . $publishColumn . '_' . $publishValue;
        
        if (!isset($allNodesCache[$cacheKey])) {
            $allNodesCache[$cacheKey] = $modelClass::where($publishColumn, $publishValue)
                ->select('id', $parentColumn)
                ->get()
                ->groupBy($parentColumn);
        }
        
        $childrenByParent = $allNodesCache[$cacheKey];
        $ids = [$parentId];
        $queue = [$parentId];
        
        // BFS traversal
        while (!empty($queue)) {
            $currentId = array_shift($queue);
            
            if (isset($childrenByParent[$currentId])) {
                foreach ($childrenByParent[$currentId] as $child) {
                    $ids[] = $child->id;
                    $queue[] = $child->id;
                }
            }
        }
        
        return array_unique($ids);
    }

    /**
     * Lấy tất cả nodes theo cấu trúc flat với depth
     * Sử dụng cho filter sidebar, dropdown select, etc.
     * 
     * @param string $modelClass Class name của model
     * @param callable $mapCallback Callback để map mỗi node
     * @param string $parentColumn Tên cột parent
     * @param int|null $parentId ID của node cha (null = root)
     * @param int $depth Độ sâu hiện tại
     */
    public static function getFlatTreeWithDepth(
        string $modelClass,
        callable $mapCallback,
        string $parentColumn = 'parent_id',
        ?int $parentId = null,
        int $depth = 0
    ): array {
        $result = [];
        
        $query = $modelClass::where('publish', 2);
        
        if ($parentId === null) {
            $query->where(function ($q) use ($parentColumn) {
                $q->where($parentColumn, 0)->orWhereNull($parentColumn);
            });
        } else {
            $query->where($parentColumn, $parentId);
        }
        
        $nodes = $query->orderBy('order')->with('languages')->get();
        
        foreach ($nodes as $node) {
            $result[] = $mapCallback($node, $depth);
            $children = self::getFlatTreeWithDepth($modelClass, $mapCallback, $parentColumn, $node->id, $depth + 1);
            $result = array_merge($result, $children);
        }
        
        return $result;
    }

    /**
     * Lấy tất cả ancestors của một node (từ node hiện tại lên root)
     * Sử dụng cho breadcrumb, etc.
     * 
     * @param Model $node Node hiện tại
     * @param string $parentColumn Tên cột parent
     */
    public static function getAncestors(Model $node, string $parentColumn = 'parent_id'): Collection
    {
        $ancestors = collect([$node]);
        $current = $node;
        
        while ($current->{$parentColumn}) {
            $parent = $current::with('languages')->find($current->{$parentColumn});
            if (!$parent) break;
            $ancestors->prepend($parent);
            $current = $parent;
        }
        
        return $ancestors;
    }
}
