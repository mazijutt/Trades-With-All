import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Shield, ShieldCheck, Lock, Globe, Camera, CircleAlert, Clock, Check, Loader2, Gift, Copy } from 'lucide-react';

export default function Profile() {
  const { user, updateUser, fetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState('identity');

  const [identityForm, setIdentityForm] = useState({
    date_of_birth: '',
    country_code: '',
    mobile: '',
  });
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityMessage, setIdentityMessage] = useState({ type: '', text: '' });

  const [loginPw, setLoginPw] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loginPwLoading, setLoginPwLoading] = useState(false);
  const [loginPwMessage, setLoginPwMessage] = useState({ type: '', text: '' });

  const [withdrawPw, setWithdrawPw] = useState({ new_password: '', confirm_password: '' });
  const [withdrawPwLoading, setWithdrawPwLoading] = useState(false);
  const [withdrawPwMessage, setWithdrawPwMessage] = useState({ type: '', text: '' });

  const [language, setLanguage] = useState(user?.language || 'en');
  const [langLoading, setLangLoading] = useState(false);
  const [langMessage, setLangMessage] = useState({ type: '', text: '' });

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullName = user?.full_name || 'User';
  const email = user?.email || '';
  const role = user?.role || 'user';
  const identityStatus = user?.identity_status || 'unverified';

  const tabs = [
    { id: 'identity', label: 'Identity', icon: Shield },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'referral', label: 'Referral', icon: Gift },
  ];

  useEffect(() => {
    if (user?.date_of_birth) {
      setIdentityForm(prev => ({ ...prev, date_of_birth: user.date_of_birth }));
    }
    if (user?.country_code) {
      setIdentityForm(prev => ({ ...prev, country_code: user.country_code }));
    }
    if (user?.mobile) {
      setIdentityForm(prev => ({ ...prev, mobile: user.mobile }));
    }
    if (user?.language) {
      setLanguage(user.language);
    }
  }, [user]);

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ avatar: data.avatar || data.url });
    } catch {
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleIdentitySubmit(e) {
    e.preventDefault();
    setIdentityLoading(true);
    setIdentityMessage({ type: '', text: '' });
    try {
      await api.post('/auth/submit-verification', {
        date_of_birth: identityForm.date_of_birth,
        country_code: identityForm.country_code || undefined,
        mobile: identityForm.mobile,
      });
      setIdentityMessage({ type: 'success', text: 'Verification request submitted successfully.' });
      updateUser({ identity_status: 'pending' });
    } catch (err) {
      setIdentityMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit verification.' });
    } finally {
      setIdentityLoading(false);
    }
  }

  async function handleLoginPassword(e) {
    e.preventDefault();
    if (loginPw.new_password !== loginPw.confirm_password) {
      setLoginPwMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setLoginPwLoading(true);
    setLoginPwMessage({ type: '', text: '' });
    try {
      await api.post('/auth/change-password', {
        current_password: loginPw.current_password,
        new_password: loginPw.new_password,
      });
      setLoginPwMessage({ type: 'success', text: 'Login password updated successfully.' });
      setLoginPw({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setLoginPwMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setLoginPwLoading(false);
    }
  }

  async function handleWithdrawPassword(e) {
    e.preventDefault();
    if (withdrawPw.new_password !== withdrawPw.confirm_password) {
      setWithdrawPwMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setWithdrawPwLoading(true);
    setWithdrawPwMessage({ type: '', text: '' });
    try {
      await api.post('/auth/withdrawal-password', {
        new_password: withdrawPw.new_password,
      });
      setWithdrawPwMessage({ type: 'success', text: 'Withdrawal password set successfully.' });
      setWithdrawPw({ new_password: '', confirm_password: '' });
      updateUser({ has_withdrawal_password: true });
    } catch (err) {
      setWithdrawPwMessage({ type: 'error', text: err.response?.data?.message || 'Failed to set withdrawal password.' });
    } finally {
      setWithdrawPwLoading(false);
    }
  }

  async function handleLanguageSave() {
    setLangLoading(true);
    setLangMessage({ type: '', text: '' });
    try {
      await api.post('/auth/language', { language });
      setLangMessage({ type: 'success', text: 'Language preference saved.' });
      updateUser({ language });
    } catch (err) {
      setLangMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save language.' });
    } finally {
      setLangLoading(false);
    }
  }

  const referralLink = user?.referral_code
    ? `${window.location.origin}/register?ref=${user.referral_code}`
    : '';

  async function copyReferral() {
    if (!user?.referral_code) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function getStatusBanner() {
    if (identityStatus === 'verified') {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-emerald-700 font-semibold text-sm">Gemini Verified Successfully!</p>
            <p className="text-emerald-500 text-xs mt-0.5">Your identity has been verified by our team.</p>
          </div>
        </div>
      );
    }
    if (identityStatus === 'pending') {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-amber-700 font-semibold text-sm">Under Review</p>
            <p className="text-amber-500 text-xs mt-0.5">Your information is being reviewed by admin.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <CircleAlert className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <p className="text-gray-800 font-semibold text-sm">Verify Your Identity</p>
          <p className="text-gray-500 text-xs mt-0.5">Complete verification to unlock all features.</p>
        </div>
      </div>
    );
  }

  function getIdentityBadge() {
    if (identityStatus === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
          <Check className="w-3 h-3" />
          Verified
        </span>
      );
    }
    if (identityStatus === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Unverified
      </span>
    );
  }

  function getRoleBadge() {
    const roleMap = {
      admin: { label: 'Admin', color: 'text-red-600 bg-red-50' },
      vip: { label: 'VIP', color: 'text-sky-600 bg-sky-50' },
      user: { label: 'User', color: 'text-blue-600 bg-blue-50' },
    };
    const r = roleMap[role] || roleMap.user;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
        {r.label}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-2xl font-bold text-white">
                {avatarLoading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  fullName[0]?.toUpperCase() || 'U'
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-sky-200 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                <Camera className="w-3.5 h-3.5 text-sky-500" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading text-xl font-bold text-gray-900 truncate">{fullName}</h2>
                {getRoleBadge()}
                {getIdentityBadge()}
              </div>
              <p className="text-gray-400 text-sm truncate mt-0.5">{email}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-xl border border-sky-100 p-1">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-600 border border-sky-200'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'identity' && (
          <div className="bg-white shadow-sm rounded-xl border border-sky-100 p-6 space-y-5">
            {getStatusBanner()}

            {(identityStatus === 'unverified' || identityStatus === 'pending') && (
              <form onSubmit={handleIdentitySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    readOnly
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm cursor-not-allowed opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm cursor-not-allowed opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={identityForm.date_of_birth}
                    onChange={(e) => setIdentityForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    readOnly={identityStatus === 'pending'}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={identityForm.country_code}
                      onChange={(e) => setIdentityForm(prev => ({ ...prev, country_code: e.target.value }))}
                      placeholder="+91"
                      readOnly={identityStatus === 'pending'}
                      className="w-24 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    />
                    <input
                      type="text"
                      value={identityForm.mobile}
                      onChange={(e) => setIdentityForm(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="Phone number"
                      readOnly={identityStatus === 'pending'}
                      className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

                {identityMessage.text && (
                  <p className={`text-sm font-medium ${identityMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {identityMessage.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={identityLoading || identityStatus === 'pending'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {identityLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : identityStatus === 'pending' ? (
                    'Awaiting Admin Approval'
                  ) : (
                    'Submit for Verification'
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="bg-white shadow-sm rounded-xl border border-sky-100 p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-5 h-5 text-sky-500" />
                <h3 className="font-heading text-lg font-bold text-gray-900">Login Password</h3>
              </div>
              <form onSubmit={handleLoginPassword} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={loginPw.current_password}
                    onChange={(e) => setLoginPw(prev => ({ ...prev, current_password: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={loginPw.new_password}
                    onChange={(e) => setLoginPw(prev => ({ ...prev, new_password: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={loginPw.confirm_password}
                    onChange={(e) => setLoginPw(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                </div>
                {loginPwMessage.text && (
                  <p className={`text-sm font-medium ${loginPwMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {loginPwMessage.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loginPwLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loginPwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Login Password'}
                </button>
              </form>
            </div>

            <div className="bg-white shadow-sm rounded-xl border border-sky-100 p-6 space-y-4 border-t">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Lock className="w-5 h-5 text-sky-500" />
                <h3 className="font-heading text-lg font-bold text-gray-900">Withdrawal Password</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-600">
                  Required for withdrawals
                </span>
              </div>
              <form onSubmit={handleWithdrawPassword} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Withdrawal Password</label>
                  <input
                    type="password"
                    value={withdrawPw.new_password}
                    onChange={(e) => setWithdrawPw(prev => ({ ...prev, new_password: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Withdrawal Password</label>
                  <input
                    type="password"
                    value={withdrawPw.confirm_password}
                    onChange={(e) => setWithdrawPw(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  />
                </div>
                <p className="text-gray-400 text-xs">
                  {user?.has_withdrawal_password
                    ? 'Your withdrawal password is set. You can update it here.'
                    : 'You have not set a withdrawal password yet. Set one to enable withdrawals.'}
                </p>
                {withdrawPwMessage.text && (
                  <p className={`text-sm font-medium ${withdrawPwMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {withdrawPwMessage.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={withdrawPwLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {withdrawPwLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : user?.has_withdrawal_password ? (
                    'Update Withdrawal Password'
                  ) : (
                    'Set Withdrawal Password'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'language' && (
          <div className="bg-white shadow-sm rounded-xl border border-sky-100 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-5 h-5 text-sky-500" />
              <h3 className="font-heading text-lg font-bold text-gray-900">Preferred Language</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="pt">Português</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ru">Russian</option>
                <option value="ko">Korean</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
            {langMessage.text && (
              <p className={`text-sm font-medium ${langMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {langMessage.text}
              </p>
            )}
            <button
              onClick={handleLanguageSave}
              disabled={langLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {langLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Language'}
            </button>
          </div>
        )}

        {activeTab === 'referral' && (
          <div className="bg-white shadow-sm rounded-xl border border-sky-100 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-sky-500" />
              <h3 className="font-heading text-lg font-bold text-gray-900">Referral Program</h3>
            </div>
            <p className="text-sm text-gray-500">
              Share your code and earn a <span className="font-semibold text-sky-600">$5 bonus</span> for every friend who signs up using your referral link.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sky-50/60 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Referrals</p>
                <p className="font-heading text-2xl font-bold text-gray-900">{user?.referrals?.length || 0}</p>
              </div>
              <div className="bg-emerald-50/60 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Referral Earnings</p>
                <p className="font-heading text-2xl font-bold text-emerald-600">${(user?.referral_earnings || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Your Referral Code</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-heading text-2xl font-bold text-sky-600 tracking-widest">
                  {user?.referral_code || '—'}
                </p>
                <button
                  onClick={copyReferral}
                  disabled={!user?.referral_code}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              {referralLink && (
                <p className="text-gray-400 text-xs break-all mt-1">{referralLink}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
