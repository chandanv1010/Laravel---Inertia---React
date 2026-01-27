<?php  
namespace App\Http\Controllers\Backend\V1\Image;
use App\Services\Interfaces\Image\ImageServiceInterface;
use App\Http\Controllers\Controller;
use App\Traits\HasTracking;
use App\Http\Requests\Image\ImageTempUploadRequest;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Http\Resources\ApiResource;
use Illuminate\Support\Facades\Lang;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class ImageTempController extends Controller{

    use HasTracking;

    private $imageService;
    private $auth;

    public function __construct(
        ImageServiceInterface $imageService
    )
    {
        $this->imageService = $imageService;
        $this->auth = Auth::user();
    }
    
    public function upload(ImageTempUploadRequest $request){
        $uploadConfig = [
            'file' => $request->file,
            'folder' => Str::before($this->auth->email, '@'). '/temp/'.$request->input('session_id'),
            'pipelineKey' => 'default',
        ];
        $result = $this->imageService->upload(...$uploadConfig);
        $url = $result['path'];
        $response = [
            'id' => uniqid('temp_', true),
            'url' => "/storage/{$url}"
        ];
        
        $this->trackAction('upload', 'image_temp', null, [
            'description' => "Upload ảnh tạm: {$url}",
            'new_data' => [
                'url' => $url,
                'session_id' => $request->input('session_id'),
            ],
        ]);
        
        return ApiResource::ok($response, Lang::get('messages.upload.success'));
    }


    public function destroy(Request $request){
        $sessionId = $request->input('session_id');
        $filepath = $request->input('filepath');
        $username = Str::before($this->auth->email, '@');
        if(!$sessionId){
            return ApiResource::message('SessionID không hợp lệ', Response::HTTP_BAD_REQUEST);
        }

        if($filepath){
            try {
                $disk = config('upload.image.disk');
                $fullpath = ltrim($filepath, '/');
                if(Storage::disk($disk)->exists($fullpath)){
                    Storage::disk($disk)->delete($fullpath);
                    
                    $this->trackAction('delete', 'image_temp', null, [
                        'description' => "Xóa ảnh tạm: {$fullpath}",
                        'old_data' => ['filepath' => $fullpath],
                    ]);
                    
                    return ApiResource::ok(null, Lang::get('messages.upload.remove_success'), Response::HTTP_OK);
                }
                return ApiResource::message(Lang::get('messages.response.not_found'));
            } catch (\Throwable $th) {
                return ApiResource::message(Lang::get('messages.upload.remove_failed'). $th->getMessage(), Response::HTTP_INTERNAL_SERVER_ERROR);
            }
        }
        $deleted = $this->imageService->deleteTempFiles($sessionId, $username);
        if($deleted){
            $this->trackAction('delete', 'image_temp', null, [
                'description' => "Xóa tất cả ảnh tạm theo session: {$sessionId}",
                'old_data' => ['session_id' => $sessionId, 'username' => $username],
            ]);
            
            return ApiResource::ok(null, Lang::get('messages.upload.remove_success'), Response::HTTP_OK);
        }
        return ApiResource::message(Lang::get('messages.upload.remove_failed'), Response::HTTP_BAD_REQUEST);

    }

}