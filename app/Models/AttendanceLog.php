<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AttendanceLog extends Model
{
    protected $fillable = [
        'employee_id',
        'attendance_date',
        'schedule_time_id',
        'scheduled_time',
        'time_in',
        'status',
        'late_minutes',
        'remarks',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'scheduled_time'  => 'string',
            'time_in'         => 'string',
            'late_minutes'    => 'integer',
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

    public function scheduleStatus(): HasOne
    {
        return $this->hasOne(AttendanceScheduleStatus::class, 'attendance_log_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
