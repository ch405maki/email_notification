import { useEffect, useState } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { dashboard } from '@/routes'
import { type BreadcrumbItem } from '@/types'
import UserTable from '@/components/users/userTable'
import UserForm from '@/components/users/userForm'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: dashboard().url },
  { title: 'User Management', href: '#' },
]

type Role = { id: number; name: string; slug: string }
type Module = { id: number; name: string; slug: string }
type User = { id: number; name: string; email: string; status: boolean; role: Role; modules: Module[] }

export default function UserIndex() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [allModules, setAllModules] = useState<Module[]>([])
  const [openForm, setOpenForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchUsers = async () => {
    try {
      const params: Record<string, string> = {}
      if (roleFilter) params.role_id = roleFilter
      if (statusFilter !== '') params.status = statusFilter
      const res = await axios.get('/api/v1/users', { params })
      setUsers(res.data.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch users')
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await axios.get('/api/v1/roles')
      setRoles(res.data.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch roles')
    }
  }

  const fetchModules = async () => {
    try {
      const res = await axios.get('/api/v1/modules')
      setAllModules(res.data.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch modules')
    }
  }

  useEffect(() => {
    fetchRoles()
    fetchModules()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, statusFilter])

  const handleDelete = async (user: User) => {
    try {
      await axios.delete(`/api/v1/users/${user.id}`)
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setOpenForm(true)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="User Management" />

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage your application users and their roles
            </p>
          </div>

          <UserForm
            open={openForm}
            setOpen={setOpenForm}
            user={editingUser}
            roles={roles}
            allModules={allModules}
            onSaved={() => {
              setEditingUser(undefined)
              fetchUsers()
              toast.success(editingUser ? 'User updated successfully' : 'User created successfully')
            }}
          />
        </div>

        <div className="flex gap-4">
          <div className="w-48">
            <Select value={roleFilter} onValueChange={v => setRoleFilter(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="1">Active</SelectItem>
                <SelectItem value="0">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <UserTable users={users} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
