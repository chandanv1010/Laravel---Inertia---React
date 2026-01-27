<?php

namespace App\Pipelines\ImportOrder\Pipes;

use App\Pipelines\ImportOrder\Payloads\ImportOrderPayload;
use Illuminate\Support\Facades\Auth;

class PrepareModelDataPipe extends AbstractImportOrderPipe
{
    public function handle(ImportOrderPayload $payload, \Closure $next): ImportOrderPayload
    {
        $request = $payload->request;
        $repository = $this->getRepository();
        
        // Get fillable fields
        $fillable = $repository->getFillable();
        $payload->modelData = $request->only($fillable);
        $payload->modelData['user_id'] = Auth::id();
        
        // Generate code if needed (only for new orders)
        if (empty($payload->modelData['code']) && !$payload->order?->id) {
            $payload->modelData['code'] = $this->generateCode($repository);
        } elseif(isset($payload->modelData['code'])) {
            $payload->modelData['code'] = strtoupper($payload->modelData['code']);
        }
        
        // Handle import_costs - convert array to JSON
        if ($request->has('import_costs') && is_array($request->input('import_costs'))) {
            $payload->modelData['import_costs'] = json_encode($request->input('import_costs'));
        }
        
        // Set status based on import_to_stock
        $importToStock = $request->boolean('import_to_stock', false);
        if (!$payload->order || !$payload->order->id) {
            // Tạo mới: set status dựa trên import_to_stock
            $payload->modelData['status'] = $importToStock ? 'completed' : 'pending';
        } elseif ($request->has('import_to_stock')) {
            // Update và có thay đổi import_to_stock: cập nhật status
            $payload->modelData['status'] = $importToStock ? 'completed' : 'pending';
        }
        
        // Remove items from modelData (handled separately)
        unset($payload->modelData['items']);
        unset($payload->modelData['import_to_stock']);
        
        return $next($payload);
    }
    
    protected function generateCode($repository): string
    {
        $lastOrder = $repository->getModel()
            ->where('code', 'like', 'AT%')
            ->orderBy('id', 'desc')
            ->first();
        
        $nextNumber = 1;
        if ($lastOrder && $lastOrder->code) {
            $lastNumber = (int) preg_replace('/^AT/i', '', $lastOrder->code);
            $nextNumber = $lastNumber + 1;
        }
        
        return 'AT' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
    }
}
