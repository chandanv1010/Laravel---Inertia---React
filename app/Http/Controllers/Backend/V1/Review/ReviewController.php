<?php

namespace App\Http\Controllers\Backend\V1\Review;

use App\Http\Controllers\Backend\BaseController;
use App\Services\Interfaces\Review\ReviewServiceInterface as ReviewService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ReviewController extends BaseController
{
    protected $reviewService;

    public function __construct(ReviewService $reviewService)
    {
        $this->reviewService = $reviewService;
    }

    public function index(Request $request)
    {
        $reviews = $this->reviewService->paginate($request);
        return Inertia::render('backend/review/index', [
            'reviews' => $reviews,
            'filters' => $request->all(['keyword'])
        ]);
    }

    public function create()
    {
        return Inertia::render('backend/review/save', [
             'config' => [
                'method' => 'create'
             ]
        ]);
    }

    public function store(Request $request) 
    {
        $payload = $request->validate([
            'reviewable_type' => 'required',
            'reviewable_id' => 'required',
            'fullname' => 'required',
            'score' => 'required|integer|min:1|max:5',
            'content' => 'required',
            'email' => 'nullable|email',
            'phone' => 'nullable',
            'publish' => 'nullable',
            'user_id' => 'nullable'
        ]);

        // Fix casing for class names if needed, or rely on frontend sending full class
        // Mapping simple names to full class names
        $map = [
            'product' => 'App\Models\Product',
            'post' => 'App\Models\Post',
        ];

        if (array_key_exists($payload['reviewable_type'], $map)) {
            $payload['reviewable_type'] = $map[$payload['reviewable_type']];
        }

        try {
            $this->reviewService->create($payload);
            return redirect()->route('review.index')->with('success', 'Thêm mới thành công');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function edit(string $id)
    {
        $review = $this->reviewService->findById($id);
        
        // Map back full class to simple name for frontend
        $mapFlip = [
            'App\Models\Product' => 'product',
            'App\Models\Post' => 'post',
        ];
        
        if (isset($mapFlip[$review->reviewable_type])) {
            $review->entity_type = $mapFlip[$review->reviewable_type];
        } else {
             $review->entity_type = $review->reviewable_type;
        }

        // Load entity name for display
        if ($review->reviewable) {
            // Retrieve name from relation assuming languages/current_languages exists or basic name
            // For now, let's try to access name if it exists, or relation->name
             // Product/Post models use translation. 
             // Accessor or relation access needed.
             // Usually $review->reviewable->name works if Accessor is set up or joined query.
             // If not, we might need to load it properly.
             // Let's assume standard access for now.
             $review->entity_name = $review->reviewable->name ?? 'Unknown Resource';
        }

        return Inertia::render('backend/review/save', [
            'record' => $review,
             'config' => [
                'method' => 'edit'
             ]
        ]);
    }

    public function update(Request $request, string $id)
    {
         $payload = $request->validate([
            'reviewable_type' => 'required',
            'reviewable_id' => 'required',
            'fullname' => 'required',
            'score' => 'required|integer|min:1|max:5',
            'content' => 'required',
            'email' => 'nullable|email',
            'phone' => 'nullable',
            'publish' => 'nullable',
            'user_id' => 'nullable'
        ]);
        
        $map = [
            'product' => 'App\Models\Product',
            'post' => 'App\Models\Post',
        ];
        if (array_key_exists($payload['reviewable_type'], $map)) {
            $payload['reviewable_type'] = $map[$payload['reviewable_type']];
        }

        try {
            $this->reviewService->update($id, $payload);
            return redirect()->route('review.index')->with('success', 'Cập nhật thành công');
        } catch (\Exception $e) {
             return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function destroy(string $id)
    {
        try {
            $this->reviewService->delete($id);
            return redirect()->route('review.index')->with('success', 'Xóa thành công');
        } catch (\Exception $e) {
             return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function toggle(\App\Http\Requests\ToggleRequest $request, $id)
    {
        $result = $this->reviewService->updateStatus($id, $request->input('field'), $request->input('value'));
        if ($result) {
             return redirect()->back()->with('success', 'Cập nhật thành công');
        }
        return redirect()->back()->with('error', 'Cập nhật thất bại');
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->input('ids');
        if (empty($ids)) {
            return redirect()->back()->with('error', 'Chưa chọn bản ghi nào');
        }
        $result = $this->reviewService->bulkDestroy($ids);
        if ($result) {
             return redirect()->back()->with('success', 'Xóa thành công');
        }
        return redirect()->back()->with('error', 'Xóa thất bại');
    }

    public function bulkUpdate(Request $request)
    {
        $result = $this->reviewService->bulkUpdate($request->all());
        if ($result) {
             return redirect()->back()->with('success', 'Cập nhật thành công');
        }
        return redirect()->back()->with('error', 'Cập nhật thất bại');
    }


    public function searchEntities(Request $request)
    {
        $type = $request->input('type'); // 'product' or 'post'
        $keyword = $request->input('keyword');
        $languageId = config('app.language_id') ?? 1;

        if ($type === 'product') {
            $data = DB::table('products')
                ->join('product_language', 'products.id', '=', 'product_language.product_id')
                ->where('product_language.language_id', $languageId)
                ->where('product_language.name', 'LIKE', "%{$keyword}%")
                ->select('products.id as value', 'product_language.name as label')
                ->limit(20)
                ->get();
            return response()->json($data);
        } elseif ($type === 'post') {
             $data = DB::table('posts')
                ->join('post_language', 'posts.id', '=', 'post_language.post_id')
                ->where('post_language.language_id', $languageId)
                ->where('post_language.name', 'LIKE', "%{$keyword}%")
                ->select('posts.id as value', 'post_language.name as label')
                ->limit(20)
                ->get();
            return response()->json($data);
        }
        
        return response()->json([]);
    }
}
