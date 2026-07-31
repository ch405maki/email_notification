<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('attendance/employees', function () {
        return Inertia::render('attendance/employees/index');
    })->name('attendance.employees');

    Route::get('attendance/schedules', function () {
        return Inertia::render('attendance/schedules/index');
    })->name('attendance.schedules');

    Route::get('attendance/employee-schedules', function () {
        return Inertia::render('attendance/employee-schedules/index');
    })->name('attendance.employee-schedules');

    Route::get('attendance/logs', function () {
        return Inertia::render('attendance/logs/index');
    })->name('attendance.logs');

    Route::get('attendance/summary', function () {
        return Inertia::render('attendance/summary/index');
    })->name('attendance.summary');
});
