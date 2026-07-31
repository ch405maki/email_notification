import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Search, RefreshCw, UserRoundPlus, UserRoundPen, UserRoundX } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Attendance', href: '/attendance/employees' },
  { title: 'Employees', href: '#' },
]

type Employee = {
  id: number
  employee_number: string
  id_number: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  full_name: string
  status: string
}

type PaginatedResponse = {
  data: Employee[]
  meta: { current_page: number; last_page: number; total: number }
}

export default function EmployeeIndex() {
  const [employees, setEmployees] = useState<PaginatedResponse | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ employee_number: '', id_number: '', first_name: '', middle_name: '', last_name: '', status: 'ACTIVE' })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchEmployees = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page }
      if (search) params.search = search
      const res = await axios.get('/api/v1/employees', { params })
      setEmployees(res.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => fetchEmployees(), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => { fetchEmployees() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ employee_number: '', id_number: '', first_name: '', middle_name: '', last_name: '', status: 'ACTIVE' })
    setOpen(true)
  }

  const openEdit = (emp: Employee) => {
    setEditing(emp)
    setForm({
      employee_number: emp.employee_number,
      id_number: emp.id_number ?? '',
      first_name: emp.first_name,
      middle_name: emp.middle_name ?? '',
      last_name: emp.last_name,
      status: emp.status,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await axios.put(`/api/v1/employees/${editing.id}`, form)
        toast.success('Employee updated')
      } else {
        await axios.post('/api/v1/employees', form)
        toast.success('Employee created')
      }
      setOpen(false)
      fetchEmployees()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await axios.delete(`/api/v1/employees/${deleting.id}`)
      toast.success('Employee deleted')
      setDeleteOpen(false)
      setDeleting(null)
      fetchEmployees()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Employees" />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage employee records</p>
          </div>
          <Button onClick={openCreate}><UserRoundPlus /> Add Employee</Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-72" />
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchEmployees()}><RefreshCw className="size-4" /> Refresh</Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee #</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !employees && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              )}
              {employees?.data.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No employees found</TableCell></TableRow>
              )}
              {employees?.data.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono">{emp.employee_number}</TableCell>
                  <TableCell className="font-mono">{emp.id_number ?? '—'}</TableCell>
                  <TableCell>{emp.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={emp.status === 'ACTIVE' ? 'default' : 'destructive'}>{emp.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><UserRoundPen /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeleting(emp); setDeleteOpen(true) }}><UserRoundX className="text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {employees && employees.meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={employees.meta.current_page <= 1} onClick={() => fetchEmployees(employees.meta.current_page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {employees.meta.current_page} of {employees.meta.last_page}</span>
            <Button variant="outline" size="sm" disabled={employees.meta.current_page >= employees.meta.last_page} onClick={() => fetchEmployees(employees.meta.current_page + 1)}>Next</Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Employee' : 'Create Employee'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Employee Number</Label><Input value={form.employee_number} onChange={e => setForm({ ...form, employee_number: e.target.value })} /></div>
            <div><Label>ID Number</Label><Input value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>First Name</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><Label>Middle Name</Label><Input value={form.middle_name} onChange={e => setForm({ ...form, middle_name: e.target.value })} /></div>
              <div><Label>Last Name</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Employee?</AlertDialogTitle></AlertDialogHeader>
          <p className="my-2">Are you sure you want to delete <strong>{deleting?.full_name}</strong>?</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
