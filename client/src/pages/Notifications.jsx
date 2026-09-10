import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Bell, CircleArrowDown, CircleArrowUp, Info, Trophy, XCircle, Flame, Check, CheckCheck } from 'lucide-react'

function timeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const SYSTEM_NOTIFICATIONS = [
  {
    id: 'system-1',
    title: 'Security Tip',
    message: 'Enable 2-step verification to protect your account from unauthorized access.',
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  {
    id: 'system-2',
    title: 'Market Update - BTC',
    message: 'Bitcoin (BTC) is up 4.2% in the last 24 hours. Check the latest prices on Trade.',
    icon: Flame,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
  },
  {
    id: 'system-3',
    title: 'Trading Streak',
    message: 'Log in to the Trade page and keep your streak going.',
    icon: Flame,
    color: 'text-sky-600',
    bg: 'bg-sky-50'
  }
]

function getNotificationIcon(type) {
  switch (type) {
    case 'deposit_request':
      return { icon: CircleArrowDown, color: 'text-sky-600', bg: 'bg-sky-50' }
    case 'withdrawal_request':
      return { icon: CircleArrowUp, color: 'text-sky-600', bg: 'bg-sky-50' }
    case 'deposit_approved':
      return { icon: CircleArrowDown, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    case 'withdrawal_approved':
      return { icon: CircleArrowUp, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    case 'deposit_rejected':
      return { icon: CircleArrowDown, color: 'text-red-600', bg: 'bg-red-50' }
    case 'withdrawal_rejected':
      return { icon: CircleArrowUp, color: 'text-red-600', bg: 'bg-red-50' }
    case 'trade_won':
      return { icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    case 'trade_lost':
      return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' }
    case 'general':
    case 'system':
      return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' }
    default:
      return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' }
  }
}

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data.notifications || res.data || [])
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (err) {
      console.error('Failed to mark as read', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter(n => !n.is_read)
          .map(n => api.post(`/notifications/${n.id}/read`))
      )
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Failed to mark all as read', err)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const filteredNotifications = notifications.filter(n => {
    switch (filter) {
      case 'unread':
        return !n.is_read
      case 'deposits':
        return n.type?.includes('deposit')
      case 'withdrawals':
        return n.type?.includes('withdrawal')
      case 'system':
        return n.type === 'system' || n.type === 'general'
      default:
        return true
    }
  })

  const tabs = ['all', 'unread', 'deposits', 'withdrawals', 'system']
  const tabLabels = { all: 'All', unread: 'Unread', deposits: 'Deposits', withdrawals: 'Withdrawals', system: 'System' }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-sky-500" />
            <h1 className="text-2xl font-heading font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-sm text-gray-400">{unreadCount} unread</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab
                  ? 'bg-sky-50 text-sky-600 border border-sky-200'
                  : 'bg-white text-gray-400 border border-transparent hover:bg-gray-50 hover:text-gray-600 shadow-sm'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filter === 'all' && (
              <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">System</p>
                {SYSTEM_NOTIFICATIONS.map(sysNotif => {
                  const SysIcon = sysNotif.icon
                  return (
                    <div
                      key={sysNotif.id}
                      className="bg-white rounded-xl shadow-sm border border-sky-100 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${sysNotif.bg} flex items-center justify-center flex-shrink-0`}>
                          <SysIcon className={`w-5 h-5 ${sysNotif.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{sysNotif.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{sysNotif.message}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
                  <Bell className="w-10 h-10 text-sky-300" />
                </div>
                <p className="text-gray-400 text-sm">No notifications</p>
              </div>
            ) : (
              <>
                {filter !== 'all' && <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">{tabLabels[filter]}</p>}
                {filteredNotifications.map(notification => {
                  const { icon: NotifIcon, color, bg } = getNotificationIcon(notification.type)
                  return (
                    <div
                      key={notification.id}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                      className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                        notification.is_read ? 'border-sky-100' : 'border-sky-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                          <NotifIcon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {timeAgo(notification.created_at || notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
