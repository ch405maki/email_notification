import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { CalendarPlus, UserRoundPen, Trash2, Plus, Moon } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Attendance', href: '/attendance/schedules' },
  { title: 'Schedules', href: '#' },
]

type DayTime = { scheduled_time: string }
type Day = { day_of_week: number; is_rest_day: boolean; times: DayTime[] }
type Schedule = { id: number; name: string; days: Day[] }

const DAY_NAMES: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
]

const to12Hour = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

const emptyDays = (): Day[] =>
  DAY_NAMES.map(d => ({ day_of_week: d.value, is_rest_day: false, times: [{ scheduled_time: '08:00' }] }))

const normalizeDays = (days: Day[]): Day[] =>
  DAY_NAMES.map(d => {
    const existing = days.find(x => x.day_of_week === d.value)
    return {
      day_of_week: d.value,
      is_rest_day: existing?.is_rest_day ?? false,
      times: existing?.times.length ? existing.times : [{ scheduled_time: '08:00' }],
    }
  })

const dayLabel = (dayOfWeek: number) => DAY_NAMES.find(d => d.value === dayOfWeek)?.label ?? dayOfWeek

export default function ScheduleIndex() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [form, setForm] = useState<{ name: string; days: Day[] }>({ name: '', days: emptyDays() })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Schedule | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/v1/attendance-schedules')
      setSchedules(res.data.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch schedules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', days: emptyDays() })
    setOpen(true)
  }

  const openEdit = (s: Schedule) => {
    setEditing(s)
    setForm({ name: s.name, days: normalizeDays(s.days) })
    setOpen(true)
  }

  const updateDay = (dayOfWeek: number, patch: Partial<Day>) => {
    setForm(f => ({
      ...f,
      days: f.days.map(d => (d.day_of_week === dayOfWeek ? { ...d, ...patch } : d)),
    }))
  }

  const updateTime = (dayOfWeek: number, index: number, scheduled_time: string) => {
    setForm(f => ({
      ...f,
      days: f.days.map(d =>
        d.day_of_week === dayOfWeek
          ? { ...d, times: d.times.map((t, i) => (i === index ? { scheduled_time } : t)) }
          : d
      ),
    }))
  }

  const addTime = (dayOfWeek: number) => {
    setForm(f => ({
      ...f,
      days: f.days.map(d => (d.day_of_week === dayOfWeek ? { ...d, times: [...d.times, { scheduled_time: '08:00' }] } : d)),
    }))
  }

  const removeTime = (dayOfWeek: number, index: number) => {
    setForm(f => ({
      ...f,
      days: f.days.map(d =>
        d.day_of_week === dayOfWeek
          ? { ...d, times: d.times.filter((_, i) => i !== index) }
          : d
      ),
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Schedule name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        days: form.days.map(d => ({
          day_of_week: d.day_of_week,
          is_rest_day: d.is_rest_day,
          times: d.is_rest_day
            ? []
            : d.times.map((t, index) => ({ scheduled_time: t.scheduled_time, sequence: index + 1 })),
        })),
      }
      if (editing) {
        await axios.put(`/api/v1/attendance-schedules/${editing.id}`, payload)
        toast.success('Schedule updated')
      } else {
        await axios.post('/api/v1/attendance-schedules', payload)
        toast.success('Schedule created')
      }
      setOpen(false)
      fetchSchedules()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await axios.delete(`/api/v1/attendance-schedules/${deleting.id}`)
      toast.success('Schedule deleted')
      setDeleteOpen(false)
      setDeleting(null)
      fetchSchedules()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  const workingDays = (s: Schedule) =>
    s.days.filter(d => !d.is_rest_day).length

  const scheduleSummary = (s: Schedule) => {
    const work = s.days.filter(d => !d.is_rest_day)
    const rest = s.days.filter(d => d.is_rest_day)
    const workLabel = work.length
      ? work.map(d => `${dayLabel(d.day_of_week)} ${d.times.map(t => to12Hour(t.scheduled_time)).join(', ')}`).join(' · ')
      : 'No working days'
    const restLabel = rest.length ? `Rest: ${rest.map(d => dayLabel(d.day_of_week)).join(', ')}` : 'No rest days'
    const summary = `${workLabel} — ${restLabel}`
    return summary.length > 50 ? `${summary.slice(0, 47)}...` : summary
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Schedules" />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Schedule Templates</h1>
            <p className="text-sm text-muted-foreground">Manage weekly attendance schedule templates</p>
          </div>
          <Button onClick={openCreate}><CalendarPlus /> Add Schedule</Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Weekly Plan</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : schedules.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No schedules found</TableCell></TableRow>
              ) : schedules.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{workingDays(s)} working day(s)</div>
                  </TableCell>
                  <TableCell className="max-w-xl">
                    <div className="text-sm text-muted-foreground">{scheduleSummary(s)}</div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><UserRoundPen /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeleting(s); setDeleteOpen(true) }}><Trash2 className="text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Schedule Template' : 'Create Schedule Template'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Regular Office" />
            </div>

            <div className="flex flex-col gap-3">
              {form.days.map(day => (
                <div key={day.day_of_week} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{dayLabel(day.day_of_week)}</div>
                    <div className="flex items-center gap-2">
                      <Moon className="size-4 text-muted-foreground" />
                      <Switch
                        checked={day.is_rest_day}
                        onCheckedChange={v => updateDay(day.day_of_week, { is_rest_day: v, times: v ? [] : day.times })}
                      />
                      <span className="text-sm text-muted-foreground">Rest day</span>
                    </div>
                  </div>

                  {!day.is_rest_day && (
                    <div className="mt-2 flex flex-col gap-2">
                      {day.times.map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-5">{index + 1}.</span>
                          <Input type="time" value={time.scheduled_time} onChange={e => updateTime(day.day_of_week, index, e.target.value)} className="w-40" />
                          <Button variant="ghost" size="icon" disabled={day.times.length === 1} onClick={() => removeTime(day.day_of_week, index)}>
                            <Trash2 className="text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addTime(day.day_of_week)}><Plus /> Add Time Slot</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Schedule?</AlertDialogTitle></AlertDialogHeader>
          <p className="my-2">Are you sure you want to delete <strong>{deleting?.name}</strong>?</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
