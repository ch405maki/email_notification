<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceScheduleDayTime extends Model
{
    protected $fillable = [
        'attendance_schedule_day_id',
        'scheduled_time',
        'sequence',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_time' => 'string',
            'sequence'       => 'integer',
        ];
    }

    public function day(): BelongsTo
    {
        return $this->belongsTo(AttendanceScheduleDay::class);
    }
}
