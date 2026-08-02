<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('attendance_logs') && Schema::hasColumn('attendance_logs', 'schedule_time_id')) {
            Schema::table('attendance_logs', function (Blueprint $table) {
                $table->dropForeign(['schedule_time_id']);
            });

            DB::table('attendance_logs')->whereNotNull('schedule_time_id')->update(['schedule_time_id' => null]);

            Schema::table('attendance_logs', function (Blueprint $table) {
                $table->foreign('schedule_time_id')
                    ->references('id')
                    ->on('attendance_schedule_day_times')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('attendance_schedule_statuses') && Schema::hasColumn('attendance_schedule_statuses', 'schedule_time_id')) {
            Schema::table('attendance_schedule_statuses', function (Blueprint $table) {
                $table->dropForeign(['schedule_time_id']);
            });

            DB::table('attendance_schedule_statuses')->whereNotNull('schedule_time_id')->update(['schedule_time_id' => null]);

            Schema::table('attendance_schedule_statuses', function (Blueprint $table) {
                $table->foreign('schedule_time_id')
                    ->references('id')
                    ->on('attendance_schedule_day_times')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (['attendance_logs', 'attendance_schedule_statuses'] as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'schedule_time_id')) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    $table->dropForeign(['schedule_time_id']);
                });

                DB::table($tableName)->whereNotNull('schedule_time_id')->update(['schedule_time_id' => null]);

                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    $table->foreign('schedule_time_id')
                        ->references('id')
                        ->on('schedule_times')
                        ->nullOnDelete();
                });
            }
        }
    }
};
