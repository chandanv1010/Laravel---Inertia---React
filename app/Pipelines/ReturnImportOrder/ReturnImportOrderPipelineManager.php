<?php

namespace App\Pipelines\ReturnImportOrder;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use App\Pipelines\ReturnImportOrder\Pipes\AbstractReturnImportOrderPipe;
use App\Pipelines\ReturnImportOrder\Pipes\ValidateReturnItemsPipe;
use App\Pipelines\ReturnImportOrder\Pipes\PrepareModelDataPipe;
use App\Pipelines\ReturnImportOrder\Pipes\SaveReturnOrderPipe;
use App\Pipelines\ReturnImportOrder\Pipes\SaveReturnItemsPipe;
use App\Pipelines\ReturnImportOrder\Pipes\SubtractWarehouseStocksPipe;
use App\Pipelines\ReturnImportOrder\Pipes\SubtractBatchStocksPipe;
use App\Pipelines\ReturnImportOrder\Pipes\UpdateStatusPipe;
use App\Pipelines\ReturnImportOrder\Pipes\CreateHistoryPipe;
use App\Pipelines\ReturnImportOrder\Pipes\ClearCachePipe;
use App\Services\Interfaces\Warehouse\ReturnImportOrderServiceInterface;
use App\Services\Interfaces\Product\ProductServiceInterface;
use App\Services\Interfaces\Product\ProductVariantServiceInterface;
use Illuminate\Pipeline\Pipeline;

class ReturnImportOrderPipelineManager
{
    protected ReturnImportOrderServiceInterface $service;
    protected ProductServiceInterface $productService;
    protected ProductVariantServiceInterface $variantService;
    
    protected array $pipes = [
        'validate_items' => ValidateReturnItemsPipe::class,
        'prepare_model_data' => PrepareModelDataPipe::class,
        'save_order' => SaveReturnOrderPipe::class,
        'save_items' => SaveReturnItemsPipe::class,
        'subtract_warehouse_stocks' => SubtractWarehouseStocksPipe::class,
        'subtract_batch_stocks' => SubtractBatchStocksPipe::class,
        'update_status' => UpdateStatusPipe::class,
        'create_history' => CreateHistoryPipe::class,
        'clear_cache' => ClearCachePipe::class,
    ];
    
    public function __construct(
        ReturnImportOrderServiceInterface $service,
        ProductServiceInterface $productService,
        ProductVariantServiceInterface $variantService
    ) {
        $this->service = $service;
        $this->productService = $productService;
        $this->variantService = $variantService;
    }
    
    public function process(ReturnImportOrderPayload $payload, string $action = 'return_by_order'): ReturnImportOrderPayload
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
            'return_by_order' => $this->getReturnByOrderPipes(),
            'return_without_order' => $this->getReturnWithoutOrderPipes(),
            'export_to_stock' => $this->getExportToStockPipes(),
            default => $this->getReturnByOrderPipes(),
        };
    }
    
    protected function getReturnByOrderPipes(): array
    {
        // Flow: validate -> prepare -> save order -> save items -> subtract stocks -> update status -> history -> cache
        // SubtractWarehouseStocksPipe phải chạy TRƯỚC SubtractBatchStocksPipe
        // để xử lý sản phẩm không có batch trước
        // Sau đó SubtractBatchStocksPipe sẽ sync stock từ batch cho sản phẩm có batch
        return [
            new ValidateReturnItemsPipe($this->service, $this->productService, $this->variantService),
            new PrepareModelDataPipe($this->service),
            new SaveReturnOrderPipe($this->service),
            new SaveReturnItemsPipe($this->service),
            new SubtractWarehouseStocksPipe($this->service, $this->productService, $this->variantService),
            new SubtractBatchStocksPipe($this->service, $this->productService, $this->variantService),
            new UpdateStatusPipe($this->service),
            new CreateHistoryPipe($this->service),
            new ClearCachePipe($this->service),
        ];
    }
    
    protected function getReturnWithoutOrderPipes(): array
    {
        // Flow tương tự return_by_order
        return [
            new ValidateReturnItemsPipe($this->service, $this->productService, $this->variantService),
            new PrepareModelDataPipe($this->service),
            new SaveReturnOrderPipe($this->service),
            new SaveReturnItemsPipe($this->service),
            new SubtractWarehouseStocksPipe($this->service, $this->productService, $this->variantService),
            new SubtractBatchStocksPipe($this->service, $this->productService, $this->variantService),
            new UpdateStatusPipe($this->service),
            new CreateHistoryPipe($this->service),
            new ClearCachePipe($this->service),
        ];
    }
    
    protected function getExportToStockPipes(): array
    {
        // Flow: validate -> subtract stocks -> update status -> history -> cache
        // Không cần prepare, save order, save items vì đơn đã tồn tại
        return [
            new ValidateReturnItemsPipe($this->service, $this->productService, $this->variantService),
            new SubtractWarehouseStocksPipe($this->service, $this->productService, $this->variantService),
            new SubtractBatchStocksPipe($this->service, $this->productService, $this->variantService),
            new UpdateStatusPipe($this->service),
            new CreateHistoryPipe($this->service),
            new ClearCachePipe($this->service),
        ];
    }
}

