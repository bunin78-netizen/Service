import { useState } from 'react';
import { AppData, Employee } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Calendar, Download } from 'lucide-react';

export default function Salary({ data }: { data: AppData }) {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(data.employees[0]?.id || '');

  const employee = data.employees.find(e => e.id === selectedEmployeeId);
  
  const calculateDailySalary = (day: Date, emp: Employee) => {
    const dayOrders = data.workOrders.filter(wo => 
      wo.status === 'Completed' && 
      isSameDay(parseISO(wo.date), day)
    );

    let servicesTotal = 0;
    dayOrders.forEach(wo => {
      wo.services.forEach(s => {
        if (s.masterId === emp.id) {
          servicesTotal += s.price;
        }
      });
    });

    const bonus = (servicesTotal * emp.bonusPercentage) / 100;
    const total = emp.dailyRate + bonus;

    return {
      date: day,
      base: emp.dailyRate,
      bonus,
      total,
      ordersCount: dayOrders.length
    };
  };

  const daysInRange = eachDayOfInterval({
    start: parseISO(dateRange.start),
    end: parseISO(dateRange.end),
  });

  const dailyStats = employee ? daysInRange.map(day => calculateDailySalary(day, employee)) : [];
  const periodTotal = dailyStats.reduce((acc, curr) => acc + curr.total, 0);
  const periodBase = dailyStats.reduce((acc, curr) => acc + curr.base, 0);
  const periodBonus = dailyStats.reduce((acc, curr) => acc + curr.bonus, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-neutral-500 mb-1">Співробітник</label>
          <select 
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="border rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-[#ffcc00] outline-none"
          >
            {data.employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.role === 'Master' ? 'Майстер' : 'Менеджер'})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-500 mb-1">Початок періоду</label>
          <input 
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#ffcc00] outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-500 mb-1">Кінець періоду</label>
          <input 
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#ffcc00] outline-none"
          />
        </div>
        <button className="bg-neutral-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-neutral-800 transition-colors">
          <Download size={18} />
          Експорт PDF
        </button>
      </div>

      {employee && (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="font-bold mb-2">Інформація про співробітника</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Посада:</span>
              <span className="ml-2 font-medium">{employee.role === 'Master' ? 'Майстер' : 'Менеджер'}</span>
            </div>
            <div>
              <span className="text-neutral-500">Денна ставка:</span>
              <span className="ml-2 font-medium">{employee.dailyRate} ₴</span>
            </div>
            <div>
              <span className="text-neutral-500">% від робіт:</span>
              <span className="ml-2 font-medium">{employee.bonusPercentage}%</span>
            </div>
            <div>
              <span className="text-neutral-500">Днів у періоді:</span>
              <span className="ml-2 font-medium">{daysInRange.length}</span>
            </div>
            {employee.address && (
              <div className="col-span-2">
                <span className="text-neutral-500">Адреса:</span>
                <span className="ml-2 font-medium">{employee.address}</span>
              </div>
            )}
            {employee.inn && (
              <div>
                <span className="text-neutral-500">ІПН:</span>
                <span className="ml-2 font-medium">{employee.inn}</span>
              </div>
            )}
            {employee.idDocument && (employee.idDocument.series || employee.idDocument.number) && (
              <div className="col-span-2">
                <span className="text-neutral-500">Посвідчення:</span>
                <span className="ml-2 font-medium">
                  {[employee.idDocument.series, employee.idDocument.number].filter(Boolean).join(' ')}
                  {employee.idDocument.issuedBy && `, ${employee.idDocument.issuedBy}`}
                  {employee.idDocument.issuedDate && ` від ${employee.idDocument.issuedDate}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-neutral-500 text-sm mb-1">Разом за період</p>
          <h3 className="text-2xl font-bold text-neutral-900">{periodTotal.toLocaleString()} ₴</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-neutral-500 text-sm mb-1">Ставка (фікс)</p>
          <h3 className="text-2xl font-bold text-blue-600">{periodBase.toLocaleString()} ₴</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-neutral-500 text-sm mb-1">Бонуси (% від робіт)</p>
          <h3 className="text-2xl font-bold text-green-600">{periodBonus.toLocaleString()} ₴</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-neutral-50">
          <h3 className="font-bold flex items-center gap-2">
            <Calendar size={18} className="text-[#ffcc00]" />
            Деталізація по днях
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-sm border-b">
                <th className="px-6 py-3 font-semibold">Дата</th>
                <th className="px-6 py-3 font-semibold">День тижня</th>
                <th className="px-6 py-3 font-semibold">Ставка</th>
                <th className="px-6 py-3 font-semibold">Бонус</th>
                <th className="px-6 py-3 font-semibold">Замовлень</th>
                <th className="px-6 py-3 font-semibold text-right">Всього</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dailyStats.map((stat, i) => (
                <tr key={i} className={stat.total > stat.base ? 'bg-green-50/30' : ''}>
                  <td className="px-6 py-3 font-medium">{format(stat.date, 'dd.MM.yyyy')}</td>
                  <td className="px-6 py-3 text-neutral-500 capitalize">
                    {format(stat.date, 'EEEE', { locale: uk })}
                  </td>
                  <td className="px-6 py-3">{stat.base} ₴</td>
                  <td className="px-6 py-3 text-green-600">+{stat.bonus.toFixed(0)} ₴</td>
                  <td className="px-6 py-3">{stat.ordersCount}</td>
                  <td className="px-6 py-3 text-right font-bold">{stat.total.toFixed(0)} ₴</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
