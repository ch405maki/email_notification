<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            ['name' => 'Email Module',       'slug' => 'email'],
            ['name' => 'ID Application',      'slug' => 'id-application'],
            ['name' => 'Announcements',       'slug' => 'announcements'],
            ['name' => 'Gallery',             'slug' => 'gallery'],
            ['name' => 'Activity Logs',       'slug' => 'activity-logs'],
            ['name' => 'Redirect Links',      'slug' => 'redirect-links'],
            ['name' => 'Onload Banner',       'slug' => 'onload-banner'],
            ['name' => 'Subject Status',      'slug' => 'subject-status'],
            ['name' => 'Bar Passers',         'slug' => 'bar-passers'],
        ];

        foreach ($modules as $module) {
            Module::firstOrCreate($module);
        }
    }
}
