import React, { useState, useEffect } from 'react';
import { 
  db,
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  addDoc, 
  increment 
} from '../lib/firebase';
import { Issue, Comment, StatusUpdate } from '../types';
import CivicMap from './CivicMap';
import ReportIssueModal from './ReportIssueModal';
import { useTranslation } from '../lib/i18n';
import { 
  MapPin, 
  Plus, 
  Filter, 
  MessageSquare, 
  ThumbsUp, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Building, 
  ExternalLink,
  ChevronRight,
  Smile,
  Users,
  X,
  Play
} from 'lucide-react';

interface CitizenDashboardProps {
  userId: string;
  userName: string;
}

export default function CitizenDashboard({ userId, userName }: CitizenDashboardProps) {
  const { t } = useTranslation();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'mine'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  
  // Active/focused issue
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [focusedIssue, setFocusedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [newComment, setNewComment] = useState('');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Load Issues
  useEffect(() => {
    let q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        fetchedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });
      setIssues(fetchedIssues);
      
      // Update active issue focus in real-time if it exists
      if (focusedIssueId) {
        const updatedFocus = fetchedIssues.find(i => i.id === focusedIssueId);
        if (updatedFocus) {
          setFocusedIssue(updatedFocus);
        }
      }
    });

    return unsubscribe;
  }, [focusedIssueId]);

  // Load Details (Comments & Status Updates) for focused issue
  useEffect(() => {
    if (!focusedIssueId) {
      setComments([]);
      setStatusUpdates([]);
      return;
    }

    // Comments query
    const commentsQ = query(
      collection(db, 'comments'), 
      where('issueId', '==', focusedIssueId),
      orderBy('createdAt', 'asc')
    );
    const unsubComments = onSnapshot(commentsQ, (snapshot) => {
      const fetchedComments: Comment[] = [];
      snapshot.forEach((doc) => {
        fetchedComments.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(fetchedComments);
    });

    // Status Updates query
    const statusQ = query(
      collection(db, 'statusUpdates'), 
      where('issueId', '==', focusedIssueId),
      orderBy('createdAt', 'desc')
    );
    const unsubStatus = onSnapshot(statusQ, (snapshot) => {
      const fetchedUpdates: StatusUpdate[] = [];
      snapshot.forEach((doc) => {
        fetchedUpdates.push({ id: doc.id, ...doc.data() } as StatusUpdate);
      });
      setStatusUpdates(fetchedUpdates);
    });

    return () => {
      unsubComments();
      unsubStatus();
    };
  }, [focusedIssueId]);

  // Handle upvote/verify
  const handleVerify = async (issueId: string) => {
    const issueRef = doc(db, 'issues', issueId);
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const hasUpvoted = issue.verifications?.includes(userId);

    try {
      if (hasUpvoted) {
        // Remove verification
        await updateDoc(issueRef, {
          verificationCount: increment(-1),
          verifications: arrayRemove(userId)
        });
      } else {
        // Add verification
        await updateDoc(issueRef, {
          verificationCount: increment(1),
          verifications: arrayUnion(userId)
        });
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  // Submit new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !focusedIssueId) return;

    try {
      await addDoc(collection(db, 'comments'), {
        issueId: focusedIssueId,
        userId: userId,
        userName: userName,
        userRole: 'citizen',
        content: newComment.trim(),
        createdAt: Date.now()
      });
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Get filtered issues
  const filteredIssues = issues.filter((issue) => {
    const matchesFilter = filterType === 'all' || issue.reporterId === userId;
    const matchesCategory = selectedCategory === 'all' || issue.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity;
    return matchesFilter && matchesCategory && matchesSeverity;
  });

  // Category counts for quick metrics
  const uniqueCategories = Array.from(new Set(issues.map(i => i.category)));
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'Rejected': return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'In Progress': return 'bg-indigo-50 text-indigo-800 border border-indigo-200';
      case 'Assigned': return 'bg-blue-50 text-blue-800 border border-blue-200';
      case 'Under Review': return 'bg-amber-50 text-amber-800 border border-amber-200';
      default: return 'bg-rose-50 text-rose-800 border border-rose-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl py-4 sm:py-6 lg:py-8">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-slate-800 rounded-2xl p-6 shadow-md shadow-slate-100 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 h-20 w-20 bg-white/5 rounded-full pointer-events-none" />
        
        <div className="relative">
          <h2 className="text-xl font-extrabold tracking-tight">{t('welcomeUser', { name: userName })}</h2>
          <p className="text-slate-200 text-xs mt-1 max-w-lg leading-relaxed">
            {t('citizenBannerSubtext')}
          </p>
        </div>
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="relative flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100 transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>{t('reportNewIssueBtn')}</span>
        </button>
      </div>

      {/* Primary Split Grid (Fluid, responsive container) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* Left Side: Map & Local Stats (Cols 7 on Desktop, full width on mobile) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{t('mapTitle')}</h3>
                <p className="text-[11px] text-slate-400">{t('activeCommunityReports')}</p>
              </div>
              <span className="flex items-center gap-1.5 bg-slate-50 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
                <CheckCircle className="h-3.5 w-3.5 text-slate-600" />
                {t('liveMap')}
              </span>
            </div>

            {/* Map Canvas (Responsive sizing with minimum constraints to prevent horizontal layout issue) */}
            <div className="h-[280px] sm:h-[420px] w-full relative rounded-xl overflow-hidden border border-slate-200 shadow-xs">
              <CivicMap
                issues={filteredIssues}
                interactive={false}
                activeIssueId={focusedIssueId}
                center={focusedIssue ? [focusedIssue.latitude, focusedIssue.longitude] : undefined}
              />
            </div>
          </div>

          {/* Quick Info Block / Guidelines (Flex to responsive Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4.5 flex gap-3.5 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 border border-slate-200 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">{t('earnPointsTitle')}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{t('earnPointsDesc')}</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4.5 flex gap-3.5 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 border border-slate-200 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">{t('verificationCountsTitle')}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{t('verificationCountsDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Issue feed & details (Cols 5 on Desktop, full width on mobile) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Controls & List Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            {/* Tab filter toggles */}
            <div className="flex flex-col sm:flex-row gap-3 border-b border-slate-100 pb-4 mb-4 justify-between sm:items-center">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('communityReportsTab')}
                </button>
                <button
                  onClick={() => setFilterType('mine')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterType === 'mine' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('myReportsTab')}
                </button>
              </div>

              {/* Counter info */}
              <span className="text-[11px] font-extrabold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                {filteredIssues.length} {t('resolvedLabel', { count: filteredIssues.length }).toLowerCase() || 'found'}
              </span>
            </div>

            {/* Sub-Filters row */}
            <div className="grid grid-cols-2 gap-2.5 mb-4.5">
              {/* Category selector */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600 focus:outline-hidden font-semibold cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Severity selector */}
              <div>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600 focus:outline-hidden font-semibold cursor-pointer"
                >
                  <option value="all">All Severity</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {/* List View Container */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl border-slate-200 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-400">{t('noIssuesFound')}</p>
                </div>
              ) : (
                filteredIssues.map((issue) => {
                  const isSelected = focusedIssueId === issue.id;
                  const hasUpvoted = issue.verifications?.includes(userId);

                  return (
                     <div
                      key={issue.id}
                      onClick={() => {
                        setFocusedIssueId(issue.id);
                        setFocusedIssue(issue);
                      }}
                      className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-slate-800 bg-slate-50 shadow-xs' 
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-slate-800 transition-colors truncate">
                          {issue.title}
                        </h4>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${getSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                        {issue.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 truncate max-w-[60%]">
                          <MapPin className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                          <span className="truncate">{issue.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${getStatusBadge(issue.status)}`}>
                            {issue.status}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(issue.id);
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] cursor-pointer transition-all ${
                              hasUpvoted 
                                ? 'bg-slate-800 text-white border-slate-800 font-bold' 
                                : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span>{issue.verificationCount}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Issue Details Panel (Active details drawer) */}
          {focusedIssue && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-fadeIn">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusBadge(focusedIssue.status)}`}>
                    {focusedIssue.status}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-1.5 leading-tight">{focusedIssue.title}</h3>
                </div>
                <button
                  onClick={() => {
                    setFocusedIssueId(null);
                    setFocusedIssue(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Render Media correctly (Image vs Video) */}
              {(focusedIssue.mediaUrl || focusedIssue.imageUrl) && (
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border max-h-48 flex justify-center shadow-xs">
                  {focusedIssue.mediaType === 'video' ? (
                    <video 
                      src={focusedIssue.mediaUrl} 
                      controls 
                      className="object-contain max-h-48 w-full bg-black" 
                    />
                  ) : (
                    <img 
                      src={focusedIssue.mediaUrl || focusedIssue.imageUrl} 
                      alt="Civic report media evidence" 
                      className="object-cover max-h-48 w-full" 
                    />
                  )}
                </div>
              )}

              {/* Routing metadata info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{t('category')}</span>
                  <p className="font-bold text-slate-800 mt-0.5">{focusedIssue.category}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{t('aiDepartmentLabel')}</span>
                  <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {focusedIssue.department || 'Awaiting routing'}
                  </p>
                </div>
              </div>

              {/* Official status remarks thread */}
              {statusUpdates.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-500" />
                    {t('officialRemarks')}
                  </h4>
                  <div className="relative border-l border-slate-200 pl-4 space-y-3.5 text-xs ml-2">
                    {statusUpdates.map((update) => (
                      <div key={update.id} className="relative">
                        {/* Dot indicator */}
                        <span className="absolute -left-6.5 top-1 bg-white border border-slate-300 rounded-full h-3.5 w-3.5 flex items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-slate-600" style={{
                            backgroundColor: update.status === 'Resolved' ? '#10b981' : '#f59e0b'
                          }} />
                        </span>
                        
                        <div className="flex justify-between items-center text-slate-400 text-[10px]">
                          <span className="font-bold text-slate-600">{update.status} by {update.updaterName}</span>
                          <span>{new Date(update.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-relaxed">{update.remarks}</p>
                        
                        {update.proofImageUrl && (
                          <div className="mt-2 rounded-lg overflow-hidden border max-w-xs max-h-24 flex bg-slate-50 shadow-xs">
                            <img src={update.proofImageUrl} alt="Resolution proof" className="object-contain" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Thread Section */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-slate-600" />
                  {t('citizenComments')} ({comments.length})
                </h4>

                {/* Listing comments */}
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">{t('noComments')}</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 rounded-xl p-3 text-xs border border-slate-100 shadow-xs">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-bold text-slate-700">{comment.userName}</span>
                          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder={t('commentPlaceholder')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-800 hover:bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer shrink-0 transition-colors"
                  >
                    {t('commentPostBtn')}
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Reporting modal */}
      {isReportModalOpen && (
        <ReportIssueModal
          userId={userId}
          userName={userName}
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={() => {
            setIsReportModalOpen(false);
            alert(t('reportedSuccessAlert'));
          }}
        />
      )}
    </div>
  );
}
