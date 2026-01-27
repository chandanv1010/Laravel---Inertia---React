<?php

namespace App\Pipelines\ImportOrder;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use App\Pipelines\ImportOrder\Pipes\AbstractImportOrderPipe;
use App\Pipelines\ImportOrder\Pipes\PrepareModelDataPipe;
use App\Pipelines\ImportOrder\Pipes\ValidateItemsPipe;
use App\Pipelines\ImportOrder\Pipes\SaveOrderPipe;
use App\Pipelines\ImportOrder\Pipes\SaveItemsPipe;
use App\Pipelines\ImportOrder\Pipes\UpdateWarehouseStocksPipe;
use App\Pipelines\ImportOrder\Pipes\UpdateBatchStocksPipe;
use App\Pipelines\ImportOrder\Pipes\CreateHistoryPipe;
use App\Pipelines\ImportOrder\Pipes\TrackPaymentStatusPipe;
use App\Pipelines\ImportOrder\Pipes\ClearCachePipe;
use App\Services\Interfaces\Warehouse\ImportOrderServiceInterface;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use Illuminate\Pipeline\Pipeline;

class ImportOrderPipelineManager
{
    protected ImportOrderServiceInterface $service;
    protected ProductServiceInterface $productService;
    protected ProductVariantServiceInterface $variantService;
    
    protected array $pipes = [
        'prepare_model_data' => PrepareModelDataPipe::class,
        'validate_items' => ValidateItemsPipe::class,
        'save_order' => SaveOrderPipe::class,
        'save_items' => SaveItemsPipe::class,
        'update_warehouse_stocks' => UpdateWarehouseStocksPipe::class,
        'update_batch_stocks' => UpdateBatchStocksPipe::class,
        'create_history' => CreateHistoryPipe::class,
        'track_payment_status' => TrackPaymentStatusPipe::class,
        'clear_cache' => ClearCachePipe::class,
    ];
    
    public function __construct(
        ImportOrderServiceInterface $service,
        ProductServiceInterface $productService,
        ProductVariantServiceInterface $variantService
    ) {
        $this->service = $service;
        $this->productService = $productService;
        $this->variantService = $variantService;
    }
    
    public function process(ImportOrderPayload $payload, string $action = 'save'): ImportOrderPayload
    {
        // Set service reference in payload
        $payload->setService($this->service);
        
        $pipes = $this->getPipesForAction($action);
        
        return app(Pipeline::class)
            ->send($payload)
            ->through($pipes)
            ->thenReturn();
    }
    
    protected function getPipesForAction(string $action): array
    {
        return match($action) {
            'save' => $this->getSavePipes(),
            'import_to_stock' => $this->getImportToStockPipes(),
            'cancel' => $this->getCancelPipes(),
            'restore' => $this->getRestorePipes(),
            default => $this->getSavePipes(),
        };
    }
    
    protected function getSavePipes(): array
    {
        // Skip PrepareModelDataPipe vì đã làm ở prepareModelData()
        // Skip SaveOrderPipe vì đã save ở BaseService::saveModel()
        // UpdateWarehouseStocksPipe phải chạy TRƯỚC UpdateBatchStocksPipe
        // để xử lý sản phẩm không có batch trước
        // Sau đó UpdateBatchStocksPipe sẽ sync stock từ batch cho sản phẩm có batch
        return [
            new ValidateItemsPipe($this->service, $this->productService, $this->variantService),
            new SaveItemsPipe($this->service),
            new UpdateWarehouseStocksPipe($this->service, $this->productService, $this->variantService),
            new UpdateBatchStocksPipe($this->service, $this->productService, $this->variantService),
            new CreateHistoryPipe($this->service),
            new TrackPaymentStatusPipe($this->service),
            new ClearCachePipe($this->service),
        ];
    }
    
    protected function getImportToStockPipes(): array
    {
        // Chỉ cần: validate, update stocks, create history, clear cache
        // UpdateWarehouseStocksPipe phải chạy TRƯỚC UpdateBatchStocksPipe
        return [
            new ValidateItemsPipe($this->service, $this->productService, $this->variantService),
            new UpdateWarehouseStocksPipe($this->service, $this->productService, $this->variantService),
            new UpdateBatchStocksPipe($this->service, $this->productService, $this->variantService),
            new CreateHistoryPipe($this->service),
            new ClearCachePipe($this->service),
        ];
    }
    
    protected function getCancelPipes(): array
    {
        // Chỉ cần: create history, clear cache
        return [
            new CreateHistoryPipe($this->service),
            new ClearCachePipe($this->service),
        ];
    }
    
    protected function getRestorePipes(): array
    {
        // Chỉ cần: create history, clear cache
        return [
            new CreateHistoryPipe($this->service),
            new ClearCachePipe($this->service),
        ];
    }
}
