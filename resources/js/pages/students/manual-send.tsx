import { useState } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Send, Eye, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Manual Email', href: '#' },
]

export default function ManualSend() {
  const [studentNumber, setStudentNumber] = useState('')
  const [email, setEmail] = useState('')
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ success: boolean; message: string } | null>(null)

  const handlePreview = async () => {
    if (!studentNumber || !email) return
    setLoadingPreview(true)
    setSent(null)
    try {
      const res = await axios.post('/api/v1/emails/preview', {
        student_number: studentNumber,
        email,
      })
      setPreview(res.data.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSend = async () => {
    if (!studentNumber || !email) return
    setSending(true)
    setSent(null)
    try {
      const res = await axios.post('/api/v1/emails/send-single', {
        student_number: studentNumber,
        email,
      })
      setSent({ success: true, message: res.data.message })
      toast.success(res.data.message)
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to send email'
      setSent({ success: false, message: msg })
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  const canPreview = studentNumber.trim() && email.trim()

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Manual Email" />

      <div className="flex flex-col gap-6 p-4">
        <div>
          <h1 className="text-xl font-semibold">Manual Email Sender</h1>
          <p className="text-sm text-muted-foreground">
            Send an onboarding email to a single student manually
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-4" />
              Compose Email
            </CardTitle>
            <CardDescription>
              Enter the student number and email address, then preview before sending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="student-number">Student Number</Label>
                <Input
                  id="student-number"
                  placeholder="2026-0026"
                  value={studentNumber}
                  onChange={e => setStudentNumber(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handlePreview} disabled={!canPreview || loadingPreview}>
                {loadingPreview ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                Preview
              </Button>
              <Button onClick={handleSend} disabled={!canPreview || sending}>
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send Email
              </Button>
            </div>

            {sent && (
              <div className="flex items-center gap-2">
                <Badge variant={sent.success ? 'default' : 'destructive'} className={sent.success ? 'bg-green-500' : ''}>
                  {sent.success ? <CheckCircle2 className="size-3.5 mr-1" /> : <XCircle className="size-3.5 mr-1" />}
                  {sent.message}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="size-4" />
                Email Preview
              </CardTitle>
              <CardDescription>
                This is how the email will appear to the recipient
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="font-medium">{preview.subject}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Body</Label>
                <pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-md border">
                  {preview.body}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
