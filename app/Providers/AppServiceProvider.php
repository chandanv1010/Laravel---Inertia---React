<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Event;
use App\Listeners\Frontend\Auth\SendCustomerWelcomeEmail;
use App\Services\Interfaces\User\UserCatalogueServiceInterface;
use App\Services\Impl\V1\User\UserCatalogueService;
use App\Services\Interfaces\User\UserServiceInterface;
use App\Services\Impl\V1\User\UserService;
use App\Services\Interfaces\Permission\PermissionServiceInterface;
use App\Services\Impl\V1\Permission\PermissionService;
use App\Services\Interfaces\Setting\LanguageServiceInterface;
use App\Services\Impl\V1\Setting\LanguageService;
use App\Services\Interfaces\Post\PostCatalogueServiceInterface;
use App\Services\Impl\V1\Post\PostCatalogueService;
use App\Services\Interfaces\Post\PostServiceInterface;
use App\Services\Impl\V1\Post\PostService;
use App\Services\Interfaces\Product\ProductCatalogueServiceInterface;
use App\Services\Impl\V1\Product\ProductCatalogueService;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Impl\V1\Product\ProductService;
use App\Services\Interfaces\Product\ProductBrandServiceInterface;
use App\Services\Impl\V1\Product\ProductBrandService;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use App\Services\Impl\V1\Product\ProductVariantService;
use App\Services\Interfaces\Product\ProductBatchServiceInterface;
use App\Services\Impl\V2\Product\ProductBatchService;
use App\Services\Interfaces\Product\PricingTierServiceInterface;
use App\Services\Impl\V1\Product\PricingTierService;
use App\Services\Interfaces\Image\ImageServiceInterface;
use App\Services\Impl\V1\Image\ImageService;
use App\Services\Interfaces\Translate\TranslateServiceInterface;
use App\Services\Impl\V1\Translate\TranslateService;
use App\Services\Interfaces\Log\LogServiceInterface;
use App\Services\Impl\V1\Log\LogService;
use App\Services\Interfaces\Router\RouterServiceInterface;
use App\Services\Impl\V1\Router\RouterService;
use App\Services\Interfaces\Customer\CustomerCatalogueServiceInterface;
use App\Services\Impl\V1\Customer\CustomerCatalogueService;
use App\Services\Interfaces\Customer\CustomerServiceInterface;
use App\Services\Impl\V1\Customer\CustomerService;
use App\Services\Interfaces\PaymentMethod\PaymentMethodServiceInterface;
use App\Services\Impl\V1\PaymentMethod\PaymentMethodService;
use App\Services\Interfaces\BankAccount\BankAccountServiceInterface;
use App\Services\Impl\V1\BankAccount\BankAccountService;
use App\Services\Interfaces\ManualPaymentMethod\ManualPaymentMethodServiceInterface;
use App\Services\Impl\V1\ManualPaymentMethod\ManualPaymentMethodService;
use App\Services\Interfaces\Setting\GeneralSettingServiceInterface;
use App\Services\Impl\V1\Setting\GeneralSettingService;
use App\Services\Interfaces\Setting\TaxSettingServiceInterface;
use App\Services\Impl\V1\Setting\TaxSettingService;
use App\Services\Interfaces\Setting\SystemServiceInterface;
use App\Services\Impl\V1\Setting\SystemService;
use App\Services\Interfaces\Promotion\PromotionServiceInterface;
use App\Services\Impl\V1\Promotion\PromotionService;
use App\Services\Interfaces\Voucher\VoucherServiceInterface;
use App\Services\Impl\V1\Voucher\VoucherService;
use App\Services\Interfaces\CashBook\CashReasonServiceInterface;
use App\Services\Impl\V1\CashBook\CashReasonService;
use App\Services\Interfaces\CashBook\CashTransactionServiceInterface;
use App\Services\Impl\V1\CashBook\CashTransactionService;
use App\Services\Interfaces\Checkout\CheckoutServiceInterface;
use App\Services\Impl\V1\Checkout\CheckoutService;
use App\Services\Interfaces\Order\OrderServiceInterface;
use App\Services\Impl\V1\Order\OrderService;
use App\Repositories\Order\OrderRepo;
use App\Events\Frontend\Checkout\OrderCreated;
use App\Listeners\Admin\ClearOrderDashboardCache;
use App\Repositories\BankAccount\BankAccountRepo;
use App\Services\Interfaces\Attribute\AttributeCatalogueServiceInterface;
use App\Services\Impl\V1\Attribute\AttributeCatalogueService;
use App\Services\Interfaces\Attribute\AttributeServiceInterface;
use App\Services\Impl\V1\Attribute\AttributeService;
use App\Services\Interfaces\Core\TagServiceInterface;
use App\Services\Impl\V1\Core\TagService;
use App\Services\Interfaces\Menu\MenuServiceInterface;
use App\Services\Impl\V1\Menu\MenuService;
use App\Services\Interfaces\Warehouse\WarehouseServiceInterface;
use App\Services\Impl\V1\Warehouse\WarehouseService;
use App\Repositories\Warehouse\WarehouseRepo;
use App\Services\Interfaces\Warehouse\SupplierServiceInterface;
use App\Services\Impl\V1\Warehouse\SupplierService;
use App\Repositories\Warehouse\SupplierRepo;
use App\Services\Interfaces\Warehouse\ImportOrderServiceInterface;
use App\Services\Impl\V1\Warehouse\ImportOrderService;
use App\Repositories\Warehouse\ImportOrderRepo;
use App\Services\Interfaces\Warehouse\ReturnImportOrderServiceInterface;
use App\Services\Impl\V1\Warehouse\ReturnImportOrderService;
use App\Repositories\Warehouse\ReturnImportOrderRepo;
use App\Repositories\Product\ProductBatchWarehouseRepo;
use App\Repositories\Product\ProductBatchStockLogRepo;
use App\Services\Interfaces\CashBook\CashBookEntryServiceInterface;
use App\Services\Impl\V1\CashBook\CashBookEntryService;
use App\Repositories\CashBook\CashBookEntryRepo;
use App\Repositories\Promotion\PromotionRepo;
use App\Repositories\Voucher\VoucherRepo;
use App\Repositories\CashBook\CashReasonRepo;
use App\Repositories\CashBook\CashTransactionRepo;
use App\Services\Interfaces\Banner\BannerServiceInterface;
use App\Services\Impl\V1\Banner\BannerService;
use App\Services\Interfaces\Banner\SlideServiceInterface;
use App\Services\Impl\V1\Banner\SlideService;
use App\Repositories\Banner\BannerRepo;
use App\Repositories\Banner\SlideRepo;
use App\Services\Interfaces\Review\ReviewServiceInterface;
use App\Services\Impl\V1\Review\ReviewService;
use App\Repositories\Review\ReviewRepo;
use App\Services\Interfaces\Widget\WidgetServiceInterface;
use App\Services\Impl\V1\Widget\WidgetService;
use App\Services\Interfaces\Cart\CartServiceInterface;
use App\Services\Impl\V1\Cart\CartService;
use App\Services\Interfaces\Inventory\InventoryServiceInterface;
use App\Services\Impl\V1\Inventory\InventoryService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(UserCatalogueServiceInterface::class, UserCatalogueService::class);
        $this->app->bind(UserServiceInterface::class, UserService::class);
        $this->app->bind(PermissionServiceInterface::class, PermissionService::class);
        $this->app->bind(LanguageServiceInterface::class, LanguageService::class);
        $this->app->bind(PostCatalogueServiceInterface::class, PostCatalogueService::class);
        $this->app->bind(PostServiceInterface::class, PostService::class);
        $this->app->bind(ProductCatalogueServiceInterface::class, ProductCatalogueService::class);
        $this->app->bind(ProductServiceInterface::class, ProductService::class);
        $this->app->bind(ProductBrandServiceInterface::class, ProductBrandService::class);
        $this->app->bind(ProductVariantServiceInterface::class, ProductVariantService::class);
        $this->app->bind(ProductBatchServiceInterface::class, ProductBatchService::class);
        $this->app->bind(PricingTierServiceInterface::class, PricingTierService::class);
        $this->app->bind(ImageServiceInterface::class, ImageService::class);
        $this->app->bind(TranslateServiceInterface::class, TranslateService::class);
        $this->app->bind(LogServiceInterface::class, LogService::class);
        $this->app->bind(RouterServiceInterface::class, RouterService::class);
        $this->app->bind(CustomerCatalogueServiceInterface::class, CustomerCatalogueService::class);
        $this->app->bind(CustomerServiceInterface::class, CustomerService::class);
        $this->app->bind(PaymentMethodServiceInterface::class, PaymentMethodService::class);
        $this->app->bind(BankAccountServiceInterface::class, BankAccountService::class);
        $this->app->bind(ManualPaymentMethodServiceInterface::class, ManualPaymentMethodService::class);
        $this->app->bind(BankAccountRepo::class);
        $this->app->bind(GeneralSettingServiceInterface::class, GeneralSettingService::class);
        $this->app->bind(TaxSettingServiceInterface::class, TaxSettingService::class);
        $this->app->bind(SystemServiceInterface::class, SystemService::class);
        $this->app->bind(PromotionServiceInterface::class, PromotionService::class);
        $this->app->bind(VoucherServiceInterface::class, VoucherService::class);
        $this->app->bind(CheckoutServiceInterface::class, CheckoutService::class);
        $this->app->bind(AttributeCatalogueServiceInterface::class, AttributeCatalogueService::class);
        $this->app->bind(AttributeServiceInterface::class, AttributeService::class);
        $this->app->bind(TagServiceInterface::class, TagService::class);
        
        // Menu
        $this->app->bind(MenuServiceInterface::class, MenuService::class);
        
        $this->app->bind(WarehouseServiceInterface::class, WarehouseService::class);
        $this->app->bind(WarehouseRepo::class);
        
        $this->app->bind(SupplierServiceInterface::class, SupplierService::class);
        $this->app->bind(SupplierRepo::class);
        
        $this->app->bind(ImportOrderServiceInterface::class, ImportOrderService::class);
        $this->app->bind(ImportOrderRepo::class);

        $this->app->bind(ReturnImportOrderServiceInterface::class, ReturnImportOrderService::class);
        $this->app->bind(ReturnImportOrderRepo::class);
        
        $this->app->bind(ProductBatchWarehouseRepo::class);
        $this->app->bind(ProductBatchStockLogRepo::class);

        $this->app->bind(CashBookEntryServiceInterface::class, CashBookEntryService::class);
        $this->app->bind(CashBookEntryRepo::class);
        
        $this->app->bind(PromotionRepo::class);
        $this->app->bind(VoucherRepo::class);

        // Cash Book Module
        $this->app->bind(CashReasonServiceInterface::class, CashReasonService::class);
        $this->app->bind(CashTransactionServiceInterface::class, CashTransactionService::class);
        $this->app->bind(CashReasonRepo::class);
        $this->app->bind(CashTransactionRepo::class);

        // Banner/Slide Module
        $this->app->bind(BannerServiceInterface::class, BannerService::class);
        $this->app->bind(SlideServiceInterface::class, SlideService::class);
        $this->app->bind(BannerRepo::class);
        $this->app->bind(SlideRepo::class);

        // Review Module
        $this->app->bind(ReviewServiceInterface::class, ReviewService::class);
        $this->app->bind(ReviewRepo::class);

        // Widget Module - Version 1 (stable)
        $this->app->bind(WidgetServiceInterface::class, WidgetService::class);
        $this->app->bind(CartServiceInterface::class, CartService::class);

        // Order Module
        $this->app->bind(OrderServiceInterface::class, OrderService::class);
        $this->app->bind(OrderRepo::class);

        // Inventory Module
        $this->app->bind(InventoryServiceInterface::class, InventoryService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        JsonResource::withoutWrapping();

        Event::listen(
            Registered::class,
            SendCustomerWelcomeEmail::class,
        );

        Event::listen(
            \App\Events\Frontend\Checkout\OrderCreated::class,
            \App\Listeners\Admin\ClearOrderDashboardCache::class,
        );

        Event::listen(
            \App\Events\Admin\Order\OrderUpdated::class,
            \App\Listeners\Admin\ClearOrderDashboardCache::class,
        );
    }
}
