import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Send, Loader2, Users, CheckCircle2, XCircle, Clock } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Email Campaign', href: '#' },
]

type Stats = {
  total_students: number
  sent: number
  failed: number
  pending: number
}

export default function Campaign() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [sending, setSending] = useState(false)
  const [polling, setPolling] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/v1/students/stats')
      setStats(res.data.data)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(fetchStats, 3000)
    return () => clearInterval(interval)
  }, [polling, fetchStats])

  const handleSend = async () => {
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

  const allDone = stats && stats.pending === 0 && (stats.sent > 0 || stats.failed > 0)

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Email Campaign" />

      <div className="flex flex-col gap-6 p-4">
        <div>
          <h1 className="text-xl font-semibold">Email Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Send onboarding emails to all imported students
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-4" />
              Bulk Send
            </CardTitle>
            <CardDescription>
              Dispatch queued email jobs for every student in the database
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
              <Button onClick={handleSend} disabled={sending || !stats?.total_students}>
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
