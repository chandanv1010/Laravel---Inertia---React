<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class SupplierResource extends JsonResource
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
            'name' => $this->name,
            'code' => $this->code,
            'email' => $this->email,
            'website' => $this->website,
            'phone' => $this->phone,
            'tax_code' => $this->tax_code,
            'fax' => $this->fax,
            'address' => $this->address,
            'responsible_user_id' => $this->responsible_user_id,
            'responsibleUser' => $this->whenLoaded('responsibleUser', function(){
                return $this->responsibleUser;
            }),
            'publish' => $this->publish,
            'creators' => $this->whenLoaded('creators', function(){
                return $this->creators;
            }),
            'created_at' => Carbon::parse($this->created_at)->format('d-m-Y'),
            'updated_at' => Carbon::parse($this->updated_at)->format('d-m-Y'),
        ];
    }
}
