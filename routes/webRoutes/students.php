<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('students/upload', function () {
        return Inertia::render('students/upload');
    })->name('students.upload');

    Route::get('students/campaign', function () {
        return Inertia::render('students/campaign');
    })->name('students.campaign');

    Route::get('students/logs', function () {
        return Inertia::render('students/logs');
    })->name('students.logs');

    Route::get('students/manual-send', function () {
        return Inertia::render('students/manual-send');
    })->name('students.manual-send');
});
