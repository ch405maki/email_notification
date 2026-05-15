import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import axios from 'axios'

type Role = { id: number; name: string }
type User = { id?: number; name: string; email: string; password?: string; role_id: number }

interface Props {
  open: boolean
  setOpen: (val: boolean) => void
  user?: User
  roles: Role[]
  onSaved: () => void
}

export default function UserForm({ open, setOpen, user, roles, onSaved }: Props) {
  const [form, setForm] = useState<User>({
    name: '',
    email: '',
    password: '',
    role_id: roles[0]?.id || 2,
  })

  useEffect(() => {
    if (user) {
      setForm({ ...user, password: '' }) // blank password on edit
    }
  }, [user])

  const submit = async () => {
    if (user?.id) {
      // update
      await axios.put(`/api/v1/users/${user.id}`, form)
    } else {
      // create
      await axios.post('/api/v1/users', form)
    }
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserRoundPlus />{user ? 'Edit User' : 'Add User'}</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Create User'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <Label>Password {user ? '(leave blank to keep)' : ''}</Label>
            <Input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div>
            <Label>Role</Label>
            <Select
              value={String(form.role_id)}
              onValueChange={v => setForm({ ...form, role_id: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={submit}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
