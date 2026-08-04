<?php

use App\Http\Controllers\Api\v1\AttendanceController;
use App\Http\Controllers\Api\v1\AttendanceScheduleController;
use App\Http\Controllers\Api\v1\EmailController;
use App\Http\Controllers\Api\v1\EmailLogController;
use App\Http\Controllers\Api\v1\EmployeeController;
use App\Http\Controllers\Api\v1\EmployeeScheduleAssignmentController;
use App\Http\Controllers\Api\v1\ModulesController;
use App\Http\Controllers\Api\v1\RolesController;
use App\Http\Controllers\Api\v1\StudentController;
use App\Http\Controllers\Api\v1\UsersController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function () {
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/roles', [RolesController::class, 'index']);

        Route::get('/users', [UsersController::class, 'index']);
        Route::post('/users', [UsersController::class, 'store']);
        Route::put('/users/{user}', [UsersController::class, 'update']);
        Route::delete('/users/{user}', [UsersController::class, 'destroy']);

        Route::apiResource('modules', ModulesController::class)->except('show');
    });

    Route::get('/students/download-template', [StudentController::class, 'downloadTemplate']);
    Route::post('/students/upload', [StudentController::class, 'upload']);
    Route::post('/students/import-json', [StudentController::class, 'importJson']);
    Route::post('/students/check-batch', [StudentController::class, 'checkBatch']);
    Route::post('/students/send-bulk', [StudentController::class, 'sendBulk']);
    Route::get('/students/unsent', [StudentController::class, 'unsent']);
    Route::put('/students/{student}', [StudentController::class, 'update']);
    Route::delete('/students/{student}', [StudentController::class, 'destroy']);
    Route::get('/students/stats', [StudentController::class, 'stats']);

    Route::get('/email-logs', [EmailLogController::class, 'index']);
    Route::get('/email-logs/{emailLog}', [EmailLogController::class, 'show']);
    Route::put('/email-logs/{emailLog}', [EmailLogController::class, 'update']);
    Route::delete('/email-logs/{emailLog}', [EmailLogController::class, 'destroy']);

    Route::get('/emails/template', [EmailController::class, 'template']);
    Route::post('/emails/preview', [EmailController::class, 'preview']);
    Route::post('/emails/send-single', [EmailController::class, 'sendSingle']);

    Route::get('/employees/options', [EmployeeController::class, 'options']);
    Route::get('/attendance-dashboard', [AttendanceController::class, 'dashboard']);
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::post('/attendance', [AttendanceController::class, 'store']);
    Route::post('/attendance/public/lookup', [AttendanceController::class, 'publicLookup']);
    Route::post('/attendance/public/time-in', [AttendanceController::class, 'publicTimeIn']);
    Route::post('/attendance/preview', [AttendanceController::class, 'preview']);

    Route::middleware(['auth:sanctum', 'module:attendance'])->group(function () {
        Route::apiResource('employees', EmployeeController::class);
        Route::put('/employees/{employee}/schedule', [EmployeeController::class, 'updateSchedule']);
        Route::apiResource('attendance-schedules', AttendanceScheduleController::class);
        Route::get('/employee-schedules/export', [EmployeeScheduleAssignmentController::class, 'export']);
        Route::apiResource('employee-schedules', EmployeeScheduleAssignmentController::class);
        Route::get('/attendance-summary', [AttendanceController::class, 'summary']);
        Route::get('/attendance-compliance', [AttendanceController::class, 'compliance']);
        Route::apiResource('attendance', AttendanceController::class)->only(['show', 'update', 'destroy']);
    });
});
