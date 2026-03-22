<?php

namespace App\Services\Impl\V1\Promotion;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Promotion\PromotionServiceInterface;
use App\Repositories\Promotion\PromotionRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class PromotionService extends BaseCacheService implements PromotionServiceInterface
{
    // Cache strategy: 'lazy' phù hợp cho promotions vì có nhiều filter và sort
    // Lazy sẽ cache các query được truy cập nhiều lần
    protected string $cacheStrategy = 'lazy';
    protected string $module = 'promotions';

    protected $repository;

    protected $with = ['creator', 'customer_groups', 'product_variants.product', 'product_catalogues.current_languages', 'product_catalogues.languages'];
    protected $simpleFilter = ['publish', 'user_id', 'type', 'apply_source'];
    protected $searchFields = ['name'];
    protected $sort = ['order', 'asc'];

    public function __construct(PromotionRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    /**
     * Override show để đảm bảo load đầy đủ relationships
     */
    public function show(int $id)
    {
        // Load với đầy đủ relationships, đặc biệt là nested relationships
        $this->model = $this->repository->getModel()
            ->with([
                'creator',
                'customer_groups',
                'product_variants.product',
                'product_catalogues' => function($query) {
                    $query->with(['current_languages', 'languages']);
                },
                'combo_items.product',
                'combo_items.product_variant'
            ])
            ->findOrFail($id);
        
        $this->result = $this->model;
        return $this->getResult();
    }

    /**
     * Override specifications để merge expiry_status vào filter
     */
    protected function specifications(): array
    {
        $specs = parent::specifications();
        
        // Xử lý expiry_status filter nếu có (không phải 'all')
        $expiryStatus = $this->request->input('expiry_status');
        if ($expiryStatus && $expiryStatus !== 'all' && in_array($expiryStatus, ['active', 'expired'])) {
            if (!isset($specs['filter']['custom'])) {
                $specs['filter']['custom'] = [];
            }
            $specs['filter']['custom']['expiry_status'] = $expiryStatus;
        }
        
        return $specs;
    }

    protected function prepareModelData(): static
    {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        
        // Xử lý end_date nếu no_end_date = true
        if (isset($this->modelData['no_end_date']) && $this->modelData['no_end_date']) {
            $this->modelData['end_date'] = null;
        }
        
        // Xử lý max_discount_value: chỉ lưu khi discount_type = 'percentage', nếu không thì set null
        if (isset($this->modelData['discount_type'])) {
            if ($this->modelData['discount_type'] === 'percentage') {
                // Nếu là percentage, giữ max_discount_value nếu có, nếu không có hoặc rỗng thì set null
                if (!isset($this->modelData['max_discount_value']) || $this->modelData['max_discount_value'] === '' || $this->modelData['max_discount_value'] === null) {
                    $this->modelData['max_discount_value'] = null;
                }
            } else {
                // Nếu không phải percentage (fixed_amount, same_price, hoặc free), set max_discount_value = null
                $this->modelData['max_discount_value'] = null;
            }
        } else {
            // Nếu không có discount_type, set max_discount_value = null
            $this->modelData['max_discount_value'] = null;
        }
        
        // Xử lý apply_source: chỉ áp dụng cho product_discount type
        // Nếu type không phải product_discount, set apply_source = 'all'
        if (isset($this->modelData['type']) && $this->modelData['type'] !== 'product_discount') {
            $this->modelData['apply_source'] = 'all';
        }

        // Xử lý buy_x_get_y: lưu max_apply_per_order vào condition_value và set condition_type
        if (isset($this->modelData['type']) && $this->modelData['type'] === 'buy_x_get_y') {
            $maxApplyPerOrder = $this->request->input('max_apply_per_order');
            if ($maxApplyPerOrder && $maxApplyPerOrder > 0) {
                $this->modelData['condition_value'] = $maxApplyPerOrder;
                $this->modelData['condition_type'] = 'min_product_quantity'; // Dùng để đánh dấu có giới hạn
            } else {
                $this->modelData['condition_value'] = null;
                $this->modelData['condition_type'] = 'none';
            }
            
            // Đảm bảo discount_type hợp lệ cho buy_x_get_y
            if (!isset($this->modelData['discount_type']) || !in_array($this->modelData['discount_type'], ['percentage', 'fixed_amount', 'free'])) {
                $this->modelData['discount_type'] = 'free'; // Default là miễn phí
            }
        }

        // Xử lý combo: combo không có discount, chỉ có combo_price
        if (isset($this->modelData['type']) && $this->modelData['type'] === 'combo') {
            // Combo không cần discount_type và discount_value
            $this->modelData['discount_type'] = null;
            $this->modelData['discount_value'] = null;
            $this->modelData['max_discount_value'] = null;
            // Combo không kết hợp với promotion khác
            $this->modelData['combine_with_order_discount'] = false;
            $this->modelData['combine_with_product_discount'] = false;
            $this->modelData['combine_with_free_shipping'] = false;
        } elseif ($this->request->has('name')) {
            // CHỈ xử lý checkbox khi có 'name' (ngầm hiểu là đang ở form Edit/Create đầy đủ)
            // Fix cho việc checkbox không gửi giá trị khi unchecked
            $this->modelData['combine_with_order_discount'] = $this->request->input('combine_with_order_discount', false);
            $this->modelData['combine_with_product_discount'] = $this->request->input('combine_with_product_discount', false);
            $this->modelData['combine_with_free_shipping'] = $this->request->input('combine_with_free_shipping', false);
        }
        
        // Remove relationship data from modelData (sẽ xử lý trong afterSave)
        unset($this->modelData['customer_group_ids']);
        unset($this->modelData['store_ids']);
        unset($this->modelData['product_ids']);
        unset($this->modelData['product_variant_ids']);
        unset($this->modelData['product_catalogue_ids']);
        
        // Remove buy_x_get_y specific data (sẽ xử lý trong afterSave)
        unset($this->modelData['buy_product_ids']);
        unset($this->modelData['buy_product_catalogue_ids']);
        unset($this->modelData['get_product_ids']);
        unset($this->modelData['get_product_catalogue_ids']);
        unset($this->modelData['buy_min_quantity']);
        unset($this->modelData['buy_condition_type']);
        unset($this->modelData['buy_min_order_value']);
        unset($this->modelData['buy_apply_type']);
        unset($this->modelData['get_quantity']);
        unset($this->modelData['get_apply_type']);
        unset($this->modelData['max_apply_per_order']);

        // Remove combo_items data (sẽ xử lý trong afterSave)
        unset($this->modelData['combo_items']);
        
        return $this;
    }

    /**
     * Override afterSave to handle relationships
     */
    protected function afterSave(): static
    {
        if ($this->model) {
            // Extract relationship data from request
            $customerGroupIds = $this->request->input('customer_group_ids', []);
            
            // Sync customer groups based on customer_group_type
            if ($this->model->customer_group_type === 'selected') {
                $this->model->customer_groups()->sync($customerGroupIds);
            } else {
                $this->model->customer_groups()->detach();
            }

            // Chỉ sync product variants/catalogues khi type = 'product_discount'
            if ($this->model->type === 'product_discount') {
                // Sync product variants/products based on apply_source
                $productVariantIds = $this->request->input('product_variant_ids', []);
                $productIds = $this->request->input('product_ids', []);
                
                if ($this->model->apply_source === 'product_variant') {
                    // Xóa tất cả records cũ
                    \Illuminate\Support\Facades\DB::table('promotion_product_variant')
                        ->where('promotion_id', $this->model->id)
                        ->delete();
                    
                    $insertData = [];
                    
                    // Xử lý variants
                    foreach ($productVariantIds as $variantId) {
                        $actualId = $variantId;
                        if (is_string($variantId)) {
                            if (str_starts_with($variantId, 'v')) {
                                $actualId = (int) substr($variantId, 1);
                            } elseif (str_starts_with($variantId, 'p')) {
                                continue;
                            }
                        }

                        $variant = \App\Models\ProductVariant::find($actualId);
                        if ($variant) {
                            $insertData[] = [
                                'promotion_id' => $this->model->id,
                                'product_variant_id' => $actualId,
                                'product_id' => $variant->product_id,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                    
                    // Xử lý products
                    foreach ($productIds as $productId) {
                        $actualId = $productId;
                        $isForcedProduct = false;
                        if (is_string($productId)) {
                            if (str_starts_with($productId, 'p')) {
                                $actualId = (int) substr($productId, 1);
                                $isForcedProduct = true;
                            } elseif (str_starts_with($productId, 'v')) {
                                continue;
                            }
                        }

                        $hasVariants = \App\Models\ProductVariant::where('product_id', $actualId)->exists();
                        if (!$hasVariants || $isForcedProduct) {
                            $insertData[] = [
                                'promotion_id' => $this->model->id,
                                'product_id' => $actualId,
                                'product_variant_id' => null,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                    
                    if (!empty($insertData)) {
                        \Illuminate\Support\Facades\DB::table('promotion_product_variant')->insert($insertData);
                    }
                } else {
                    \Illuminate\Support\Facades\DB::table('promotion_product_variant')
                        ->where('promotion_id', $this->model->id)
                        ->delete();
                }

                $productCatalogueIds = $this->request->input('product_catalogue_ids', []);
                if ($this->model->apply_source === 'product_catalogue') {
                    $this->model->product_catalogues()->sync($productCatalogueIds);
                } else {
                    $this->model->product_catalogues()->detach();
                }
            }

            // Xử lý buy_x_get_y type
            if ($this->model->type === 'buy_x_get_y') {
                \Illuminate\Support\Facades\DB::table('promotion_buy_x_get_y_items')
                    ->where('promotion_id', $this->model->id)
                    ->delete();

                $insertData = [];
                $buyMinQuantity = $this->request->input('buy_min_quantity', 1);
                $buyConditionType = $this->request->input('buy_condition_type', 'min_quantity');
                $buyMinOrderValue = $this->request->input('buy_min_order_value');
                $buyApplyType = $this->request->input('buy_apply_type', 'product');
                
                if ($buyApplyType === 'product') {
                    $buyProductIds = $this->request->input('buy_product_ids', []);
                    foreach ($buyProductIds as $itemId) {
                        $actualId = $itemId;
                        $forcedType = null;
                        if (is_string($itemId)) {
                            if (str_starts_with($itemId, 'p')) {
                                $actualId = (int) substr($itemId, 1);
                                $forcedType = 'product';
                            } elseif (str_starts_with($itemId, 'v')) {
                                $actualId = (int) substr($itemId, 1);
                                $forcedType = 'variant';
                            }
                        }

                        if ($forcedType === 'variant') {
                            $variant = \App\Models\ProductVariant::find($actualId);
                            if ($variant) {
                                $insertData[] = [
                                    'promotion_id' => $this->model->id, 'item_type' => 'buy', 'apply_type' => 'product_variant',
                                    'product_id' => $variant->product_id, 'product_variant_id' => $actualId,
                                    'product_catalogue_id' => null, 'quantity' => $buyMinQuantity,
                                    'min_order_value' => $buyConditionType === 'min_order_value' ? $buyMinOrderValue : null,
                                    'created_at' => now(), 'updated_at' => now(),
                                ];
                                continue;
                            }
                        } elseif ($forcedType === 'product') {
                            $product = \App\Models\Product::find($actualId);
                            if ($product) {
                                $insertData[] = [
                                    'promotion_id' => $this->model->id, 'item_type' => 'buy', 'apply_type' => 'product',
                                    'product_id' => $actualId, 'product_variant_id' => null,
                                    'product_catalogue_id' => null, 'quantity' => $buyMinQuantity,
                                    'min_order_value' => $buyConditionType === 'min_order_value' ? $buyMinOrderValue : null,
                                    'created_at' => now(), 'updated_at' => now(),
                                ];
                                continue;
                            }
                        }

                        $variant = \App\Models\ProductVariant::find($actualId);
                        if ($variant) {
                            $insertData[] = [
                                'promotion_id' => $this->model->id, 'item_type' => 'buy', 'apply_type' => 'product_variant',
                                'product_id' => $variant->product_id, 'product_variant_id' => $actualId,
                                'product_catalogue_id' => null, 'quantity' => $buyMinQuantity,
                                'min_order_value' => $buyConditionType === 'min_order_value' ? $buyMinOrderValue : null,
                                'created_at' => now(), 'updated_at' => now(),
                            ];
                        } else {
                            $product = \App\Models\Product::find($actualId);
                            if ($product) {
                                $insertData[] = [
                                    'promotion_id' => $this->model->id, 'item_type' => 'buy', 'apply_type' => 'product',
                                    'product_id' => $actualId, 'product_variant_id' => null,
                                    'product_catalogue_id' => null, 'quantity' => $buyMinQuantity,
                                    'min_order_value' => $buyConditionType === 'min_order_value' ? $buyMinOrderValue : null,
                                    'created_at' => now(), 'updated_at' => now(),
                                ];
                            }
                        }
                    }
                } elseif ($buyApplyType === 'product_catalogue') {
                    $buyCatalogueIds = $this->request->input('buy_product_catalogue_ids', []);
                    foreach ($buyCatalogueIds as $catalogueId) {
                        $insertData[] = [
                            'promotion_id' => $this->model->id, 'item_type' => 'buy', 'apply_type' => 'product_catalogue',
                            'product_id' => null, 'product_variant_id' => null, 'product_catalogue_id' => $catalogueId,
                            'quantity' => $buyMinQuantity, 'min_order_value' => $buyConditionType === 'min_order_value' ? $buyMinOrderValue : null,
                            'created_at' => now(), 'updated_at' => now(),
                        ];
                    }
                }

                $getQuantity = $this->request->input('get_quantity', 1);
                $getApplyType = $this->request->input('get_apply_type', 'product');
                
                if ($getApplyType === 'product') {
                    $getProductIds = $this->request->input('get_product_ids', []);
                    foreach ($getProductIds as $itemId) {
                        $actualId = $itemId;
                        $forcedType = null;
                        if (is_string($itemId)) {
                            if (str_starts_with($itemId, 'p')) {
                                $actualId = (int) substr($itemId, 1);
                                $forcedType = 'product';
                            } elseif (str_starts_with($itemId, 'v')) {
                                $actualId = (int) substr($itemId, 1);
                                $forcedType = 'variant';
                            }
                        }

                        if ($forcedType === 'variant') {
                            $variant = \App\Models\ProductVariant::find($actualId);
                            if ($variant) {
                                $insertData[] = [
                                    'promotion_id' => $this->model->id, 'item_type' => 'get', 'apply_type' => 'product_variant',
                                    'product_id' => $variant->product_id, 'product_variant_id' => $actualId,
                                    'product_catalogue_id' => null, 'quantity' => $getQuantity, 'min_order_value' => null,
                                    'created_at' => now(), 'updated_at' => now(),
                                ];
                                continue;
                            }
                        } elseif ($forcedType === 'product') {
                            $product = \App\Models\Product::find($actualId);
                            if ($product) {
                                $insertData[] = [
                                    'promotion_id' => $this->model->id, 'item_type' => 'get', 'apply_type' => 'product',
                                    'product_id' => $actualId, 'product_variant_id' => null,
                                    'product_catalogue_id' => null, 'quantity' => $getQuantity, 'min_order_value' => null,
                                    'created_at' => now(), 'updated_at' => now(),
                                ];
                                continue;
                            }
                        }

                        $variant = \App\Models\ProductVariant::find($actualId);
                        if ($variant) {
                            $insertData[] = [
                                'promotion_id' => $this->model->id, 'item_type' => 'get', 'apply_type' => 'product_variant',
                                'product_id' => $variant->product_id, 'product_variant_id' => $actualId,
                                'product_catalogue_id' => null, 'quantity' => $getQuantity, 'min_order_value' => null,
                                'created_at' => now(), 'updated_at' => now(),
                            ];
                        } else {
                            $product = \App\Models\Product::find($actualId);
                            if ($product) {
                                $insertData[] = [
                                    'promotion_id' => $this->model->id, 'item_type' => 'get', 'apply_type' => 'product',
                                    'product_id' => $actualId, 'product_variant_id' => null,
                                    'product_catalogue_id' => null, 'quantity' => $getQuantity, 'min_order_value' => null,
                                    'created_at' => now(), 'updated_at' => now(),
                                ];
                            }
                        }
                    }
                } elseif ($getApplyType === 'product_catalogue') {
                    $getCatalogueIds = $this->request->input('get_product_catalogue_ids', []);
                    foreach ($getCatalogueIds as $catalogueId) {
                        $insertData[] = [
                            'promotion_id' => $this->model->id, 'item_type' => 'get', 'apply_type' => 'product_catalogue',
                            'product_id' => null, 'product_variant_id' => null, 'product_catalogue_id' => $catalogueId,
                            'quantity' => $getQuantity, 'min_order_value' => null,
                            'created_at' => now(), 'updated_at' => now(),
                        ];
                    }
                }

                if (!empty($insertData)) {
                    \Illuminate\Support\Facades\DB::table('promotion_buy_x_get_y_items')->insert($insertData);
                }
            }

            // Xử lý combo type
            if ($this->model->type === 'combo') {
                \App\Models\PromotionComboItem::where('promotion_id', $this->model->id)->delete();
                $comboItems = $this->request->input('combo_items', []);
                if (!empty($comboItems) && is_array($comboItems)) {
                    $insertData = [];
                    foreach ($comboItems as $item) {
                        $productId = $item['product_id'] ?? null;
                        $productVariantId = $item['product_variant_id'] ?? null;
                        $quantity = (int)($item['quantity'] ?? 1);
                        if ($productVariantId && !$productId) {
                            $variant = \App\Models\ProductVariant::find($productVariantId);
                            if ($variant) $productId = $variant->product_id;
                        }
                        if ($productId || $productVariantId) {
                            $insertData[] = [
                                'promotion_id' => $this->model->id, 'product_id' => $productId,
                                'product_variant_id' => $productVariantId, 'quantity' => $quantity,
                                'created_at' => now(), 'updated_at' => now(),
                            ];
                        }
                    }
                    if (!empty($insertData)) \Illuminate\Support\Facades\DB::table('promotion_combo_items')->insert($insertData);
                }
            }
        }
        
        return parent::afterSave();
    }
}
