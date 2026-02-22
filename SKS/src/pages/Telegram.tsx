import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Settings, Bell, CheckCircle, AlertCircle, MessageCircle, Users, Package, CreditCard, FileText, Loader } from 'lucide-react';
import { AppData, TelegramSettings } from '../types';

type Props = {
  data: AppData;
  onSave: (data: AppData) => void;
};

export default function Telegram({ data, onSave }: Props) {
  const [settings, setSettings] = useState<TelegramSettings>(data.telegramSettings || {
    enabled: false,
    botToken: '',
    chatId: '',
    notifyNewOrder: true,
    notifyOrderCompleted: true,
    notifyLowStock: true,
    notifyPaymentReceived: true,
    notifyNewClient: true,
    welcomeMessage: 'Вітаємо в SmartKharkov! 🚗',
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);

  // Keep refs to latest values so the cleanup function can access them
  const settingsRef = useRef(settings);
  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
    dataRef.current = data;
    onSaveRef.current = onSave;
  }, [settings, data, onSave]);

  // Auto-save settings when navigating away from this page
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        onSaveRef.current({ ...dataRef.current, telegramSettings: settingsRef.current });
      }
    };
  }, []);

  const updateSettings = (updated: TelegramSettings) => {
    isDirtyRef.current = true;
    setSettings(updated);
  };

  const handleSave = () => {
    onSave({
      ...data,
      telegramSettings: settings,
    });
    isDirtyRef.current = false;
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const sendTestMessage = async () => {
    if (!settings.botToken || !settings.chatId) {
      setTestStatus('error');
      setTestMessage('Будь ласка, введіть токен бота та Chat ID');
      return;
    }

    setTestStatus('loading');
    try {
      const message = `🔧 *SmartKharkov* - Тестове повідомлення\n\n✅ Telegram бот успішно налаштований!\n\n📅 ${new Date().toLocaleString('uk-UA')}`;
      
      const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json();
      
      if (result.ok) {
        setTestStatus('success');
        setTestMessage('Тестове повідомлення успішно відправлено!');
      } else {
        setTestStatus('error');
        setTestMessage(`Помилка: ${result.description}`);
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('Помилка з\'єднання з Telegram API');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Telegram Бот</h1>
            <p className="text-gray-500">Налаштування сповіщень та інтеграції</p>
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot Token
              </label>
              <input
                type="text"
                value={settings.botToken}
                onChange={(e) => updateSettings({ ...settings, botToken: e.target.value })}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <p className="text-xs text-gray-500 mt-1">Отримайте у @BotFather</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chat ID
              </label>
              <input
                type="text"
                value={settings.chatId}
                onChange={(e) => updateSettings({ ...settings, chatId: e.target.value })}
                placeholder="-1001234567890"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <p className="text-xs text-gray-500 mt-1">ID групи або каналу для сповіщень</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Привітальне повідомлення
              </label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => updateSettings({ ...settings, welcomeMessage: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Вітаємо! Чим можемо допомогти?"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={sendTestMessage}
                disabled={testStatus === 'loading'}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
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
                className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500"
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
                className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500"
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
                className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500"
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
                className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500"
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
                className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Bot Commands & Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gray-500" />
            Команди бота для клієнтів
          </h2>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-blue-600 font-mono">/start</code>
              <p className="text-sm text-gray-600 mt-1">Початок роботи з ботом</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-blue-600 font-mono">/status [номер замовлення]</code>
              <p className="text-sm text-gray-600 mt-1">Перевірка статусу ремонту</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-blue-600 font-mono">/book</code>
              <p className="text-sm text-gray-600 mt-1">Записатися на обслуговування</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-blue-600 font-mono">/price [послуга]</code>
              <p className="text-sm text-gray-600 mt-1">Дізнатися орієнтовну вартість</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-blue-600 font-mono">/contacts</code>
              <p className="text-sm text-gray-600 mt-1">Контакти автомайстерні</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <code className="text-blue-600 font-mono">/history</code>
              <p className="text-sm text-gray-600 mt-1">Історія обслуговувань</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-gray-500" />
            Як налаштувати бота
          </h2>

          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold text-sm">1</span>
              <div>
                <p className="font-medium">Створіть бота в Telegram</p>
                <p className="text-sm text-gray-600">Напишіть @BotFather команду /newbot та дотримуйтесь інструкцій</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold text-sm">2</span>
              <div>
                <p className="font-medium">Скопіюйте токен бота</p>
                <p className="text-sm text-gray-600">BotFather надасть вам токен у форматі 123456789:ABC...</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold text-sm">3</span>
              <div>
                <p className="font-medium">Отримайте Chat ID</p>
                <p className="text-sm text-gray-600">Створіть групу, додайте бота, потім @RawDataBot щоб дізнатися ID</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold text-sm">4</span>
              <div>
                <p className="font-medium">Введіть дані та протестуйте</p>
                <p className="text-sm text-gray-600">Заповніть поля вище та натисніть "Тест" для перевірки</p>
              </div>
            </li>
          </ol>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Порада:</strong> Для роботи команд клієнтів потрібен webhook-сервер. 
              Зверніться до розробника для налаштування повної інтеграції.
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

// Export function to send notifications from other components
export async function sendTelegramNotification(
  settings: TelegramSettings,
  type: 'order' | 'completed' | 'stock' | 'payment' | 'client',
  title: string,
  body: string
) {
  if (!settings.enabled || !settings.botToken || !settings.chatId) return false;

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

  const message = `${emoji} *SmartKharkov*\n\n*${title}*\n${body}\n\n📅 ${new Date().toLocaleString('uk-UA')}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('Telegram notification error:', error);
    return false;
  }
}
