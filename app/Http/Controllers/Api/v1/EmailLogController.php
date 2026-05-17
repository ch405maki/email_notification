<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\EmailLog;
use Illuminate\Http\Request;

class EmailLogController extends Controller
{
    public function index(Request $request)
    {
        $query = EmailLog::latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('student_number', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'data' => $query->paginate(10),
        ]);
    }

    public function show(EmailLog $emailLog)
    {
        return response()->json([
            'data' => $emailLog,
        ]);
    }

    public function update(Request $request, EmailLog $emailLog)
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:pending,sent,failed',
            'error_message' => 'nullable|string',
            'sent_at' => 'nullable|date',
        ]);

        if (isset($validated['status'])) {
            $emailLog->status = $validated['status'];
        }
        if (array_key_exists('error_message', $validated)) {
            $emailLog->error_message = $validated['error_message'];
        }
        if (array_key_exists('sent_at', $validated)) {
            $emailLog->sent_at = $validated['sent_at'];
        }

        $emailLog->save();

        return response()->json([
            'message' => 'Email log updated successfully',
            'data' => $emailLog,
        ]);
    }

    public function destroy(EmailLog $emailLog)
    {
        $emailLog->delete();

        return response()->json([
            'message' => 'Email log deleted successfully',
        ]);
    }
}
