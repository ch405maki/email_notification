<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceScheduleDay extends Model
{
    protected $fillable = [
        'attendance_schedule_id',
        'day_of_week',
        'is_rest_day',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'is_rest_day' => 'boolean',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(AttendanceSchedule::class);
    }

    public function times(): HasMany
    {
        return $this->hasMany(AttendanceScheduleDayTime::class)->orderBy('sequence');
    }
}
