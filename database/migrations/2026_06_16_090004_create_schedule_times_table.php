<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('schedule_times')) {
            Schema::create('schedule_times', function (Blueprint $table) {
                $table->id();
                $table->foreignId('schedule_id')->constrained()->cascadeOnDelete();
                $table->time('scheduled_time');
                $table->unsignedInteger('sequence');
                $table->timestamps();
            });
        }

        if (Schema::hasColumn('schedules', 'start_time')) {
            $rows = DB::table('schedules')->whereNotNull('start_time')->get();
            foreach ($rows as $row) {
                DB::table('schedule_times')->insert([
                    'schedule_id'     => $row->id,
                    'scheduled_time'  => $row->start_time,
                    'sequence'        => 1,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            }

            Schema::table('schedules', function (Blueprint $table) {
                $table->dropColumn('start_time');
            });
        }

        if (Schema::hasIndex('attendance_logs', 'attendance_logs_employee_id_attendance_date_unique')) {
            Schema::table('attendance_logs', function (Blueprint $table) {
                if (!Schema::hasIndex('attendance_logs', 'attendance_logs_employee_id_index')) {
                    $table->index('employee_id');
                }
                $table->dropUnique('attendance_logs_employee_id_attendance_date_unique');
            });
        }

        if (!Schema::hasColumn('attendance_logs', 'schedule_time_id')) {
            Schema::table('attendance_logs', function (Blueprint $table) {
                $table->foreignId('schedule_time_id')
                    ->nullable()
                    ->after('attendance_date')
                    ->constrained()
                    ->nullOnDelete();
            });
        }

        $logs = DB::table('attendance_logs')->whereNull('schedule_time_id')->get();
        foreach ($logs as $log) {
            $assignment = DB::table('employee_schedule_assignments')
                ->where('employee_id', $log->employee_id)
                ->orderByDesc('effective_date')
                ->first();

            if (!$assignment) {
                continue;
            }

            $scheduleTime = DB::table('schedule_times')
                ->where('schedule_id', $assignment->schedule_id)
                ->orderBy('sequence')
                ->first();

            if (!$scheduleTime) {
                continue;
            }

            DB::table('attendance_logs')
                ->where('id', $log->id)
                ->update(['schedule_time_id' => $scheduleTime->id]);
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('attendance_logs', 'schedule_time_id')) {
            Schema::table('attendance_logs', function (Blueprint $table) {
                $table->dropForeign(['schedule_time_id']);
                $table->dropColumn('schedule_time_id');
            });
        }

        if (!Schema::hasColumn('schedules', 'start_time')) {
            Schema::table('schedules', function (Blueprint $table) {
                $table->time('start_time')->nullable();
            });
        }

        Schema::dropIfExists('schedule_times');
    }
};
