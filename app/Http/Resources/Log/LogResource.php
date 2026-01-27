<?php

namespace App\Http\Resources\Log;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class LogResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'action' => $this->action,
            'module' => $this->module,
            'record_id' => $this->record_id,
            'record_type' => $this->record_type,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'description' => $this->description,
            'old_data' => $this->old_data,
            'new_data' => $this->new_data,
            'changes' => $this->changes,
            'status' => $this->status,
            'error_message' => $this->error_message,
            'route' => $this->route,
            'method' => $this->method,
            'created_at' => Carbon::parse($this->created_at)->format('d-m-Y H:i'),
            'updated_at' => Carbon::parse($this->updated_at)->format('d-m-Y H:i'),
            // User relation
            'user' => $this->whenLoaded('user', function() {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ];
            }),
        ];
    }
}
