import { useState } from 'react';
import { AppData, User } from '../types';
import { Plus, Edit2, Trash2, Shield, UserCog, Eye, EyeOff, Save, X } from 'lucide-react';
import { generateId } from '../store';

interface UsersPageProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
}

const defaultPermissions = {
  canCreateOrders: false,
  canEditOrders: false,
  canDeleteOrders: false,
  canManageClients: false,
  canManageInventory: false,
  canViewReports: false,
  canManageUsers: false,
  canManageSettings: false,
};

const rolePermissions = {
  admin: {
    canCreateOrders: true,
    canEditOrders: true,
    canDeleteOrders: true,
    canManageClients: true,
    canManageInventory: true,
    canViewReports: true,
    canManageUsers: true,
    canManageSettings: true,
  },
  manager: {
    canCreateOrders: true,
    canEditOrders: true,
    canDeleteOrders: false,
    canManageClients: true,
    canManageInventory: true,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  master: {
    canCreateOrders: false,
    canEditOrders: true,
    canDeleteOrders: false,
    canManageClients: false,
    canManageInventory: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
  },
};

export default function UsersPage({ data, updateData }: UsersPageProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    password: '',
    name: '',
    role: 'master',
    permissions: { ...defaultPermissions },
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'master',
        permissions: { ...rolePermissions.master },
      });
    }
    setShowModal(true);
  };

  const handleRoleChange = (role: 'admin' | 'manager' | 'master') => {
    setFormData({
      ...formData,
      role,
      permissions: { ...rolePermissions[role] },
    });
  };

  const handleSave = () => {
    if (!formData.username || !formData.name || (!editingUser && !formData.password)) return;

    if (editingUser) {
      const updated = data.users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...formData, password: formData.password || u.password } as User
          : u
      );
      updateData({ users: updated });
    } else {
      const newUser: User = {
        id: generateId(),
        username: formData.username!,
        password: formData.password!,
        name: formData.name!,
        role: formData.role as 'admin' | 'manager' | 'master',
        permissions: formData.permissions || defaultPermissions,
      };
      updateData({ users: [...data.users, newUser] });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (id === data.currentUserId) {
      alert('Не можна видалити поточного користувача!');
      return;
    }
    updateData({ users: data.users.filter(u => u.id !== id) });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'master': return 'bg-green-100 text-green-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Адміністратор';
      case 'manager': return 'Менеджер';
      case 'master': return 'Майстер';
      default: return role;
    }
  };

  const permissionLabels: Record<string, string> = {
    canCreateOrders: 'Створювати замовлення',
    canEditOrders: 'Редагувати замовлення',
    canDeleteOrders: 'Видаляти замовлення',
    canManageClients: 'Керувати клієнтами',
    canManageInventory: 'Керувати складом',
    canViewReports: 'Переглядати звіти',
    canManageUsers: 'Керувати користувачами',
    canManageSettings: 'Змінювати налаштування',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Користувачі системи</h1>
          <p className="text-neutral-500">Керування доступом та правами</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-neutral-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors"
        >
          <Plus size={20} /> Додати користувача
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.users.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#ffcc00] rounded-xl flex items-center justify-center text-black font-bold text-lg">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold">{user.name}</h4>
                  <p className="text-xs text-neutral-400">@{user.username}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleBadge(user.role)}`}>
                {getRoleLabel(user.role)}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-neutral-600 flex items-center gap-2">
                <Shield size={14} className="text-neutral-400" />
                Права доступу:
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(user.permissions).filter(([, v]) => v).slice(0, 4).map(([key]) => (
                  <span key={key} className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded text-[10px]">
                    {permissionLabels[key]}
                  </span>
                ))}
                {Object.values(user.permissions).filter(v => v).length > 4 && (
                  <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded text-[10px]">
                    +{Object.values(user.permissions).filter(v => v).length - 4}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <button 
                onClick={() => handleOpenModal(user)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
              >
                <Edit2 size={14} /> Редагувати
              </button>
              <button 
                onClick={() => handleDelete(user.id)}
                className="bg-red-50 hover:bg-red-100 text-red-600 py-2 px-4 rounded-lg"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserCog className="text-[#ffcc00]" size={20} />
                {editingUser ? 'Редагування користувача' : 'Новий користувач'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Ім'я</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="Повне ім'я"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Логін</label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Пароль {editingUser && '(залиште пустим, щоб не змінювати)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2 pr-10 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 text-neutral-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Роль</label>
                <div className="flex gap-2">
                  {(['admin', 'manager', 'master'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        formData.role === role 
                          ? 'bg-[#ffcc00] text-black' 
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {getRoleLabel(role)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Права доступу</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-neutral-50 rounded-lg">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions?.[key as keyof typeof defaultPermissions] || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions!,
                            [key]: e.target.checked,
                          }
                        })}
                        className="w-4 h-4 rounded border-neutral-300 text-[#ffcc00] focus:ring-[#ffcc00]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-neutral-50 flex gap-3 justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2 rounded-lg font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Скасувати
              </button>
              <button 
                onClick={handleSave}
                className="bg-[#ffcc00] text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#e6b800]"
              >
                <Save size={18} /> Зберегти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
