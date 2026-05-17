import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await axios.get('/api/v1/emails/template')
      setPreview(res.data.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  useEffect(() => {
    if (preview && iframeRef.current) {
      iframeRef.current.srcdoc = preview.body
    }
  }, [preview])

  const autoPreview = useCallback(async (sn: string, em: string) => {
    if (!sn || !em) {
      fetchTemplate()
      return
    }
    setLoadingPreview(true)
    try {
      const res = await axios.post('/api/v1/emails/preview', {
        student_number: sn,
        email: em,
      })
      setPreview(res.data.data)
    } catch { /* ignore */ }
    finally { 
      await new Promise(r => setTimeout(r, 800))
      setLoadingPreview(false) }
  }, [fetchTemplate])

  useEffect(() => {
    const timer = setTimeout(() => autoPreview(studentNumber, email), 400)
    return () => clearTimeout(timer)
  }, [studentNumber, email, autoPreview])

  const handlePreview = () => {
    autoPreview(studentNumber, email)
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

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
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
                <div className="space-y-4">
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

                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleSend} disabled={!canPreview || sending}>
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {sending ? 'Sending...' : 'Send Email'}
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
          </div>

          <div className="flex flex-col gap-6">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="size-4" />
                  Email Preview
                </CardTitle>
                <CardDescription>
                  {preview?.subject || 'Loading preview...'}
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
      </div>
    </AppLayout>
  )
}
