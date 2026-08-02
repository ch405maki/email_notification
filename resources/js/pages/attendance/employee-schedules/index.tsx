import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Search, RefreshCw, CalendarPlus, Trash2, CheckCircle2, MinusCircle } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Attendance', href: '/attendance/employee-schedules' },
  { title: 'Employee Schedules', href: '#' },
]

type EmployeeOption = { id: number; employee_number: string; id_number: string | null; full_name: string }
type Schedule = { id: number; name: string; days: { day_of_week: number; is_rest_day: boolean; times: { scheduled_time: string }[] }[] }
type Assignment = {
  id: number
  employee_id: number
  attendance_schedule_id: number
  effective_from: string
  effective_to: string | null
  employee: EmployeeOption | null
  attendance_schedule: Schedule | null
}

type PaginatedResponse = {
  data: Assignment[]
  meta: { current_page: number; last_page: number; total: number }
}

const DAY_SHORT: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' }

const formatDate = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const scheduleSummary = (s: Schedule | null) => {
  if (!s) return '—'
  const work = s.days.filter(d => !d.is_rest_day)
  const rest = s.days.filter(d => d.is_rest_day)
  const workLabel = work.length
    ? work.map(d => DAY_SHORT[d.day_of_week]).join(', ')
    : 'No working days'
  return rest.length ? `${workLabel} (Rest: ${rest.map(d => DAY_SHORT[d.day_of_week]).join(', ')})` : workLabel
}

export default function EmployeeScheduleIndex() {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [form, setForm] = useState({ employee_id: '', attendance_schedule_id: '', effective_from: '' })
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Assignment | null>(null)

  const fetchAssignments = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await axios.get('/api/v1/employee-schedules', { params: { page } })
      setData(res.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch assignments')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOptions = useCallback(async () => {
    try {
      const [empRes, schRes] = await Promise.all([
        axios.get('/api/v1/employees/options'),
        axios.get('/api/v1/attendance-schedules'),
      ])
      setEmployees(empRes.data.data)
      setSchedules(schRes.data.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchAssignments(); fetchOptions() }, [])

  const openCreate = () => {
    setForm({ employee_id: '', attendance_schedule_id: '', effective_from: new Date().toISOString().slice(0, 10) })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.employee_id || !form.attendance_schedule_id) {
      toast.error('Select an employee and a schedule')
      return
    }
    setSaving(true)
    try {
      await axios.put(`/api/v1/employees/${form.employee_id}/schedule`, {
        attendance_schedule_id: Number(form.attendance_schedule_id),
        effective_from: form.effective_from,
      })
      toast.success('Schedule assigned')
      setOpen(false)
      fetchAssignments()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await axios.delete(`/api/v1/employee-schedules/${deleting.id}`)
      toast.success('Assignment deleted')
      setDeleteOpen(false)
      setDeleting(null)
      fetchAssignments()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  const filteredEmployees = employees.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.full_name.toLowerCase().includes(q) || e.employee_number.toLowerCase().includes(q) || (e.id_number ?? '').toLowerCase().includes(q)
  })

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Employee Schedules" />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Employee Schedules</h1>
            <p className="text-sm text-muted-foreground">Assign weekly schedule templates to employees</p>
          </div>
          <Button onClick={openCreate}><CalendarPlus /> Assign Schedule</Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Filter employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-72" />
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchAssignments()}><RefreshCw className="size-4" /> Refresh</Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee #</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              )}
              {data?.data.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No assignments found</TableCell></TableRow>
              )}
              {data?.data.map(a => {
                const isActive = !a.effective_to
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono">{a.employee?.employee_number ?? '—'}</TableCell>
                    <TableCell className="font-mono">{a.employee?.id_number ?? '—'}</TableCell>
                    <TableCell>{a.employee?.full_name ?? '—'}</TableCell>
                    <TableCell>
                      <div className="font-medium">{a.attendance_schedule?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{scheduleSummary(a.attendance_schedule)}</div>
                    </TableCell>
                    <TableCell>{formatDate(a.effective_from)}</TableCell>
                    <TableCell>
                      {isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="size-3" /> Active</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground"><MinusCircle className="size-3 inline" /> {formatDate(a.effective_to)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setDeleting(a); setDeleteOpen(true) }}><Trash2 className="text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {data && data.meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={data.meta.current_page <= 1} onClick={() => fetchAssignments(data.meta.current_page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {data.meta.current_page} of {data.meta.last_page}</span>
            <Button variant="outline" size="sm" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => fetchAssignments(data.meta.current_page + 1)}>Next</Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Schedule</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.full_name} ({e.employee_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule Template</Label>
              <Select value={form.attendance_schedule_id} onValueChange={v => setForm({ ...form, attendance_schedule_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select schedule" /></SelectTrigger>
                <SelectContent>
                  {schedules.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Effective From</Label>
              <Input type="date" value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })} />
            </div>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Assignment?</AlertDialogTitle></AlertDialogHeader>
          <p className="my-2">Are you sure you want to delete this schedule assignment?</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
