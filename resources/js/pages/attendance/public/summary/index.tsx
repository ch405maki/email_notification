import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import axios from 'axios'
import PublicLayout from '@/layouts/public-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Trophy } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Public', href: '/public/attendance' },
  { title: 'Attendance', href: '/public/attendance' },
  { title: 'Monitoring Dashboard', href: '#' },
]

type EmployeeOption = { id: number; employee_number: string; full_name: string }

type Summary = {
  present_days: number
  late_count: number
  total_late_minutes: number
  total_late_hours: number
  employees_near_threshold: number
  employees_over_threshold: number
}

type ComplianceRow = {
  employee_id: number
  employee_number: string
  full_name: string
  late_count: number
  late_minutes: number
  late_count_percentage: number
  late_minutes_percentage: number
  risk_score: number
  status: 'SAFE' | 'WARNING' | 'THRESHOLD REACHED'
}

type ChartPoint = {
  label: string
  full_name: string
  late_minutes: number
  late_count: number
  status: 'SAFE' | 'WARNING' | 'THRESHOLD REACHED'
}

type DashboardData = {
  summary: Summary
  compliance: {
    data: ComplianceRow[]
    meta: { current_page: number; last_page: number; per_page: number; total: number }
  }
  chart: ChartPoint[]
  range: { date_from: string; date_to: string }
  thresholds: { late_minutes_threshold: number; late_count_threshold: number }
}

const pad = (n: number) => String(n).padStart(2, '0')

const formatDate = (iso: string) => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const statusBadge: Record<string, string> = {
  SAFE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  WARNING: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'THRESHOLD REACHED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const statusRowClass: Record<string, string> = {
  SAFE: 'bg-emerald-50 dark:bg-emerald-950/40',
  WARNING: 'bg-amber-50 dark:bg-amber-950/40',
  'THRESHOLD REACHED': 'bg-red-50 dark:bg-red-950/40',
}

const STATUS_COLORS: Record<string, string> = {
  SAFE: '#10b981',
  WARNING: '#f59e0b',
  'THRESHOLD REACHED': '#ef4444',
}

const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-orange-500']

const chartConfig = {
  late_minutes: { label: 'Late Minutes', color: 'var(--chart-1)' },
  late_count: { label: 'Late Count', color: 'var(--chart-2)' },
} satisfies ChartConfig

type DotRenderProps = {
  cx?: number
  cy?: number
  payload?: ChartPoint
}

const renderStatusDot = (props: DotRenderProps) => {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null
  return (
    <circle
      key={`dot-${payload.label}`}
      cx={cx}
      cy={cy}
      r={4}
      fill={STATUS_COLORS[payload.status] ?? 'var(--chart-1)'}
      stroke="hsl(var(--background))"
      strokeWidth={1}
    />
  )
}

function SortHead({
  label,
  column,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  label: string
  column: string
  sortBy: string
  sortDir: 'asc' | 'desc'
  onSort: (column: string) => void
  className?: string
}) {
  const active = sortBy === column
  return (
    <TableHead className={className}>
      <button type="button" onClick={() => onSort(column)} className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
        ) : (
          <ArrowUpDown className="size-3 text-muted-foreground/50" />
        )}
      </button>
    </TableHead>
  )
}

