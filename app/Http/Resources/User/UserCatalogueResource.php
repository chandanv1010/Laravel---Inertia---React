<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class UserCatalogueResource extends JsonResource
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
            'creator' => $this->whenLoaded('creators', function(){
                return $this->creators->name;
            }),
            'name' => $this->name,
            'canonical' => $this->canonical,
            'description' => $this->description,
            'created_at' => Carbon::parse($this->created_at)->format('d-m-Y H:i'),
            'updated_at' => Carbon::parse($this->updated_at)->format('d-m-Y H:i'),
        ];
    }
}
