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

export const SocialMediaManagement: React.FC = () => {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [history, setHistory] = useState<UpdateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Fetch social media data
  const fetchSocialData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/social-stats.php');
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
    fetchSocialData();
  }, []);

  // Update follower count
  const handleUpdate = async (platformKey: string, newCount: string) => {
    const count = parseInt(newCount);
    if (isNaN(count) || count < 0) {
      alert('الرجاء إدخال رقم صحيح');
      return;
    }

    setUpdating(platformKey);
    try {
      const response = await fetch('/api/admin/social-stats.php', {
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

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6" dir="rtl">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded"></div>
        </div>
        إدارة أعداد المتابعين
      </h2>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 border-t-red-600"></div>
          <p className="text-white mt-4">جاري التحميل...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-red-500 transition-colors"
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
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-2xl font-bold focus:outline-none focus:border-red-500"
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
      )}
    </div>
  );
};
