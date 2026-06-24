import React from 'react';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { useTranslation, languages, Language } from '../lib/i18n';
import { ShieldAlert, LogOut, Award, Star, User, Building, ShieldCheck, Languages } from 'lucide-react';

interface NavbarProps {
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export default function Navbar({ userProfile, onLogout }: NavbarProps) {
  const { t, language, setLanguage } = useTranslation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="h-4.5 w-4.5 text-rose-600" />;
      case 'authority':
        return <Building className="h-4.5 w-4.5 text-slate-700" />;
      default:
        return <User className="h-4.5 w-4.5 text-slate-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-50 text-rose-700 border-rose-200 border';
      case 'authority':
        return 'bg-slate-50 text-slate-700 border-slate-200 border';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 border';
    }
  };

  const getRolePortalText = (role: string) => {
    switch (role) {
      case 'admin':
        return t('adminPortal');
      case 'authority':
        return t('authorityPortal');
      default:
        return t('citizenPortal');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-xs">
            H
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">{t('appName')}</h1>
            <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">{t('tagline')}</p>
          </div>
        </div>

        {/* Right side Actions (User details, Language drop down, Logout) */}
        <div className="flex items-center gap-4">
          
          {/* User Details & Rewards */}
          {userProfile && (
            <div className="hidden md:flex items-center gap-4 border-r border-slate-200 pr-4">
              {/* Profile Info */}
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{userProfile.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {userProfile.role === 'citizen' 
                    ? t('heroPointsBadge', { points: userProfile.points || 0 }) 
                    : userProfile.email}
                </p>
              </div>

              {/* Avatar Icon */}
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-xs overflow-hidden flex items-center justify-center">
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold uppercase">
                  {userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              </div>

              {/* Role Badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadge(userProfile.role)}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>{getRolePortalText(userProfile.role)}</span>
              </div>

              {/* Achievements Badges (For Citizen) */}
              {userProfile.role === 'citizen' && userProfile.badges && userProfile.badges.length > 0 && (
                <div className="flex gap-1 pl-1.5 border-l border-slate-200">
                  {userProfile.badges.slice(0, 3).map((badge, idx) => (
                    <div key={idx} title={badge} className="relative group cursor-pointer">
                      <Award className="h-4.5 w-4.5 text-slate-600 hover:text-slate-900 transition-colors" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-950 text-white text-[10px] py-1 px-2.5 rounded-md whitespace-nowrap z-50 shadow-md">
                        {badge}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Language Selection Dropdown */}
          <div className="relative flex items-center gap-1">
            <Languages className="h-4 w-4 text-slate-400 hidden sm:block" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Logout */}
          {userProfile && (
            <>
              {/* Mobile simplified info */}
              <div className="flex md:hidden flex-col items-end">
                <span className="text-xs font-bold text-slate-900">{userProfile.name}</span>
                <span className="text-[10px] text-slate-500 capitalize">{getRolePortalText(userProfile.role)}</span>
              </div>

              <button
                onClick={handleLogout}
                className="group flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
              >
                <LogOut className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                <span className="hidden sm:inline text-xs font-semibold">{t('logout')}</span>
              </button>
            </>
          )}

        </div>
      </div>
    </header>
  );
}
