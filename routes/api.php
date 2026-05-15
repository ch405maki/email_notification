<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\v1\UsersController;
use App\Http\Controllers\Api\v1\RolesController;
use App\Http\Controllers\Api\v1\StudentController;
use App\Http\Controllers\Api\v1\EmailLogController;
use App\Http\Controllers\Api\v1\EmailController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function () {
    Route::get('/roles', [RolesController::class, 'index']);

    Route::get('/users', [UsersController::class, 'index']);
    Route::post('/users', [UsersController::class, 'store']);
    Route::put('/users/{user}', [UsersController::class, 'update']);
    Route::delete('/users/{user}', [UsersController::class, 'destroy']);

    Route::get('/students/download-template', [StudentController::class, 'downloadTemplate']);
    Route::post('/students/upload', [StudentController::class, 'upload']);
    Route::post('/students/import-json', [StudentController::class, 'importJson']);
    Route::post('/students/check-batch', [StudentController::class, 'checkBatch']);
    Route::post('/students/send-bulk', [StudentController::class, 'sendBulk']);
    Route::get('/students/stats', [StudentController::class, 'stats']);

    Route::get('/email-logs', [EmailLogController::class, 'index']);

    Route::get('/emails/template', [EmailController::class, 'template']);
    Route::post('/emails/preview', [EmailController::class, 'preview']);
    Route::post('/emails/send-single', [EmailController::class, 'sendSingle']);
});

