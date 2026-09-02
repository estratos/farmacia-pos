import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Users, Phone, Mail } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { customerService } from '../services/customerService';
import { writeCreateCustomer, writeUpdateCustomer, writeDeleteCustomer } from '../services/remoteApi';
import type { Customer } from '../types';

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
}

const emptyForm: CustomerForm = { name: '', phone: '', email: '' };

function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(() => customerService.getCustomers());
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const filtered = search.trim() ? customerService.searchCustomers(search) : customers;
  const refresh = () => setCustomers(customerService.getCustomers());

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({ name: customer.name, phone: customer.phone, email: customer.email });
    setError(null);
    setShowForm(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (window.confirm(`¿Eliminar al cliente "${customer.name}"?`)) {
      try {
        await writeDeleteCustomer(customer.id);
        refresh();
        showToast('success', 'Cliente eliminado');
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'No se pudo eliminar');
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    try {
      if (editingId !== null) {
        await writeUpdateCustomer(editingId, form);
        showToast('success', 'Cliente actualizado');
      } else {
        await writeCreateCustomer(form);
        showToast('success', 'Cliente agregado');
      }
      refresh();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el cliente');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {customers.length} clientes registrados
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Agregar Cliente
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          className="input-field pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/40">
              <tr>
                <th className="table-header">Cliente</th>
                <th className="table-header">Teléfono</th>
                <th className="table-header">Email</th>
                <th className="table-header">Registro</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <Users className="w-4 h-4" />
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {customer.name}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400">
                    {customer.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {customer.phone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400">
                    {customer.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {customer.email}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400">
                    {new Date(customer.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(customer)}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    No hay clientes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <Modal
          title={editingId !== null ? 'Editar Cliente' : 'Agregar Cliente'}
          onClose={() => setShowForm(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre *
              </label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Teléfono
              </label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="55 1234 5678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={handleSubmit} className="btn-primary flex-1">
                {editingId !== null ? 'Guardar Cambios' : 'Agregar Cliente'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Customers;
