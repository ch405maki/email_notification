import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { CalendarPlus, UserRoundPen, Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Attendance', href: '/attendance/schedules' },
  { title: 'Schedules', href: '#' },
]

type ScheduleTime = {
  id: number
  scheduled_time: string
  sequence: number
}

type Schedule = {
  id: number
  name: string
  schedule_times: ScheduleTime[]
}

const to12Hour = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

export default function ScheduleIndex() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [form, setForm] = useState<{ name: string; times: string[] }>({ name: '', times: [] })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Schedule | null>(null)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/v1/schedules')
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
    setForm({ name: '', times: [''] })
    setOpen(true)
  }

  const openEdit = (s: Schedule) => {
    setEditing(s)
    setForm({
      name: s.name,
      times: s.schedule_times.map(t => t.scheduled_time.slice(0, 5)),
    })
    setOpen(true)
  }

  const addTime = () => setForm(f => ({ ...f, times: [...f.times, ''] }))
  const removeTime = (index: number) => setForm(f => ({ ...f, times: f.times.filter((_, i) => i !== index) }))
  const setTime = (index: number, value: string) => setForm(f => ({
    ...f,
    times: f.times.map((t, i) => (i === index ? value : t)),
  }))
  const moveTime = (index: number, dir: -1 | 1) => setForm(f => {
    const times = [...f.times]
    const target = index + dir
    if (target < 0 || target >= times.length) return f
    ;[times[index], times[target]] = [times[target], times[index]]
    return { ...f, times }
  })

  const handleSave = async () => {
    try {
      const payload = { name: form.name, schedule_times: form.times }
      if (editing) {
        await axios.put(`/api/v1/schedules/${editing.id}`, payload)
        toast.success('Schedule updated')
      } else {
        await axios.post('/api/v1/schedules', payload)
        toast.success('Schedule created')
      }
      setOpen(false)
      fetchSchedules()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await axios.delete(`/api/v1/schedules/${deleting.id}`)
      toast.success('Schedule deleted')
      setDeleteOpen(false)
      setDeleting(null)
      fetchSchedules()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Schedules" />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Schedules</h1>
            <p className="text-sm text-muted-foreground">Manage attendance schedules</p>
          </div>
          <Button onClick={openCreate}><CalendarPlus /> Add Schedule</Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Schedule Times</TableHead>
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
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.schedule_times.map(t => (
                        <span key={t.id} className="font-mono text-xs border rounded px-1.5 py-0.5 bg-muted">
                          {to12Hour(t.scheduled_time)}
                        </span>
                      ))}
                    </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Regular Office" /></div>
            <div>
              <Label>Schedule Times</Label>
              <div className="flex flex-col gap-2 mt-1">
                {form.times.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-5">{index + 1}.</span>
                    <Input type="time" value={time} onChange={e => setTime(index, e.target.value)} />
                    <Button variant="ghost" size="icon" disabled={index === 0} onClick={() => moveTime(index, -1)}><ArrowUp /></Button>
                    <Button variant="ghost" size="icon" disabled={index === form.times.length - 1} onClick={() => moveTime(index, 1)}><ArrowDown /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeTime(index)}><Trash2 className="text-red-500" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addTime}><Plus /> Add Time</Button>
              </div>
            </div>
            <Button onClick={handleSave}>Save</Button>
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
