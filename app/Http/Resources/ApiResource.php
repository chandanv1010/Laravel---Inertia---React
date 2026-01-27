<?php

namespace App\Http\Resources;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;

class ApiResource extends JsonResource
{
   
    public static function ok($data = null, string $message = 'Success', int $httpcode = Response::HTTP_OK): JsonResponse {
        return response()->json([
            'status' => true,
            'code' => $httpcode,
            'data' => $data,
            'message' => $message,
            'timestamp' => now(),
        ], $httpcode);
    }

    public static function error($errors = null, string $message = 'Failed', int $httpcode = Response::HTTP_INTERNAL_SERVER_ERROR): JsonResponse {
        return response()->json([
            'status' => false,
            'code' => $httpcode,
            'errors' => $errors,
            'message' => $message,
            'timestamp' => now()
        ], $httpcode);
    }

    public static function message(string $message = '', int $httpcode = Response::HTTP_OK): JsonResponse {
        return response()->json([
            'status' => $httpcode === Response::HTTP_ACCEPTED || $httpcode === Response::HTTP_OK || $httpcode === Response::HTTP_CREATED,
            'code' => $httpcode,
            'message' => $message,
            'timestamp' => now()
        ], $httpcode);
    }

}
