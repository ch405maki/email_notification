<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CanAccessModule
{
    public function handle(Request $request, Closure $next, string $slug): Response
    {
        $user = $request->user();

        if (!$user || !$user->hasModule($slug)) {
            abort(403, 'You do not have access to this module.');
        }

        return $next($request);
    }
}
