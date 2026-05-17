import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Save, Eye, RotateCcw, Loader2, Pencil } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Email Template', href: '#' },
]

export default function EmailTemplate() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('email_template')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.subject && parsed.body) {
          setSubject(parsed.subject)
          setBody(parsed.body)
          setLoading(false)
          return
        }
      } catch { /* ignore */ }
    }
    axios.get('/api/v1/emails/template')
      .then(res => {
        setSubject(res.data.data.subject)
        setBody(res.data.data.body)
      })
      .catch(() => toast.error('Failed to load template'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (iframeRef.current && body) {
      iframeRef.current.srcdoc = body
    }
  }, [body])

  const handleSave = () => {
    try {
      localStorage.setItem('email_template', JSON.stringify({ subject, body }))
      toast.success('Template saved locally')
    } catch {
      toast.error('Failed to save template')
    }
  }

  const handleReset = async () => {
    try {
      localStorage.removeItem('email_template')
      const res = await axios.get('/api/v1/emails/template')
      setSubject(res.data.data.subject)
      setBody(res.data.data.body)
      toast.success('Reset to default template')
    } catch {
      toast.error('Failed to reset template')
    }
  }

  if (loading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Email Template" />
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Email Template" />

      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Email Template</h1>
            <p className="text-sm text-muted-foreground">
              Edit the subject and body used for bulk emails. Use {'{student_number}'} as a placeholder.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="size-4" />
              Reset to Default
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="size-4" />
              Save
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pencil className="size-4" />
                Editor
              </CardTitle>
              <CardDescription>
                Customize the email template content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template-subject">Subject</Label>
                <Input
                  id="template-subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Student Number: {student_number}"
                />
                <p className="text-xs text-muted-foreground mt-1">Use {'{student_number}'} as placeholder</p>
              </div>
              <div>
                <Label htmlFor="template-body">Body</Label>
                <textarea
                  id="template-body"
                  className="flex min-h-[350px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Enter email body..."
                />
                <p className="text-xs text-muted-foreground mt-1">Use {'{student_number}'} as placeholder — it will be replaced per student</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="size-4" />
                Preview
              </CardTitle>
              <CardDescription>
                {subject || 'No subject'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden bg-white">
                <iframe
                  ref={iframeRef}
                  title="Email Preview"
                  className="w-full min-h-[500px]"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
