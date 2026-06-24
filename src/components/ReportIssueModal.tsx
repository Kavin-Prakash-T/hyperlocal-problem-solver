import React, { useState, useRef, useEffect } from 'react';
import { 
  db,
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  uploadMedia
} from '../lib/firebase';
import { Issue, IssueSeverity, IssueStatus } from '../types';
import CivicMap from './CivicMap';
import { useTranslation } from '../lib/i18n';
import { X, Upload, MapPin, Sparkles, Loader2, Image as ImageIcon, Video, Film, AlertTriangle } from 'lucide-react';

interface ReportIssueModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportIssueModal({ userId, userName, onClose, onSuccess }: ReportIssueModalProps) {
  const { t } = useTranslation();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  // Media states
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null); // For AI analysis
  const [mediaError, setMediaError] = useState<string | null>(null);

  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    category: string;
    severity: IssueSeverity;
    department: string;
    summary: string;
    urgencyScore: number;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map settings (Default to Bangalore, will center automatically)
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(13);

  // Geolocation trigger on mount (falls back gracefully if denied)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          setMapCenter([lat, lng]);
          setMapZoom(15);
          
          // Reverse geocoding
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
              if (data && data.display_name) {
                setAddress(data.display_name);
              }
            })
            .catch(() => {
              setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            });
        },
        (error) => {
          console.warn('Geolocation failed:', error);
        }
      );
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setMediaError(null);

    // 1. Validate File Size (Max 25MB)
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
      setMediaError(t('fileSizeError'));
      return;
    }

    // 2. Validate File Type
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov']; // quicktime is mov
    
    // Check extension or MIME type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isImg = imageTypes.includes(file.type) || ['.jpg', '.jpeg', '.png', '.webp'].includes(fileExtension);
    const isVid = videoTypes.includes(file.type) || ['.mp4', '.webm', '.mov'].includes(fileExtension);

    if (!isImg && !isVid) {
      setMediaError(t('fileTypeError'));
      return;
    }

    const detectedType = isVid ? 'video' : 'image';
    setMediaFile(file);
    setMediaType(detectedType);

    // Create dynamic preview URL
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);

    // If it is an image, read as base64 for Gemini AI analysis
    if (detectedType === 'image') {
      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageBase64(null); // Videos don't send base64 to server proxy
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    
    // Fetch reverse geocoding address
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          setAddress(data.display_name);
        }
      })
      .catch(() => {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      });
  };

  // Run Gemini AI Analysis
  const runAiAnalysis = async () => {
    if (!description && !imageBase64) {
      alert('Please provide a description or upload an image first so the AI has context to analyze.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/gemini-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description || title,
          imageBase64: imageBase64 // Will be null for videos
        }),
      });

      if (!response.ok) {
        throw new Error('AI analysis backend failed.');
      }

      const result = await response.json();
      setAiAnalysis(result);
    } catch (err) {
      console.error('AI Analysis failed, using fallback:', err);
      // Fallback
      setAiAnalysis({
        category: 'Other',
        severity: 'Medium',
        department: 'General Civic Ops',
        summary: description || 'Issue reported with description.',
        urgencyScore: 50
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Issue
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Title is required');
    if (!latitude || !longitude) return alert('Please select a location on the map');

    setIsSubmitting(true);

    try {
      // 1. Upload Media file (if selected) to Firebase Storage
      let uploadedUrl = '';
      let uploadedType: 'image' | 'video' | undefined = undefined;

      if (mediaFile) {
        const uploadRes = await uploadMedia(mediaFile, 'issues');
        uploadedUrl = uploadRes.url;
        uploadedType = uploadRes.type;
      }

      // Ensure AI analysis is run
      let currentAiResult = aiAnalysis;
      if (!currentAiResult) {
        // Run synchronously inline before writing
        try {
          const response = await fetch('/api/gemini-categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: description || title,
              imageBase64: imageBase64
            }),
          });
          currentAiResult = await response.json();
        } catch (e) {
          currentAiResult = {
            category: 'Other',
            severity: 'Medium',
            department: 'General Civic Ops',
            summary: description || 'Issue reported.',
            urgencyScore: 50
          };
        }
      }

      const category = currentAiResult?.category || 'Other';
      const severity = currentAiResult?.severity || 'Medium';
      const department = currentAiResult?.department || 'General Civic Ops';
      const urgencyScore = currentAiResult?.urgencyScore || 50;

      // Create Issue Document in Firestore
      const newIssue: any = {
        title,
        description,
        category,
        severity,
        status: 'Reported',
        latitude,
        longitude,
        address: address || 'No address provided',
        reporterId: userId,
        reporterName: userName,
        department,
        verificationCount: 0,
        verifications: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        urgencyScore: urgencyScore,
        aiSummary: currentAiResult?.summary || ''
      };

      // Save media URL and media type if available
      if (uploadedUrl) {
        newIssue.mediaUrl = uploadedUrl;
        newIssue.mediaType = uploadedType;
        
        // For backwards compatibility with old code displaying images
        if (uploadedType === 'image') {
          newIssue.imageUrl = uploadedUrl;
        }
      }

      const issueRef = await addDoc(collection(db, 'issues'), newIssue);

      // Create initial status update log
      await addDoc(collection(db, 'statusUpdates'), {
        issueId: issueRef.id,
        status: 'Reported',
        updaterName: userName,
        remarks: 'Issue reported by citizen. AI automatically analyzed classification and routed to departmental team.',
        createdAt: Date.now()
      });

      // Award Points & Badges to User profile
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentPoints = userData.points || 0;
        const currentBadges: string[] = userData.badges || [];
        
        const newPoints = currentPoints + 20; // 20 points per report
        const updatedBadges = [...currentBadges];

        // Badge checks
        if (newPoints >= 20 && !updatedBadges.includes('First Responder')) {
          updatedBadges.push('First Responder');
        }
        if (newPoints >= 100 && !updatedBadges.includes('Civic Advocate')) {
          updatedBadges.push('Civic Advocate');
        }
        if (newPoints >= 250 && !updatedBadges.includes('Community Hero')) {
          updatedBadges.push('Community Hero');
        }

        await updateDoc(userRef, {
          points: newPoints,
          badges: updatedBadges
        });
      }

      onSuccess();
    } catch (err) {
      console.error('Error submitting issue:', err);
      alert('Failed to submit issue. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col my-8 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{t('reportNewIssueBtn')}</h2>
            <p className="text-xs text-slate-500">{t('appSubtitle')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Side: Fields & Image/Video Upload */}
            <div className="space-y-4.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Deep pothole at intersections, Overflowing public garbage bin"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the issue in detail. The more details you provide, the better the AI routing can analyze and dispatch."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-colors resize-none"
                />
              </div>

              {/* Drag & Drop File Upload */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('uploadMediaLabel')}</label>
                
                {mediaError && (
                  <div className="flex gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{mediaError}</span>
                  </div>
                )}

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 transition-all ${
                    dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {mediaPreview ? (
                    <div className="relative w-full max-h-48 overflow-hidden rounded-lg flex flex-col items-center justify-center bg-slate-50 border p-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">{t('mediaPreview')}</span>
                      
                      {mediaType === 'video' ? (
                        <video 
                          src={mediaPreview} 
                          controls 
                          className="object-contain max-h-36 rounded-lg bg-black" 
                        />
                      ) : (
                        <img 
                          src={mediaPreview} 
                          alt="Issue preview" 
                          className="object-contain max-h-36 rounded-lg" 
                        />
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setMediaPreview(null);
                          setMediaFile(null);
                          setMediaType(null);
                          setImageBase64(null);
                          setAiAnalysis(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md cursor-pointer transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center flex flex-col items-center">
                      <div className="flex gap-1.5 mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 text-slate-500 border">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 text-slate-500 border">
                          <Film className="h-5 w-5" />
                        </div>
                      </div>
                      
                      <p className="text-xs font-bold text-slate-700 px-4">{t('uploadMediaDesc')}</p>
                      
                      <button
                        type="button"
                        onClick={triggerFileSelect}
                        className="mt-3.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                      >
                        Choose File
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* AI Trigger button */}
              {(description || imageBase64) && !aiAnalysis && (
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={runAiAnalysis}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-slate-800 hover:bg-slate-200 transition-colors text-xs font-bold shadow-xs cursor-pointer disabled:opacity-65"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-slate-700" />
                      <span>{t('aiAnalyzing')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4.5 w-4.5 text-slate-800 fill-slate-300 animate-pulse" />
                      <span>{t('aiAssistantTitle')}</span>
                    </>
                  )}
                </button>
              )}

              {/* AI Results Display */}
              {aiAnalysis && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 relative overflow-hidden">
                  <div className="absolute -top-3 -right-3 h-16 w-16 bg-slate-500/5 rounded-full pointer-events-none" />
                  
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-slate-800 fill-slate-200" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('aiAssistantTitle')}</span>
                  </div>

                  <p className="text-xs text-slate-800 bg-white border border-slate-100 px-3 py-1.5 rounded-lg italic">
                    "{aiAnalysis.summary}"
                  </p>

                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t('category')}</span>
                      <p className="font-bold text-slate-900 mt-0.5">{aiAnalysis.category}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t('severity')}</span>
                      <p className="font-bold text-slate-900 mt-0.5">{aiAnalysis.severity}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t('aiDepartmentLabel')}</span>
                      <p className="font-bold text-slate-900 mt-0.5">{aiAnalysis.department}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t('aiUrgencyLabel')}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-700" 
                            style={{ width: `${aiAnalysis.urgencyScore}%` }} 
                          />
                        </div>
                        <span className="font-bold text-slate-800">{aiAnalysis.urgencyScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Map Location Selection */}
            <div className="flex flex-col space-y-3 h-full min-h-[300px]">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('mapTitle')}</label>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-2">{t('clickMapToSelect')}</p>
              </div>

              {/* Leaflet map inside container */}
              <div className="flex-1 min-h-[250px] relative rounded-2xl overflow-hidden border border-slate-200">
                <CivicMap
                  issues={[]}
                  center={mapCenter}
                  zoom={mapZoom}
                  interactive={true}
                  onLocationSelect={handleMapLocationSelect}
                  selectedLocation={latitude && longitude ? [latitude, longitude] : null}
                />
              </div>

              {/* Geolocation indicators */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <MapPin className="h-4.5 w-4.5 text-slate-600" />
                  <div className="flex-1 overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider leading-none mb-0.5">{t('address')}</span>
                    <span className="text-xs text-slate-700 truncate block">{address || 'No location pinned yet'}</span>
                  </div>
                </div>
                {latitude && longitude && (
                  <div className="text-[10px] font-mono text-slate-400 text-right">
                    Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !latitude || !longitude}
              className="rounded-xl bg-slate-800 hover:bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('submittingToCivicEngine')}</span>
                </div>
              ) : (
                <span>{t('submit')} (+20 Pts)</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
