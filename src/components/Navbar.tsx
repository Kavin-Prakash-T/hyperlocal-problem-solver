import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { useTranslation, languages, Language } from '../lib/i18n';
import { 
  ShieldCheck, 
  Building, 
  User, 
  Award, 
  Languages, 
  LogOut, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export default function Navbar({ userProfile, onLogout }: NavbarProps) {
  const { t, language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

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
        return <ShieldCheck className="h-4 w-4" />;
      case 'authority':
        return <Building className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'authority':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-xs shrink-0">
              H
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">{t('appName')}</h1>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">{t('tagline')}</p>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {userProfile && (
              <div className="flex items-center gap-4 border-r border-slate-200 pr-4">
                {/* Profile Info */}
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{userProfile.name}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    {userProfile.role === 'citizen' 
                      ? t('heroPointsBadge', { points: userProfile.points || 0 }) 
                      : userProfile.email}
                  </p>
                </div>

                {/* Avatar Icon */}
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center font-bold text-slate-700 text-xs uppercase shrink-0">
                  {userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>

                {/* Role Badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getRoleBadgeClass(userProfile.role)}`}>
                  {getRoleIcon(userProfile.role)}
                  <span>{getRolePortalText(userProfile.role)}</span>
                </div>

                {/* Achievements Badges (For Citizen) */}
                {userProfile.role === 'citizen' && userProfile.badges && userProfile.badges.length > 0 && (
                  <div className="flex gap-1 pl-2 border-l border-slate-200">
                    {userProfile.badges.slice(0, 3).map((badge, idx) => (
                      <div key={idx} title={badge} className="relative group cursor-pointer">
                        <Award className="h-4.5 w-4.5 text-slate-500 hover:text-slate-800 transition-colors" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[9px] py-1 px-2 rounded-md whitespace-nowrap z-50 shadow-md font-semibold">
                          {badge}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Language Dropdown */}
            <div className="relative flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-slate-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
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
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-xs font-semibold shadow-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t('logout')}</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburguer Trigger */}
          <div className="flex md:hidden items-center gap-2">
            {/* Quick Lang selection for mobile on navbar directly */}
            <div className="relative flex items-center">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold px-2 py-1 focus:outline-hidden cursor-pointer"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {userProfile && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-50 focus:outline-hidden cursor-pointer"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && userProfile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-200 bg-white overflow-hidden"
          >
            <div className="px-4 pt-4 pb-6 space-y-4">
              {/* User Identity Info */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm uppercase shrink-0">
                  {userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{userProfile.name}</p>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">
                    {userProfile.role === 'citizen' 
                      ? t('heroPointsBadge', { points: userProfile.points || 0 }) 
                      : userProfile.email}
                  </p>
                </div>
                <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${getRoleBadgeClass(userProfile.role)}`}>
                  {getRolePortalText(userProfile.role).split(' ')[0]}
                </div>
              </div>

              {/* Badges display on mobile */}
              {userProfile.role === 'citizen' && userProfile.badges && userProfile.badges.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('badges')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {userProfile.badges.map((badge, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-600">
                        <Award className="h-3.5 w-3.5 text-slate-500" />
                        <span>{badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Language Selector in Mobile Drawer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Languages className="h-4 w-4 text-slate-400" />
                  Language
                </span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold px-2.5 py-1.5 cursor-pointer"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-3 text-slate-700 transition-colors cursor-pointer text-xs font-bold"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('logout')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
