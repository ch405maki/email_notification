<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleTime extends Model
{
    protected $fillable = [
        'schedule_id',
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

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }
}
