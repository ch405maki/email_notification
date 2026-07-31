<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    protected $fillable = [
        'employee_number',
        'id_number',
        'first_name',
        'middle_name',
        'last_name',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'string',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->last_name . ', ' . $this->first_name . ($this->middle_name ? ' ' . $this->middle_name . '.' : ''));
    }

    public function scheduleAssignments(): HasMany
    {
        return $this->hasMany(EmployeeScheduleAssignment::class);
    }

    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class);
    }
}
