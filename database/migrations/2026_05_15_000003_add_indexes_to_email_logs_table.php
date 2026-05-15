<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_logs', function (Blueprint $table) {
            $table->index('status');
            $table->index('student_number');
            $table->index(['student_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('email_logs', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['student_number']);
            $table->dropIndex(['student_id', 'status']);
        });
    }
};
