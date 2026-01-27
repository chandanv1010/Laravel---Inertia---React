<?php

namespace App\Http\Resources\Post;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class PostResource extends JsonResource
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
                   'post_catalogue_id' => $this->post_catalogue_id,
                   'order' => $this->order ?? 0,
                   'publish' => $this->publish ?? '1',
                   'image' => $this->image,
            'album' => $this->album, // Cần cho save page
            'robots' => $this->robots ?? null, // Cần cho save page
            'auto_translate' => $this->auto_translate ?? false,
            'created_at' => Carbon::parse($this->created_at)->format('d-m-Y'),
            'updated_at' => Carbon::parse($this->updated_at)->format('d-m-Y'),
            // Language fields - trả về trong current_language object (giống PostCatalogueResource)
            'current_language' => $language ? [
                'name' => $language->pivot->name ?? '',
                'description' => $language->pivot->description ?? null,
                'content' => $language->pivot->content ?? null,
                'canonical' => $language->pivot->canonical ?? null,
                'meta_title' => $language->pivot->meta_title ?? null,
                'meta_keyword' => $language->pivot->meta_keyword ?? null,
                'meta_description' => $language->pivot->meta_description ?? null,
            ] : null,
            // Legacy flat structure (giữ lại để tương thích nếu có code cũ đang dùng)
            'name' => $language?->pivot->name ?? '',
            'description' => $language?->pivot->description ?? null,
            'content' => $language?->pivot->content ?? null,
            'canonical' => $language?->pivot->canonical ?? null,
            'meta_title' => $language?->pivot->meta_title ?? null,
            'meta_keyword' => $language?->pivot->meta_keyword ?? null,
            'meta_description' => $language?->pivot->meta_description ?? null,
            // Creators - chỉ trả về id và name
            'creator_id' => $this->whenLoaded('creators', fn() => $this->creators->id ?? null),
            'creator_name' => $this->whenLoaded('creators', fn() => $this->creators->name ?? null),
            // Post catalogues - Service đã load hết, chỉ trả về
            'post_catalogues' => $this->whenLoaded('post_catalogues', function(){
                return $this->post_catalogues->map(function($catalogue){
                    // Service đã load current_languages cho catalogue, chỉ lấy dữ liệu
                    $catalogueName = $catalogue->relationLoaded('current_languages') && $catalogue->current_languages->isNotEmpty()
                        ? $catalogue->current_languages->first()?->pivot->name
                        : ($catalogue->relationLoaded('languages') && $catalogue->languages->isNotEmpty()
                            ? $catalogue->languages->first()?->pivot->name
                            : 'N/A');
                    
                    return [
                        'id' => $catalogue->id,
                        'name' => $catalogueName ?? 'N/A'
                    ];
                });
            }),
            // Translation status - danh sách language IDs mà post đã dịch
            'translated_language_ids' => $this->whenLoaded('languages', function(){
                return $this->languages->pluck('id')->toArray();
            }, []),
        ];
    }
}
