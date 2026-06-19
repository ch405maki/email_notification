<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UsersController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('role', 'modules');

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->boolean('status'));
        }

        return response()->json([
            'data' => $query->latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => ['required', 'string'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'min:6'],
            'role_id'  => ['required', 'exists:roles,id'],
            'status'   => ['boolean'],
            'modules'  => ['nullable', 'array'],
            'modules.*' => ['exists:modules,id'],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id'  => $validated['role_id'],
            'status'   => $validated['status'] ?? true,
        ]);

        if (!empty($validated['modules'])) {
            $user->modules()->sync($validated['modules']);
        }

        return response()->json([
            'message' => 'User created successfully',
            'data'    => $user->load('role', 'modules'),
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'     => ['required', 'string'],
            'email'    => ['required', 'email', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'min:6'],
            'role_id'  => ['required', 'exists:roles,id'],
            'status'   => ['boolean'],
            'modules'  => ['nullable', 'array'],
            'modules.*' => ['exists:modules,id'],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->role_id = $validated['role_id'];

        if (isset($validated['status'])) {
            $user->status = $validated['status'];
        }

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        if (array_key_exists('modules', $validated)) {
            $user->modules()->sync($validated['modules'] ?? []);
        }

        return response()->json([
            'message' => 'User updated successfully',
            'data'    => $user->load('role', 'modules'),
        ]);
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }
}
