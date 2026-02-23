import { useState, useEffect, useRef } from 'react';
import { Send, Settings, Bell, CheckCircle, AlertCircle, MessageCircle, Users, Package, CreditCard, FileText, Loader, Receipt } from 'lucide-react';
import { AppData, ViberSettings } from '../types';

type Props = {
  data: AppData;
  onSave: (data: AppData) => void;
};

export default function Viber({ data, onSave }: Props) {
  const [settings, setSettings] = useState<ViberSettings>(data.viberSettings || {
    enabled: false,
    authToken: '',
    notifyNewOrder: true,
    notifyOrderCompleted: true,
    notifyLowStock: true,
    notifyPaymentReceived: true,
    notifyNewClient: true,
    sendFiscalReceipts: true,
    welcomeMessage: 'Вітаємо в SmartKharkov! 🚗 Ми допоможемо вам з ремонтом та обслуговуванням вашого авто.',
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);

  const settingsRef = useRef(settings);
  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
    dataRef.current = data;
    onSaveRef.current = onSave;
  }, [settings, data, onSave]);

  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        onSaveRef.current({ ...dataRef.current, viberSettings: settingsRef.current });
      }
    };
  }, []);

  const updateSettings = (updated: ViberSettings) => {
    isDirtyRef.current = true;
    setSettings(updated);
  };

  const handleSave = () => {
    onSave({ ...data, viberSettings: settings });
    isDirtyRef.current = false;
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const sendTestMessage = async () => {
    if (!settings.authToken) {
      setTestStatus('error');
      setTestMessage('Будь ласка, введіть Auth Token');
      return;
    }

    setTestStatus('loading');
    try {
      const message = `🔧 SmartKharkov - Тестове повідомлення\n\n✅ Viber бот успішно налаштований!\n\n📅 ${new Date().toLocaleString('uk-UA')}`;

      const response = await fetch('https://chatapi.viber.com/pa/broadcast_message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Viber-Auth-Token': settings.authToken,
        },
        body: JSON.stringify({
          broadcast_list: [],
          sender: { name: 'SmartKharkov' },
          type: 'text',
          text: message,
        }),
      });

      const result = await response.json();

      if (result.status === 0) {
        setTestStatus('success');
        setTestMessage('Тестове повідомлення успішно відправлено!');
      } else {
        setTestStatus('error');
        setTestMessage(`Помилка: ${result.status_message || 'Невідома помилка'}`);
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Помилка з\'єднання з Viber API');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Viber Бот</h1>
            <p className="text-gray-500">Спілкування з клієнтами та відправка фіскальних чеків</p>
          </div>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span>Збережено!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Configuration */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            Налаштування бота
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${settings.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="font-medium">Статус бота</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => updateSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auth Token
              </label>
              <input
                type="text"
                value={settings.authToken}
                onChange={(e) => updateSettings({ ...settings, authToken: e.target.value })}
                placeholder="445da6az32d8a2k0z-2376e7h4e88-e23e-8b7c-a2b5b0e6b3d4"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
              <p className="text-xs text-gray-500 mt-1">Отримайте в Viber Admin Panel → Edit Bot → Auth Token</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Привітальне повідомлення
              </label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => updateSettings({ ...settings, welcomeMessage: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="Вітаємо! Чим можемо допомогти?"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={sendTestMessage}
                disabled={testStatus === 'loading'}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {testStatus === 'loading' ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Тест
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-yellow-500 text-black font-medium px-4 py-2 rounded-lg hover:bg-yellow-400"
              >
                Зберегти
              </button>
            </div>

            {testStatus !== 'idle' && testStatus !== 'loading' && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                testStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {testStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="text-sm">{testMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500" />
            Типи сповіщень
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <span className="font-medium">Нове замовлення</span>
                  <p className="text-xs text-gray-500">Сповіщення при створенні наряд-замовлення</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyNewOrder}
                onChange={(e) => updateSettings({ ...settings, notifyNewOrder: e.target.checked })}
                className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <span className="font-medium">Замовлення виконано</span>
                  <p className="text-xs text-gray-500">Сповіщення при завершенні робіт</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyOrderCompleted}
                onChange={(e) => updateSettings({ ...settings, notifyOrderCompleted: e.target.checked })}
                className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-orange-500" />
                <div>
                  <span className="font-medium">Критичний залишок</span>
                  <p className="text-xs text-gray-500">Сповіщення коли товар закінчується</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyLowStock}
                onChange={(e) => updateSettings({ ...settings, notifyLowStock: e.target.checked })}
                className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-purple-500" />
                <div>
                  <span className="font-medium">Оплата отримана</span>
                  <p className="text-xs text-gray-500">Сповіщення при отриманні оплати</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyPaymentReceived}
                onChange={(e) => updateSettings({ ...settings, notifyPaymentReceived: e.target.checked })}
                className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-cyan-500" />
                <div>
                  <span className="font-medium">Новий клієнт</span>
                  <p className="text-xs text-gray-500">Сповіщення при реєстрації клієнта</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyNewClient}
                onChange={(e) => updateSettings({ ...settings, notifyNewClient: e.target.checked })}
                className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-violet-50 rounded-lg cursor-pointer hover:bg-violet-100 border border-violet-200">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-violet-600" />
                <div>
                  <span className="font-medium text-violet-800">Фіскальні чеки клієнтам</span>
                  <p className="text-xs text-violet-600">Автоматична відправка чеків після оплати</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sendFiscalReceipts}
                onChange={(e) => updateSettings({ ...settings, sendFiscalReceipts: e.target.checked })}
                className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Bot Commands & Setup Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gray-500" />
            Команди бота для клієнтів
          </h2>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-violet-600 font-mono">Привіт / Hello</code>
              <p className="text-sm text-gray-600 mt-1">Початок роботи з ботом та привітання</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-violet-600 font-mono">Статус [номер замовлення]</code>
              <p className="text-sm text-gray-600 mt-1">Перевірка статусу ремонту</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-violet-600 font-mono">Запис</code>
              <p className="text-sm text-gray-600 mt-1">Записатися на обслуговування</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-violet-600 font-mono">Чек [номер замовлення]</code>
              <p className="text-sm text-gray-600 mt-1">Отримати фіскальний чек</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-violet-600 font-mono">Контакти</code>
              <p className="text-sm text-gray-600 mt-1">Адреса та телефон автомайстерні</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-violet-600 font-mono">Історія</code>
              <p className="text-sm text-gray-600 mt-1">Історія обслуговувань авто</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-violet-600" />
            Як налаштувати бота
          </h2>

          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
              <div>
                <p className="font-medium">Створіть бота у Viber</p>
                <p className="text-sm text-gray-600">Перейдіть на <span className="text-violet-600">partners.viber.com</span> та створіть новий Public Account або бот</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
              <div>
                <p className="font-medium">Скопіюйте Auth Token</p>
                <p className="text-sm text-gray-600">У розділі Edit Bot знайдіть Auth Token і скопіюйте його</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
              <div>
                <p className="font-medium">Введіть токен та збережіть</p>
                <p className="text-sm text-gray-600">Вставте Auth Token у поле вище та натисніть «Зберегти»</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</span>
              <div>
                <p className="font-medium">Увімкніть потрібні сповіщення</p>
                <p className="text-sm text-gray-600">Оберіть типи сповіщень та увімкніть відправку фіскальних чеків</p>
              </div>
            </li>
          </ol>

          <div className="mt-6 p-4 bg-violet-50 rounded-lg">
            <p className="text-sm text-violet-800">
              <strong>💡 Фіскальні чеки:</strong> При увімкненій опції «Фіскальні чеки клієнтам» система автоматично надсилатиме клієнту чек у Viber після підтвердження оплати замовлення.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Notifications Log */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Останні відправлені сповіщення</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Тип</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Повідомлення</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Дата</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.notifications.slice(0, 10).map((notif) => (
                <tr key={notif.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      notif.type === 'order' ? 'bg-blue-100 text-blue-700' :
                      notif.type === 'stock' ? 'bg-orange-100 text-orange-700' :
                      notif.type === 'payment' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {notif.type === 'order' ? 'Замовлення' :
                       notif.type === 'stock' ? 'Склад' :
                       notif.type === 'payment' ? 'Оплата' : 'Система'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium">{notif.title}</p>
                    <p className="text-sm text-gray-500">{notif.message}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{notif.date}</td>
                  <td className="py-3 px-4">
                    {settings.enabled ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Відправлено
                      </span>
                    ) : (
                      <span className="text-gray-400">Бот вимкнено</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Export function to send Viber notifications from other components
export async function sendViberNotification(
  settings: ViberSettings,
  type: 'order' | 'completed' | 'stock' | 'payment' | 'client',
  title: string,
  body: string,
  receiverIds: string[] = []
) {
  if (!settings.enabled || !settings.authToken) return false;

  const shouldSend = {
    order: settings.notifyNewOrder,
    completed: settings.notifyOrderCompleted,
    stock: settings.notifyLowStock,
    payment: settings.notifyPaymentReceived,
    client: settings.notifyNewClient,
  }[type];

  if (!shouldSend) return false;

  const emoji = {
    order: '📋',
    completed: '✅',
    stock: '📦',
    payment: '💳',
    client: '👤',
  }[type];

  const text = `${emoji} SmartKharkov\n\n${title}\n${body}\n\n📅 ${new Date().toLocaleString('uk-UA')}`;

  try {
    if (receiverIds.length > 0) {
      // Send to specific subscribers
      const results = await Promise.all(
        receiverIds.map((id) =>
          fetch('https://chatapi.viber.com/pa/send_message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Viber-Auth-Token': settings.authToken,
            },
            body: JSON.stringify({
              receiver: id,
              sender: { name: 'SmartKharkov' },
              type: 'text',
              text,
            }),
          }).then((r) => r.json())
        )
      );
      return results.every((r) => r.status === 0);
    } else {
      // Broadcast to all subscribers
      const response = await fetch('https://chatapi.viber.com/pa/broadcast_message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Viber-Auth-Token': settings.authToken,
        },
        body: JSON.stringify({
          broadcast_list: [],
          sender: { name: 'SmartKharkov' },
          type: 'text',
          text,
        }),
      });
      const result = await response.json();
      return result.status === 0;
    }
  } catch (error) {
    console.error('Viber notification error:', error);
    return false;
  }
}

// Send a fiscal receipt via Viber to a specific client
export async function sendViberFiscalReceipt(
  settings: ViberSettings,
  receiverId: string,
  orderId: string,
  total: number,
  items: { name: string; qty: number; price: number }[],
  companyName: string
) {
  if (!settings.enabled || !settings.authToken || !settings.sendFiscalReceipts) return false;

  const itemLines = items
    .map((i) => `  • ${i.name} × ${i.qty} — ${(i.price * i.qty).toLocaleString('uk-UA')} грн`)
    .join('\n');

  const text =
    `🧾 Фіскальний чек\n` +
    `${companyName}\n` +
    `────────────────────\n` +
    `Замовлення: ${orderId}\n` +
    `Дата: ${new Date().toLocaleString('uk-UA')}\n` +
    `────────────────────\n` +
    `${itemLines}\n` +
    `────────────────────\n` +
    `💰 Разом: ${total.toLocaleString('uk-UA')} грн\n\n` +
    `Дякуємо за довіру! 🚗`;

  try {
    const response = await fetch('https://chatapi.viber.com/pa/send_message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Viber-Auth-Token': settings.authToken,
      },
      body: JSON.stringify({
        receiver: receiverId,
        sender: { name: companyName },
        type: 'text',
        text,
      }),
    });
    const result = await response.json();
    return result.status === 0;
  } catch (error) {
    console.error('Viber fiscal receipt error:', error);
    return false;
  }
}
