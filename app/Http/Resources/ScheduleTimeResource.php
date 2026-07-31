<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleTimeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'schedule_id'    => $this->schedule_id,
            'scheduled_time' => $this->scheduled_time,
            'sequence'       => $this->sequence,
            'schedule_name'  => $this->whenLoaded('schedule', fn () => $this->schedule->name),
        ];
    }
}
