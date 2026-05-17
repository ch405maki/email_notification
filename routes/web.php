<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Illuminate\Support\Facades\Mail;

// Route::get('/', function () {
//     return Inertia::render('welcome', [
//         'canRegister' => Features::enabled(Features::registration()),
//     ]);
// })->name('home');

Route::get('/', function () {
    return Inertia::render('auth/login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

Route::get('/test-email', function () {
$details = [
        'subject' => 'Test Email',
        'body' => 'This is a test email to verify the SMTP configuration.',
    ];
    Mail::raw($details['body'], function ($message) use ($details) {
    $message->from('markmanuel0317@gmail.com', 'Test Mail')
        ->to('markmanuel0317@gmail.com')
        ->subject($details['subject']);
    });
    return 'Test email sent!';
});

require __DIR__.'/settings.php';
require __DIR__.'/webRoutes/users.php';
require __DIR__.'/webRoutes/students.php';
