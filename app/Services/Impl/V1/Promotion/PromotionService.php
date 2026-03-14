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
                    // Xử lý sync vào bảng promotion_product_variant
                    // Logic: 
                    // - Nếu có variant: lưu product_variant_id và product_id (lấy từ variant để dễ query)
                    // - Nếu không có variant: lưu product_id và product_variant_id = null
                    
                    // Xóa tất cả records cũ
                    \Illuminate\Support\Facades\DB::table('promotion_product_variant')
                        ->where('promotion_id', $this->model->id)
                        ->delete();
                    
                    $insertData = [];
                    
                    // Xử lý variants: lưu product_variant_id và product_id (lấy từ variant)
                    foreach ($productVariantIds as $variantId) {
                        $variant = \App\Models\ProductVariant::find($variantId);
                        if ($variant) {
                            $insertData[] = [
                                'promotion_id' => $this->model->id,
                                'product_variant_id' => $variantId,
                                'product_id' => $variant->product_id, // Lưu product_id từ variant để dễ query
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                    
                    // Xử lý products không có variant: lưu product_id và product_variant_id = null
                    foreach ($productIds as $productId) {
                        // Kiểm tra xem product này có variant không (chỉ lưu nếu không có variant)
                        $hasVariants = \App\Models\ProductVariant::where('product_id', $productId)->exists();
                        if (!$hasVariants) {
                            $insertData[] = [
                                'promotion_id' => $this->model->id,
                                'product_id' => $productId,
                                'product_variant_id' => null,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                    
                    // Insert tất cả records mới (batch insert để tối ưu)
                    if (!empty($insertData)) {
                        \Illuminate\Support\Facades\DB::table('promotion_product_variant')->insert($insertData);
                    }
                } else {
                    // Nếu không phải product_variant, detach tất cả
                    \Illuminate\Support\Facades\DB::table('promotion_product_variant')
                        ->where('promotion_id', $this->model->id)
                        ->delete();
                }

                // Sync product catalogues based on apply_source
                $productCatalogueIds = $this->request->input('product_catalogue_ids', []);
                if ($this->model->apply_source === 'product_catalogue') {
                    $this->model->product_catalogues()->sync($productCatalogueIds);
                } else {
                    $this->model->product_catalogues()->detach();
                }
            } else {
                // Nếu không phải product_discount, detach tất cả product relationships
                \Illuminate\Support\Facades\DB::table('promotion_product_variant')
                    ->where('promotion_id', $this->model->id)
                    ->delete();
                $this->model->product_catalogues()->detach();
            }
        }

        // Xử lý buy_x_get_y type
        if ($this->model->type === 'buy_x_get_y') {
            // Xóa tất cả records cũ
            \Illuminate\Support\Facades\DB::table('promotion_buy_x_get_y_items')
                ->where('promotion_id', $this->model->id)
                ->delete();

            $insertData = [];

            // Xử lý Buy X items
            $buyMinQuantity = $this->request->input('buy_min_quantity', 1);
            $buyConditionType = $this->request->input('buy_condition_type', 'min_quantity');
            $buyMinOrderValue = $this->request->input('buy_min_order_value');
            $buyApplyType = $this->request->input('buy_apply_type', 'product');
            
            if ($buyApplyType === 'product') {
                $buyProductIds = $this->request->input('buy_product_ids', []);
                foreach ($buyProductIds as $itemId) {
                    // itemId có thể là product_id hoặc variant_id
                    // Kiểm tra xem có phải variant không
                    $variant = \App\Models\ProductVariant::find($itemId);
                    if ($variant) {
                        // Là variant
                        $insertData[] = [
                            'promotion_id' => $this->model->id,
                            'item_type' => 'buy',
                            'apply_type' => 'product_variant',
                            'product_id' => $variant->product_id,
                            'product_variant_id' => $itemId,
                            'product_catalogue_id' => null,
                            'quantity' => $buyMinQuantity,
                            'min_order_value' => $buyConditionType === 'min_order_value' ? $buyMinOrderValue : null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    } else {
                        // Là product không có variant
                        $product = \App\Models\Product::find($itemId);
                        if ($product) {
                            $insertData[] = [
                                'promotion_id' => $this->model->id,
                                'item_type' => 'buy',
                                'apply_type' => 'product',
                                'product_id' => $itemId,
                                'product_variant_id' => null,
                                'product_catalogue_id' => null,
                                'quantity' => $buyMinQuantity,
                                'min_order_value' => $buyConditionType === 'min_order_value' ? $buyMinOrderValue : null,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                }
            } elseif ($buyApplyType === 'product_catalogue') {
                $buyCatalogueIds = $this->request->input('buy_product_catalogue_ids', []);
                foreach ($buyCatalogueIds as $catalogueId) {
                    $insertData[] = [
                        'promotion_id' => $this->model->id,
                        'item_type' => 'buy',
                        'apply_type' => 'product_catalogue',
                        'product_id' => null,
                        'product_variant_id' => null,
                        'product_catalogue_id' => $catalogueId,
                        'quantity' => $buyMinQuantity,
                        'min_order_value' => $buyConditionType === 'min_order_value' ? $buyMinOrderValue : null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            // Xử lý Get Y items
            $getQuantity = $this->request->input('get_quantity', 1);
            $getApplyType = $this->request->input('get_apply_type', 'product');
            
            if ($getApplyType === 'product') {
                $getProductIds = $this->request->input('get_product_ids', []);
                foreach ($getProductIds as $itemId) {
                    // itemId có thể là product_id hoặc variant_id
                    // Kiểm tra xem có phải variant không
                    $variant = \App\Models\ProductVariant::find($itemId);
                    if ($variant) {
                        // Là variant
                        $insertData[] = [
                            'promotion_id' => $this->model->id,
                            'item_type' => 'get',
                            'apply_type' => 'product_variant',
                            'product_id' => $variant->product_id,
                            'product_variant_id' => $itemId,
                            'product_catalogue_id' => null,
                            'quantity' => $getQuantity,
                            'min_order_value' => null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    } else {
                        // Là product không có variant
                        $product = \App\Models\Product::find($itemId);
                        if ($product) {
                            $insertData[] = [
                                'promotion_id' => $this->model->id,
                                'item_type' => 'get',
                                'apply_type' => 'product',
                                'product_id' => $itemId,
                                'product_variant_id' => null,
                                'product_catalogue_id' => null,
                                'quantity' => $getQuantity,
                                'min_order_value' => null,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                }
            } elseif ($getApplyType === 'product_catalogue') {
                $getCatalogueIds = $this->request->input('get_product_catalogue_ids', []);
                foreach ($getCatalogueIds as $catalogueId) {
                    $insertData[] = [
                        'promotion_id' => $this->model->id,
                        'item_type' => 'get',
                        'apply_type' => 'product_catalogue',
                        'product_id' => null,
                        'product_variant_id' => null,
                        'product_catalogue_id' => $catalogueId,
                        'quantity' => $getQuantity,
                        'min_order_value' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            // Insert tất cả records
            if (!empty($insertData)) {
                \Illuminate\Support\Facades\DB::table('promotion_buy_x_get_y_items')->insert($insertData);
            }
        }

        // Xử lý combo type
        if ($this->model->type === 'combo') {
            // Xóa tất cả combo items cũ
            \App\Models\PromotionComboItem::where('promotion_id', $this->model->id)->delete();
            
            // Lấy combo_items từ request
            $comboItems = $this->request->input('combo_items', []);
            
            if (!empty($comboItems) && is_array($comboItems)) {
                $insertData = [];
                
                foreach ($comboItems as $item) {
                    if (!isset($item['product_id']) && !isset($item['product_variant_id'])) {
                        continue; // Bỏ qua nếu không có product_id hoặc variant_id
                    }
                    
                    $productId = isset($item['product_id']) ? $item['product_id'] : null;
                    $productVariantId = isset($item['product_variant_id']) ? $item['product_variant_id'] : null;
                    $quantity = isset($item['quantity']) && $item['quantity'] > 0 ? (int)$item['quantity'] : 1;
                    
                    // Nếu có variant_id, lấy product_id từ variant
                    if ($productVariantId && !$productId) {
                        $variant = \App\Models\ProductVariant::find($productVariantId);
                        if ($variant) {
                            $productId = $variant->product_id;
                        }
                    }
                    
                    if ($productId || $productVariantId) {
                        $insertData[] = [
                            'promotion_id' => $this->model->id,
                            'product_id' => $productId,
                            'product_variant_id' => $productVariantId,
                            'quantity' => $quantity,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
                
                // Insert tất cả records
                if (!empty($insertData)) {
                    \Illuminate\Support\Facades\DB::table('promotion_combo_items')->insert($insertData);
                }
            }
        } else {
            // Nếu không phải combo, xóa tất cả combo items
            \App\Models\PromotionComboItem::where('promotion_id', $this->model->id)->delete();
        }
        
        // Gọi parent::afterSave() để clear cache
        // parent::afterSave() sẽ gọi invalidateCache() để clear tất cả cache liên quan
        return parent::afterSave();
    }
}

