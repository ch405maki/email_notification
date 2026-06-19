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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import axios from 'axios'

type Module = { id: number; name: string; slug: string }
type Role = { id: number; name: string }
type User = { id?: number; name: string; email: string; password?: string; role_id: number; status: boolean; modules: number[] }

interface Props {
  open: boolean
  setOpen: (val: boolean) => void
  user?: User
  roles: Role[]
  allModules: Module[]
  onSaved: () => void
}

export default function UserForm({ open, setOpen, user, roles, allModules, onSaved }: Props) {
  const [form, setForm] = useState<User>({
    name: '',
    email: '',
    password: '',
    role_id: roles[0]?.id || 2,
    status: true,
    modules: [],
  })

  useEffect(() => {
    if (user) {
      const modIds = Array.isArray(user.modules)
        ? user.modules.map((m: any) => (typeof m === 'number' ? m : m.id))
        : []
      setForm({ ...user, password: '', modules: modIds })
    } else {
      setForm({ name: '', email: '', password: '', role_id: roles[0]?.id || 2, status: true, modules: [] })
    }
  }, [user, open])

  const toggleModule = (moduleId: number) => {
    setForm(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter(id => id !== moduleId)
        : [...prev.modules, moduleId],
    }))
  }

  const submit = async () => {
    if (user?.id) {
      await axios.put(`/api/v1/users/${user.id}`, form)
    } else {
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

      <DialogContent className="max-w-lg">
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

          <div className="flex items-center gap-3">
            <Switch
              id="status"
              checked={form.status}
              onCheckedChange={v => setForm({ ...form, status: v })}
            />
            <Label htmlFor="status" className="cursor-pointer">
              {form.status ? 'Active' : 'Inactive'}
            </Label>
          </div>

          <div>
            <Label className="mb-2 block">Module Access</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
              {allModules.map(mod => (
                <label key={mod.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={form.modules.includes(mod.id)}
                    onCheckedChange={() => toggleModule(mod.id)}
                  />
                  {mod.name}
                </label>
              ))}
            </div>
          </div>

          <Button onClick={submit}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
