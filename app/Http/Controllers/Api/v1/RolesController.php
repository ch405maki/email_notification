<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Role;

class RolesController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Role::select('id', 'name', 'slug')->get(),
        ]);
    }
}
