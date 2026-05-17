import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head, Link } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { RefreshCw, Mail, Search, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Email Logs', href: '#' },
]

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

export default function Logs() {
  const [logs, setLogs] = useState<PaginatedResponse | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page }
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search
      const res = await axios.get('/api/v1/email-logs', { params })
      setLogs(res.data.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchLogs()
  }, [statusFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Email Logs" />

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Email Logs</h1>
            <p className="text-sm text-muted-foreground">
              Monitor sent, pending, and failed emails
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 w-72"
            />
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student #</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !logs && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {logs?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                  <TableCell className="text-sm">
                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-sm text-red-500">
                    {log.error_message || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {logs && logs.last_page > 1 && (
          <div className="flex items-center justify-center gap-2">
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
      </div>
    </AppLayout>
  )
}
