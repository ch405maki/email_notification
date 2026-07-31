import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import PublicLayout from '@/layouts/public-layout';
import {
    defaultBlobTheme,
    lateBlobTheme,
    onTimeBlobTheme,
    type BlobTheme,
} from '@/lib/blob-themes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { BlobSpeech, JellyBlobMascot } from 'feral-blob';
import 'feral-blob/blob.css';
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    LogIn,
    RefreshCw,
    Search,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Public', href: '/public/attendance' },
    { title: 'Attendance', href: '#' },
];

type Employee = {
    id: number;
    employee_number: string;
    id_number: string | null;
    full_name: string;
};

type UpcomingSchedule = {
    schedule_time_id: number;
    scheduled_time: string;
};

type AttendancePreview = {
    status: 'ON_TIME' | 'LATE';
    late_minutes: number;
};

type LookupResponse = {
    employee: Employee;
    upcoming_schedule: UpcomingSchedule | null;
    attendance_preview: AttendancePreview | null;
    message: string | null;
};

type View = 'search' | 'preview' | 'success';

const errorMessage = (e: unknown, fallback: string) => {
    if (axios.isAxiosError<{ message?: string }>(e)) {
        return e.response?.data?.message || fallback;
    }
    return fallback;
};

const statusBadgeClass: Record<string, string> = {
    ON_TIME:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    LATE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabel = (status: string) =>
    status === 'LATE' ? 'LATE' : 'ON TIME';

const pad = (n: number) => String(n).padStart(2, '0');

const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const to12Hour = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${pad(hour)}:${pad(m)} ${period}`;
};

const greetingForTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
};

const minutesEarly = (timeIn: string, scheduledTime: string) => {
    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };
    return Math.max(0, toMinutes(scheduledTime) - toMinutes(timeIn));
};

export default function PublicAttendanceIndex() {
    const [view, setView] = useState<View>('search');
    const [keyword, setKeyword] = useState('');
    const [lookup, setLookup] = useState<LookupResponse | null>(null);
    const [attendanceDate, setAttendanceDate] = useState('');
    const [timeIn, setTimeIn] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const [searchTyping, setSearchTyping] = useState(false);
    const lastLookupRef = useRef('');
    const lastSearchKwRef = useRef('');
    const requestIdRef = useRef(0);
    const searchTypeTimer = useRef(0);

    const debouncedKeyword = useDebouncedValue(keyword, 800);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => () => window.clearTimeout(searchTypeTimer.current), []);

    const previewStatus = lookup?.attendance_preview?.status ?? null;

    const earlyMinutes =
        previewStatus === 'ON_TIME' && lookup?.upcoming_schedule && timeIn
            ? minutesEarly(timeIn, lookup.upcoming_schedule.scheduled_time)
            : 0;

    const performLookup = useCallback(
        async (kw: string, date: string, time: string, isInitial: boolean) => {
            const requestId = ++requestIdRef.current;
            lastLookupRef.current = `${date}|${time}`;
            if (isInitial) {
                setAttendanceDate(date);
                setTimeIn(time);
                setLookupLoading(true);
            } else {
                setRecalcLoading(true);
            }
            setError(null);
            try {
                const res = await axios.post(
                    '/api/v1/attendance/public/lookup',
                    {
                        keyword: kw,
                        attendance_date: date,
                        time_in: time,
                    },
                );
                if (requestId !== requestIdRef.current) return;
                setLookup(res.data);
                if (isInitial) setView('preview');
            } catch (e: unknown) {
                if (requestId !== requestIdRef.current) return;
                const msg = errorMessage(e, 'Unable to look up employee');
                if (isInitial) {
                    setLookup(null);
                    setError(msg);
                    setView('search');
                } else {
                    toast.error(msg);
                }
            } finally {
                if (requestId === requestIdRef.current) {
                    if (isInitial) setLookupLoading(false);
                    else setRecalcLoading(false);
                }
            }
        },
        [],
    );

    const handleSearch = () => {
        const kw = keyword.trim();
        if (!kw || lookupLoading) return;
        const nowDate = new Date();
        performLookup(kw, toDateStr(nowDate), toTimeStr(nowDate), true);
    };

    useEffect(() => {
        if (view !== 'search') return;
        const kw = debouncedKeyword.trim();
        if (!kw || kw.length < 4 || lookupLoading) return;
        if (kw === lastSearchKwRef.current) return;
        lastSearchKwRef.current = kw;
        const searchDate = new Date();
        performLookup(kw, toDateStr(searchDate), toTimeStr(searchDate), true);
    }, [debouncedKeyword, view, lookupLoading, performLookup]);

    useEffect(() => {
        if (view !== 'preview' || !lookup) return;
        const key = `${attendanceDate}|${timeIn}`;
        if (key === lastLookupRef.current) return;
        const timer = setTimeout(() => {
            performLookup(keyword, attendanceDate, timeIn, false);
        }, 600);
        return () => clearTimeout(timer);
    }, [attendanceDate, timeIn, view, lookup, keyword, performLookup]);

    const handleConfirm = async () => {
        if (!lookup?.employee || submitLoading) return;
        setSubmitLoading(true);
        try {
            const res = await axios.post('/api/v1/attendance/public/time-in', {
                employee_id: lookup.employee.id,
                attendance_date: attendanceDate,
                time_in: timeIn,
            });
            toast.success(res.data.message);
            try {
                const previewRes = await axios.post(
                    '/api/v1/attendance/public/lookup',
                    {
                        keyword,
                        attendance_date: attendanceDate,
                        time_in: timeIn,
                    },
                );
                setLookup(previewRes.data);
            } catch {
                // keep the last preview when the follow-up lookup fails
            }
            setView('success');
        } catch (e: unknown) {
            toast.error(errorMessage(e, 'Failed to record attendance'));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleReset = () => {
        requestIdRef.current++;
        setKeyword('');
        setLookup(null);
        setView('search');
        setError(null);
        setAttendanceDate('');
        setTimeIn('');
        lastLookupRef.current = '';
        lastSearchKwRef.current = '';
    };

    const canReset = keyword.trim() !== '' || view !== 'search' || !!lookup;

    const errorBlock = error && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            <AlertTriangle className="size-4 shrink-0" />
            {error}
        </div>
    );

    const searchForm = (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
            }}
            className="flex w-full items-center gap-2"
        >
            <div className="relative flex-1">
                <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={keyword}
                    onChange={(e) => {
                        setKeyword(e.target.value);
                        setSearchTyping(true);
                        window.clearTimeout(searchTypeTimer.current);
                        searchTypeTimer.current = window.setTimeout(
                            () => setSearchTyping(false),
                            800,
                        );
                    }}
                    placeholder="Enter Employee Number or ID Number"
                    className="h-12 rounded-full pr-4 pl-11 text-base"
                    autoFocus
                    disabled={lookupLoading}
                />
            </div>
            <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-12 shrink-0 rounded-full"
                onClick={handleReset}
                disabled={lookupLoading || !canReset}
                aria-label="Reset search"
            >
                <RefreshCw
                    className={`size-4 ${lookupLoading ? 'animate-spin' : ''}`}
                />
            </Button>
        </form>
    );

    const botMessage = (() => {
        if (!lookup) return '';
        if (lookup.message)
            return `Hello ${lookup.employee.full_name}.\n\n${lookup.message}`;
        return '';
    })();

    const avatarRingClass =
        previewStatus === 'LATE'
            ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'
            : previewStatus === 'ON_TIME'
              ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background'
              : '';

    const blobTheme =
        previewStatus === 'LATE'
            ? lateBlobTheme
            : previewStatus === 'ON_TIME'
              ? onTimeBlobTheme
              : defaultBlobTheme;

    const blobMood =
        previewStatus === 'LATE'
            ? 'angry'
            : previewStatus === 'ON_TIME'
              ? 'happy'
              : 'neutral';

    const bubbleBorderClass =
        previewStatus === 'LATE'
            ? 'border-red-300 dark:border-red-800'
            : previewStatus === 'ON_TIME'
              ? 'border-green-300 dark:border-green-800'
              : 'border-border';

    const bubbleTheme: BlobTheme =
        previewStatus === 'LATE'
            ? {
                  '--bubble-fill-top': '#ef4444',
                  '--bubble-fill-bottom': '#dc2626',
                  '--bubble-stroke-top': 'rgba(255, 255, 255, 0.32)',
                  '--bubble-stroke-bottom': 'rgba(255, 255, 255, 0.06)',
              }
            : previewStatus === 'ON_TIME'
              ? {
                    '--bubble-fill-top': '#34d399',
                    '--bubble-fill-bottom': '#10b981',
                    '--bubble-stroke-top': 'rgba(255, 255, 255, 0.32)',
                    '--bubble-stroke-bottom': 'rgba(255, 255, 255, 0.06)',
                }
              : {
                    '--bubble-fill-top': '#b66af0',
                    '--bubble-fill-bottom': '#8d52de',
                    '--bubble-stroke-top': 'rgba(255, 255, 255, 0.32)',
                    '--bubble-stroke-bottom': 'rgba(255, 255, 255, 0.06)',
                };

    const successBubbleTheme: BlobTheme = {
        '--bubble-fill-top': '#34d399',
        '--bubble-fill-bottom': '#10b981',
        '--bubble-stroke-top': 'rgba(255, 255, 255, 0.32)',
        '--bubble-stroke-bottom': 'rgba(255, 255, 255, 0.06)',
    };

    return (
        <PublicLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance Kiosk" />

            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
                {view === 'search' && !lookup ? (
                    <div className="flex min-h-[calc(100dvh-9rem)] flex-1 flex-col items-center justify-center gap-6">
                        <div style={defaultBlobTheme}>
                            <JellyBlobMascot
                                className="size-40"
                                mood={searchTyping ? 'sideEye' : 'happy'}
                            />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold">
                                {now.toLocaleTimeString([], {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </h2>
                            <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                Enter your Employee Number or ID Number to begin
                                your time-in.
                            </p>
                        </div>
                        <div className="w-full max-w-xl">
                            {searchForm}
                            {errorBlock}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {searchForm}
                        {errorBlock}
                    </div>
                )}

                {view === 'preview' && lookup && (
                    <div className="flex flex-col gap-4">
                        <div
                            className={`flex items-start gap-3 rounded-xl border p-4 ${bubbleBorderClass}`}
                        >
                            <div
                                className="flex shrink-0 flex-col items-center"
                                style={bubbleTheme}
                            >
                                <BlobSpeech
                                    mood={blobMood}
                                    messages={{
                                        neutral: 'Hello there!',
                                        happy:
                                            earlyMinutes >= 30
                                                ? 'Too early!'
                                                : 'Right on time!',
                                        angry: "You're late!",
                                    }}
                                />
                                <Avatar
                                    className={`mt-1 size-16 shrink-0 overflow-hidden rounded-full bg-muted ${avatarRingClass}`}
                                    style={blobTheme}
                                >
                                    <JellyBlobMascot
                                        className="size-full"
                                        mood={blobMood}
                                        nod
                                    />
                                </Avatar>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold">
                                        Attendance Bot
                                    </p>
                                    {recalcLoading && (
                                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                                {botMessage && (
                                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">
                                        {botMessage}
                                    </p>
                                )}
                                {!botMessage &&
                                lookup.upcoming_schedule &&
                                lookup.attendance_preview ? (
                                    <div className="mt-2 space-y-1.5 text-sm leading-snug">
                                        <p className="text-muted-foreground">
                                            {greetingForTime()},{' '}
                                            <span className="font-semibold text-foreground">
                                                {lookup.employee.full_name}
                                            </span>
                                            .
                                        </p>
                                        <p className="text-muted-foreground">
                                            Next required schedule:{' '}
                                            <span className="font-semibold text-foreground">
                                                {to12Hour(
                                                    lookup.upcoming_schedule
                                                        .scheduled_time,
                                                )}
                                            </span>
                                        </p>
                                        <p className="text-muted-foreground">
                                            Selected time-in:{' '}
                                            <span className="font-semibold text-foreground">
                                                {to12Hour(timeIn)}
                                            </span>
                                        </p>
                                        <p
                                            className={`font-semibold ${
                                                previewStatus === 'LATE'
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-green-600 dark:text-green-400'
                                            }`}
                                        >
                                            {previewStatus === 'LATE'
                                                ? `You are currently ${lookup.attendance_preview.late_minutes} minute${lookup.attendance_preview.late_minutes === 1 ? '' : 's'} late.`
                                                : 'You are on time.'}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {lookup.upcoming_schedule &&
                        lookup.attendance_preview ? (
                            <>
                                <Card>
                                    <CardContent className="px-6 py-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label htmlFor="attendance-date">
                                                    Attendance Date
                                                </Label>
                                                <Input
                                                    id="attendance-date"
                                                    type="date"
                                                    value={attendanceDate}
                                                    onChange={(e) =>
                                                        setAttendanceDate(
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={submitLoading}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="time-in">
                                                    Time In
                                                </Label>
                                                <Input
                                                    id="time-in"
                                                    type="time"
                                                    value={timeIn}
                                                    onChange={(e) =>
                                                        setTimeIn(
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={submitLoading}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">
                                                    Status
                                                </span>
                                                <Badge
                                                    className={
                                                        statusBadgeClass[
                                                            lookup
                                                                .attendance_preview
                                                                .status
                                                        ]
                                                    }
                                                >
                                                    {lookup.attendance_preview
                                                        .status === 'LATE' ? (
                                                        <AlertTriangle className="size-3" />
                                                    ) : (
                                                        <CheckCircle2 className="size-3" />
                                                    )}
                                                    {statusLabel(
                                                        lookup
                                                            .attendance_preview
                                                            .status,
                                                    )}
                                                </Badge>
                                            </div>
                                            {lookup.attendance_preview
                                                .status === 'LATE' && (
                                                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                                    {
                                                        lookup
                                                            .attendance_preview
                                                            .late_minutes
                                                    }{' '}
                                                    minute
                                                    {lookup.attendance_preview
                                                        .late_minutes === 1
                                                        ? ''
                                                        : 's'}{' '}
                                                    late
                                                </span>
                                            )}
                                        </div>

                                        <Button
                                            className="mt-4 w-full"
                                            size="lg"
                                            onClick={handleConfirm}
                                            disabled={submitLoading}
                                        >
                                            {submitLoading ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <LogIn className="size-4" />
                                            )}
                                            Confirm Time In
                                        </Button>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <Card>
                                <CardContent className="px-6 py-4">
                                    <Button
                                        variant="outline"
                                        onClick={handleReset}
                                    >
                                        <RefreshCw className="size-4" />
                                        Try Another Employee
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {view === 'success' && lookup && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3 rounded-xl border border-green-300 p-4 dark:border-green-800">
                            <div
                                className="flex shrink-0 flex-col items-center"
                                style={successBubbleTheme}
                            >
                                <BlobSpeech
                                    mood="happy"
                                    messages={{
                                        happy: lookup.upcoming_schedule
                                            ? 'Next up!'
                                            : 'All done!',
                                    }}
                                />
                                <Avatar
                                    className="mt-1 size-16 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-green-500 ring-offset-2 ring-offset-background"
                                    style={onTimeBlobTheme}
                                >
                                    <JellyBlobMascot
                                        className="size-full"
                                        mood="happy"
                                        nod
                                    />
                                </Avatar>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">
                                    Attendance Bot
                                </p>
                                <div className="mt-2 space-y-1.5 text-sm leading-snug">
                                    <p className="text-muted-foreground">
                                        {greetingForTime()},{' '}
                                        <span className="font-semibold text-foreground">
                                            {lookup.employee.full_name}
                                        </span>
                                        .
                                    </p>
                                    {lookup.upcoming_schedule ? (
                                        <p className="text-muted-foreground">
                                            Your next required schedule is{' '}
                                            <span className="font-semibold text-foreground">
                                                {to12Hour(
                                                    lookup.upcoming_schedule
                                                        .scheduled_time,
                                                )}
                                            </span>
                                            .
                                        </p>
                                    ) : (
                                        <p className="font-semibold text-green-600 dark:text-green-400">
                                            All done for the day!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}
