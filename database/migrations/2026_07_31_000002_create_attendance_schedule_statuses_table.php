<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_schedule_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->date('attendance_date');
            $table->foreignId('schedule_time_id')->nullable()->constrained()->nullOnDelete();
            $table->time('scheduled_time');
            $table->string('status');
            $table->foreignId('attendance_log_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index('attendance_date');
            $table->index('status');
            $table->unique(
                ['employee_id', 'attendance_date', 'schedule_time_id'],
                'attendance_schedule_statuses_employee_date_time_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_schedule_statuses');
    }
};
