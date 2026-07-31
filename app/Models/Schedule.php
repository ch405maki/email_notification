<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Schedule extends Model
{
    protected $fillable = [
        'name',
    ];

    public function scheduleTimes(): HasMany
    {
        return $this->hasMany(ScheduleTime::class)->orderBy('sequence');
    }

    public function employeeScheduleAssignments(): HasMany
    {
        return $this->hasMany(EmployeeScheduleAssignment::class);
    }
}
