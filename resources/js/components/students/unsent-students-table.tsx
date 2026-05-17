import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { RefreshCw, Pencil, Trash2, Send, Users, X, Loader2 } from 'lucide-react'

type UnsentStudent = {
  id: number
  student_number: string
  email: string
}

type PaginatedResponse = {
  data: UnsentStudent[]
  current_page: number
  last_page: number
  total: number
}

interface Props {
  onClose: () => void
  onUpdated?: () => void
}

export default function UnsentStudentsTable({ onClose, onUpdated }: Props) {
  const [students, setStudents] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState<UnsentStudent | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<UnsentStudent | null>(null)
  const [editNumber, setEditNumber] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const [sendingIds, setSendingIds] = useState<Set<number>>(new Set())

  const fetchStudents = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await axios.get('/api/v1/students/unsent', { params: { page } })
      setStudents(res.data.data)
    } catch {
      toast.error('Failed to fetch unsent students')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const openDeleteDialog = (student: UnsentStudent) => {
    setDeletingStudent(student)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingStudent) return
    setDeleting(true)
    try {
      await axios.delete(`/api/v1/students/${deletingStudent.id}`)
      toast.success(`Student ${deletingStudent.student_number} deleted`)
      setDeleteDialogOpen(false)
      setDeletingStudent(null)
      fetchStudents()
      onUpdated?.()
    } catch {
      toast.error('Failed to delete student')
    } finally {
      setDeleting(false)
    }
  }

  const openEditDialog = (student: UnsentStudent) => {
    setEditingStudent(student)
    setEditNumber(student.student_number)
    setEditEmail(student.email)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingStudent) return
    setSaving(true)
    try {
      const res = await axios.put(`/api/v1/students/${editingStudent.id}`, {
        student_number: editNumber,
        email: editEmail,
      })
      toast.success(res.data.message)
      setEditDialogOpen(false)
      setEditingStudent(null)
      fetchStudents()
      onUpdated?.()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update student')
    } finally {
      setSaving(false)
    }
  }

  const handleSendSingle = async (student: UnsentStudent) => {
    setSendingIds(prev => new Set(prev).add(student.id))
    try {
      await axios.post('/api/v1/emails/send-single', {
        student_number: student.student_number,
        email: student.email,
        sync: true,
      })
      toast.success(`Email sent to ${student.student_number}`)
      fetchStudents()
      onUpdated?.()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send email')
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev)
        next.delete(student.id)
        return next
      })
    }
  }

  return (
    <div className="border rounded-md">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Unsent Students</h3>
          {students && (
            <Badge variant="outline" className="text-xs">
              {students.total}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchStudents()}>
            <RefreshCw className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student #</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && !students && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                Loading...
              </TableCell>
            </TableRow>
          )}
          {students?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                <Users className="size-8 mx-auto mb-2 opacity-40" />
                No unsent students
              </TableCell>
            </TableRow>
          )}
          {students?.data.map(student => (
            <TableRow key={student.id}>
              <TableCell className="font-mono">{student.student_number}</TableCell>
              <TableCell>{student.email}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendSingle(student)}
                    disabled={sendingIds.has(student.id)}
                  >
                    {sendingIds.has(student.id) ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    Send
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(student)}>
                    <Trash2 className="size-3.5 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {students && students.last_page > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            disabled={students.current_page <= 1}
            onClick={() => fetchStudents(students.current_page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {students.current_page} of {students.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={students.current_page >= students.last_page}
            onClick={() => fetchStudents(students.current_page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student number or email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-student-number">Student Number</Label>
              <Input
                id="edit-student-number"
                value={editNumber}
                onChange={e => setEditNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingStudent?.student_number}</strong> ({deletingStudent?.email})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600">
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
