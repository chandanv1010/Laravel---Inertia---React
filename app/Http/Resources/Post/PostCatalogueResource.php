<?php

namespace App\Http\Resources\Post;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class PostCatalogueResource extends JsonResource
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
            'parent_id' => $this->parent_id,
            'level' => $this->level,
            'order' => $this->order,
            'publish' => $this->publish,
            'type' => $this->type,
            'robots' => $this->robots,
            'auto_translate' => $this->auto_translate ?? false,
            'creators' => $this->whenLoaded('creators', function(){
                return $this->creators;
            }),
            'album' => $this->album,
            'image' => $this->image,
            'current_language' => $this->getCurrentLanguage(),
            'languages' => $this->whenLoaded('languages', function(){
                return $this->languages->map(function($language) {
                    return [
                        'id' => $language->id,
                        'name' => $language->name,
                        'canonical' => $language->canonical,
                        'image' => $language->image,
                        'pivot' => [
                            'name' => $language->pivot->name ?? null,
                            'canonical' => $language->pivot->canonical ?? null,
                        ]
                    ];
                });
            }),
            // Translation status - danh sách language IDs mà post_catalogue đã dịch
            'translated_language_ids' => $this->whenLoaded('languages', function(){
                return $this->languages->pluck('id')->toArray();
            }, []),
            'created_at' => Carbon::parse($this->created_at)->format('d-m-Y'),
            'updated_at' => Carbon::parse($this->updated_at)->format('d-m-Y'),
        ];
    }

    /**
     * Get current language data with fallback
     */
    protected function getCurrentLanguage(): ?array
    {
        // Try current_languages first
        if ($this->relationLoaded('current_languages') && $this->current_languages->isNotEmpty()) {
            $language = $this->current_languages->first();
            if ($language && $language->pivot) {
                return [
                    'name' => $language->pivot->name ?? '',
                    'description' => $language->pivot->description ?? null,
                    'content' => $language->pivot->content ?? null,
                    'canonical' => $language->pivot->canonical ?? null,
                    'meta_title' => $language->pivot->meta_title ?? null,
                    'meta_keyword' => $language->pivot->meta_keyword ?? null,
                    'meta_description' => $language->pivot->meta_description ?? null,
                ];
            }
        }
        
        // Fallback to languages if current_languages is empty
        if ($this->relationLoaded('languages') && $this->languages->isNotEmpty()) {
            $languageId = config('app.language_id');
            $language = $this->languages->firstWhere('id', $languageId) ?? $this->languages->first();
            if ($language && $language->pivot) {
                return [
                    'name' => $language->pivot->name ?? '',
                    'description' => $language->pivot->description ?? null,
                    'content' => $language->pivot->content ?? null,
                    'canonical' => $language->pivot->canonical ?? null,
                    'meta_title' => $language->pivot->meta_title ?? null,
                    'meta_keyword' => $language->pivot->meta_keyword ?? null,
                    'meta_description' => $language->pivot->meta_description ?? null,
                ];
            }
        }
        
        return null;
    }
}
