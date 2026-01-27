<?php

namespace App\Http\Resources\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class ProductBrandResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Service layer đã load hết dữ liệu, chỉ cần lấy từ relation đã loaded
        $language = $this->relationLoaded('current_languages') && $this->current_languages->isNotEmpty()
            ? $this->current_languages->first()
            : ($this->relationLoaded('languages') && $this->languages->isNotEmpty()
                ? $this->languages->first()
                : null);
        
        return [
            'id' => $this->id,
            'order' => $this->order ?? 0,
            'publish' => $this->publish ?? '1',
            'image' => $this->image,
            'album' => $this->album,
            'robots' => $this->robots ?? null,
            'auto_translate' => $this->auto_translate ?? false,
            'created_at' => Carbon::parse($this->created_at)->format('d-m-Y'),
            'updated_at' => Carbon::parse($this->updated_at)->format('d-m-Y'),
            // Language fields
            'current_language' => $language ? [
                'name' => $language->pivot->name ?? '',
                'description' => $language->pivot->description ?? null,
                'content' => $language->pivot->content ?? null,
                'canonical' => $language->pivot->canonical ?? null,
                'meta_title' => $language->pivot->meta_title ?? null,
                'meta_keyword' => $language->pivot->meta_keyword ?? null,
                'meta_description' => $language->pivot->meta_description ?? null,
            ] : null,
            // Legacy flat structure
            'name' => $language?->pivot->name ?? '',
            'description' => $language?->pivot->description ?? null,
            'content' => $language?->pivot->content ?? null,
            'canonical' => $language?->pivot->canonical ?? null,
            'meta_title' => $language?->pivot->meta_title ?? null,
            'meta_keyword' => $language?->pivot->meta_keyword ?? null,
            'meta_description' => $language?->pivot->meta_description ?? null,
            // Creators
            'creator_id' => $this->whenLoaded('creators', fn() => $this->creators->id ?? null),
            'creator_name' => $this->whenLoaded('creators', fn() => $this->creators->name ?? null),
            // Translation status
            'translated_language_ids' => $this->whenLoaded('languages', function(){
                return $this->languages->pluck('id')->toArray();
            }, []),
        ];
    }
}