export default function AttendanceDashboard() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [cutoff, setCutoff] = useState('current')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('late_minutes')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get('/api/v1/employees/options')
      setEmployees(res.data.data)
    } catch { /* ignore */ }
  }, [])

  const fetchDashboard = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { cutoff, page }
      if (employeeId) params.employee_id = employeeId
      if (cutoff === 'custom') {
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo
      }
      if (search) params.search = search
      params.sort_by = sortBy
      params.sort_dir = sortDir
      const res = await axios.get('/api/v1/attendance-dashboard', { params })
      setData(res.data.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch dashboard')
    } finally {
      setLoading(false)
    }
  }, [cutoff, employeeId, dateFrom, dateTo, search, sortBy, sortDir])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])
  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleCutoffChange = (value: string) => {
    setCutoff(value)
    const now = new Date()
    const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    if (value === 'today') {
      const t = toStr(now)
      setDateFrom(t)
      setDateTo(t)
    } else if (value === 'week') {
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      setDateFrom(toStr(from))
      setDateTo(toStr(now))
    } else if (value === 'month') {
      const from = new Date(now)
      from.setDate(from.getDate() - 29)
      setDateFrom(toStr(from))
      setDateTo(toStr(now))
    } else if (value === 'custom' && (!dateFrom || !dateTo)) {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      setDateFrom(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`)
      setDateTo(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`)
    }
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir(['full_name', 'employee_number'].includes(column) ? 'asc' : 'desc')
    }
  }

  const thresholds = data?.thresholds ?? { late_minutes_threshold: 60, late_count_threshold: 4 }
  const compliance = data?.compliance
  const chartData = data?.chart ?? []

  const tooltipLabel = (value: ReactNode) => {
    const point = chartData.find(d => d.label === value)
    return point?.full_name ?? value
  }

  return (
    <PublicLayout breadcrumbs={breadcrumbs}>
      <Head title="Attendance Monitoring Dashboard" />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Attendance Monitoring Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {data ? (
                <>Period: {formatDate(data.range.date_from)} - {formatDate(data.range.date_to)}</>
              ) : (
                'Loading period...'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={employeeId || 'all'} onValueChange={v => setEmployeeId(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-fit min-w-40 max-w-full"><SelectValue placeholder="All Employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>{e.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cutoff} onValueChange={handleCutoffChange}>
            <SelectTrigger className="w-fit min-w-36 max-w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Cutoff</SelectItem>
              <SelectItem value="first">First Cutoff</SelectItem>
              <SelectItem value="second">Second Cutoff</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week Ago</SelectItem>
              <SelectItem value="month">Month Ago</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-36"
            title="Date from"
            disabled={cutoff !== 'custom'}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-36"
            title="Date to"
            disabled={cutoff !== 'custom'}
          />

          <Button variant="outline" size="sm" onClick={() => fetchDashboard()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Employee Compliance Chart</CardTitle>
            <CardDescription>
              Late minutes (left) and late count (right) per employee for the selected period. Dots are colored by
              compliance status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
              <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fontSize: 10 }}
                  tickFormatter={value => `${value} min`}
                  domain={[0, 'auto']}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tick={{ fontSize: 10 }}
                  allowDecimals={false}
                  domain={[0, 'auto']}
                />
                <ChartTooltip
                  cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }}
                  content={<ChartTooltipContent labelFormatter={tooltipLabel} />}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={thresholds.late_minutes_threshold}
                  stroke={STATUS_COLORS['THRESHOLD REACHED']}
                  strokeDasharray="6 4"
                  label={{ value: `${thresholds.late_minutes_threshold} min`, position: 'insideTopRight', fontSize: 10 }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={thresholds.late_count_threshold}
                  stroke={STATUS_COLORS.WARNING}
                  strokeDasharray="6 4"
                  label={{ value: `${thresholds.late_count_threshold} count`, position: 'insideBottomLeft', fontSize: 10 }}
                />
                <Area
                  yAxisId="left"
                  dataKey="late_minutes"
                  type="monotone"
                  stroke="var(--color-late_minutes)"
                  fill="var(--color-late_minutes)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                  dot={renderStatusDot}
                  activeDot={{ r: 5 }}
                />
                <Area
                  yAxisId="right"
                  dataKey="late_count"
                  type="monotone"
                  stroke="var(--color-late_count)"
                  fill="var(--color-late_count)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                  dot={renderStatusDot}
                  activeDot={{ r: 5 }}
                />
                <ChartLegend content={<ChartLegendContent verticalAlign="top" />} />
              </AreaChart>
            </ChartContainer>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              {Object.entries(STATUS_COLORS).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Top Employees By Late Minutes</h2>
              <p className="text-sm text-muted-foreground">Ranked by highest late minutes in the selected period</p>
            </div>
            <div className="relative">
              <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search employees..."
                className="pl-8 w-64"
              />
            </div>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <SortHead label="Employee #" column="employee_number" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHead label="Full Name" column="full_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHead label="Late Count" column="late_count" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHead label="Late Minutes" column="late_minutes" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHead label="Risk Score" column="risk_score" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHead label="Status" column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !compliance && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
                )}
                {compliance?.data.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No compliance data found</TableCell></TableRow>
                )}
                {compliance?.data.map((row, index) => (
                  <TableRow key={row.employee_id} className={statusRowClass[row.status]}>
                    <TableCell>
                      {index < 3 ? (
                        <Trophy className={`size-4 ${RANK_COLORS[index]}`} />
                      ) : (
                        <span className="text-muted-foreground">{index + 1}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{row.employee_number}</TableCell>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell>{row.late_count}</TableCell>
                    <TableCell>{row.late_minutes}</TableCell>
                    <TableCell className="font-medium">{row.risk_score}</TableCell>
                    <TableCell>
                      <Badge className={statusBadge[row.status]}>{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {compliance && compliance.meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={compliance.meta.current_page <= 1}
                onClick={() => fetchDashboard(compliance.meta.current_page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {compliance.meta.current_page} of {compliance.meta.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={compliance.meta.current_page >= compliance.meta.last_page}
                onClick={() => fetchDashboard(compliance.meta.current_page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}
