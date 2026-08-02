<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('attendance_schedule_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_schedule_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->boolean('is_rest_day')->default(false);
            $table->timestamps();

            $table->unique(
                ['attendance_schedule_id', 'day_of_week'],
                'attendance_schedule_days_schedule_day_unique'
            );
        });

        Schema::create('attendance_schedule_day_times', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_schedule_day_id')->constrained()->cascadeOnDelete();
            $table->time('scheduled_time');
            $table->unsignedInteger('sequence');
            $table->timestamps();

            $table->unique(
                ['attendance_schedule_day_id', 'scheduled_time'],
                'attendance_schedule_day_times_day_time_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_schedule_day_times');
        Schema::dropIfExists('attendance_schedule_days');
        Schema::dropIfExists('attendance_schedules');
    }
};
