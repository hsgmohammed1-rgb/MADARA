import React, { useState, useEffect } from 'react';
import { InstagramIcon, TikTokIcon, XIcon, WhatsAppIcon, SnapchatIcon, YoutubeIcon, KickIcon } from './Icons';

interface SocialPlatform {
  id: number;
  platform_name: string;
  platform_key: string;
  icon_name: string;
  color_hex: string;
  profile_url: string;
  follower_count: number;
  last_updated: string;
  updated_by: string;
  is_active: boolean;
}

interface UpdateHistory {
  id: number;
  platform_name: string;
  platform_key: string;
  old_count: number;
  new_count: number;
  updated_by: string;
  update_source: string;
  notes: string;
  created_at: string;
}

export const SocialMediaAdmin: React.FC = () => {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [history, setHistory] = useState<UpdateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showHistory, setShowHistory] = useState(false);

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-auth');
        const data = await response.json();
        setIsAdmin(data.authenticated);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAdmin(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch social media data
  const fetchSocialData = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/admin/social-stats');
      const data = await response.json();
      setPlatforms(data.platforms || []);
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch social data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSocialData();
    }
  }, [isAdmin]);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();
      if (data.success) {
        setIsAdmin(true);
        setLoginForm({ username: '', password: '' });
      } else {
        alert('بيانات الدخول غير صحيحة');
      }
    } catch (error) {
      alert('حدث خطأ في تسجيل الدخول');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsAdmin(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Update follower count
  const handleUpdate = async (platformKey: string, newCount: string) => {
    const count = parseInt(newCount);
    if (isNaN(count) || count < 0) {
      alert('الرجاء إدخال رقم صحيح');
      return;
    }

    setUpdating(platformKey);
    try {
      const response = await fetch('/api/admin/update-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_key: platformKey,
          follower_count: count,
          update_source: 'manual',
          notes: 'تم التحديث يدوياً من لوحة التحكم'
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchSocialData();
        setEditMode(null);
        setEditValues({});
        alert('تم تحديث العدد بنجاح');
      } else {
        alert('فشل تحديث العدد');
      }
    } catch (error) {
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setUpdating(null);
    }
  };

  // Get icon component
  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      InstagramIcon: <InstagramIcon className="w-6 h-6" />,
      TikTokIcon: <TikTokIcon className="w-6 h-6" />,
      XIcon: <XIcon className="w-6 h-6" />,
      WhatsAppIcon: <WhatsAppIcon className="w-6 h-6" />,
      SnapchatIcon: <SnapchatIcon className="w-6 h-6" />,
      YoutubeIcon: <YoutubeIcon className="w-6 h-6" />,
      KickIcon: <KickIcon className="w-6 h-6" />
    };
    return icons[iconName] || <div className="w-6 h-6 bg-gray-500 rounded" />;
  };

  // Format number
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4" dir="rtl">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">تسجيل دخول المدير</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white mb-2">اسم المستخدم</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-white mb-2">كلمة المرور</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              دخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4" dir="rtl">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">إدارة التواصل الاجتماعي</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            تسجيل خروج
          </button>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowHistory(false)}
          className={`px-6 py-3 rounded-lg font-bold transition-colors ${
            !showHistory ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          تحديث الأرقام
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`px-6 py-3 rounded-lg font-bold transition-colors ${
            showHistory ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          سجل التحديثات
        </button>
      </div>

      {!showHistory ? (
        /* Social Media Platforms Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-red-500 transition-colors"
            >
              {/* Platform Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: platform.color_hex + '20' }}
                  >
                    {getIcon(platform.icon_name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{platform.platform_name}</h3>
                    <p className="text-xs text-gray-400">آخر تحديث: {new Date(platform.last_updated).toLocaleDateString('ar-SA')}</p>
                  </div>
                </div>
              </div>

              {/* Follower Count Display/Edit */}
              <div className="space-y-3">
                {editMode === platform.platform_key ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={editValues[platform.platform_key] || ''}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [platform.platform_key]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-2xl font-bold focus:outline-none focus:border-red-500"
                      placeholder="أدخل العدد الجديد"
                      min="0"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(platform.platform_key, editValues[platform.platform_key])}
                        disabled={updating === platform.platform_key}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors"
                      >
                        {updating === platform.platform_key ? 'جاري الحفظ...' : 'حفظ'}
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(null);
                          setEditValues({});
                        }}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {formatNumber(platform.follower_count)}
                    </div>
                    <button
                      onClick={() => {
                        setEditMode(platform.platform_key);
                        setEditValues({ [platform.platform_key]: platform.follower_count.toString() });
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors"
                    >
                      تعديل العدد
                    </button>
                  </div>
                )}
              </div>

              {/* Platform Link */}
              {platform.profile_url && (
                <div className="mt-4">
                  <a
                    href={platform.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                  >
                    فتح الصفحة
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Update History */
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">سجل التحديثات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-right p-3">المنصة</th>
                  <th className="text-right p-3">العدد القديم</th>
                  <th className="text-right p-3">العدد الجديد</th>
                  <th className="text-right p-3">تم التحديث بواسطة</th>
                  <th className="text-right p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="p-3">{item.platform_name}</td>
                    <td className="p-3">{item.old_count ? formatNumber(item.old_count) : '-'}</td>
                    <td className="p-3 font-bold text-green-400">{formatNumber(item.new_count)}</td>
                    <td className="p-3">{item.updated_by}</td>
                    <td className="p-3">{new Date(item.created_at).toLocaleString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
