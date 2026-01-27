<?php

namespace App\Services\Impl\V1\Voucher;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Voucher\VoucherServiceInterface;
use App\Repositories\Voucher\VoucherRepo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class VoucherService extends BaseCacheService implements VoucherServiceInterface
{
    // Cache strategy: 'lazy' phù hợp cho vouchers vì có nhiều filter và sort
    protected string $cacheStrategy = 'lazy';
    protected string $module = 'vouchers';

    protected $repository;

    protected $with = ['creator', 'customer_groups', 'product_variants.product', 'product_catalogues.current_languages', 'product_catalogues.languages'];
    protected $simpleFilter = ['publish', 'user_id', 'type', 'apply_source'];
    protected $searchFields = ['name', 'code'];
    protected $sort = ['order', 'asc'];

    public function __construct(VoucherRepo $repository)
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    /**
     * Generate unique voucher code
     */
    public function generateCode(): string
    {
        do {
            // Tạo code ngẫu nhiên 8 ký tự (chữ và số, viết hoa)
            $code = strtoupper(Str::random(8));
        } while (!$this->isCodeAvailable($code));

        return $code;
    }

    /**
     * Check if voucher code is available
     */
    public function isCodeAvailable(string $code, ?int $excludeId = null): bool
    {
        $query = $this->repository->getModel()->where('code', $code);
        
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        return !$query->exists();
    }
    
    /**
     * Lấy voucher đang active để hiển thị trên frontend
     * Ưu tiên voucher order_discount hoặc product_discount còn hạn
     * @return array|null
     */
    public function getActiveVoucherForDisplay(): ?array
    {
        $voucher = $this->repository->getModel()
            ->where('publish', '2')
            ->whereIn('type', ['order_discount', 'product_discount'])
            ->where('start_date', '<=', now())
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            })
            ->orderBy('id', 'desc')
            ->first();
            
        if (!$voucher) {
            return null;
        }
        
        // Format discount display text
        $discountText = '';
        if ($voucher->discount_type === 'percentage') {
            $discountText = $voucher->discount_value . '%';
        } else {
            $discountText = number_format($voucher->discount_value, 0, ',', '.') . 'đ';
        }
        
        return [
            'id' => $voucher->id,
            'code' => $voucher->code,
            'name' => $voucher->name,
            'discount_text' => $discountText,
            'discount_type' => $voucher->discount_type,
            'discount_value' => $voucher->discount_value,
            'max_discount_value' => $voucher->max_discount_value,
            'condition_type' => $voucher->condition_type,
            'condition_value' => $voucher->condition_value,
            'description' => $voucher->description ?? 'Sử dụng mã giảm giá để được giảm ' . $discountText . ' cho đơn hàng',
        ];
    }

    /**
     * Lấy danh sách voucher áp dụng cho sản phẩm cụ thể để hiển thị
     * @param int $productId
     * @return array
     */
    public function getApplicableVouchersForProduct(int $productId): array
    {
        // 1. Get base active vouchers (published, valid date)
        // Focus on 'order_discount' (applies to all), 'product_discount' (specific logic), and 'free_shipping'
        $query = $this->repository->getModel()
            ->where('publish', 2)
            ->whereIn('type', ['order_discount', 'product_discount', 'free_shipping'])
            ->where('start_date', '<=', now())
            ->where(function ($q) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', now());
            })
            ->orderBy('order', 'asc') // Priority order
            ->orderBy('discount_value', 'desc'); // Then best discount

        $vouchers = $query->get();
        $applicableVouchers = [];

        // 2. Filter applicable vouchers
        foreach ($vouchers as $voucher) {
            $isApplicable = false;

            if ($voucher->type === 'order_discount' || $voucher->type === 'free_shipping') {
                // Order discount and Free shipping usually applies to everything unless excluded
                $isApplicable = true;
            } elseif ($voucher->type === 'product_discount') {
                if ($voucher->apply_source === 'all') {
                    $isApplicable = true;
                } elseif ($voucher->apply_source === 'product_variant') {
                    // Check if product OR its variants are linked
                    $exists = DB::table('voucher_product_variant')
                        ->where('voucher_id', $voucher->id)
                        ->where('product_id', $productId)
                        ->exists();
                    if ($exists) $isApplicable = true;
                } elseif ($voucher->apply_source === 'product_catalogue') {
                    // Check if product belongs to linked catalogues
                    $productCatalogueIds = DB::table('product_catalogue_product')
                        ->where('product_id', $productId)
                        ->pluck('product_catalogue_id');
                    
                    if ($productCatalogueIds->isNotEmpty()) {
                        $exists = DB::table('voucher_product_catalogue')
                            ->where('voucher_id', $voucher->id)
                            ->whereIn('product_catalogue_id', $productCatalogueIds)
                            ->exists();
                        if ($exists) $isApplicable = true;
                    }
                }
            }

            if ($isApplicable) {
                // Format for frontend
                $discountValue = (float)$voucher->discount_value;
                $description = $voucher->description;
                
                if (empty($description)) {
                    $descText = '';
                    if ($voucher->type === 'free_shipping') {
                         $descText = "Miễn phí vận chuyển";
                         if ($voucher->condition_type === 'min_order_amount' && $voucher->condition_value > 0) {
                             $minVal = number_format($voucher->condition_value, 0, ',', '.');
                             $descText .= " cho đơn từ {$minVal}đ";
                         }
                    } elseif ($voucher->discount_type === 'percentage') {
                        $descText = "Giảm {$discountValue}%";
                        if ($voucher->max_discount_value > 0) {
                            $maxVal = number_format($voucher->max_discount_value, 0, ',', '.');
                            $descText .= " tối đa {$maxVal}đ";
                        }
                    } else {
                        $val = number_format($discountValue, 0, ',', '.');
                        $descText = "Giảm {$val}đ";
                    }
                    
                    if ($voucher->type !== 'free_shipping' && $voucher->condition_type === 'min_order_amount' && $voucher->condition_value > 0) {
                         $minVal = number_format($voucher->condition_value, 0, ',', '.');
                         $descText .= " cho đơn từ {$minVal}đ";
                    }
                    $description = $descText;
                }

                $applicableVouchers[] = [
                    'code' => $voucher->code,
                    'discount_value' => $discountValue,
                    'remaining_uses' => $voucher->usage_limit ? ($voucher->usage_limit - $voucher->usage_count) : 999,
                    'min_order_value' => $voucher->condition_type === 'min_order_amount' ? (float)$voucher->condition_value : 0,
                    'description' => $description,
                    'color' => null,
                    'type' => $voucher->type,
                    'is_product_specific' => $voucher->type === 'product_discount'
                ];
            }
        }

        return $applicableVouchers;
    }

    /**
     * Override show để đảm bảo load đầy đủ relationships
     */
    public function show(int $id)
    {
        $this->model = $this->repository->getModel()
            ->with([
                'creator',
                'customer_groups',
                'product_variants.product',
                'product_catalogues' => function($query) {
                    $query->with(['current_languages', 'languages']);
                },
                'buy_x_get_y_items',
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
        
        // Xử lý code: nếu không có code hoặc code rỗng, auto-generate
        if (empty($this->modelData['code'])) {
            $this->modelData['code'] = $this->generateCode();
        } else {
            // Validate code phải unique (trừ khi đang edit cùng record)
            // Lấy ID từ route parameter hoặc từ request
            $excludeId = null;
            if ($this->request->route('voucher')) {
                $excludeId = $this->request->route('voucher');
            } elseif ($this->request->has('id')) {
                $excludeId = $this->request->input('id');
            } elseif ($this->model && $this->model->id) {
                $excludeId = $this->model->id;
            }
            
            if (!$this->isCodeAvailable($this->modelData['code'], $excludeId)) {
                throw new \Exception('Mã voucher đã tồn tại. Vui lòng chọn mã khác hoặc để trống để tự động tạo mã.');
            }
        }
        
        // Xử lý end_date nếu no_end_date = true
        if (isset($this->modelData['no_end_date']) && $this->modelData['no_end_date']) {
            $this->modelData['end_date'] = null;
        }
        
        // Xử lý max_discount_value: chỉ lưu khi discount_type = 'percentage', nếu không thì set null
        if (isset($this->modelData['discount_type'])) {
            if ($this->modelData['discount_type'] === 'percentage') {
                if (!isset($this->modelData['max_discount_value']) || $this->modelData['max_discount_value'] === '' || $this->modelData['max_discount_value'] === null) {
                    $this->modelData['max_discount_value'] = null;
                }
            } else {
                $this->modelData['max_discount_value'] = null;
            }
        } else {
            $this->modelData['max_discount_value'] = null;
        }
        
        if (isset($this->modelData['type']) && $this->modelData['type'] !== 'product_discount') {
            $this->modelData['apply_source'] = 'all';
        }

        // Set default name if missing
        if (empty($this->modelData['name'])) {
            $this->modelData['name'] = 'Voucher ' . ($this->modelData['code'] ?? '');
        }

        // Set default start_date if missing
        if (empty($this->modelData['start_date'])) {
            $this->modelData['start_date'] = now();
        }

        // Explicitly handle combine_with_* boolean fields (fix for false values not being sent)
        $this->modelData['combine_with_order_discount'] = $this->request->input('combine_with_order_discount', false);
        $this->modelData['combine_with_product_discount'] = $this->request->input('combine_with_product_discount', false);
        $this->modelData['combine_with_free_shipping'] = $this->request->input('combine_with_free_shipping', false);


        // Xử lý buy_x_get_y: lưu max_apply_per_order vào condition_value và set condition_type
        if (isset($this->modelData['type']) && $this->modelData['type'] === 'buy_x_get_y') {
            $maxApplyPerOrder = $this->request->input('max_apply_per_order');
            if ($maxApplyPerOrder && $maxApplyPerOrder > 0) {
                $this->modelData['condition_value'] = $maxApplyPerOrder;
                $this->modelData['condition_type'] = 'min_product_quantity';
            } else {
                $this->modelData['condition_value'] = null;
                $this->modelData['condition_type'] = 'none';
            }
            
            // Đảm bảo discount_type hợp lệ cho buy_x_get_y
            if (!isset($this->modelData['discount_type']) || !in_array($this->modelData['discount_type'], ['percentage', 'fixed_amount', 'free'])) {
                $this->modelData['discount_type'] = 'free';
            }
        }

        // Xử lý combo: combo không có discount, chỉ có combo_price
        if (isset($this->modelData['type']) && $this->modelData['type'] === 'combo') {
            $this->modelData['discount_type'] = null;
            $this->modelData['discount_value'] = null;
            $this->modelData['max_discount_value'] = null;
            $this->modelData['combine_with_order_discount'] = false;
            $this->modelData['combine_with_product_discount'] = false;
            $this->modelData['combine_with_free_shipping'] = false;
        }

        // Xử lý free_shipping: không cần discount_type và discount_value
        if (isset($this->modelData['type']) && $this->modelData['type'] === 'free_shipping') {
            $this->modelData['discount_type'] = null;
            $this->modelData['discount_value'] = null;
            $this->modelData['max_discount_value'] = null;
        }
        
        // Remove relationship data from modelData (sẽ xử lý trong afterSave)
        unset($this->modelData['customer_group_ids']);
        unset($this->modelData['store_ids']);
        unset($this->modelData['product_ids']);
        unset($this->modelData['product_variant_ids']);
        unset($this->modelData['product_catalogue_ids']);
        
        // Remove buy_x_get_y specific data
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

        // Remove combo_items data
        unset($this->modelData['combo_items']);
        
        return $this;
    }

    /**
     * Get all active vouchers and check eligibility for current cart
     * 
     * @param array $cartItems Items in cart
     * @param float $cartTotal Total price of cart
     * @return array
     */
    public function getVouchersForCart(array $cartItems, float $cartTotal): array
    {
        // 1. Get all base active vouchers
        $vouchers = $this->repository->getModel()
            ->where('publish', 2)
            ->whereIn('type', ['order_discount', 'product_discount', 'free_shipping', 'buy_x_get_y'])
            ->where('start_date', '<=', now())
            ->where(function ($q) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', now());
            })
            ->orderBy('order', 'asc')
            ->orderBy('discount_value', 'desc')
            ->get();

        $result = [];

        foreach ($vouchers as $voucher) {
            $isEligible = false;
            $ineligibleReason = '';

            // Check usage limit
            if ($voucher->usage_limit !== null && $voucher->usage_count >= $voucher->usage_limit) {
                 // Skip entirely or show as Inactive? usually hide if used up.
                 // But let's skip for list
                 continue; 
            }

            // Logic check based on type
            if ($voucher->type === 'order_discount' || $voucher->type === 'free_shipping') {
                // Check min order value
                if ($voucher->condition_type === 'min_order_amount') {
                    if ($cartTotal >= $voucher->condition_value) {
                        $isEligible = true;
                    } else {
                        $missing = number_format($voucher->condition_value - $cartTotal, 0, ',', '.');
                        $minVal = number_format($voucher->condition_value, 0, ',', '.');
                        $ineligibleReason = "Đơn hàng chưa đạt tối thiểu {$minVal}đ (Thiếu {$missing}đ)";
                    }
                } else {
                    $isEligible = true;
                }
            } elseif ($voucher->type === 'product_discount') {
                if ($voucher->apply_source === 'all') {
                    $isEligible = true;
                } elseif ($voucher->apply_source === 'product_variant') {
                    // Check if any cart item matches
                    $matched = false;
                    foreach ($cartItems as $item) {
                        $exists = DB::table('voucher_product_variant')
                            ->where('voucher_id', $voucher->id)
                            ->where(function($q) use ($item) {
                                $q->where('product_id', $item['product_id'])
                                  ->orWhere('product_variant_id', $item['variant_id'] ?? 0);
                            })
                            ->exists();
                        if ($exists) {
                            $matched = true;
                            break;
                        }
                    }
                    if ($matched) {
                        // Also check min order value if set
                        if ($voucher->condition_type === 'min_order_amount' && $cartTotal < $voucher->condition_value) {
                             $missing = number_format($voucher->condition_value - $cartTotal, 0, ',', '.');
                             $minVal = number_format($voucher->condition_value, 0, ',', '.');
                             $ineligibleReason = "Đơn hàng chưa đạt tối thiểu {$minVal}đ (Thiếu {$missing}đ)";
                        } else {
                            $isEligible = true;
                        }
                    } else {
                        $ineligibleReason = "Sản phẩm trong giỏ không thuộc danh sách áp dụng mã này";
                    }
                } elseif ($voucher->apply_source === 'product_catalogue') {
                    // Check catalogues
                    $matched = false;
                    foreach ($cartItems as $item) {
                        $productCatalogueIds = DB::table('product_catalogue_product')
                            ->where('product_id', $item['product_id'])
                            ->pluck('product_catalogue_id');
                        
                        if ($productCatalogueIds->isNotEmpty()) {
                            $exists = DB::table('voucher_product_catalogue')
                                ->where('voucher_id', $voucher->id)
                                ->whereIn('product_catalogue_id', $productCatalogueIds)
                                ->exists();
                            if ($exists) {
                                $matched = true;
                                break;
                            }
                        }
                    }
                    if ($matched) {
                         if ($voucher->condition_type === 'min_order_amount' && $cartTotal < $voucher->condition_value) {
                             $missing = number_format($voucher->condition_value - $cartTotal, 0, ',', '.');
                             $minVal = number_format($voucher->condition_value, 0, ',', '.');
                             $ineligibleReason = "Đơn hàng chưa đạt tối thiểu {$minVal}đ (Thiếu {$missing}đ)";
                        } else {
                            $isEligible = true;
                        }
                    } else {
                        $ineligibleReason = "Sản phẩm trong giỏ không thuộc danh mục áp dụng mã này";
                    }
                }
            } elseif ($voucher->type === 'buy_x_get_y') {
                // Check if "Buy" items condition is met
                $buyItems = DB::table('voucher_buy_x_get_y_items')
                    ->where('voucher_id', $voucher->id)
                    ->where('item_type', 'buy')
                    ->get();
                
                if ($buyItems->isEmpty()) {
                    $ineligibleReason = "Điều kiện áp dụng không hợp lệ";
                } else {
                    $buyConditionMet = false;

                    foreach ($buyItems as $buyItem) {
                        $requiredQty = $buyItem->quantity;
                        $foundQty = 0;

                        foreach ($cartItems as $cartItem) {
                            if ($buyItem->apply_type === 'product' && $cartItem['product_id'] == $buyItem->product_id) {
                                $foundQty += $cartItem['quantity'];
                            } elseif ($buyItem->apply_type === 'product_variant' && isset($cartItem['variant_id']) && $cartItem['variant_id'] == $buyItem->product_variant_id) {
                                $foundQty += $cartItem['quantity'];
                            } elseif ($buyItem->apply_type === 'product_catalogue') {
                                // Check catalogue
                                $inCatalogue = DB::table('product_catalogue_product')
                                    ->where('product_id', $cartItem['product_id'])
                                    ->where('product_catalogue_id', $buyItem->product_catalogue_id)
                                    ->exists();
                                if ($inCatalogue) {
                                    $foundQty += $cartItem['quantity'];
                                }
                            }
                        }

                        if ($foundQty >= $requiredQty) {
                            $buyConditionMet = true; 
                            break; 
                        }
                    }

                    if ($buyConditionMet) {
                         // Check if "Get" items are in cart
                         $getItems = DB::table('voucher_buy_x_get_y_items')
                            ->where('voucher_id', $voucher->id)
                            ->where('item_type', 'get')
                            ->get();

                         if ($getItems->isEmpty()) {
                              // If no specific GET item defined (e.g. maybe free choice logic not in this table?), assume eligible
                              $isEligible = true;
                         } else {
                              $getConditionMet = false;
                              foreach ($getItems as $getItem) {
                                  // For GET items, we just need to verify PRESENCE (quantity >= 1 usually, or >= getQuantity)
                                  // User argument: "if don't use -> waste". So imply at least 1 must be there.
                                  // Let's check against getQuantity specifically or just existence?
                                  // Usually better to check existence. 
                                  $foundGetQty = 0;
                                  
                                  foreach ($cartItems as $cartItem) {
                                      if ($getItem->apply_type === 'product' && $cartItem['product_id'] == $getItem->product_id) {
                                          $foundGetQty += $cartItem['quantity'];
                                      } elseif ($getItem->apply_type === 'product_variant' && isset($cartItem['variant_id']) && $cartItem['variant_id'] == $getItem->product_variant_id) {
                                          $foundGetQty += $cartItem['quantity'];
                                      } elseif ($getItem->apply_type === 'product_catalogue') {
                                          $inCatalogue = DB::table('product_catalogue_product')
                                              ->where('product_id', $cartItem['product_id'])
                                              ->where('product_catalogue_id', $getItem->product_catalogue_id)
                                              ->exists();
                                          if ($inCatalogue) {
                                              $foundGetQty += $cartItem['quantity'];
                                          }
                                      }
                                  }

                                  if ($foundGetQty > 0) { // Require at least 1, or match get item quantity? 
                                      // User said "get Y ben trong gio hang". Presence is key.
                                      $getConditionMet = true;
                                      break; 
                                  }
                              }

                              if ($getConditionMet) {
                                  $isEligible = true;
                              } else {
                                  $ineligibleReason = "Vui lòng thêm quà tặng vào giỏ hàng để được áp dụng mã";
                              }
                         }
                    } else {
                        $ineligibleReason = "Chưa có sản phẩm mua yêu cầu trong giỏ hàng";
                    }
                }
            }

            // Format description and condition details
            $conditionText = "";
            
            if ($voucher->type === 'order_discount') {
                 $val = $voucher->condition_value ? $voucher->condition_value : 0;
                 $minVal = number_format((float)$val, 0, ',', '.');
                 $conditionText = "Áp dụng cho đơn hàng từ {$minVal}đ";
            } elseif ($voucher->type === 'free_shipping') {
                 $val = $voucher->condition_value ? $voucher->condition_value : 0;
                 $minVal = number_format((float)$val, 0, ',', '.');
                 $conditionText = "Miễn phí vận chuyển cho đơn hàng từ {$minVal}đ";
            } elseif ($voucher->type === 'product_discount') {
                 if ($voucher->apply_source === 'all') {
                     $conditionText = "Áp dụng cho tất cả sản phẩm";
                 } else {
                     $conditionText = "Áp dụng cho một số sản phẩm nhất định";
                 }
            } elseif ($voucher->type === 'buy_x_get_y') {
                // Get Buy Items names for better description
                $buyNames = [];
                $languageId = 1; // Default language ID, usually 1 for VN
                // If possible get from config, but DB query needs int
                $configLang = config('app.language_id');
                if ($configLang) $languageId = $configLang;

                try {
                    $buyItemRows = DB::table('voucher_buy_x_get_y_items')
                       ->where('voucher_id', $voucher->id)
                       ->where('item_type', 'buy')
                       ->get();
                    
                    // Log for debugging
                    \Illuminate\Support\Facades\Log::info("Voucher {$voucher->code} Buy Items: " . $buyItemRows->count());

                    foreach($buyItemRows as $row) {
                        if ($row->apply_type === 'product_catalogue') {
                             $cat = DB::table('product_catalogues')->where('id', $row->product_catalogue_id)->value('name'); 
                             // Wait, catalog name usually also in description? product_catalogues mostly has name. 
                             // Check if product_catalogues has translation too? Likely.
                             // Assuming simple 'name' exists on catalogues or we need join there too. 
                             // Based on migration usually catalogues have name?
                             // Let's check catalogue usage elsewhere or assume similar structure.
                             // Actually user complained about PRODUCT name.
                             if ($cat) $buyNames[] = "Danh mục $cat";
                        } elseif ($row->apply_type === 'product') {
                             $prodName = DB::table('product_language')
                                ->where('product_id', $row->product_id)
                                ->where('language_id', $languageId)
                                ->value('name');
                             if ($prodName) $buyNames[] = $prodName;
                        } elseif ($row->apply_type === 'product_variant') {
                             // Get product name from translation
                             $prodName = DB::table('product_language')
                                ->join('product_variants', 'product_variants.product_id', '=', 'product_language.product_id')
                                ->where('product_variants.id', $row->product_variant_id)
                                ->where('product_language.language_id', $languageId)
                                ->value('product_language.name');
                             
                             if ($prodName) {
                                  // Optional SKU
                                 $sku = DB::table('product_variants')->where('id', $row->product_variant_id)->value('sku');
                                 // $name = $prodName . ($sku ? " ($sku)" : "");
                                 $buyNames[] = $prodName;
                             } elseif ($row->product_id) {
                                 // Fallback
                                 $prodName = DB::table('product_language')
                                    ->where('product_id', $row->product_id)
                                    ->where('language_id', $languageId)
                                    ->value('name');
                                 if ($prodName) $buyNames[] = $prodName;
                             }
                        }
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Voucher Condition Error: " . $e->getMessage());
                }
                
                if (!empty($buyNames)) {
                     // Limit to first 3 items to avoid huge text
                     $count = count($buyNames);
                     $displayText = implode(', ', array_slice($buyNames, 0, 3));
                     if ($count > 3) $displayText .= ", ... (và " . ($count - 3) . " sản phẩm khác)";
                     $conditionText = "Mua: {$displayText} để nhận quà.";
                } else {
                     $conditionText = "Mua sản phẩm chỉ định để nhận quà tặng.";
                }
            }

            // Fallback description
            $description = $voucher->description;
             if (empty($description)) {
                $descText = '';
                if ($voucher->type === 'free_shipping') {
                        $descText = "Miễn phí vận chuyển";
                } elseif ($voucher->discount_type === 'percentage') {
                    $descText = "Giảm {$voucher->discount_value}%";
                    if ($voucher->max_discount_value > 0) {
                        $maxVal = number_format($voucher->max_discount_value, 0, ',', '.');
                        $descText .= " tối đa {$maxVal}đ";
                    }
                } elseif ($voucher->discount_type === 'free') {
                     $descText = "Tặng quà miễn phí";
                } else {
                    $val = number_format($voucher->discount_value, 0, ',', '.');
                    $descText = "Giảm {$val}đ";
                }
                
                if ($voucher->condition_type === 'min_order_amount' && $voucher->condition_value > 0) {
                        $minVal = number_format($voucher->condition_value, 0, ',', '.');
                        $descText .= " đơn từ {$minVal}đ";
                }
                $description = $descText;
            }

            $result[] = [
                'code' => $voucher->code,
                'name' => $voucher->name,
                'description' => $description,
                'condition_text' => $conditionText,
                'is_eligible' => $isEligible,
                'ineligible_reason' => $ineligibleReason,
                'discount_amount' => $voucher->discount_value,
                'discount_type' => $voucher->discount_type,
                'min_order_value' => $voucher->condition_type === 'min_order_amount' ? (float)$voucher->condition_value : 0,
                'end_date' => $voucher->end_date ? date('d/m/Y', strtotime($voucher->end_date)) : null,
            ];
        }

        return $result;
    }

    public function validateVoucher(string $code, array $cartItems, float $cartTotal)
    {
        $voucher = $this->repository->getModel()
            ->where('code', $code)
            ->where('publish', 2)
            ->where('start_date', '<=', now())
            ->where(function ($q) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', now());
            })
            ->first();

        if (!$voucher) {
            throw new \Exception('Mã giảm giá không tồn tại hoặc đã hết hạn.');
        }

        if ($voucher->usage_limit !== null && $voucher->usage_count >= $voucher->usage_limit) {
             throw new \Exception('Mã giảm giá đã hết lượt sử dụng.');
        }

        // Eligibility Check Logic (Similar to loop but throws exception on failure)
        // 1. Order / Free Shipping
        if ($voucher->type === 'order_discount' || $voucher->type === 'free_shipping') {
            if ($voucher->condition_type === 'min_order_amount') {
                if ($cartTotal < $voucher->condition_value) {
                     $minVal = number_format($voucher->condition_value, 0, ',', '.');
                     throw new \Exception("Đơn hàng chưa đạt tối thiểu {$minVal}đ để áp dụng mã này.");
                }
            }
        } 
        // 2. Product Discount
        elseif ($voucher->type === 'product_discount') {
             $matched = false;
             if ($voucher->apply_source === 'all') {
                 $matched = true;
             } elseif ($voucher->apply_source === 'product_variant') {
                foreach ($cartItems as $item) {
                     $exists = DB::table('voucher_product_variant')
                        ->where('voucher_id', $voucher->id)
                        ->where(function($q) use ($item) {
                            $q->where('product_id', $item['product_id'])
                              ->orWhere('product_variant_id', $item['variant_id'] ?? 0);
                        })
                        ->exists();
                    if ($exists) {
                        $matched = true;
                        break;
                    }
                }
             } elseif ($voucher->apply_source === 'product_catalogue') {
                 foreach ($cartItems as $item) {
                    $productCatalogueIds = DB::table('product_catalogue_product')
                        ->where('product_id', $item['product_id'])
                        ->pluck('product_catalogue_id');
                    
                    if ($productCatalogueIds->isNotEmpty()) {
                        $exists = DB::table('voucher_product_catalogue')
                            ->where('voucher_id', $voucher->id)
                            ->whereIn('product_catalogue_id', $productCatalogueIds)
                            ->exists();
                        if ($exists) {
                            $matched = true;
                            break;
                        }
                    }
                }
             }

             if (!$matched) {
                 throw new \Exception('Giỏ hàng không chứa sản phẩm áp dụng mã này.');
             }
             
             // Min order check for product discount if applicable
             if ($voucher->condition_type === 'min_order_amount' && $cartTotal < $voucher->condition_value) {
                 $minVal = number_format($voucher->condition_value, 0, ',', '.');
                 throw new \Exception("Đơn hàng chưa đạt tối thiểu {$minVal}đ.");
             }
        }
        // 3. Buy X Get Y
        elseif ($voucher->type === 'buy_x_get_y') {
             $buyItems = DB::table('voucher_buy_x_get_y_items')
                    ->where('voucher_id', $voucher->id)
                    ->where('item_type', 'buy')
                    ->get();
             
             if ($buyItems->isEmpty()) {
                 throw new \Exception('Cấu hình mã lỗi.');
             }

             $buyConditionMet = false;
             foreach ($buyItems as $buyItem) {
                $requiredQty = $buyItem->quantity;
                $foundQty = 0;
                foreach ($cartItems as $cartItem) {
                    if ($buyItem->apply_type === 'product' && $cartItem['product_id'] == $buyItem->product_id) {
                        $foundQty += $cartItem['quantity'];
                    } elseif ($buyItem->apply_type === 'product_variant' && isset($cartItem['variant_id']) && $cartItem['variant_id'] == $buyItem->product_variant_id) {
                        $foundQty += $cartItem['quantity'];
                    } elseif ($buyItem->apply_type === 'product_catalogue') {
                         $inCatalogue = DB::table('product_catalogue_product')
                            ->where('product_id', $cartItem['product_id'])
                            ->where('product_catalogue_id', $buyItem->product_catalogue_id)
                            ->exists();
                        if ($inCatalogue) {
                            $foundQty += $cartItem['quantity'];
                        }
                    }
                }
                if ($foundQty >= $requiredQty) {
                    $buyConditionMet = true; 
                    break;
                }
             }

             if (!$buyConditionMet) {
                 throw new \Exception('Chưa đủ số lượng sản phẩm mua yêu cầu.');
             }

             // Check Get Item presence
             $getItems = DB::table('voucher_buy_x_get_y_items')
                ->where('voucher_id', $voucher->id)
                ->where('item_type', 'get')
                ->get();
            
             if ($getItems->isNotEmpty()) {
                  $getConditionMet = false;
                  foreach ($getItems as $getItem) {
                      $foundGetQty = 0;
                      foreach ($cartItems as $cartItem) {
                          if ($getItem->apply_type === 'product' && $cartItem['product_id'] == $getItem->product_id) {
                              $foundGetQty += $cartItem['quantity'];
                          } elseif ($getItem->apply_type === 'product_variant' && isset($cartItem['variant_id']) && $cartItem['variant_id'] == $getItem->product_variant_id) {
                              $foundGetQty += $cartItem['quantity'];
                          } elseif ($getItem->apply_type === 'product_catalogue') {
                              $inCatalogue = DB::table('product_catalogue_product')
                                  ->where('product_id', $cartItem['product_id'])
                                  ->where('product_catalogue_id', $getItem->product_catalogue_id)
                                  ->exists();
                              if ($inCatalogue) {
                                  $foundGetQty += $cartItem['quantity'];
                              }
                          }
                      }
                      if ($foundGetQty > 0) {
                          $getConditionMet = true;
                          break; 
                      }
                  }
                  if (!$getConditionMet) {
                       throw new \Exception('Vui lòng thêm quà tặng vào giỏ hàng trước khi áp dụng.');
                  }
             }
        }

        return $voucher;
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
                $productVariantIds = $this->request->input('product_variant_ids', []);
                $productIds = $this->request->input('product_ids', []);
                
                if ($this->model->apply_source === 'product_variant') {
                    // Xóa tất cả records cũ
                    \Illuminate\Support\Facades\DB::table('voucher_product_variant')
                        ->where('voucher_id', $this->model->id)
                        ->delete();
                    
                    $insertData = [];
                    
                    // Xử lý variants
                    foreach ($productVariantIds as $variantId) {
                        $variant = \App\Models\ProductVariant::find($variantId);
                        if ($variant) {
                            $insertData[] = [
                                'voucher_id' => $this->model->id,
                                'product_variant_id' => $variantId,
                                'product_id' => $variant->product_id,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                    
                    // Xử lý products không có variant
                    foreach ($productIds as $productId) {
                        $hasVariants = \App\Models\ProductVariant::where('product_id', $productId)->exists();
                        if (!$hasVariants) {
                            $insertData[] = [
                                'voucher_id' => $this->model->id,
                                'product_id' => $productId,
                                'product_variant_id' => null,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                    
                    if (!empty($insertData)) {
                        \Illuminate\Support\Facades\DB::table('voucher_product_variant')->insert($insertData);
                    }
                } else {
                    \Illuminate\Support\Facades\DB::table('voucher_product_variant')
                        ->where('voucher_id', $this->model->id)
                        ->delete();
                }

                // Sync product catalogues
                $productCatalogueIds = $this->request->input('product_catalogue_ids', []);
                if ($this->model->apply_source === 'product_catalogue') {
                    $this->model->product_catalogues()->sync($productCatalogueIds);
                } else {
                    $this->model->product_catalogues()->detach();
                }
            } else {
                // Nếu không phải product_discount, detach tất cả product relationships
                \Illuminate\Support\Facades\DB::table('voucher_product_variant')
                    ->where('voucher_id', $this->model->id)
                    ->delete();
                $this->model->product_catalogues()->detach();
            }

            // Xử lý buy_x_get_y type
            if ($this->model->type === 'buy_x_get_y') {
                // Xóa tất cả records cũ
                \Illuminate\Support\Facades\DB::table('voucher_buy_x_get_y_items')
                    ->where('voucher_id', $this->model->id)
                    ->delete();
                
                $insertData = [];
                
                // Buy items
                $buyMinQuantity = $this->request->input('buy_min_quantity', 1);
                $buyConditionType = $this->request->input('buy_condition_type', 'min_quantity');
                $buyMinOrderValue = $this->request->input('buy_min_order_value', 0);
                $buyApplyType = $this->request->input('buy_apply_type', 'product');
                
                if ($buyApplyType === 'product') {
                    $buyProductIds = $this->request->input('buy_product_ids', []);
                    foreach ($buyProductIds as $itemId) {
                        $variant = \App\Models\ProductVariant::find($itemId);
                        if ($variant) {
                            $insertData[] = [
                                'voucher_id' => $this->model->id,
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
                            $product = \App\Models\Product::find($itemId);
                            if ($product) {
                                $insertData[] = [
                                    'voucher_id' => $this->model->id,
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
                            'voucher_id' => $this->model->id,
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
                
                // Get items
                $getQuantity = $this->request->input('get_quantity', 1);
                $getApplyType = $this->request->input('get_apply_type', 'product');
                
                if ($getApplyType === 'product') {
                    $getProductIds = $this->request->input('get_product_ids', []);
                    foreach ($getProductIds as $itemId) {
                        $variant = \App\Models\ProductVariant::find($itemId);
                        if ($variant) {
                            $insertData[] = [
                                'voucher_id' => $this->model->id,
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
                            $product = \App\Models\Product::find($itemId);
                            if ($product) {
                                $insertData[] = [
                                    'voucher_id' => $this->model->id,
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
                            'voucher_id' => $this->model->id,
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

                if (!empty($insertData)) {
                    \Illuminate\Support\Facades\DB::table('voucher_buy_x_get_y_items')->insert($insertData);
                }
            } else {
                \Illuminate\Support\Facades\DB::table('voucher_buy_x_get_y_items')
                    ->where('voucher_id', $this->model->id)
                    ->delete();
            }

            // Xử lý combo type
            if ($this->model->type === 'combo') {
                \App\Models\VoucherComboItem::where('voucher_id', $this->model->id)->delete();
                
                $comboItems = $this->request->input('combo_items', []);
                
                if (!empty($comboItems) && is_array($comboItems)) {
                    $insertData = [];
                    
                    foreach ($comboItems as $item) {
                        if (!isset($item['product_id']) && !isset($item['product_variant_id'])) {
                            continue;
                        }
                        
                        $productId = isset($item['product_id']) ? $item['product_id'] : null;
                        $productVariantId = isset($item['product_variant_id']) ? $item['product_variant_id'] : null;
                        $quantity = isset($item['quantity']) && $item['quantity'] > 0 ? (int)$item['quantity'] : 1;
                        
                        if ($productVariantId && !$productId) {
                            $variant = \App\Models\ProductVariant::find($productVariantId);
                            if ($variant) {
                                $productId = $variant->product_id;
                            }
                        }
                        
                        if ($productId || $productVariantId) {
                            $insertData[] = [
                                'voucher_id' => $this->model->id,
                                'product_id' => $productId,
                                'product_variant_id' => $productVariantId,
                                'quantity' => $quantity,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                    
                    if (!empty($insertData)) {
                        \Illuminate\Support\Facades\DB::table('voucher_combo_items')->insert($insertData);
                    }
                }
            } else {
                \App\Models\VoucherComboItem::where('voucher_id', $this->model->id)->delete();
            }
        }
        
        return parent::afterSave();
    }
}
