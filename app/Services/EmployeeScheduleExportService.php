<?php

namespace App\Services;

use App\Models\Employee;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeScheduleExportService
{
    public const DAY_COLUMNS = [
        1 => 'Mon',
        2 => 'Tue',
        3 => 'Wed',
        4 => 'Thu',
        5 => 'Fri',
        6 => 'Sat',
        0 => 'Sun',
    ];

    public const SECTION_ORDER = ['Technical', 'Systems'];

    private const GRAY_DARK = 'FF6B7280';

    private const GRAY_LIGHT = 'FFE5E7EB';

    private const TEXT_DARK = 'FF111827';

    private const REST_FILL = 'FFFEE2E2';

    private const REST_TEXT = 'FFB91C1C';

    public function __construct(
        protected ScheduleAssignmentService $scheduleAssignmentService
    ) {}

    public function stream(?string $section = null, ?string $date = null): StreamedResponse
    {
        $today = $date ? Carbon::parse($date)->toDateString() : Carbon::today()->toDateString();

        $spreadsheet = $this->build($section, $date);

        $filename = sprintf('employee-schedules-%s.xlsx', $today);

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function build(?string $section = null, ?string $date = null): Spreadsheet
    {
        $today = $date ? Carbon::parse($date)->toDateString() : Carbon::today()->toDateString();

        $query = Employee::query()->where('status', 'ACTIVE');

        if ($section) {
            $query->where('section', $section);
        }

        $employees = $query->orderBy('last_name')->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Employee Schedules');

        $lastColumn = Coordinate::stringFromColumnIndex(count(self::DAY_COLUMNS) + 1);

        $sheet->mergeCells("A1:{$lastColumn}1");
        $sheet->setCellValue(
            'A1',
            strtoupper(sprintf('Employee Schedules - %s', Carbon::parse($today)->format('F Y')))
        );
        $this->styleTitle($sheet, count(self::DAY_COLUMNS) + 1);

        $headers = array_map('strtoupper', array_merge(['Name'], array_values(self::DAY_COLUMNS)));
        $sheet->fromArray($headers, null, 'A2');
        $this->styleHeader($sheet, count(self::DAY_COLUMNS) + 1);

        $rowIndex = 3;
        foreach ($this->groupBySection($employees) as $groupName => $group) {
            $sheet->mergeCells("A{$rowIndex}:{$lastColumn}{$rowIndex}");
            $sheet->setCellValue("A{$rowIndex}", strtoupper($groupName));
            $this->styleGroupHeader($sheet, count(self::DAY_COLUMNS) + 1, $rowIndex);
            $rowIndex++;

            foreach ($group as $employee) {
                $dayMap = $this->resolveWeeklyDays($employee, $today);

                $row = [strtoupper($employee->full_name)];

                foreach (array_keys(self::DAY_COLUMNS) as $index => $dayOfWeek) {
                    $row[] = strtoupper($this->dayCell($dayMap[$dayOfWeek] ?? null));

                    if (($dayMap[$dayOfWeek]['is_rest_day'] ?? false)) {
                        $coord = Coordinate::stringFromColumnIndex($index + 2) . $rowIndex;
                        $this->styleRestDay($sheet, $coord);
                    }
                }

                $sheet->fromArray($row, null, "A{$rowIndex}");
                $rowIndex++;
            }
        }

        $this->styleBody($sheet, $rowIndex - 1);

        return $spreadsheet;
    }

    protected function groupBySection(\Illuminate\Support\Collection $employees): array
    {
        $groups = [];

        foreach ($employees as $employee) {
            $key = $employee->section ?: 'Unassigned';
            $groups[$key][] = $employee;
        }

        $ordered = [];

        foreach (self::SECTION_ORDER as $section) {
            if (isset($groups[$section])) {
                $ordered[$section] = $groups[$section];
                unset($groups[$section]);
            }
        }

        if (isset($groups['Unassigned'])) {
            $ordered['Unassigned'] = $groups['Unassigned'];
            unset($groups['Unassigned']);
        }

        foreach ($groups as $name => $group) {
            $ordered[$name] = $group;
        }

        return $ordered;
    }

    protected function resolveWeeklyDays(Employee $employee, string $date): array
    {
        $schedule = $this->scheduleAssignmentService->getActiveSchedule($employee, $date);

        if (! $schedule) {
            return [];
        }

        $schedule->loadMissing('days.times');

        $map = [];
        foreach ($schedule->days as $day) {
            $map[$day->day_of_week] = [
                'is_rest_day' => $day->is_rest_day,
                'times' => $day->times->pluck('scheduled_time')->values()->all(),
            ];
        }

        return $map;
    }

    protected function dayCell(?array $day): string
    {
        if (! $day) {
            return '';
        }

        if ($day['is_rest_day']) {
            return 'RESTDAY';
        }

        $formatted = array_map(
            fn (string $time) => Carbon::parse($time)->format('g:iA'),
            $day['times']
        );

        return implode(' - ', $formatted);
    }

    protected function styleTitle(Worksheet $sheet, int $columnCount): void
    {
        $sheet->getStyle('A1:'.Coordinate::stringFromColumnIndex($columnCount).'1')
            ->getFont()
            ->setBold(true)
            ->setSize(14)
            ->getColor()
            ->setARGB('FFFFFFFF');

        $sheet->getStyle('A1:'.Coordinate::stringFromColumnIndex($columnCount).'1')
            ->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB(self::GRAY_DARK);

        $sheet->getStyle('A1:'.Coordinate::stringFromColumnIndex($columnCount).'1')
            ->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);

        $sheet->getRowDimension(1)->setRowHeight(26);
    }

    protected function styleHeader(Worksheet $sheet, int $columnCount): void
    {
        $range = 'A2:'.Coordinate::stringFromColumnIndex($columnCount).'2';

        $sheet->getStyle($range)
            ->getFont()
            ->setBold(true)
            ->getColor()
            ->setARGB('FFFFFFFF');

        $sheet->getStyle($range)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB(self::GRAY_DARK);

        $sheet->getStyle($range)->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);

        $sheet->getRowDimension(2)->setRowHeight(20);
    }

    protected function styleGroupHeader(Worksheet $sheet, int $columnCount, int $row): void
    {
        $range = "A{$row}:".Coordinate::stringFromColumnIndex($columnCount).$row;

        $sheet->getStyle($range)
            ->getFont()
            ->setBold(true)
            ->setSize(12)
            ->getColor()
            ->setARGB(self::TEXT_DARK);

        $sheet->getStyle($range)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB(self::GRAY_LIGHT);

        $sheet->getStyle($range)->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);

        $sheet->getRowDimension($row)->setRowHeight(22);
    }

    protected function styleRestDay(Worksheet $sheet, string $coord): void
    {
        $sheet->getStyle($coord)
            ->getFont()
            ->setBold(true)
            ->getColor()
            ->setARGB(self::REST_TEXT);

        $sheet->getStyle($coord)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB(self::REST_FILL);
    }

    protected function styleBody(Worksheet $sheet, int $lastRow): void
    {
        if ($lastRow < 1) {
            return;
        }

        $columnCount = count(self::DAY_COLUMNS) + 1;
        $range = 'A1:'.Coordinate::stringFromColumnIndex($columnCount).$lastRow;

        $sheet->getStyle($range)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

        foreach (array_keys(self::DAY_COLUMNS) as $index => $dayOfWeek) {
            $letter = Coordinate::stringFromColumnIndex($index + 2);
            $sheet->getColumnDimension($letter)->setWidth(18);
        }

        $sheet->getColumnDimension('A')->setWidth(30);
    }
}
