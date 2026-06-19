import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, Library, Copy, CopyCheck, Search, RefreshCw, Printer, Trash2 } from 'lucide-react'
import { formatDate, formatDateShort } from '@/lib/utils'
import { printIdApplications } from '@/lib/print-id-applications'

const API_BASE = 'http://192.168.0.6/api'
const API_KEY = '12345'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  xsrfHeaderName: null,
  xsrfCookieName: null,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'ID Application', href: '#' },
]

type Application = {
  id: number
  id_no: string | null
  last_name: string
  first_name: string
  middle_initial: string
  address: string
  contact_no: string
  em_full_name: string
  em_contact_no: string
  date: string | null
  status: 'pending' | 'approved' | 'released' | 'printed'
}

const statusColors: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  released: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  printed:  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

const fieldLabels: Record<string, string> = {
  id_no:         'ID No',
  last_name:     'Last Name',
  first_name:    'First Name',
  middle_initial:'Middle Initial',
  address:       'Address',
  contact_no:    'Contact No',
  em_full_name:  'Emergency Contact Name',
  em_contact_no: 'Emergency Contact No',
  date:          'Date',
  status:        'Status',
}

export default function IdApplication() {
  const [applications, setApplications] = useState<Application[]>([])
  const [selected, setSelected]         = useState<Application | null>(null)
  const [loading, setLoading]           = useState(true)
  const [updating, setUpdating]         = useState<string | null>(null)
  const [copiedField, setCopiedField]   = useState<string | null>(null)
  const [errorType, setErrorType]       = useState<string | null>(null)
  const [searchQuery, setSearchQuery]   = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusTab, setStatusTab]       = useState('pending')
  const [selectedIds, setSelectedIds]   = useState<number[]>([])
  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [editingIdNo, setEditingIdNo]   = useState('')
  const [editingId, setEditingId]       = useState(false)
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')

  const isDetailView = statusTab === 'pending'

  useEffect(() => { setSelectedIds([]) }, [statusTab])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Sync editingIdNo when selected changes
  useEffect(() => {
    setEditingIdNo(selected?.id_no ?? '')
    setEditingId(false)
  }, [selected])

  const filtered = useMemo(() => {
    let result = applications.filter(app => app.status === statusTab)
    if (dateFrom) {
      result = result.filter(app => !app.date || app.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter(app => !app.date || app.date <= dateTo)
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(app => {
        const fullName = `${app.last_name} ${app.first_name} ${app.middle_initial}`.toLowerCase()
        return (app.id_no ?? '').toLowerCase().includes(q) || fullName.includes(q)
      })
    }
    return result
  }, [applications, statusTab, dateFrom, dateTo, debouncedSearch])

  // Deselect if no longer in filtered list
  useEffect(() => {
    if (selected && !filtered.find(a => a.id === selected.id)) {
      setSelected(null)
    }
  }, [filtered])

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setErrorType(null)
    try {
      const res = await api.get('/id-applications', { params: { api_key: API_KEY } })
      const data = Array.isArray(res.data) ? res.data : res.data.data ?? []
      setApplications(data)
    } catch (error: any) {
      const status = error.response?.status
      if (status === 401) { setErrorType('unauthorized'); toast.error('Invalid API key') }
      else { setErrorType('network'); toast.error('Unable to load data') }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const copyToClipboard = useCallback(async (value: string, field: string) => {
    const fallback = () => {
      const el = document.createElement('textarea')
      el.value = value
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      try { document.execCommand('copy'); document.body.removeChild(el); return true }
      catch { document.body.removeChild(el); return false }
    }
    try { await navigator.clipboard.writeText(value) }
    catch { if (!fallback()) { toast.error('Failed to copy'); return } }
    setCopiedField(field)
    toast.success('Copied')
    setTimeout(() => setCopiedField(null), 1500)
  }, [])

  const updateStatus = useCallback(async (appId: number, newStatus: string, newIdNo?: string) => {
    setUpdating(String(appId))
    try {
      const res = await api.post(`/id-applications/${appId}/status`, {
        status:  newStatus,
        ...(newIdNo?.trim() ? { id_no: newIdNo.trim() } : {}),
        api_key: API_KEY,
      })

      const savedIdNo = res.data.id_no

      setApplications(prev =>
        prev.map(a => a.id === appId
          ? { ...a, status: newStatus as Application['status'], id_no: savedIdNo ?? a.id_no }
          : a
        )
      )
      setSelected(prev =>
        prev?.id === appId
          ? { ...prev, status: newStatus as Application['status'], id_no: savedIdNo ?? prev.id_no }
          : prev
      )
      setEditingIdNo('')
      toast.success(res.data.message || 'Application updated')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update')
    } finally {
      setUpdating(null)
    }
  }, [])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(
      filtered.length > 0 && selectedIds.length === filtered.length
        ? []
        : filtered.map(app => app.id).filter(Boolean)
    )
  }

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await api.delete('/id-applications', {
        params: { ids: selectedIds, api_key: API_KEY },
      })
      toast.success(`Deleted ${selectedIds.length} application(s)`)
      setSelectedIds([])
      setDeleteOpen(false)
      fetchApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }, [selectedIds, fetchApplications])

  const handlePrint = useCallback(() => {
    printIdApplications(filtered, statusTab)
  }, [filtered, statusTab])

  const formattedName = (app: Application) =>
    `${app.last_name}, ${app.first_name}${app.middle_initial ? ' ' + app.middle_initial + '.' : ''}`

  const renderCopyCell = (value: string | null, cellId: string) => (
    <TableCell
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => copyToClipboard(String(value ?? ''), cellId)}
      title="Click to copy"
    >
      <span className="flex items-center gap-1.5">
        {copiedField === cellId
          ? <CopyCheck className="size-3.5 text-green-500 shrink-0" />
          : <Copy className="size-3.5 text-muted-foreground shrink-0" />
        }
        {value ?? '—'}
      </span>
    </TableCell>
  )

  if (loading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="ID Application" />
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (errorType) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="ID Application" />
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          {errorType === 'unauthorized' ? (
            <>
              <Library className="size-14 mb-3 opacity-40" />
              <p className="text-lg font-medium">Invalid API key</p>
              <p className="text-sm">Please check your API credentials</p>
            </>
          ) : (
            <>
              <Loader2 className="size-14 mb-3 opacity-40" />
              <p className="text-lg font-medium">Unable to load data</p>
              <p className="text-sm">Check your connection and try again</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={fetchApplications}>Retry</Button>
            </>
          )}
        </div>
      </AppLayout>
    )
  }

  if (applications.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="ID Application" />
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Library className="size-14 mb-3 opacity-40" />
          <p className="text-lg font-medium">No applications found</p>
        </div>
      </AppLayout>
    )
  }

  const renderTableView = () => {
    const allSelected = filtered.length > 0 && selectedIds.length === filtered.length
    return (
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <div className="flex flex-col gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="size-4" /> Delete Selected
                </Button>
              </AlertDialogTrigger>
            </div>
          )}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead>ID No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <Library className="size-8 mx-auto mb-2 opacity-40" />
                      No matching records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((app, i) => {
                    const rowKey = app.id_no ?? `row-${i}`
                    return (
                    <TableRow key={rowKey}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(app.id)}
                          onCheckedChange={() => toggleSelect(app.id)}
                          aria-label={`Select ${app.id_no ?? 'row ' + i}`}
                        />
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-sm">{i + 1}</TableCell>
                      {renderCopyCell(app.id_no, `id-${rowKey}`)}
                      <TableCell
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => copyToClipboard(formattedName(app), `name-${rowKey}`)}
                        title="Click to copy"
                      >
                        <span className="flex items-center gap-1.5">
                          {copiedField === `name-${rowKey}`
                            ? <CopyCheck className="size-3.5 text-green-500 shrink-0" />
                            : <Copy className="size-3.5 text-muted-foreground shrink-0" />
                          }
                          {formattedName(app)}
                        </span>
                      </TableCell>
                      {renderCopyCell(app.contact_no, `cn-${rowKey}`)}
                      <TableCell
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => copyToClipboard(String(app.date ?? ''), `dt-${rowKey}`)}
                        title="Click to copy"
                      >
                        <span className="flex items-center gap-1.5">
                          {copiedField === `dt-${rowKey}`
                            ? <CopyCheck className="size-3.5 text-green-500 shrink-0" />
                            : <Copy className="size-3.5 text-muted-foreground shrink-0" />
                          }
                          {formatDateShort(app.date)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {statusTab === 'released' ? (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateStatus(app.id!, 'printed')}
                            disabled={updating === String(app.id)}
                          >
                            {updating === String(app.id)
                              ? <Loader2 className="size-4 animate-spin" />
                              : <Printer className="size-4" />
                            }
                            Mark as Printed
                          </Button>
                        ) : (
                          <Badge className={statusColors.printed}>
                            <CheckCircle2 className="size-3.5 mr-1" /> Printed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Applications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} application(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive  hover:bg-red-700"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="ID Application" />

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">ID Application</h1>
            <p className="text-sm text-muted-foreground">View and manage ID applications</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchApplications}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Tabs value={statusTab} onValueChange={v => setStatusTab(v)}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="released">Released</TabsTrigger>
              <TabsTrigger value="printed">Printed</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ID or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-36 h-9"
              title="Date from"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-36 h-9"
              title="Date to"
            />
            <Button variant="default" size="sm" onClick={handlePrint}>
              <Printer className="size-4" /> Print
            </Button>
          </div>
        </div>

        {isDetailView ? (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

              {/* Left — list */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="size-4" /> Delete Selected
                      </Button>
                    </AlertDialogTrigger>
                  </div>
                )}
                <div className="border rounded-md max-h-[calc(100vh-20rem)] overflow-y-auto flex-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={filtered.length > 0 && selectedIds.length === filtered.length}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead className="w-8 text-center">#</TableHead>
                        <TableHead className="w-22 text-start">ID No</TableHead>
                        <TableHead className="text-start">Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No matching records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((app, i) => (
                          <TableRow
                            key={app.id}
                            className={`cursor-pointer ${selected?.id === app.id ? 'bg-green-50 dark:bg-green-950' : 'hover:bg-muted/50'}`}
                            onClick={() => setSelected(app)}
                          >
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.includes(app.id)}
                                onCheckedChange={() => toggleSelect(app.id)}
                                aria-label={`Select ${app.id_no ?? 'row ' + i}`}
                              />
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground text-sm">{i + 1}</TableCell>
                            <TableCell className={`text-start font-mono font-medium ${!app.id_no ? 'text-destructive' : ''}`}>
                              {app.id_no ?? (
                                <span className="text-destructive text-xs font-sans font-medium">Missing</span>
                              )}
                            </TableCell>
                            <TableCell className="text-start text-muted-foreground">{formattedName(app)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Right — detail */}
              <div className="flex-1 min-w-0">
                {selected ? (
                  <div className="border rounded-md p-5 space-y-5">
                    <div className="space-y-4">

                      {/* ID No — copyable if present, editable on double-click or if missing */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                          {fieldLabels['id_no']}
                          {!selected.id_no && (
                            <span className="text-destructive font-semibold text-xs">* Required before releasing</span>
                          )}
                        </div>
                        {selected.id_no && !editingId ? (
                          <button
                            onClick={() => copyToClipboard(selected.id_no, 'id_no')}
                            onDoubleClick={() => { setEditingIdNo(selected.id_no ?? ''); setEditingId(true) }}
                            className="w-full text-left flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                            title="Click to copy, double-click to edit"
                          >
                            {copiedField === 'id_no'
                              ? <CopyCheck className="size-3.5 text-green-500 shrink-0" />
                              : <Copy className="size-3.5 text-muted-foreground shrink-0" />
                            }
                            <span className="text-sm font-mono">{selected.id_no}</span>
                          </button>
                        ) : (
                          <Input
                            value={editingIdNo}
                            onChange={e => setEditingIdNo(e.target.value)}
                            placeholder="Enter ID number"
                            className={`h-8 text-sm font-mono ${
                              !selected.id_no && !editingIdNo
                                ? 'border-destructive focus-visible:ring-destructive bg-destructive/5 placeholder:text-destructive/40'
                                : ''
                            }`}
                          />
                        )}
                      </div>

                      {/* Full Name — copyable */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Full Name</div>
                        <button
                          onClick={() => copyToClipboard(formattedName(selected), 'full_name')}
                          className="w-full text-left flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                          title="Click to copy"
                        >
                          {copiedField === 'full_name'
                            ? <CopyCheck className="size-3.5 text-green-500 shrink-0" />
                            : <Copy className="size-3.5 text-muted-foreground shrink-0" />
                          }
                          <span className="text-sm truncate">{formattedName(selected)}</span>
                        </button>
                      </div>

                      {/* All other fields — copyable */}
                      {(['address', 'contact_no', 'em_full_name', 'em_contact_no', 'date'] as const).map(field => (
                        <div key={field}>
                          <div className="text-xs font-medium text-muted-foreground mb-1">{fieldLabels[field]}</div>
                          <button
                            onClick={() => copyToClipboard(String(selected[field] ?? ''), field)}
                            className="w-full text-left flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                            title="Click to copy"
                          >
                            {copiedField === field
                              ? <CopyCheck className="size-3.5 text-green-500 shrink-0" />
                              : <Copy className="size-3.5 text-muted-foreground shrink-0" />
                            }
                            <span className="text-sm truncate">
                              {field === 'date' ? formatDateShort(selected[field]) : (selected[field] ?? '—')}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Badge className={statusColors[selected.status]}>
                        {selected.status}
                      </Badge>

                      {selected.status === 'pending' ? (
                        <Button
                          onClick={() => {
                            const hasChanged = editingIdNo.trim() !== (selected.id_no ?? '')
                            updateStatus(
                              selected.id!,
                              'released',
                              hasChanged ? editingIdNo : undefined
                            )
                          }}
                          disabled={
                            (!selected.id_no && !editingIdNo.trim()) ||
                            updating === String(selected.id)
                          }
                          title={!selected.id_no && !editingIdNo.trim() ? 'Enter an ID number first' : undefined}
                        >
                          {updating === String(selected.id)
                            ? <Loader2 className="size-4 animate-spin" />
                            : <CheckCircle2 className="size-4" />
                          }
                          Mark as Released
                        </Button>
                      ) : (
                        <Badge className={statusColors[selected.status]}>
                          <CheckCircle2 className="size-3.5 mr-1" />
                          {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-md flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <Library className="size-12 mb-3 opacity-40" />
                    <p className="text-base font-medium">Select an application</p>
                    <p className="text-sm">Choose a record from the left panel to view details</p>
                  </div>
                )}
              </div>
            </div>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Applications</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {selectedIds.length} application(s)? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive  hover:bg-red-700"
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          renderTableView()
        )}
      </div>
    </AppLayout>
  )
}