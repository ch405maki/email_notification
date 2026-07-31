import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import PublicLayout from '@/layouts/public-layout';
import { type BreadcrumbItem } from '@/types';
import { SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
InputGroup,
InputGroupAddon,
InputGroupInput,
} from '@/components/ui/input-group';


const breadcrumbs: BreadcrumbItem[] = [
{ title: 'Public', href: '/public/attendance' },
{ title: 'Attendance', href: '#' },
];

interface Employee {
id: number;
employeeId: string;
firstName: string;
lastName: string;
department: string;
position: string;
schedule: string;
currentTime: string;
status: 'ON TIME' | 'LATE' | '';
attendanceType: string;
photo: string | null;
}

interface InfoCardProps {
label: string;
value: string;
}

function InfoCard({ label, value }: InfoCardProps) {
return ( <div className='rounded-xl border bg-slate-50 p-4'> <p className='text-sm text-slate-500'>{label}</p> <p className='text-xl font-semibold text-slate-800'>{value}</p> </div>
);
}

export default function PublicAttendanceIndex() {
const inputRef = useRef<HTMLInputElement | null>(null);

const [cardNumber, setCardNumber] = useState('');
const [employee, setEmployee] = useState<Employee | null>(null);
const [time, setTime] = useState(new Date());
const [timeIn, setTimeIn] = useState(
new Date().toTimeString().slice(0, 5)
);

const [errorMessage, setErrorMessage] = useState('');
const [loading, setLoading] = useState(false);
const [submittingAttendance, setSubmittingAttendance] = useState(false);

useEffect(() => {
inputRef.current?.focus();

const interval = window.setInterval(() => {
  setTime(new Date());
}, 1000);

return () => window.clearInterval(interval);


}, []);

useEffect(() => {
if (!cardNumber.trim()) return;

const timer = window.setTimeout(() => {
  handleScan();
}, 300);

return () => window.clearTimeout(timer);

}, [cardNumber]);

const resetScreen = () => {
setTimeout(() => {
setEmployee(null);
setErrorMessage('');
setCardNumber('');
setTimeIn(new Date().toTimeString().slice(0, 5));
inputRef.current?.focus();
}, 3000);
};

const handleScan = async () => {
if (!cardNumber.trim() || loading) return;

setLoading(true);

try {
  setErrorMessage('');

  const response = await axios.get('/api/v1/employees/options', {
    params: { search: cardNumber.trim() },
  });

  const emp = response.data?.data?.[0];

  if (!emp) throw new Error('Card not registered');

  const nameParts = emp.full_name?.split(' ') ?? [];
  const firstName = nameParts.shift() ?? '';
  const lastName = nameParts.join(' ');

  setEmployee({
    id: emp.id,
    employeeId: emp.employee_number,
    firstName,
    lastName,
    department: 'Department',
    position: 'Employee',
    schedule: emp.schedule_time
  ? new Date(`1970-01-01T${emp.schedule_time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  : '--:--',
    currentTime: time.toLocaleTimeString(),
    status: '',
    attendanceType: '',
    photo: null,
  });

  setTimeIn(new Date().toTimeString().slice(0, 5));
  setCardNumber('');
  } catch (error: any) {
    setEmployee(null);
    setCardNumber('');
    setErrorMessage(error.response?.data?.message || 'Card not registered');
    resetScreen();
  } finally {
    setLoading(false);
    inputRef.current?.focus();
  }
};

const refreshNextSchedule = async (employeeNumber: string) => {
  const res = await axios.get('/api/v1/employees/options', {
    params: { search: employeeNumber },
  });

  const emp = res.data?.data?.[0];

  if (emp?.schedule_time) {
    setEmployee((prev) =>
      prev
        ? {
            ...prev,
            schedule: new Date(`1970-01-01T${emp.schedule_time}`)
              .toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
          }
        : prev
    );
  } else {
    setEmployee((prev) =>
      prev
        ? {
            ...prev,
            schedule: 'Completed',
          }
        : prev
    );
  }
};

const handleTimeIn = async () => {
  if (!employee) return;

  setSubmittingAttendance(true);

  try {
    const payload = {
      employee_id: employee.id,
      attendance_date: new Date().toISOString().slice(0, 10),
      time_in: timeIn,
    };

    const response = await axios.post('/api/v1/attendance', payload);

    const attendance = response.data.data;

    setEmployee((prev) =>
      prev
        ? {
            ...prev,
            schedule: attendance.scheduled_time ?? prev.schedule,
            status: attendance.status === 'ON_TIME' ? 'ON TIME' : 'LATE',
            attendanceType:
              attendance.schedule_time?.schedule?.name ?? 'WORK IN',
            currentTime: attendance.time_in,
          }
        : prev
    );
    await refreshNextSchedule(employee.employeeId);
    toast.success('Attendance recorded successfully');

    resetScreen();
  } catch (error: any) {
    const message =
      error.response?.data?.message || 'Unable to record attendance';

    // Show shadcn/sonner toast
    toast.error(message);

    // Optional: also show it in the large error panel
    setErrorMessage(message);

    resetScreen();
  } finally {
    setSubmittingAttendance(false);
  }
};

return ( <PublicLayout breadcrumbs={breadcrumbs}> <Head title='Public Attendance' />

  <div className='flex min-h-[calc(100vh-120px)] items-center justify-center'>
    <div className='w-full max-w-5xl rounded-3xl bg-white p-8 shadow-lg space-y-8'>
      <div className='rounded-2xl bg-slate-50 p-6 text-center'>
        <p className='text-lg text-slate-500'>
          {time.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <h2 className='text-6xl font-bold text-blue-600'>
          {time.toLocaleTimeString()}
        </h2>
      </div>

      <InputGroup className='rounded-full'>
        <InputGroupInput
          ref={inputRef}
          type='text'
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder='Tap employee ID card here'
          autoFocus
        />

        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>

      {employee ? (
        <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
          <div className='flex justify-center'>
            <img
              src={
                employee.photo ||
                'https://ui-avatars.com/api/?name=' +
                  encodeURIComponent(
                    `${employee.firstName} ${employee.lastName}`
                  )
              }
              alt='Employee'
              className='h-56 w-56 rounded-full border-4 border-slate-300 object-cover'
            />
          </div>

          <div className='md:col-span-2'>
            <h3 className='text-4xl font-bold text-slate-800'>
              {employee.firstName} {employee.lastName}
            </h3>

            <p className='mt-2 text-slate-500'>
              Employee ID: {employee.employeeId}
            </p>

            <div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='rounded-xl border bg-slate-50 p-4'>
                <p className='text-sm text-slate-500'>Time In</p>
                <Input
                  type='time'
                  value={timeIn}
                  onChange={(e) => setTimeIn(e.target.value)}
                  className='mt-2'
                />
              </div>

              <InfoCard
                label='Scheduled Time'
                value={employee.schedule}
              />
            </div>

            <div className='mt-6 flex flex-wrap gap-3'>
              {employee.status && (
                <span
                  className={`rounded-full px-6 py-3 text-xl font-bold ${
                    employee.status === 'LATE'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {employee.status}
                </span>
              )}

              {employee.attendanceType && (
                <span className='rounded-full bg-blue-100 px-6 py-3 text-xl font-bold text-blue-700'>
                  {employee.attendanceType}
                </span>
              )}
            </div>

            <button
              onClick={handleTimeIn}
              disabled={submittingAttendance}
              className='mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-xl font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
            >
              {submittingAttendance
                ? 'Recording Attendance...'
                : 'Time In'}
            </button>
          </div>
        </div>
      ) : errorMessage ? (
        <div className='flex h-72 items-center justify-center rounded-2xl border bg-red-50 text-3xl font-semibold text-red-600'>
          {errorMessage}
        </div>
      ) : (
        <div className='flex h-72 items-center justify-center rounded-2xl border bg-slate-50 text-3xl font-semibold text-slate-400'>
          Waiting for employee ID...
        </div>
      )}
    </div>
  </div>
</PublicLayout>

);
}
