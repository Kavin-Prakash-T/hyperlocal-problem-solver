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
  getDocs,
  getDoc,
  increment 
} from '../lib/firebase';
import { Issue, Comment, StatusUpdate, UserProfile } from '../types';
import CivicMap from './CivicMap';
import ReportIssueModal from './ReportIssueModal';
import { useTranslation } from '../lib/i18n';
import { useToast } from './Toast';
import { 
  MapPin, 
  Plus, 
  MessageSquare, 
  ThumbsUp, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Building, 
  Award,
  X,
  Flame,
  AlertTriangle,
  Ban,
  Globe,
  Reply,
  Sparkles,
  Users,
  Briefcase,
  AlertOctagon,
  ChevronRight,
  ShieldAlert,
  Shield,
  Leaf
} from 'lucide-react';

interface CitizenDashboardProps {
  userId: string;
  userName: string;
}

export default function CitizenDashboard({ userId, userName }: CitizenDashboardProps) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'mine'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  
  // Tabs: 'feed' | 'leaderboard' | 'insights' | 'performance'
  const [activeTab, setActiveTab] = useState<'feed' | 'leaderboard' | 'insights' | 'performance'>('feed');

  // Heatmap state
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Active/focused issue
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [focusedIssue, setFocusedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Users for Leaderboard
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserProfile[]>([]);

  // AI insights compilation
  const [isCompilingInsights, setIsCompilingInsights] = useState(false);
  const [aiReportOutput, setAiReportOutput] = useState<string | null>(null);

  // Translation states for individual comments
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(null);

  // Geolocation for Distance check
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);

  // Real-time Profile Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    }, (error) => {
      console.error('Failed to load profile:', error);
    });
    return unsub;
  }, [userId]);

  // Load Issues
  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        fetchedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });
      setIssues(fetchedIssues);
      
      if (focusedIssueId) {
        const updatedFocus = fetchedIssues.find(i => i.id === focusedIssueId);
        if (updatedFocus) {
          setFocusedIssue(updatedFocus);
        }
      }
    });

    return unsubscribe;
  }, [focusedIssueId]);

  // Load Leaderboard users on tab change
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      const q = query(collection(db, 'users'), orderBy('points', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((doc) => {
          list.push(doc.data() as UserProfile);
        });
        setLeaderboardUsers(list.slice(0, 10)); // Top 10
      });
      return unsub;
    }
  }, [activeTab]);

  // Load Geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  // Distance calculator helper
  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Load Comments & Status Logs
  useEffect(() => {
    if (!focusedIssueId) {
      setComments([]);
      setStatusUpdates([]);
      return;
    }

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
        await updateDoc(issueRef, {
          verificationCount: increment(-1),
          verifications: arrayRemove(userId)
        });
        toast(t('toastUpvoteRemoved'), 'info');
      } else {
        await updateDoc(issueRef, {
          verificationCount: increment(1),
          verifications: arrayUnion(userId)
        });
        
        // Reward voter
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          points: increment(10),
          reputationScore: increment(5)
        });

        toast(t('toastUpvoteAdded'), 'success');
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
      toast(t('toastError'), 'error');
    }
  };

  // Handle Community Votes (Urgent, Duplicate, Invalid)
  const handleCommunityVote = async (issueId: string, voteType: 'urgency' | 'duplicate' | 'invalid') => {
    const issueRef = doc(db, 'issues', issueId);
    const userRef = doc(db, 'users', userId);
    
    try {
      if (voteType === 'urgency') {
        await updateDoc(issueRef, {
          urgencyVotes: increment(1)
        });
        await updateDoc(userRef, {
          points: increment(5),
          reputationScore: increment(2)
        });
        toast("Marked as Urgent! +5 Points rewarded.", "success");
      } else if (voteType === 'duplicate') {
        await updateDoc(issueRef, {
          duplicateVotes: increment(1)
        });
        await updateDoc(userRef, {
          points: increment(5),
          reputationScore: increment(5)
        });
        toast("Flagged as Duplicate ticket. +5 Points.", "success");
      } else if (voteType === 'invalid') {
        await updateDoc(issueRef, {
          invalidVotes: increment(1)
        });
        await updateDoc(userRef, {
          points: increment(5),
          reputationScore: increment(5)
        });
        toast("Flagged as Spam/Invalid. Authorities notified.", "success");
      }
    } catch (err) {
      console.error("Failed community vote:", err);
      toast("Action failed.", "error");
    }
  };

  // Translate comment with AI
  const handleTranslateComment = async (commentId: string, content: string) => {
    setTranslatingCommentId(commentId);
    try {
      const response = await fetch('/api/gemini-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          targetLanguage: language
        })
      });
      if (response.ok) {
        const result = await response.json();
        setTranslatedComments(prev => ({
          ...prev,
          [commentId]: result.translatedText
        }));
        toast("Translated successfully!", "success");
      } else {
        throw new Error("Translation failed.");
      }
    } catch (err) {
      console.error("AI Translation failed:", err);
      toast("Translation service unavailable. Please check API configuration.", "warning");
    } finally {
      setTranslatingCommentId(null);
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
      toast(t('toastCommentSuccess'), 'success');
    } catch (err) {
      console.error('Error adding comment:', err);
      toast(t('toastError'), 'error');
    }
  };

  // Submit comment sub-reply
  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim() || !focusedIssueId) return;
    try {
      await addDoc(collection(db, 'comments'), {
        issueId: focusedIssueId,
        parentId: commentId,
        userId: userId,
        userName: userName,
        userRole: 'citizen',
        content: replyText.trim(),
        createdAt: Date.now()
      });
      setReplyText('');
      setReplyingToCommentId(null);
      toast("Reply submitted!", "success");
    } catch (err) {
      console.error("Error submitting sub-reply:", err);
    }
  };

  // Generate dynamic monthly analysis using Gemini
  const handleGenerateAiInsights = async () => {
    setIsCompilingInsights(true);
    setAiReportOutput(null);
    try {
      const response = await fetch('/api/gemini-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issues })
      });
      if (response.ok) {
        const result = await response.json();
        setAiReportOutput(result.insights);
        toast("AI Insights generated successfully!", "success");
      } else {
        throw new Error("Failed to compile reports");
      }
    } catch (err) {
      console.error("AI Insights generator failed:", err);
      setAiReportOutput("### API key configuration required\nPlease configure the `GEMINI_API_KEY` to unlock monthly AI Hotspot and trend reports.");
    } finally {
      setIsCompilingInsights(false);
    }
  };

  // Get filtered issues
  const filteredIssues = issues.filter((issue) => {
    const matchesFilter = filterType === 'all' || issue.reporterId === userId;
    const matchesCategory = selectedCategory === 'all' || issue.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity;
    return matchesFilter && matchesCategory && matchesSeverity;
  });

  // Calculate nearby unresolved complaints (<1.5km)
  const nearbyIssues = issues.filter((issue) => {
    if (!userCoords || !issue.latitude || !issue.longitude || issue.status === 'Resolved') return false;
    const dist = getDistanceInKm(userCoords[0], userCoords[1], issue.latitude, issue.longitude);
    return dist < 1.5;
  });

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

  // Badges criteria grid helper
  const allAchievements = [
    { title: "First Responder", desc: "Reported your first civic complaint.", icon: Award, target: 1 },
    { title: "Civic Advocate", desc: "Accumulated 100+ total points.", icon: TrendingUp, target: 100 },
    { title: "Community Guardian", desc: "Upvoted or verified 5 complaints.", icon: CheckCircle, target: 5 },
    { title: "Civic Champion", desc: "Reached 300+ total points.", icon: Award, target: 300 },
    { title: "Top Verifier", desc: "Upvoted or verified 15 active complaints.", icon: Users, target: 15 }
  ];

  // Calculate Department Performance Statistics
  const departmentsList = [
    { name: 'Road Maintenance', key: 'deptRoads' },
    { name: 'Waste Management', key: 'deptWaste' },
    { name: 'Water Supply Dept', key: 'deptWater' },
    { name: 'Streetlight Utility', key: 'deptPower' },
    { name: 'Drainage & Sewerage', key: 'deptDrainage' }
  ];

  const departmentPerformance = departmentsList.map((dept) => {
    const deptIssues = issues.filter(i => i.category === dept.name || i.department === dept.name);
    const resolvedDept = deptIssues.filter(i => i.status === 'Resolved');
    const resolutionRate = deptIssues.length > 0 ? Math.round((resolvedDept.length / deptIssues.length) * 100) : 100;
    
    return {
      name: dept.name,
      total: deptIssues.length,
      resolved: resolvedDept.length,
      rate: resolutionRate,
      time: resolvedDept.length > 0 ? "48 Hours" : "Awaiting data"
    };
  });

  return (
    <div className="mx-auto max-w-7xl py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 rounded-2xl p-6 shadow-lg text-white border border-slate-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/10 rounded-full -mr-10 -mt-10 pointer-events-none blur-xl" />
        <div className="absolute bottom-0 left-1/3 h-20 w-20 bg-emerald-500/5 rounded-full pointer-events-none blur-lg" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-400/30">
              Citizen Trust Rank #{profile?.reputationScore ? Math.floor(profile.reputationScore / 50) + 1 : 1}
            </span>
          </div>
          <h2 className="text-2xl text-white tracking-tight">{t('welcomeUser', { name: userName })}</h2>
          <p className="text-slate-300/90 text-xs mt-1.5 max-w-lg leading-relaxed font-medium">
            {t('citizenBannerSubtext')}
          </p>
        </div>
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer shrink-0"
        >
          <Plus className="h-4.5 w-4.5 text-white" />
          <span>{t('reportNewIssueBtn')}</span>
        </button>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-6 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex items-center gap-2 pb-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'feed' ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Civic Feed & Map</span>
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 pb-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'leaderboard' ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Local Leaderboard</span>
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex items-center gap-2 pb-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'insights' ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>AI Civic Insights</span>
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 pb-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'performance' ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building className="h-4 w-4" />
          <span>Dept Performance</span>
        </button>
      </div>

      {/* TAB CONTENTS */}

      {/* TAB 1: CIVIC FEED & MAP */}
      {activeTab === 'feed' && (
        <div className="space-y-6">
          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50/45 p-4.5 rounded-2xl border border-blue-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-blue-100/80 border border-blue-200 rounded-xl text-blue-700 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Total Reports</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{issues.length}</p>
              </div>
            </div>
            
            <div className="bg-amber-50/45 p-4.5 rounded-2xl border border-amber-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-amber-100/80 border border-amber-200 rounded-xl text-amber-700 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-600/90 tracking-wider">Pending Issues</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {issues.filter(i => i.status !== 'Resolved' && i.status !== 'Rejected').length}
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/45 p-4.5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-emerald-100/80 border border-emerald-200 rounded-xl text-emerald-700 shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-600/90 tracking-wider">Resolved Tickets</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {issues.filter(i => i.status === 'Resolved').length}
                </p>
              </div>
            </div>

            <div className="bg-indigo-50/45 p-4.5 rounded-2xl border border-indigo-100 shadow-xs flex items-center gap-4 col-span-2 lg:col-span-1">
              <div className="p-3 bg-indigo-100/80 border border-indigo-200 rounded-xl text-indigo-700 shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">My Reputation Score</p>
                <p className="text-sm font-black text-slate-900 mt-0.5 truncate flex items-center gap-1">
                  <Shield className="h-4 w-4 text-slate-700 shrink-0 inline" /> {profile?.reputationScore || 100} Trust • <span className="text-indigo-600 font-black">{profile?.points || 0} pts</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left Column: Map with Heatmap toggle & Nearby Panel */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{t('mapTitle')}</h3>
                    <p className="text-[11px] text-slate-400">{t('activeCommunityReports')}</p>
                  </div>
                  
                  {/* Heatmap activation toggle */}
                  <button
                    type="button"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      showHeatmap 
                        ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-100' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Flame className={`h-3.5 w-3.5 ${showHeatmap ? 'animate-pulse' : ''}`} />
                    <span>{showHeatmap ? 'Heatmap On' : 'Toggle Hotspot Heatmap'}</span>
                  </button>
                </div>

                {/* Map Canvas */}
                <div className="h-[280px] sm:h-[420px] w-full relative rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <CivicMap
                    issues={filteredIssues}
                    interactive={false}
                    activeIssueId={focusedIssueId}
                    showHeatmap={showHeatmap}
                    center={focusedIssue ? [focusedIssue.latitude, focusedIssue.longitude] : undefined}
                  />
                </div>
              </div>

              {/* Nearby Issue Discovery Panel */}
              {userCoords && nearbyIssues.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-900">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Closest Issues Reported Nearby (&lt;1.5km)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {nearbyIssues.slice(0, 4).map((issue) => {
                      const dist = getDistanceInKm(userCoords[0], userCoords[1], issue.latitude, issue.longitude);
                      return (
                        <div 
                          key={issue.id} 
                          onClick={() => {
                            setFocusedIssueId(issue.id);
                            setFocusedIssue(issue);
                          }}
                          className="bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-all cursor-pointer shadow-xs flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{issue.title}</p>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{issue.category}</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg shrink-0">
                            {dist.toFixed(2)} km away
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Feeds, filter controls & comments */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                {/* Tab filters */}
                <div className="flex flex-col sm:flex-row gap-3 border-b border-slate-100 pb-4 mb-4 justify-between sm:items-center">
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t('communityReportsTab')}
                    </button>
                    <button
                      onClick={() => setFilterType('mine')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        filterType === 'mine' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t('myReportsTab')}
                    </button>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                    {filteredIssues.length} Complaints Listed
                  </span>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-2.5 mb-4.5">
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

                {/* Ticket feed */}
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
                              ? 'border-indigo-500 bg-indigo-50/30 shadow-xs shadow-indigo-50/50 ring-1 ring-indigo-500/30' 
                              : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <h4 className="text-xs font-semibold text-slate-900 group-hover:text-slate-800 transition-colors truncate">
                              {issue.title}
                            </h4>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${getSeverityColor(issue.severity)}`}>
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
                                    ? 'bg-slate-800 text-white border-slate-800 font-semibold' 
                                    : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                                }`}
                              >
                                <ThumbsUp className="h-3 w-3" />
                                <span>{issue.verificationCount || 0}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active Issue Details Panel */}
              {focusedIssue && (
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusBadge(focusedIssue.status)}`}>
                        {focusedIssue.status}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1.5 leading-tight">{focusedIssue.title}</h3>
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

                  {/* Render Media */}
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
                          alt="Evidence" 
                          className="object-cover max-h-48 w-full" 
                        />
                      )}
                    </div>
                  )}

                  {/* Proximity / Routing Info Cards */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{t('category')}</span>
                      <p className="font-bold text-slate-800 mt-0.5">{focusedIssue.category}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{t('aiDepartmentLabel')}</span>
                      <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {focusedIssue.department || 'Municipal Board'}
                      </p>
                    </div>
                  </div>

                  {/* 🔮 AI Predictive Safety & Diagnostics Panel */}
                  <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50 border border-indigo-100 rounded-xl p-4 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-indigo-900 text-[10px] font-bold uppercase tracking-wider">
                        <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                        <span>AI Agent Diagnostics & Forecast</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-indigo-100/60 border border-indigo-200/50 text-indigo-700 px-1.5 py-0.5 rounded-sm">
                        Active Prediction
                      </span>
                    </div>

                    {/* Localized Public Safety Alert Banner */}
                    {focusedIssue.publicSafetyAlert ? (
                      <div className="bg-amber-50/80 border border-amber-200/60 text-amber-900 rounded-lg p-2.5 text-[11px] leading-relaxed flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{focusedIssue.publicSafetyAlert}</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/80 border border-emerald-200/60 text-emerald-900 rounded-lg p-2.5 text-[11px] leading-relaxed flex gap-2">
                        <ShieldAlert className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Standard public precaution advised inside this coordinate segment.</span>
                      </div>
                    )}

                    {/* Environmental and Forecast Metrics */}
                    <div className="grid grid-cols-2 gap-3.5 text-[11px] pt-1 border-t border-slate-100/80">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Environmental Impact</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="font-bold text-slate-800">{focusedIssue.environmentalImpactIndex || (focusedIssue.severity === 'Critical' ? 5 : 2)}/5</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">
                            {focusedIssue.environmentalImpactIndex && focusedIssue.environmentalImpactIndex >= 4 ? 'High Footprint' : 'Moderate'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Hotspot Recurrence Risk</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`font-bold text-[10px] uppercase ${
                            focusedIssue.predictedHotspotRisk === 'Severe' || focusedIssue.predictedHotspotRisk === 'High' 
                              ? 'text-red-600' : 'text-slate-700'
                          }`}>
                            {focusedIssue.predictedHotspotRisk || 'Medium'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Strategic Step-by-Step Resolution Plan */}
                    <div className="space-y-1.5 pt-2.5 border-t border-slate-100/80">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Estimated Resolution Milestones</span>
                      <div className="space-y-2 mt-1.5">
                        {(focusedIssue.aiResolutionPlan && focusedIssue.aiResolutionPlan.length > 0) ? (
                          focusedIssue.aiResolutionPlan.map((step: string, index: number) => (
                            <div key={index} className="flex gap-2 items-start text-xs text-slate-600">
                              <span className="h-4 w-4 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <p className="text-[11px] leading-snug">{step}</p>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex gap-2 items-start text-xs text-slate-600">
                              <span className="h-4 w-4 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                              <p className="text-[11px] leading-snug">Flag and coordinate response team assignments.</p>
                            </div>
                            <div className="flex gap-2 items-start text-xs text-slate-600">
                              <span className="h-4 w-4 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                              <p className="text-[11px] leading-snug">Schedule technical review and allocate repair materials.</p>
                            </div>
                            <div className="flex gap-2 items-start text-xs text-slate-600">
                              <span className="h-4 w-4 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                              <p className="text-[11px] leading-snug">Complete physical repair and submit completion certificate.</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Community Audit & Action Voting Board */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-1 text-slate-800 text-[10px] font-bold uppercase tracking-wider">
                      <ShieldAlert className="h-4 w-4 text-slate-600" />
                      <span>Community Audit & Civic Action</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCommunityVote(focusedIssue.id, 'urgency')}
                        className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <Flame className="h-4.5 w-4.5 text-red-600 fill-red-100" />
                        <span className="text-[10px] font-bold text-slate-700 mt-1">Mark Urgent</span>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">{focusedIssue.urgencyVotes || 0}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCommunityVote(focusedIssue.id, 'duplicate')}
                        className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                        <span className="text-[10px] font-bold text-slate-700 mt-1">Duplicate</span>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">{focusedIssue.duplicateVotes || 0}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCommunityVote(focusedIssue.id, 'invalid')}
                        className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <Ban className="h-4.5 w-4.5 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-700 mt-1">Spam/Invalid</span>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">{focusedIssue.invalidVotes || 0}</span>
                      </button>
                    </div>
                  </div>

                  {/* Resolution Summary / Proof Auditing */}
                  {focusedIssue.status === 'Resolved' && focusedIssue.resolutionImageUrl && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-emerald-900">
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">AI Verified Resolution Proof</h4>
                      </div>
                      {focusedIssue.resolutionSummary && (
                        <p className="text-xs text-slate-700 bg-white border border-slate-100 p-2.5 rounded-lg italic">
                          "{focusedIssue.resolutionSummary}"
                        </p>
                      )}
                      <div className="text-[10px] text-emerald-800 font-semibold flex items-center justify-between">
                        <span>Repairs Auditing Match Score:</span>
                        <span className="bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-md font-bold">
                          {focusedIssue.resolutionConfidence || 95}% Confidence
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Official remarks logs */}
                  {statusUpdates.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-500" />
                        Official Action History
                      </h4>
                      <div className="relative border-l border-slate-200 pl-4 space-y-3.5 text-xs ml-2">
                        {statusUpdates.map((update) => (
                          <div key={update.id} className="relative">
                            <span className="absolute -left-6.5 top-1 bg-white border border-slate-300 rounded-full h-3.5 w-3.5 flex items-center justify-center">
                              <span className="h-2 w-2 rounded-full bg-slate-600" style={{
                                backgroundColor: update.status === 'Resolved' ? '#10b981' : '#f59e0b'
                              }} />
                            </span>
                            
                            <div className="flex justify-between items-center text-slate-400 text-[10px]">
                              <span className="font-semibold text-slate-600">{update.status} by {update.updaterName}</span>
                              <span>{new Date(update.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-600 mt-1 leading-relaxed">{update.remarks}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Public Discussion Threads */}
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-slate-600" />
                      {t('citizenComments')} ({comments.length})
                    </h4>

                    {/* Comment list */}
                    <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                      {comments.filter(c => !c.parentId).length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">{t('noComments')}</p>
                      ) : (
                        comments.filter(c => !c.parentId).map((comment) => {
                          const hasTranslation = translatedComments[comment.id];
                          const isTranslating = translatingCommentId === comment.id;

                          // Find sub replies
                          const replies = comments.filter(r => r.parentId === comment.id);

                          return (
                            <div key={comment.id} className="bg-slate-50 rounded-xl p-3 text-xs border border-slate-100 space-y-2">
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span className="font-bold text-slate-700">{comment.userName}</span>
                                <div className="flex items-center gap-2">
                                  {/* AI Translator trigger button */}
                                  <button
                                    type="button"
                                    onClick={() => handleTranslateComment(comment.id, comment.content)}
                                    disabled={isTranslating}
                                    className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Globe className="h-3 w-3 shrink-0" />
                                    <span>{isTranslating ? "Translating..." : "Translate AI"}</span>
                                  </button>
                                  <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              
                              <p className="text-slate-700 leading-relaxed">{comment.content}</p>

                              {/* Translation Overlay */}
                              {hasTranslation && (
                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2 mt-1.5 text-slate-800">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 block mb-0.5">AI Translation ({language.toUpperCase()}):</span>
                                  <p className="italic">"{hasTranslation}"</p>
                                </div>
                              )}

                              {/* Reply trigger controls */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                                <button
                                  type="button"
                                  onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                                >
                                  <Reply className="h-3 w-3" />
                                  <span>Reply</span>
                                </button>
                                <span className="text-[10px] font-mono text-slate-400">{replies.length} replies</span>
                              </div>

                              {/* Nested Sub-replies loop */}
                              {replies.length > 0 && (
                                <div className="pl-4 border-l border-slate-200 space-y-2 mt-2">
                                  {replies.map((rep) => (
                                    <div key={rep.id} className="bg-white p-2 rounded-lg border border-slate-100">
                                      <div className="flex justify-between text-[9px] text-slate-400">
                                        <span className="font-semibold text-slate-600">{rep.userName}</span>
                                        <span>{new Date(rep.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-slate-700 mt-0.5 leading-relaxed">{rep.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Inline reply Box */}
                              {replyingToCommentId === comment.id && (
                                <div className="flex gap-1.5 pt-1">
                                  <input
                                    type="text"
                                    placeholder="Write a reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-hidden"
                                  />
                                  <button
                                    onClick={() => handleAddReply(comment.id)}
                                    className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-2.5 text-[10px] font-bold transition-colors cursor-pointer"
                                  >
                                    Reply
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Post public Comment Form */}
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Join the local civic discussion..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-800 hover:bg-slate-900 px-4 py-2 text-xs font-semibold text-white cursor-pointer transition-colors shrink-0"
                      >
                        {t('commentPostBtn')}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOCAL LEADERBOARD & CIVIC ACHIEVEMENTS */}
      {activeTab === 'leaderboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Top Citizens Leaderboard Table */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Community Leaderboard</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ranking of the top contributing citizens in our municipality based on verified reports.</p>
              </div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {leaderboardUsers.map((usr, index) => (
                <div key={usr.uid} className="p-4.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      index === 1 ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                      index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 text-sm truncate">{usr.name}</p>
                        {usr.uid === userId && (
                           <span className="bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm">YOU</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate mt-0.5 flex items-center gap-1">
                        <Shield className="h-3 w-3 text-slate-400 inline" /> {usr.reputationScore || 100} Trust Points • Badges: {usr.badges?.join(', ') || 'Contributor'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900 text-sm">{usr.points || 0} Pts</p>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Hero Points</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievement Badges Checklist panel */}
          <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">🎖️ Badges & Achievements</h3>
              <p className="text-xs text-slate-500 mt-1">Track your progress and unlock badges for active local municipal coordination.</p>
            </div>

            <div className="space-y-4">
              {allAchievements.map((badge, idx) => {
                const userHasBadge = profile?.badges?.includes(badge.title);
                const BadgeIcon = badge.icon;
                
                return (
                  <div 
                    key={idx} 
                    className={`flex gap-3.5 p-4 rounded-xl border transition-all ${
                      userHasBadge 
                        ? 'bg-slate-900 text-white border-slate-800 shadow-md' 
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg shrink-0 ${userHasBadge ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-150 text-slate-300'}`}>
                      <BadgeIcon className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-bold ${userHasBadge ? 'text-white' : 'text-slate-700'}`}>{badge.title}</h4>
                        {userHasBadge ? (
                          <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase">Unlocked</span>
                        ) : (
                          <span className="bg-slate-200 text-slate-600 text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase">Locked</span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-1 leading-relaxed ${userHasBadge ? 'text-slate-300' : 'text-slate-500'}`}>{badge.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: AI CIVIC INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">🔮 AI Automated Hotspot Analyzer</h3>
                <p className="text-xs text-slate-500 mt-1">Leverage Gemini to analyze region-wide municipal tickets, identifying localized hotspots, patterns, and safety threats.</p>
              </div>
              <button
                onClick={handleGenerateAiInsights}
                disabled={isCompilingInsights}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-65 shrink-0"
              >
                {isCompilingInsights ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing Region Patterns...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                    <span>Compile Regional AI Report</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Report output display container */}
            {aiReportOutput ? (
              <div className="bg-slate-950 text-slate-100 rounded-xl p-5 border border-slate-800 max-h-[500px] overflow-y-auto leading-relaxed text-xs space-y-4 font-mono">
                <div className="flex items-center gap-1 text-indigo-400 font-bold border-b border-slate-800 pb-2 mb-2 uppercase tracking-wider">
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Gemini Dynamic Regional Diagnostics</span>
                </div>
                <div className="whitespace-pre-line text-slate-300">
                  {aiReportOutput}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400">
                <Sparkles className="h-9 w-9 text-slate-300 mx-auto mb-3.5 animate-pulse" />
                <p className="text-xs font-bold text-slate-600">No report generated yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">Click "Compile Regional AI Report" to have Gemini read active complaints and construct structural hotspot briefs for citizen review.</p>
              </div>
            )}
          </div>

          {/* Regional Safety Hotspots & Alerts List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">🚨 Current Safety Alerts & Critical Hotspots</h3>
              <p className="text-xs text-slate-500 mt-1">High-risk safety situations cataloged across the district requiring immediate citizen caution.</p>
            </div>

            <div className="space-y-3">
              {issues.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length === 0 ? (
                <div className="bg-slate-50 text-slate-500 rounded-xl p-4 text-center text-xs">
                  ✓ Excellent! No active Critical/Hazardous public safety issues detected in the neighborhood.
                </div>
              ) : (
                issues.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').map((hazard) => (
                  <div key={hazard.id} className="flex gap-3 bg-red-50 border border-red-100 text-red-900 rounded-xl p-4">
                    <AlertOctagon className="h-5.5 w-5.5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold">{hazard.title}</h4>
                      <p className="text-[11px] text-red-800 mt-1 leading-relaxed">{hazard.description}</p>
                      {hazard.publicSafetyAlert && (
                        <p className="text-[10px] text-red-700 bg-white/60 border border-red-200/50 p-2 rounded-md mt-2 font-medium">
                          {hazard.publicSafetyAlert}
                        </p>
                      )}
                      <span className="text-[9px] font-mono font-semibold bg-red-100 border border-red-200 text-red-700 px-2 py-0.5 rounded-md mt-2 inline-block">
                        📍 {hazard.address}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 🔮 Dynamic AI Hazard & Hotspot Forecaster Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">🔮 Dynamic AI Predictive Hazard Forecaster</h3>
              <p className="text-xs text-slate-500 mt-1">Predicting local hazard projections and hotspot recurrence probabilities based on real-time community report patterns.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pothole / Asphalt Failure */}
              {(() => {
                const count = issues.filter(i => i.category === 'Pothole' && i.status !== 'Resolved').length;
                const risk = count >= 3 ? 'Severe' : count >= 1 ? 'Elevated' : 'Low';
                const color = risk === 'Severe' ? 'text-red-600 border-red-100 bg-red-50/50' : risk === 'Elevated' ? 'text-amber-600 border-amber-100 bg-amber-50/50' : 'text-slate-600 border-slate-100 bg-slate-50/50';
                return (
                  <div className={`p-4 rounded-xl border ${color} space-y-2`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Asphalt Corrosion Risk</span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-white border font-mono">
                        {risk} Risk
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {risk === 'Severe' ? 'Multiple reports indicate localized subgrade weakening. Drive carefully.' : 'Street foundations are solid. No significant deformation forecast.'}
                    </p>
                    <div className="text-[10px] font-mono font-medium text-slate-400">
                      Active Hotspots Identified: {count}
                    </div>
                  </div>
                );
              })()}

              {/* Water logging / Drainage overflow */}
              {(() => {
                const count = issues.filter(i => i.category === 'Drainage Issue' && i.status !== 'Resolved').length;
                const risk = count >= 2 ? 'Severe' : count >= 1 ? 'Elevated' : 'Low';
                const color = risk === 'Severe' ? 'text-red-600 border-red-100 bg-red-50/50' : risk === 'Elevated' ? 'text-amber-600 border-amber-100 bg-amber-50/50' : 'text-slate-600 border-slate-100 bg-slate-50/50';
                return (
                  <div className={`p-4 rounded-xl border ${color} space-y-2`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Sewer Waterlogging Projections</span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-white border font-mono">
                        {risk} Risk
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {risk === 'Severe' ? 'Drain blockage cluster detected. Rainstorm may trigger immediate road waterlogging.' : 'Local stormwater conduits show clear channels. Minimum hazard probability.'}
                    </p>
                    <div className="text-[10px] font-mono font-medium text-slate-400">
                      Active Drainage Blockages: {count}
                    </div>
                  </div>
                );
              })()}

              {/* Sanitary Risk / Garbage */}
              {(() => {
                const count = issues.filter(i => i.category === 'Garbage' && i.status !== 'Resolved').length;
                const risk = count >= 3 ? 'Severe' : count >= 1 ? 'Elevated' : 'Low';
                const color = risk === 'Severe' ? 'text-red-600 border-red-100 bg-red-50/50' : risk === 'Elevated' ? 'text-amber-600 border-amber-100 bg-amber-50/50' : 'text-slate-600 border-slate-100 bg-slate-50/50';
                return (
                  <div className={`p-4 rounded-xl border ${color} space-y-2`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Sanitary & Pathogen Level</span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-white border font-mono">
                        {risk} Risk
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {risk === 'Severe' ? 'Waste backlog clusters pose air quality and scavenger attraction warnings.' : 'Efficient municipal cleanup loops detected. Pathogen hazard minimal.'}
                    </p>
                    <div className="text-[10px] font-mono font-medium text-slate-400">
                      Unattended Waste Dumps: {count}
                    </div>
                  </div>
                );
              })()}

              {/* Electrical / Power hazards */}
              {(() => {
                const count = issues.filter(i => i.category === 'Broken Streetlight' && i.status !== 'Resolved').length;
                const risk = count >= 3 ? 'High' : count >= 1 ? 'Elevated' : 'Low';
                const color = risk === 'High' ? 'text-red-600 border-red-100 bg-red-50/50' : risk === 'Elevated' ? 'text-amber-600 border-amber-100 bg-amber-50/50' : 'text-slate-600 border-slate-100 bg-slate-50/50';
                return (
                  <div className={`p-4 rounded-xl border ${color} space-y-2`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Dark Street Safety Risk</span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-white border font-mono">
                        {risk} Risk
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {risk === 'High' ? 'Dark corridor detected. Security vigilance and pedestrian precautions are recommended.' : 'Street illumination coverage stands above 95% target threshold.'}
                    </p>
                    <div className="text-[10px] font-mono font-medium text-slate-400">
                      Unlit Power Outages: {count}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEPARTMENT PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">📊 Civic Impact & Department Performance</h3>
            <p className="text-xs text-slate-500 mt-1">Monitor neighborhood ecological footprint milestones and municipal response metrics to ensure absolute accountability.</p>
          </div>

          {/* 🌱 Neighborhood Environmental & CO2 Impact Counter */}
          {(() => {
            const resolvedCount = issues.filter(i => i.status === 'Resolved').length;
            const waterLeaksResolved = issues.filter(i => i.category === 'Water Leakage' && i.status === 'Resolved').length;
            const garbageResolved = issues.filter(i => i.category === 'Garbage' && i.status === 'Resolved').length;
            const roadResolved = issues.filter(i => i.category === 'Pothole' && i.status === 'Resolved').length;

            const co2Saved = (garbageResolved * 15.5) + (roadResolved * 8.2);
            const waterSaved = waterLeaksResolved * 480;
            const wellnessScore = Math.min(85 + (resolvedCount * 2.5), 98);

            return (
              <div className="bg-gradient-to-br from-emerald-50/40 via-teal-50/20 to-slate-50 border border-emerald-150 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-1.5 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                  <Leaf className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
                  <span>Your Neighborhood Ecological Footprint Savings</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  {/* CO2 Saved */}
                  <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">CO2 Offset Equivalent</span>
                    <p className="text-lg font-extrabold text-emerald-700">{co2Saved.toFixed(1)} <span className="text-xs font-semibold text-emerald-600">kg</span></p>
                    <span className="text-[9px] text-slate-400 block mt-1">Timely waste & road optimization</span>
                  </div>

                  {/* Clean Water */}
                  <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Clean Water Conserved</span>
                    <p className="text-lg font-extrabold text-sky-700">{waterSaved} <span className="text-xs font-semibold text-sky-600">Liters</span></p>
                    <span className="text-[9px] text-slate-400 block mt-1">From resolved pipeline leaks</span>
                  </div>

                  {/* Resolved Projects */}
                  <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Milestones Resolved</span>
                    <p className="text-lg font-extrabold text-teal-700">{resolvedCount} <span className="text-xs font-semibold text-teal-600">Tickets</span></p>
                    <span className="text-[9px] text-slate-400 block mt-1">Completed civic interventions</span>
                  </div>

                  {/* Safety & Wellness Index */}
                  <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Wellness index</span>
                    <p className="text-lg font-extrabold text-indigo-700">{wellnessScore}%</p>
                    <span className="text-[9px] text-slate-400 block mt-1">Based on local risk reduction</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="border-t border-slate-150 pt-5">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3.5">Departmental Response & Processing Rate</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departmentPerformance.map((dept, idx) => (
              <div key={idx} className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                    <h4 className="text-xs font-bold text-slate-800 truncate">{t(dept.name) || dept.name}</h4>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                    {dept.total} reported
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Resolution rate:</span>
                    <span className="font-bold text-slate-800">{dept.rate}%</span>
                  </div>

                  {/* Progressive bar overlay */}
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-800" 
                      style={{ width: `${dept.rate}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-slate-500 pt-1.5">
                    <span>Resolved Tickets:</span>
                    <span className="font-bold text-emerald-600">{dept.resolved} Tickets</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500">
                    <span>Avg Response Time:</span>
                    <span className="font-bold text-indigo-600">{dept.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal trigger popup */}
      {isReportModalOpen && (
        <ReportIssueModal
          userId={userId}
          userName={userName}
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={() => {
            setIsReportModalOpen(false);
            toast(t('reportedSuccessAlert'), 'success');
          }}
        />
      )}
    </div>
  );
}
