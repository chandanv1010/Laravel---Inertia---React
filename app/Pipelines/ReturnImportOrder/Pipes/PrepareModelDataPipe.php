<?php

namespace App\Pipelines\ReturnImportOrder\Pipes;

use App\Pipelines\ReturnImportOrder\Payloads\ReturnImportOrderPayload;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PrepareModelDataPipe extends AbstractReturnImportOrderPipe
{
    public function handle(ReturnImportOrderPayload $payload, \Closure $next): ReturnImportOrderPayload
    {
        // Skip nếu đang export_to_stock (đơn đã tồn tại)
        if ($payload->returnType === 'export_to_stock') {
            return $next($payload);
        }
        
        $request = $payload->request;
        $repository = $this->getRepository();
        
        // Get fillable fields
        $fillable = $repository->getFillable();
        $payload->modelData = $request->only($fillable);
        $payload->modelData['user_id'] = Auth::id();
        
        // Generate code if needed
        if (empty($payload->modelData['code'])) {
            $payload->modelData['code'] = $this->generateReturnCode($repository);
        } elseif(isset($payload->modelData['code'])) {
            $payload->modelData['code'] = strtoupper($payload->modelData['code']);
        }
        
        // Handle return_costs - convert array to JSON
        if ($request->has('return_costs') && is_array($request->input('return_costs'))) {
            $payload->modelData['return_costs'] = json_encode($request->input('return_costs'));
        }
        
        // Handle tags - convert array to JSON if needed
        if ($request->has('tags') && is_array($request->input('tags'))) {
            $payload->modelData['tags'] = json_encode($request->input('tags'));
        }
        
        // Set return_type
        if ($payload->returnType === 'by_order') {
            $payload->modelData['return_type'] = 'by_order';
            $payload->modelData['import_order_id'] = $payload->importOrderId;
            
            // Set supplier_id và warehouse_id từ importOrder
            if ($payload->importOrder) {
                $payload->modelData['supplier_id'] = $payload->importOrder->supplier_id;
                if (empty($payload->modelData['warehouse_id'])) {
                    $payload->modelData['warehouse_id'] = $payload->importOrder->warehouse_id;
                }
            }
            
            // Force export_to_stock = true cho by_order
            $payload->modelData['export_to_stock'] = true;
            $payload->exportToStock = true;
        } elseif ($payload->returnType === 'without_order') {
            $payload->modelData['return_type'] = 'without_order';
            $payload->modelData['import_order_id'] = null;
            
            // Set export_to_stock từ request
            $payload->modelData['export_to_stock'] = $request->boolean('export_to_stock', true);
            $payload->exportToStock = $payload->modelData['export_to_stock'];
        }
        
        // Set status: pending (sẽ update thành completed nếu export_to_stock = true)
        $payload->modelData['status'] = 'pending';
        
        // Remove items from modelData (handled separately)
        unset($payload->modelData['items']);
        unset($payload->modelData['export_to_stock']);
        
        // Set warehouseId trong payload
        if (isset($payload->modelData['warehouse_id'])) {
            $payload->warehouseId = $payload->modelData['warehouse_id'];
        }
        
        Log::info('PrepareModelDataPipe - Model data prepared', [
            'return_type' => $payload->returnType,
            'export_to_stock' => $payload->exportToStock,
            'warehouse_id' => $payload->warehouseId,
        ]);
        
        return $next($payload);
    }
    
    protected function generateReturnCode($repository): string
    {
        $lastOrder = $repository->getModel()
            ->where('code', 'like', 'TH%')
            ->orderBy('id', 'desc')
            ->first();
        
        $nextNumber = 1;
        if ($lastOrder && $lastOrder->code) {
            $lastNumber = (int) preg_replace('/^TH/i', '', $lastOrder->code);
            $nextNumber = $lastNumber + 1;
        }
        
        return 'TH' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
    }
}

