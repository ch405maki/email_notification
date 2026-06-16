<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('id-application', function () {
        return Inertia::render('id-application/index');
    })->name('id-application.index');
});
