import React, { useState } from 'react';
import { AppData } from '../types';
import { Save, Building, Phone, Mail, CreditCard, User } from 'lucide-react';

const Settings = ({ data, updateData }: { data: AppData, updateData: (d: Partial<AppData>) => void }) => {
  const [formData, setFormData] = useState(data.companySettings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateData({ companySettings: formData });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Налаштування підприємства</h1>
        {isSaved && (
          <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
            Збережено успішно!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-semibold flex items-center text-gray-800">
            <Building className="w-5 h-5 mr-2 text-[#ffcc00]" />
            Основні реквізити
          </h2>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Назва підприємства</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ffcc00] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ЄДРПОУ</label>
            <input
              type="text"
              value={formData.edrpou}
              onChange={(e) => setFormData({ ...formData, edrpou: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ffcc00] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Адреса</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ffcc00] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Phone size={14} /> Телефон
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ffcc00] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Mail size={14} /> Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ffcc00] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <CreditCard size={14} /> IBAN
            </label>
            <input
              type="text"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ffcc00] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User size={14} /> Керівник
            </label>
            <input
              type="text"
              value={formData.managerName}
              onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ffcc00] outline-none"
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex justify-end">
          <button
            type="submit"
            className="bg-[#ffcc00] hover:bg-yellow-500 text-black px-6 py-2 rounded-lg font-bold flex items-center shadow-md transition-all"
          >
            <Save className="w-5 h-5 mr-2" />
            Зберегти
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;