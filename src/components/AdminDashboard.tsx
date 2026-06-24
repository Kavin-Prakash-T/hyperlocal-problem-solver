import React, { useState, useEffect } from 'react';
import { 
  db,
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  orderBy, 
  setDoc
} from '../lib/firebase';
import { Issue, UserProfile, IssueStatus } from '../types';
import CivicMap from './CivicMap';
import { useTranslation } from '../lib/i18n';
import { useToast } from './Toast';
import { 
  FolderLock, 
  Sparkles, 
  Download, 
  Building, 
  Briefcase, 
  Loader2, 
  UserCheck,
  X,
  Users
} from 'lucide-react';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  // Analytics State
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Authority Creation Form
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authDept, setAuthDept] = useState('Road Maintenance');
  const [isCreatingAuthority, setIsCreatingAuthority] = useState(false);

  // Issue Assignment form
  const [assignDept, setAssignDept] = useState('Road Maintenance');
  const [isAssigning, setIsAssigning] = useState(false);

  // Active view tabs: 'issues' | 'users'
  const [activeTab, setActiveTab] = useState<'issues' | 'users'>('issues');

  // Load Issues
  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Issue[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Issue);
      });
      setIssues(fetched);
    }, (error) => {
      console.error('Failed to load issues:', error);
    });
    return unsubscribe;
  }, []);

  // Sync selected issue details
  useEffect(() => {
    if (selectedIssue) {
      const updated = issues.find(i => i.id === selectedIssue.id);
      if (updated) {
        setSelectedIssue(updated);
      }
    }
  }, [issues]);

  // Load Users
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: UserProfile[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(fetchedUsers);
    }, (error) => {
      console.error('Failed to load users:', error);
    });
    return unsubscribe;
  }, []);

  // AI Insights Generation Proxy
  const generateAiHotspotInsights = async () => {
    if (issues.length === 0) {
      toast('Please wait for reported issues to populate before generating hotspot analysis.', 'warning');
      return;
    }

    setIsGeneratingInsights(true);
    setAiInsights('');
    try {
      const summaryReports = issues.map(i => ({
        category: i.category,
        severity: i.severity,
        status: i.status,
        address: i.address,
        upvotes: i.verificationCount
      }));

      const response = await fetch('/api/gemini-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: summaryReports })
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const result = await response.json();
      setAiInsights(result.insights || 'No substantial trends detected.');
      toast('Hotspot analysis complete!', 'success');
    } catch (err) {
      console.error('Failed to analyze hotspots:', err);
      setAiInsights('Error: Unable to analyze city hotspots. Confirm your Gemini API key credentials and internet connectivity.');
      toast('AI insights failed. Check credentials.', 'error');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // CSV Data Exporter
  const exportToCSV = () => {
    if (issues.length === 0) {
      toast('No issues available to export.', 'warning');
      return;
    }

    const headers = ['ID', 'Title', 'Category', 'Severity', 'Status', 'Department', 'Reporter', 'Upvotes', 'Address', 'Latitude', 'Longitude', 'CreatedAt'];
    const rows = issues.map(issue => [
      issue.id,
      `"${issue.title.replace(/"/g, '""')}"`,
      issue.category,
      issue.severity,
      issue.status,
      issue.department || '',
      issue.reporterName,
      issue.verificationCount,
      `"${issue.address.replace(/"/g, '""')}"`,
      issue.latitude,
      issue.longitude,
      new Date(issue.createdAt).toISOString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `community_hero_issues_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Database exported successfully as CSV!', 'success');
  };

  // Create Authority Role pre-auth mapping
  const handleCreateAuthority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName || !authEmail) {
      toast('Please provide name and email.', 'warning');
      return;
    }

    setIsCreatingAuthority(true);
    try {
      const mockUid = `auth_pre_${Date.now().toString()}`;
      
      await setDoc(doc(db, 'users', mockUid), {
        uid: mockUid,
        name: authName,
        email: authEmail.toLowerCase(),
        role: 'authority',
        points: 0,
        badges: [],
        department: authDept,
        createdAt: Date.now()
      });

      toast(`Designated ${authName} as Official Authority successfully!`, 'success');
      setAuthName('');
      setAuthEmail('');
    } catch (err) {
      console.error('Failed to create pre-assigned authority:', err);
      toast('Error saving authority record.', 'error');
    } finally {
      setIsCreatingAuthority(false);
    }
  };

  // Re-route/assign issues to departments
  const handleAssignDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    setIsAssigning(true);
    try {
      const issueRef = doc(db, 'issues', selectedIssue.id);
      
      await updateDoc(issueRef, {
        department: assignDept,
        status: 'Assigned',
        updatedAt: Date.now()
      });

      await addDoc(collection(db, 'statusUpdates'), {
        issueId: selectedIssue.id,
        status: 'Assigned',
        updaterName: 'System Admin',
        remarks: `Issue re-routed and assigned to ${assignDept} department.`,
        createdAt: Date.now()
      });

      toast(`Issue re-routed and assigned to ${assignDept}.`, 'success');
    } catch (err) {
      console.error('Assignment failed:', err);
      toast('Failed to re-route department assignment.', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // Update specific user roles
  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'citizen' ? 'authority' : 'citizen';
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: nextRole
      });
      toast(`User role modified to ${nextRole} successfully!`, 'success');
    } catch (err) {
      console.error('Failed to modify user role:', err);
      toast('Failed to modify user role.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderLock className="h-5.5 w-5.5 text-slate-800" />
            {t('adminDashboardTitle')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">{t('systemStats')}</p>
        </div>
        
        {/* Actions header */}
        <button
          onClick={exportToCSV}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer hover:border-slate-300 transition-all shrink-0"
        >
          <Download className="h-4 w-4 text-slate-400" />
          <span>Export Database</span>
        </button>
      </div>

      {/* Main Tabs switcher */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-xs mb-8">
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'issues' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Issues
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Manage Users
        </button>
      </div>

      {activeTab === 'issues' ? (
        /* TAB 1: AUDIT ISSUES */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Side: Table & Map (7 Cols on Desktop) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* AI Insights Card */}
            <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden shadow-md border border-slate-800">
              <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full -mr-12 -mt-12 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-slate-300 fill-white/10" />
                  <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-300">{t('aiAssistantTitle')}</h3>
                </div>
                <button
                  onClick={generateAiHotspotInsights}
                  disabled={isGeneratingInsights}
                  className="rounded-lg bg-white text-slate-950 hover:bg-slate-100 text-xs font-semibold px-3.5 py-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs self-start sm:self-auto"
                >
                  {isGeneratingInsights ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" />
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    <span>Generate insights</span>
                  )}
                </button>
              </div>

              {aiInsights ? (
                <div className="text-xs text-slate-200 leading-relaxed bg-black/40 border border-white/5 rounded-xl p-4 max-h-48 overflow-y-auto">
                  {aiInsights}
                </div>
              ) : (
                <p className="text-xs text-slate-300">
                  Click to run real-time cluster analyses, hotspot assessments, and AI routing optimization algorithms across all municipal tickets.
                </p>
              )}
            </div>

            {/* General Queue List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-900 text-sm">All Municipal Tickets ({issues.length})</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {issues.length === 0 ? (
                  <p className="text-center py-12 text-xs text-slate-400 p-4">{t('noIssuesFound')}</p>
                ) : (
                  issues.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className={`p-4 flex items-center justify-between gap-4 transition-all cursor-pointer ${
                        selectedIssue?.id === issue.id ? 'bg-slate-50 border-l-4 border-slate-800' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-semibold text-slate-800 truncate">{issue.title}</h4>
                          <span className="text-[9px] font-semibold bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md shrink-0">
                            {issue.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{issue.address}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
                          Dept: <strong className="text-slate-600 font-semibold">{issue.department || 'Unassigned'}</strong>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                          {issue.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Dispatch assignment terminal (5 Cols on Desktop) */}
          <div className="lg:col-span-5">
            {selectedIssue ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Department Assignment Console</span>
                      <h3 className="font-semibold text-slate-900 text-sm mt-0.5 leading-tight">{selectedIssue.title}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedIssue(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3.5 italic leading-relaxed">"{selectedIssue.description}"</p>
                </div>

                {/* Render Media correctly (Image vs Video) */}
                {(selectedIssue.mediaUrl || selectedIssue.imageUrl) && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48 flex justify-center bg-slate-950 shadow-xs">
                    {selectedIssue.mediaType === 'video' ? (
                      <video 
                        src={selectedIssue.mediaUrl} 
                        controls 
                        className="object-contain max-h-48 w-full bg-black" 
                      />
                    ) : (
                      <img 
                        src={selectedIssue.mediaUrl || selectedIssue.imageUrl} 
                        alt="Civic report media evidence" 
                        className="object-cover max-h-48 w-full" 
                    />
                    )}
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs text-slate-600 border border-slate-200">
                  <div className="flex justify-between">
                    <span>Current Department:</span>
                    <strong className="text-slate-800 font-semibold">{selectedIssue.department || 'Unassigned'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Severity Rank:</span>
                    <strong className="text-slate-800 font-semibold">{selectedIssue.severity}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Reporter:</span>
                    <strong className="text-slate-800 font-semibold">{selectedIssue.reporterName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Pin coordinates:</span>
                    <strong className="text-slate-800 font-semibold font-mono text-[10px]">{selectedIssue.latitude.toFixed(5)}, {selectedIssue.longitude.toFixed(5)}</strong>
                  </div>
                </div>

                {/* Form to assign department */}
                <form onSubmit={handleAssignDepartment} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1.5">Route to Department</label>
                    <select
                      value={assignDept}
                      onChange={(e) => setAssignDept(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-700 focus:outline-hidden font-semibold cursor-pointer"
                    >
                      <option value="Road Maintenance">Road Maintenance</option>
                      <option value="Waste Management">Waste Management</option>
                      <option value="Water Supply Dept">Water Supply Dept</option>
                      <option value="Streetlight Utility">Streetlight Utility</option>
                      <option value="Drainage & Sewerage">Drainage & Sewerage</option>
                      <option value="Animal Control">Animal Control</option>
                      <option value="General Civic Ops">General Civic Ops</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isAssigning}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 py-3 text-xs font-semibold text-white shadow-lg shadow-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Briefcase className="h-4 w-4 text-white/80" />
                        <span>Re-route Ticket Department</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400">
                <Building className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-pulse" />
                <p className="text-sm font-bold text-slate-600">{t('noTicketSelected')}</p>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{t('noTicketSelectedSub')}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: MANAGE USERS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left: User directory */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Citizen & Officials Directory ({users.length})</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {users.map((u) => (
                <div key={u.uid} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-all">
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 truncate">{u.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600`}>
                        {u.role}
                      </span>
                      {u.role === 'citizen' && (
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{u.points || 0} Points</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleRoleToggle(u.uid, u.role)}
                      className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-semibold px-3 py-1.5 text-slate-600 cursor-pointer shadow-xs transition-colors"
                    >
                      Toggle Role
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Designate Authority Accounts */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Designate Municipal Authority</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Pre-assign specific email registrations to inherit authority status on account creation.</p>
            </div>

            <form onSubmit={handleCreateAuthority} className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1.5">Official Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Inspector Roger Adams"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1.5">Official Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g., roger.adams@citycouncil.gov"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1.5">Assigned Department</label>
                <select
                  value={authDept}
                  onChange={(e) => setAuthDept(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-700 focus:outline-hidden font-semibold cursor-pointer"
                >
                  <option value="Road Maintenance">Road Maintenance</option>
                  <option value="Waste Management">Waste Management</option>
                  <option value="Water Supply Dept">Water Supply Dept</option>
                  <option value="Streetlight Utility">Streetlight Utility</option>
                  <option value="Drainage & Sewerage">Drainage & Sewerage</option>
                  <option value="Animal Control">Animal Control</option>
                  <option value="General Civic Ops">General Civic Ops</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isCreatingAuthority}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 py-3 text-xs font-semibold text-white shadow-lg shadow-slate-100 transition-colors cursor-pointer"
              >
                {isCreatingAuthority ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 text-white/80" />
                    <span>Designate Authority Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
