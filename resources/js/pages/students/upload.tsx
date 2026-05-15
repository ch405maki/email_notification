import { useState, useRef } from 'react'
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
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, Loader2, Download } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'CSV Upload', href: '#' },
]

export default function CsvUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ student_number: string; email: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
    setFile(f)
    setImported(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split('\n').filter(Boolean)
      const rows = lines.slice(1).map(line => {
        const cols = line.split(',')
        return {
          student_number: cols[0]?.trim() || '',
          email: cols[1]?.trim() || '',
        }
      }).filter(r => r.student_number && r.email)
      setPreview(rows)
    }
    reader.readAsText(f)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axios.post('/api/v1/students/upload', formData)
      setImported(res.data.count)
      toast.success(res.data.message)
      setFile(null)
      setPreview([])
      if (fileRef.current) fileRef.current.value = ''
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="CSV Upload" />

      <div className="flex flex-col gap-6 p-4">
        <div>
          <h1 className="text-xl font-semibold">CSV Upload</h1>
          <p className="text-sm text-muted-foreground">
            Import students from a CSV file with columns: student_number, email
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="size-4" />
              CSV Template
            </CardTitle>
            <CardDescription>
              Download a sample CSV template with the correct format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="size-4" />
              Upload File
            </CardTitle>
            <CardDescription>
              Select a CSV file to preview and import student records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {preview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {preview.length} records found
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setFile(null); setPreview([]); if (fileRef.current) fileRef.current.value = '' }}>
                      Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={importing}>
                      {importing && <Loader2 className="size-4 animate-spin" />}
                      <FileSpreadsheet className="size-4" />
                      Import {preview.length} Students
                    </Button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Student Number</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-mono">{row.student_number}</TableCell>
                          <TableCell>{row.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {imported !== null && (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  {imported} students imported successfully
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
