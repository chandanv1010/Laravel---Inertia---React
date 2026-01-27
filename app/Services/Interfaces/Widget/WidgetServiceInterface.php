<?php

namespace App\Services\Interfaces\Widget;

use Illuminate\Http\Request;

interface WidgetServiceInterface
{
    public function paginate(Request $request);
    public function create($request);
    public function update($id, $request);
    public function delete($id);
    public function show(int $id);
    public function searchModel($model, $keyword, $limit = 10);
    public function getData($keyword);
    public function getMultipleData(array $keywords): array;
    public function getCategoryWidgetData($keyword);
}
