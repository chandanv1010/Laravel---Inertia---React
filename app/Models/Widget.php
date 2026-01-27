<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasQuery;

class Widget extends Model
{
    use HasFactory, SoftDeletes, HasQuery;

    protected $fillable = [
        'name',
        'keyword',
        'description',
        'album',
        'model_id',
        'model',
        'options',
        'content',
        'short_code',
        'publish',
    ];

    protected $casts = [
        'album' => 'array',
        'model_id' => 'array',
        'options' => 'array',
    ];

    /**
     * Get the items associated with this widget
     */
    public function getItemsAttribute()
    {
        if (empty($this->model) || empty($this->model_id)) {
            return collect([]);
        }

        $modelClass = $this->model;
        if (!class_exists($modelClass)) {
            return collect([]);
        }

        $ids = $this->model_id;
        $isCatalogue = str_contains($modelClass, 'Catalogue');
        $isProductCatalogue = $modelClass === 'App\\Models\\ProductCatalogue';
        
        // Use cached loading for ProductCatalogue
        if ($isProductCatalogue) {
            $items = ProductCatalogue::getCachedWithLanguages($ids, true);
        } else {
            $query = $modelClass::whereIn('id', $ids);
            if ($isCatalogue) {
                $query->with('languages');
            }
            $items = $query->get();
        }

        $languageId = config('app.language_id', 1);
        
        return $items->sortBy(function ($model) use ($ids) {
            return array_search($model->id, $ids);
        })->values()->map(function ($item) use ($isCatalogue, $isProductCatalogue, $languageId) {
            $name = '';
            $canonical = null;
            
            if ($isCatalogue) {
                $langPivot = $item->languages->firstWhere('id', $languageId);
                if ($langPivot && isset($langPivot->pivot)) {
                    $name = $langPivot->pivot->name ?? '';
                    $canonical = $langPivot->pivot->canonical ?? null;
                }
                if (empty($name) && $item->languages->isNotEmpty()) {
                    $firstLang = $item->languages->first();
                    $name = $firstLang->pivot->name ?? '';
                    $canonical = $canonical ?? ($firstLang->pivot->canonical ?? null);
                }
            } else {
                if (method_exists($item, 'languages') && $item->languages) {
                    $langPivot = $item->languages->firstWhere('id', $languageId);
                    if ($langPivot && isset($langPivot->pivot)) {
                        $name = $langPivot->pivot->name ?? $item->name ?? '';
                    }
                } else {
                    $name = $item->name ?? '';
                }
            }
            
            $result = [
                'id' => $item->id,
                'name' => $name,
                'image' => $item->image ?? null,
            ];
            
            if ($isProductCatalogue) {
                $result['canonical'] = $canonical;
                $result['product_count'] = $item->products_count ?? 0;
            }
            
            return $result;
        });
    }
}
