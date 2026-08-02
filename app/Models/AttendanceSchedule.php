<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSchedule extends Model
{
    protected $fillable = [
        'name',
    ];

    public function days(): HasMany
    {
        return $this->hasMany(AttendanceScheduleDay::class);
    }

    public function employeeScheduleAssignments(): HasMany
    {
        return $this->hasMany(EmployeeScheduleAssignment::class);
    }
}
