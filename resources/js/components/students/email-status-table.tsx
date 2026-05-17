import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { RefreshCw, Search, CheckCircle2, XCircle, Clock, Pencil, Trash2, Mail, X, Loader2 } from 'lucide-react'

type EmailLog = {
  id: number
  student_number: string
  email: string
  subject: string
  status: 'pending' | 'sent' | 'failed'
  error_message: string | null
  sent_at: string | null
  created_at: string
}

type PaginatedResponse = {
  data: EmailLog[]
  current_page: number
  last_page: number
  total: number
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="size-3.5" />,
  sent: <CheckCircle2 className="size-3.5" />,
  failed: <XCircle className="size-3.5" />,
}

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  sent: 'Sent',
  failed: 'Failed',
}

interface Props {
  status: string | null
  onClose: () => void
  onUpdated?: () => void
}

export default function EmailStatusTable({ status, onClose, onUpdated }: Props) {
  const [logs, setLogs] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<EmailLog | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editErrorMessage, setEditErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingLog, setDeletingLog] = useState<EmailLog | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page }
      if (status) params.status = status
      if (search) params.search = search
      const res = await axios.get('/api/v1/email-logs', { params })
      setLogs(res.data.data)
    } catch {
      toast.error('Failed to fetch email logs')
    } finally {
      setLoading(false)
    }
  }, [status, search])

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const openEditDialog = (log: EmailLog) => {
    setEditingLog(log)
    setEditStatus(log.status)
    setEditErrorMessage(log.error_message || '')
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingLog) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { status: editStatus }
      if (editStatus === 'failed') {
        payload.error_message = editErrorMessage
      }
      if (editStatus === 'sent') {
        payload.sent_at = editingLog.sent_at || new Date().toISOString()
      }
      await axios.put(`/api/v1/email-logs/${editingLog.id}`, payload)
      toast.success('Email log updated')
      setEditDialogOpen(false)
      fetchLogs()
      onUpdated?.()
    } catch {
      toast.error('Failed to update email log')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteDialog = (log: EmailLog) => {
    setDeletingLog(log)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingLog) return
    setDeleting(true)
    try {
      await axios.delete(`/api/v1/email-logs/${deletingLog.id}`)
      toast.success('Email log deleted')
      setDeleteDialogOpen(false)
      setDeletingLog(null)
      fetchLogs()
      onUpdated?.()
    } catch {
      toast.error('Failed to delete email log')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="border rounded-md">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">
            {status ? `${statusLabel[status] ?? 'All'} Emails` : 'All Emails'}
          </h3>
          {logs && (
            <Badge variant="outline" className="text-xs">
              {logs.total}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 h-8 w-60"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
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
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent At</TableHead>
            <TableHead>Error</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && !logs && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Loading...
              </TableCell>
            </TableRow>
          )}
          {logs?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                <Mail className="size-8 mx-auto mb-2 opacity-40" />
                No email logs found
              </TableCell>
            </TableRow>
          )}
          {logs?.data.map(log => (
            <TableRow key={log.id}>
              <TableCell className="font-mono">{log.student_number}</TableCell>
              <TableCell>{log.email}</TableCell>
              <TableCell className="max-w-48 truncate">{log.subject}</TableCell>
              <TableCell>
                <Badge className={statusColors[log.status]}>
                  <span className="flex items-center gap-1">
                    {statusIcons[log.status]}
                    {log.status}
                  </span>
                </Badge>
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {formatDate(log.sent_at)}
              </TableCell>
              <TableCell className="max-w-40 truncate text-sm text-red-500">
                {log.error_message || '—'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(log)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(log)}>
                    <Trash2 className="size-3.5 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {logs && logs.last_page > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            disabled={logs.current_page <= 1}
            onClick={() => fetchLogs(logs.current_page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {logs.current_page} of {logs.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={logs.current_page >= logs.last_page}
            onClick={() => fetchLogs(logs.current_page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Email Log</DialogTitle>
            <DialogDescription>
              Editing log for {editingLog?.student_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger id="edit-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editStatus === 'failed' && (
              <div>
                <Label htmlFor="edit-error">Error Message</Label>
                <textarea
                  id="edit-error"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={editErrorMessage}
                  onChange={e => setEditErrorMessage(e.target.value)}
                />
              </div>
            )}
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
            <AlertDialogTitle>Delete Email Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the log for <strong>{deletingLog?.student_number}</strong>? This action cannot be undone.
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
