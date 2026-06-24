import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db,
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  deleteDoc
} from './lib/firebase';
import { UserProfile, UserRole } from './types';
import Navbar from './components/Navbar';
import CitizenDashboard from './components/CitizenDashboard';
import AuthorityDashboard from './components/AuthorityDashboard';
import AdminDashboard from './components/AdminDashboard';
import AiChatAssistant from './components/AiChatAssistant';
import { LanguageProvider, useTranslation, Language } from './lib/i18n';
import { 
  ShieldAlert, 
  Lock, 
  Mail, 
  User, 
  Building, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { ToastProvider } from './components/Toast';

function AppContent() {
  const { t, language } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Authentication mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [department, setDepartment] = useState('Road Maintenance');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Demo account bypass definitions
  const demoAccounts = [
    { email: 'citizen@hero.org', pass: 'citizen123', name: 'Alex Mercer', role: 'citizen' },
    { email: 'authority@hero.org', pass: 'authority123', name: 'Chief Roger Smith', role: 'authority', dept: 'Road Maintenance' },
    { email: 'admin@hero.org', pass: 'admin123', name: 'Central Administrator', role: 'admin' }
  ];

  // Track Auth Session State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsLoadingProfile(true);
        try {
          await loadUserProfile(currentUser.uid, currentUser.email || '');
        } catch (err) {
          console.error('Failed to load user profile on auth trigger:', err);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoadingAuth(false);
    });

    return unsubscribe;
  }, []);

  // Fetch or create Firestore user profile matching authenticated credentials
  const loadUserProfile = async (uid: string, userEmail: string) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      setUserProfile(docSnap.data() as UserProfile);
    } else {
      // Check if email has been pre-registered by an Admin (authority accounts)
      const q = query(collection(db, 'users'), where('email', '==', userEmail.toLowerCase()));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        // Inherit pre-assigned role!
        const preAssignedDoc = querySnap.docs[0];
        const preAssignedData = preAssignedDoc.data();
        
        const completedProfile: UserProfile = {
          uid,
          name: preAssignedData.name || 'Municipal Official',
          email: userEmail,
          role: preAssignedData.role as UserRole,
          points: preAssignedData.points || 0,
          badges: preAssignedData.badges || [],
          createdAt: preAssignedData.createdAt || Date.now()
        };

        // Create the real auth UID profile and delete the dummy pre-assigned doc
        await setDoc(doc(db, 'users', uid), completedProfile);
        await deleteDoc(doc(db, 'users', preAssignedDoc.id));
        setUserProfile(completedProfile);
      } else {
        // Fresh registration profile
        const freshProfile: UserProfile = {
          uid,
          name: name || userEmail.split('@')[0],
          email: userEmail,
          role: role,
          points: 0,
          badges: [],
          createdAt: Date.now()
        };
        await setDoc(docRef, freshProfile);
        setUserProfile(freshProfile);
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Register standard Email password
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      let errMsg = t('authFailed');
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('already-registered')) {
        errMsg = t('emailInUse');
      } else if (err.code === 'auth/wrong-password' || err.message?.includes('wrong-password')) {
        errMsg = t('wrongPassword');
      } else if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found')) {
        errMsg = t('userNotFound');
      }
      setAuthError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Triggers instant bypass login for demo convenience
  const handleQuickDemoBypass = async (demo: typeof demoAccounts[number]) => {
    setAuthError('');
    setIsLoadingAuth(true);
    try {
      try {
        await signInWithEmailAndPassword(auth, demo.email, demo.pass);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          // Register demo credential
          const cred = await createUserWithEmailAndPassword(auth, demo.email, demo.pass);
          // Create corresponding profile
          const profile: UserProfile & { department?: string } = {
            uid: cred.user.uid,
            name: demo.name,
            email: demo.email,
            role: demo.role as UserRole,
            points: demo.role === 'citizen' ? 40 : 0,
            badges: demo.role === 'citizen' ? ['First Responder'] : [],
            createdAt: Date.now()
          };
          if (demo.dept) {
            profile.department = demo.dept;
          }
          await setDoc(doc(db, 'users', cred.user.uid), profile);
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      console.error('Demo account bypass failed:', err);
      setAuthError('Failed to launch demo profile: ' + (err.message || err));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Rendering screen router based on active roles
  const renderDashboardByRole = () => {
    if (!userProfile) return null;

    switch (userProfile.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'authority':
        return <AuthorityDashboard userId={userProfile.uid} userName={userProfile.name} />;
      default:
        return <CitizenDashboard userId={userProfile.uid} userName={userProfile.name} />;
    }
  };

  if (isLoadingAuth || isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800 shadow-lg shadow-slate-200">
            <span className="text-white font-bold text-2xl">H</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
            <p className="text-sm font-semibold text-slate-700">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {user && userProfile ? (
        <>
          {/* Main Dashboard Layout */}
          <Navbar userProfile={userProfile} onLogout={() => setUserProfile(null)} />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {renderDashboardByRole()}
          </main>
          <AiChatAssistant userId={userProfile.uid} userName={userProfile.name} />
        </>
      ) : (
        /* Unified Authentication Card Screen */
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-50">
          
          <div className="mx-auto w-full max-w-md space-y-8 z-10">
            {/* Header branding */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 shadow-md shadow-slate-200 mb-4 text-white font-bold text-2xl">
                H
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{t('appName')}</h2>
              <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mt-2.5">
                {t('appSubtitle')}
              </p>
            </div>

            {/* Auth Form Box */}
            <div className="bg-white px-8 py-8 rounded-xl shadow-sm border border-slate-200 space-y-6">
              
              {/* Tab Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('loginTab')}
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError('');
                  }}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authMode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('registerTab')}
                </button>
              </div>

              {/* Error Callout */}
              {authError && (
                <div className="flex gap-2 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium leading-relaxed items-start animate-shake">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Action Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">{t('fullNameLabel')}</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder={t('fullNamePlaceholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">{t('emailLabel')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder={t('emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">{t('passwordLabel')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">{t('signUpAs')}</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
                      >
                        <option value="citizen">{t('citizenOption')}</option>
                        <option value="authority">{t('authorityOption')}</option>
                      </select>
                    </div>
                    {role === 'authority' && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">{t('departmentLabel')}</label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-700 focus:outline-hidden cursor-pointer"
                        >
                          <option value="Road Maintenance">{t('deptRoads')}</option>
                          <option value="Waste Management">{t('deptWaste')}</option>
                          <option value="Water Supply Dept">{t('deptWater')}</option>
                          <option value="Streetlight Utility">{t('deptPower')}</option>
                          <option value="Drainage & Sewerage">{t('deptDrainage')}</option>
                          <option value="Animal Control">{t('deptAnimals')}</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <>
                      <span>{authMode === 'login' ? t('accessTerminal') : t('createFreeAccount')}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* QUICK DEMO BYPASS ROW */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">{t('bypassTitle')}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              
              <div className="grid grid-cols-3 gap-2.5">
                {demoAccounts.map((demo, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickDemoBypass(demo)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 bg-white transition-all cursor-pointer text-center shadow-xs"
                  >
                    <span className="text-[10px] font-semibold text-slate-800">
                      {demo.role === 'admin' 
                        ? t('adminPortal').split(' ')[0] 
                        : demo.role === 'authority' 
                        ? t('authorityPortal').split(' ')[0] 
                        : t('citizenPortal').split(' ')[0]}
                    </span>
                    <span className="text-[8px] text-slate-400 mt-0.5 truncate max-w-full">{demo.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LanguageProvider>
  );
}
