<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceScheduleStatus extends Model
{
    protected $fillable = [
        'employee_id',
        'attendance_date',
        'schedule_time_id',
        'scheduled_time',
        'status',
        'attendance_log_id',
    ];

    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'scheduled_time'  => 'string',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function scheduleTime(): BelongsTo
    {
        return $this->belongsTo(AttendanceScheduleDayTime::class, 'schedule_time_id');
    }

    public function attendanceLog(): BelongsTo
    {
        return $this->belongsTo(AttendanceLog::class);
    }
}
