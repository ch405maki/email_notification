import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import PublicLayout from '@/layouts/public-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { RefreshCw, Clock } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Public', href: '/public/attendance' },
  { title: 'Attendance', href: '/public/attendance' },
  { title: 'Attendance Logs', href: '#' },
]

type EmployeeOption = { id: number; employee_number: string; id_number: string | null; full_name: string }
type AttendanceLog = {
  id: number
  employee_id: number
  attendance_date: string
  scheduled_time: string
  time_in: string
  status: string
  late_minutes: number
  remarks: string | null
  employee: EmployeeOption | null
  schedule_time: { id: number; schedule_id: number; scheduled_time: string; sequence: number; schedule_name?: string } | null
  schedule_name?: string | null
}

type PaginatedResponse = {
  data: AttendanceLog[]
  meta: { current_page: number; last_page: number; total: number }
}

const statusColors: Record<string, string> = {
  ON_TIME: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  LATE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const statusRowClass: Record<string, string> = {
  ON_TIME: 'bg-emerald-50 dark:bg-emerald-950/40',
  LATE: 'bg-red-50 dark:bg-red-950/40',
}

const formatDate = (iso: string) => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const to12Hour = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

export default function AttendanceLogIndex() {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [rangePreset, setRangePreset] = useState('custom')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ employee_id: '', attendance_date: '', time_in: '', remarks: '' })

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page }
      if (employeeFilter) params.employee_id = employeeFilter
      if (statusFilter) params.status = statusFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const res = await axios.get('/api/v1/attendance', { params })
      setData(res.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [employeeFilter, statusFilter, dateFrom, dateTo])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get('/api/v1/employees/options')
      setEmployees(res.data.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])
  useEffect(() => { fetchLogs() }, [fetchLogs])

  const pad = (n: number) => String(n).padStart(2, '0')
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const todayStr = () => toDateStr(new Date())
  const nowStr = () => {
    const d = new Date()
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const openCreate = () => {
    setForm({ employee_id: '', attendance_date: todayStr(), time_in: nowStr(), remarks: '' })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      await axios.post('/api/v1/attendance', { ...form, employee_id: Number(form.employee_id) })
      toast.success('Attendance recorded')
      setOpen(false)
      fetchLogs()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Save failed')
    }
  }

  const handleRangePreset = (value: string) => {
    setRangePreset(value)
    const today = new Date()
    if (value === 'today') {
      const t = toDateStr(today)
      setDateFrom(t)
      setDateTo(t)
    } else if (value === 'week') {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      setDateFrom(toDateStr(from))
      setDateTo(toDateStr(today))
    } else if (value === 'month') {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      setDateFrom(toDateStr(from))
      setDateTo(toDateStr(today))
    }
  }

  return (
    <PublicLayout breadcrumbs={breadcrumbs}>
      <Head title="Attendance Logs" />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Attendance Logs</h1>
            <p className="text-sm text-muted-foreground">View and record attendance</p>
          </div>
          <Button onClick={openCreate}><Clock /> Record Attendance</Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={employeeFilter || 'all'} onValueChange={v => setEmployeeFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-fit min-w-40 max-w-full"><SelectValue placeholder="All Employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>{e.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-fit min-w-32 max-w-full"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ON_TIME">On Time</SelectItem>
              <SelectItem value="LATE">Late</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rangePreset} onValueChange={handleRangePreset}>
            <SelectTrigger className="w-fit min-w-36 max-w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom Range</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week Ago</SelectItem>
              <SelectItem value="month">Month Ago</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" title="Date from" disabled={rangePreset !== 'custom'} />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" title="Date to" disabled={rangePreset !== 'custom'} />
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}><RefreshCw className="size-4" /> Refresh</Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Late (min)</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              )}
              {data?.data.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No attendance records found</TableCell></TableRow>
              )}
              {data?.data.map(log => (
                <TableRow key={log.id} className={statusRowClass[log.status]}>
                  <TableCell>{log.employee?.full_name ?? '—'}</TableCell>
                  <TableCell>{formatDate(log.attendance_date)}</TableCell>
                  <TableCell className="font-mono">
                    {to12Hour(log.scheduled_time)}
                    {log.schedule_name && (
                      <span className="ml-2 text-xs text-muted-foreground">{log.schedule_name}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">{to12Hour(log.time_in)}</TableCell>
                  <TableCell><Badge className={statusColors[log.status]}>{log.status}</Badge></TableCell>
                  <TableCell>{log.late_minutes > 0 ? log.late_minutes : '—'}</TableCell>
                  <TableCell className="max-w-32 truncate">{log.remarks || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data && data.meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={data.meta.current_page <= 1} onClick={() => fetchLogs(data.meta.current_page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {data.meta.current_page} of {data.meta.last_page}</span>
            <Button variant="outline" size="sm" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => fetchLogs(data.meta.current_page + 1)}>Next</Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Attendance</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.full_name} ({e.employee_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.attendance_date} onChange={e => setForm({ ...form, attendance_date: e.target.value })} /></div>
            <div><Label>Time In</Label><Input type="time" value={form.time_in} onChange={e => setForm({ ...form, time_in: e.target.value })} /></div>
            <div><Label>Remarks</Label><Input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  )
}
