import { useEffect, useState } from 'react'
import axios from 'axios'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { dashboard } from '@/routes'
import { type BreadcrumbItem } from '@/types'
import UserTable from '@/components/users/userTable'
import UserForm from '@/components/users/userForm'
import { toast } from 'sonner'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: dashboard().url },
  { title: 'User Management', href: '#' },
]

type Role = { id: number; name: string }
type User = { id: number; name: string; email: string; role: Role }

export default function UserIndex() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [openForm, setOpenForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/v1/users')
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

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  // Delete user
  const handleDelete = async (user: User) => {
    if (!confirm('Delete this user?')) return
    try {
      await axios.delete(`/api/v1/users/${user.id}`)
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user')
    }
  }

  // Edit user
  const handleEdit = (user: User) => {
    setEditingUser(user)
    setOpenForm(true)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="User Management" />

      <div className="flex flex-col gap-4 p-4">
        {/* Header: Title + Subtitle + Add Button */}
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
            onSaved={() => {
              setEditingUser(undefined)
              fetchUsers()
              toast.success(editingUser ? 'User updated successfully' : 'User created successfully')
            }}
          />
        </div>

        {/* Users Table */}
        <UserTable users={users} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
    </AppLayout>
  )
}
