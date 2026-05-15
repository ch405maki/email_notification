import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, Loader2, Download, Send, Users, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'CSV Upload', href: '#' },
]

type PreviewRow = {
  student_number: string
  email: string
  status: 'new' | 'duplicate' | 'already_sent'
}

type Stats = {
  total_students: number
  sent: number
  failed: number
  pending: number
}

export default function CsvUpload() {
  const [downloading, setDownloading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [polling, setPolling] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/v1/students/stats')
      setStats(res.data.data)
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(fetchStats, 3000)
    return () => clearInterval(interval)
  }, [polling, fetchStats])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await axios.get('/api/v1/students/download-template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'student_import_template.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download template')
    } finally {
      setDownloading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImported(null)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const text = evt.target?.result as string
      if (!text) {
        toast.error('Failed to read file')
        return
      }

      const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      const lines = normalized.split('\n').filter(Boolean)

      if (lines.length === 0) {
        toast.error('File is empty')
        return
      }

      let dataLines = lines
      const first = lines[0].toLowerCase()
      if (first.includes('student_number') || first.includes('student') || first.includes('email')) {
        dataLines = lines.slice(1)
      }

      const rows = dataLines.map(line => {
        const cols = line.split(',')
        return {
          student_number: cols[0]?.trim().replace(/^["']|["']$/g, '') || '',
          email: cols[1]?.trim().replace(/^["']|["']$/g, '') || '',
        }
      }).filter(r => r.student_number && r.email)

      if (rows.length === 0) {
        toast.error('No valid rows found in CSV. Check that your file has student_number and email columns.')
        return
      }

      try {
        const res = await axios.post('/api/v1/students/check-batch', {
          student_numbers: rows.map(r => r.student_number),
        })
        const { existing, sent } = res.data.data
        const existingSet = new Set(existing)
        const sentSet = new Set(sent)

        const annotated: PreviewRow[] = rows.map(r => ({
          ...r,
          status: sentSet.has(r.student_number)
            ? 'already_sent'
            : existingSet.has(r.student_number)
              ? 'duplicate'
              : 'new',
        }))

        setPreview(annotated)
        setDialogOpen(false)
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to check duplicates')
      }
    }

    reader.onerror = () => {
      toast.error('Failed to read file')
    }

    reader.readAsText(f)
  }

  const handleImport = async () => {
    const newRows = preview.filter(r => r.status === 'new')
    if (newRows.length === 0) {
      toast.error('No new students to import')
      return
    }
    setImporting(true)
    try {
      const res = await axios.post('/api/v1/students/import-json', {
        rows: newRows.map(r => ({ student_number: r.student_number, email: r.email })),
      })
      setImported(res.data.count)
      toast.success(res.data.message)
      setPreview([])
      if (fileRef.current) fileRef.current.value = ''
      fetchStats()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleSendAll = async () => {
    setSending(true)
    try {
      const res = await axios.post('/api/v1/students/send-bulk')
      toast.success(res.data.message)
      setPolling(true)
      fetchStats()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send emails')
    } finally {
      setSending(false)
    }
  }

  const handleCancel = () => {
    setPreview([])
    setImported(null)
    if (fileRef.current) fileRef.current.value = ''
    setDialogOpen(false)
  }

  const pendingRows = preview.filter(r => r.status !== 'already_sent')
  const alreadySentRows = preview.filter(r => r.status === 'already_sent')
  const newCount = preview.filter(r => r.status === 'new').length
  const duplicateCount = preview.filter(r => r.status === 'duplicate').length
  const alreadySentCount = alreadySentRows.length
  const allDone = stats && stats.pending === 0 && (stats.sent > 0 || stats.failed > 0)

  const statusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">New</Badge>
      case 'duplicate':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Existing</Badge>
      case 'already_sent':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Already Sent</Badge>
      default:
        return null
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="CSV Upload" />

      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">CSV Upload</h1>
            <p className="text-sm text-muted-foreground">
              Import students from a CSV file with columns: student_number, email
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download Template
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Upload className="size-4" />
              Upload CSV
            </Button>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select CSV File</DialogTitle>
              <DialogDescription>
                Choose a CSV file to import student records
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
              />
            </div>
          </DialogContent>
        </Dialog>

        {preview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="size-4" />
                Import Preview
              </CardTitle>
              <CardDescription>
                <span className="text-green-600 font-medium">{newCount} new</span>
                {duplicateCount > 0 && (
                  <span> &middot; <span className="text-yellow-600 font-medium">{duplicateCount} existing</span></span>
                )}
                {alreadySentCount > 0 && (
                  <span> &middot; <span className="text-blue-600 font-medium">{alreadySentCount} already sent</span></span>
                )}
                <span> &middot; {preview.length} total</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {imported !== null && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    {imported} students imported successfully
                  </Badge>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <AlertCircle className="size-4 text-yellow-500" />
                    Pending — Needs Email
                    <Badge variant="outline" className="ml-1 text-xs">{pendingRows.length}</Badge>
                  </h3>
                  <div className="flex gap-2">
                    {newCount > 0 && (
                      <Button size="sm" onClick={handleImport} disabled={importing}>
                        {importing && <Loader2 className="size-4 animate-spin" />}
                        <FileSpreadsheet className="size-4" />
                        Import {newCount} New
                      </Button>
                    )}
                  </div>
                </div>
                {pendingRows.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Student Number</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-mono">{row.student_number}</TableCell>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>{statusBadge(row.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3">All records in this upload have already received emails.</p>
                )}
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-blue-500" />
                    Already Sent
                    <Badge variant="outline" className="ml-1 text-xs">{alreadySentRows.length}</Badge>
                  </h3>
                </div>
                {alreadySentRows.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Student Number</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alreadySentRows.map((row, i) => (
                          <TableRow key={i} className="opacity-60">
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-mono">{row.student_number}</TableCell>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>{statusBadge(row.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3">No previously sent records in this upload.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>Clear</Button>
                {newCount > 0 && (
                  <Button size="sm" onClick={handleImport} disabled={importing}>
                    {importing && <Loader2 className="size-4 animate-spin" />}
                    <FileSpreadsheet className="size-4" />
                    Import {newCount} New
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-4" />
              Send All Emails
            </CardTitle>
            <CardDescription>
              Send onboarding emails to all students who haven't received one yet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-md">
                <Users className="size-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                  <p className="text-lg font-semibold">{stats?.total_students ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-md">
                <CheckCircle2 className="size-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-lg font-semibold">{stats?.sent ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-md">
                <XCircle className="size-5 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-lg font-semibold">{stats?.failed ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-md">
                <Clock className="size-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-semibold">{stats?.pending ?? '—'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSendAll} disabled={sending || !stats?.total_students}>
                {sending && <Loader2 className="size-4 animate-spin" />}
                <Send className="size-4" />
                Send All Emails
              </Button>

              {polling && !allDone && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="size-3 animate-spin mr-1" />
                  Processing...
                </Badge>
              )}

              {allDone && (
                <Badge variant="default" className="bg-green-500">
                  Complete
                </Badge>
              )}
            </div>

            {!stats?.total_students && (
              <p className="text-sm text-muted-foreground">
                No students found. Upload a CSV first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
