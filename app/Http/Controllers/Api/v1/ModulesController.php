<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Module;
use Illuminate\Http\Request;

class ModulesController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Module::all(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string'],
            'slug' => ['required', 'string', 'unique:modules,slug'],
        ]);

        $module = Module::create($validated);

        return response()->json([
            'message' => 'Module created successfully',
            'data'    => $module,
        ], 201);
    }

    public function update(Request $request, Module $module)
    {
        $validated = $request->validate([
            'name' => ['required', 'string'],
            'slug' => ['required', 'string', 'unique:modules,slug,' . $module->id],
        ]);

        $module->update($validated);

        return response()->json([
            'message' => 'Module updated successfully',
            'data'    => $module,
        ]);
    }

    public function destroy(Module $module)
    {
        $module->delete();

        return response()->json([
            'message' => 'Module deleted successfully',
        ]);
    }
}
