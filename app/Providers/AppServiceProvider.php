<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Resources\Json\JsonResource;
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
        $this->app->bind(\App\Repositories\BankAccount\BankAccountRepo::class);
        $this->app->bind(GeneralSettingServiceInterface::class, GeneralSettingService::class);
        $this->app->bind(TaxSettingServiceInterface::class, TaxSettingService::class);
        $this->app->bind(SystemServiceInterface::class, SystemService::class);
        $this->app->bind(PromotionServiceInterface::class, PromotionService::class);
        $this->app->bind(VoucherServiceInterface::class, VoucherService::class);
        $this->app->bind(\App\Services\Interfaces\Attribute\AttributeCatalogueServiceInterface::class, \App\Services\Impl\V1\Attribute\AttributeCatalogueService::class);
        $this->app->bind(\App\Services\Interfaces\Attribute\AttributeServiceInterface::class, \App\Services\Impl\V1\Attribute\AttributeService::class);
        $this->app->bind(\App\Services\Interfaces\Core\TagServiceInterface::class, \App\Services\Impl\V1\Core\TagService::class);
        
        // Menu
        $this->app->bind(\App\Services\Interfaces\Menu\MenuServiceInterface::class, \App\Services\Impl\V1\Menu\MenuService::class);
        $this->app->bind(
            'App\Services\Interfaces\Warehouse\WarehouseServiceInterface',
            'App\Services\Impl\V1\Warehouse\WarehouseService'
        );

        $this->app->bind(
            'App\Repositories\Warehouse\WarehouseRepo'
        );
        
        $this->app->bind(
            'App\Services\Interfaces\Warehouse\SupplierServiceInterface',
            'App\Services\Impl\V1\Warehouse\SupplierService'
        );

        $this->app->bind(
            'App\Repositories\Warehouse\SupplierRepo'
        );
        
        $this->app->bind(
            'App\Services\Interfaces\Warehouse\ImportOrderServiceInterface',
            'App\Services\Impl\V1\Warehouse\ImportOrderService'
        );

        $this->app->bind(
            'App\Repositories\Warehouse\ImportOrderRepo'
        );

        $this->app->bind(
            'App\Services\Interfaces\Warehouse\ReturnImportOrderServiceInterface',
            'App\Services\Impl\V1\Warehouse\ReturnImportOrderService'
        );

        $this->app->bind(
            'App\Repositories\Warehouse\ReturnImportOrderRepo'
        );
        
        $this->app->bind(
            \App\Repositories\Product\ProductBatchWarehouseRepo::class
        );

        $this->app->bind(
            \App\Repositories\Product\ProductBatchStockLogRepo::class
        );

        $this->app->bind(
            \App\Services\Interfaces\CashBook\CashBookEntryServiceInterface::class,
            \App\Services\Impl\V1\CashBook\CashBookEntryService::class
        );

        $this->app->bind(
            \App\Repositories\CashBook\CashBookEntryRepo::class
        );
        
        $this->app->bind(
            'App\Repositories\Promotion\PromotionRepo'
        );
        
        $this->app->bind(
            'App\Repositories\Voucher\VoucherRepo'
        );

        // Cash Book Module
        $this->app->bind(CashReasonServiceInterface::class, CashReasonService::class);
        $this->app->bind(CashTransactionServiceInterface::class, CashTransactionService::class);
        $this->app->bind(\App\Repositories\CashBook\CashReasonRepo::class);
        $this->app->bind(\App\Repositories\CashBook\CashTransactionRepo::class);

        // Banner/Slide Module
        $this->app->bind(
            \App\Services\Interfaces\Banner\BannerServiceInterface::class,
            \App\Services\Impl\V1\Banner\BannerService::class
        );
        $this->app->bind(
            \App\Services\Interfaces\Banner\SlideServiceInterface::class,
            \App\Services\Impl\V1\Banner\SlideService::class
        );
        $this->app->bind(\App\Repositories\Banner\BannerRepo::class);
        $this->app->bind(\App\Repositories\Banner\SlideRepo::class);

        // Review Module
        $this->app->bind(
            \App\Services\Interfaces\Review\ReviewServiceInterface::class,
            \App\Services\Impl\V1\Review\ReviewService::class
        );
        $this->app->bind(\App\Repositories\Review\ReviewRepo::class);

        // Widget Module - Version 1 (stable)
        $this->app->bind(
            \App\Services\Interfaces\Widget\WidgetServiceInterface::class,
            \App\Services\Impl\V1\Widget\WidgetService::class
        );

        // Cart Module
        $this->app->bind(
            \App\Services\Interfaces\Cart\CartServiceInterface::class,
            \App\Services\Impl\V1\Cart\CartService::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        JsonResource::withoutWrapping();
    }
}
