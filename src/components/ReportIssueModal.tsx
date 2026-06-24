import React, { useState, useRef, useEffect } from 'react';
import { 
  db,
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  getDocs,
  query,
  uploadMedia
} from '../lib/firebase';
import { IssueSeverity, Issue } from '../types';
import CivicMap from './CivicMap';
import { useTranslation } from '../lib/i18n';
import { useToast } from './Toast';
import { 
  X, 
  Upload, 
  MapPin, 
  Sparkles, 
  Loader2, 
  Image as ImageIcon, 
  Film, 
  AlertTriangle, 
  Mic, 
  MicOff,
  CheckCircle,
  ThumbsUp,
  AlertOctagon,
  Volume2,
  Languages,
  Shield
} from 'lucide-react';

interface ReportIssueModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportIssueModal({ userId, userName, onClose, onSuccess }: ReportIssueModalProps) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  
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
    riskLevel?: 'Low' | 'Medium' | 'High' | 'Extremely High';
    suggestedResolutionTime?: string;
    emergency?: boolean;
  } | null>(null);

  // Voice recording states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Real voice recording states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceLanguage, setVoiceLanguage] = useState<'en' | 'ta' | 'hi'>('en');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceResultTranscript, setVoiceResultTranscript] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<any>(null);

  // Duplicate states
  const [duplicateIssue, setDuplicateIssue] = useState<Issue | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map settings
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(13);

  // Initialize Web Speech API for voice reporting
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
      
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
        toast("Voice transcribed successfully!", "success");
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        toast("Voice recording failed. Try again.", "error");
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [language]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
      }
    };
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      toast("Speech recognition is not supported in this browser.", "warning");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
      toast("Listening... Speak now.", "info");
    }
  };

  // Helper to convert Blob to Base64
  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Conversion to base64 failed'));
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let options = { mimeType: 'audio/webm' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Stop all track streams so microphone light turns off
        stream.getTracks().forEach(track => track.stop());
        
        await handleProcessVoiceAudio(blob, mimeType);
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start(250); // get chunks every 250ms
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      
      voiceTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 60) {
            // Auto stop at 60s
            stopVoiceRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
      
      toast("Recording started. Please describe the civic issue...", "info");
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      toast("Could not access microphone. Please check permissions.", "error");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
    }
  };

  const handleProcessVoiceAudio = async (blob: Blob, mimeType: string) => {
    setIsProcessingVoice(true);
    toast("Transcribing and analyzing voice with Gemini...", "info");
    try {
      const base64 = await convertBlobToBase64(blob);
      
      const response = await fetch('/api/gemini-voice-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType,
          language: voiceLanguage
        })
      });
      
      if (!response.ok) {
        throw new Error("Voice report API service failed");
      }
      
      const data = await response.json();
      
      // Populate fields
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      
      setAiAnalysis({
        category: data.category || 'Other',
        severity: data.severity || 'Medium',
        department: data.department || 'General Civic Ops',
        summary: data.summary || data.description || 'Voice reported issue.',
        urgencyScore: data.urgencyScore || 50,
        riskLevel: data.riskLevel || 'Medium',
        suggestedResolutionTime: data.suggestedResolutionTime || '3 Days',
        emergency: data.emergency || false
      });
      
      if (data.transcription) {
        setVoiceResultTranscript(data.transcription);
      }
      
      toast("AI Voice extraction complete! Review filled details.", "success");
    } catch (err) {
      console.error("Voice processing failed:", err);
      toast("Gemini voice extraction failed. Try dictating or typing instead.", "error");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // Distance calculator helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return 6371000 * c; // distance in meters
  };

  // Scan for nearby duplicate complaints
  const scanForDuplicates = async (lat: number, lng: number, activeCategory: string) => {
    if (!activeCategory) return;
    try {
      const q = query(collection(db, 'issues'));
      const querySnap = await getDocs(q);
      let duplicateFound: Issue | null = null;

      querySnap.forEach((doc) => {
        const data = doc.data() as any;
        if (data && data.status !== 'Resolved' && data.category === activeCategory) {
          const dist = calculateDistance(lat, lng, data.latitude, data.longitude);
          if (dist < 400) { // within 400 meters radius
            duplicateFound = { id: doc.id, ...data } as Issue;
          }
        }
      });

      if (duplicateFound) {
        setDuplicateIssue(duplicateFound);
        setShowDuplicateWarning(true);
      } else {
        setDuplicateIssue(null);
        setShowDuplicateWarning(false);
      }
    } catch (err) {
      console.error("Duplicate scan failed:", err);
    }
  };

  // Trigger duplicate check when coordinates or category changes
  useEffect(() => {
    if (latitude && longitude && aiAnalysis?.category) {
      scanForDuplicates(latitude, longitude, aiAnalysis.category);
    }
  }, [latitude, longitude, aiAnalysis?.category]);

  const fetchAddressForCoordinates = (lat: number, lng: number) => {
    // Try Google Maps Geocoder first if available
    const g = (window as any).google;
    if (g && g.maps && g.maps.Geocoder) {
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        if (status === 'OK' && results && results[0]) {
          setAddress(results[0].formatted_address);
        } else {
          fetchNominatim(lat, lng);
        }
      });
    } else {
      fetchNominatim(lat, lng);
    }
  };

  const fetchNominatim = (lat: number, lng: number) => {
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

  // Geolocation trigger on mount
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
          fetchAddressForCoordinates(lat, lng);
        },
        (error) => {
          console.warn('Geolocation failed on mount:', error);
        }
      );
    }
  }, []);

  const requestCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          setMapCenter([lat, lng]);
          setMapZoom(15);
          fetchAddressForCoordinates(lat, lng);
          toast('Location successfully centered on your position!', 'success');
        },
        (error) => {
          console.warn('Geolocation trigger failed:', error);
          toast('Failed to query current location. Ensure permission is enabled.', 'error');
        }
      );
    } else {
      toast('Geolocation is not supported by your browser.', 'warning');
    }
  };

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
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
      setMediaError(t('fileSizeError'));
      return;
    }

    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];
    
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

    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);

    if (detectedType === 'image') {
      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // For video, extract a video frame from 1-second marker to use for Gemini vision analysis!
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = previewUrl;
      video.onloadeddata = () => {
        // Seek to 1 second (or middle of video)
        video.currentTime = Math.min(1, video.duration / 2 || 1);
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            setImageBase64(base64);
            console.log("Successfully extracted representative frame from uploaded video file for AI visual inspection!");
          }
        } catch (err) {
          console.warn("Video thumbnail rendering failed, proceeding with raw video asset:", err);
          setImageBase64(null);
        }
      };
      video.onerror = () => {
        setImageBase64(null);
      };
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    fetchAddressForCoordinates(lat, lng);
  };

  // Run AI Auto-Generation Details
  const handleAiAutoGenerate = async () => {
    if (!description && !imageBase64) {
      toast('Please type a description, record voice, or upload a photo first!', 'warning');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/gemini-auto-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description,
          imageBase64: imageBase64
        }),
      });

      if (!response.ok) {
        throw new Error('AI generation service failed.');
      }

      const result = await response.json();
      
      // Auto-populate generated details
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      
      setAiAnalysis({
        category: result.category || 'Other',
        severity: result.severity || 'Medium',
        department: result.department || 'General Civic Ops',
        summary: result.summary || result.description,
        urgencyScore: result.urgencyScore || 50,
        riskLevel: result.riskLevel || 'Medium',
        suggestedResolutionTime: result.suggestedResolutionTime || '3 Days',
        emergency: result.emergency || false
      });

      toast('AI Auto-Generation details complete! Review and adjust if needed.', 'success');
    } catch (err) {
      console.error('AI Auto-generation failed, using smart local rules:', err);
      // fallback
      const localAnalysis = {
        category: 'Other',
        severity: 'Medium' as IssueSeverity,
        department: 'General Civic Ops',
        summary: description || 'Issue reported.',
        urgencyScore: 50,
        riskLevel: 'Medium' as const,
        suggestedResolutionTime: '3 Days',
        emergency: false
      };
      setAiAnalysis(localAnalysis);
      setTitle(title || "New Municipal Complaint");
      toast('AI fallback applied. Please edit category or severity details below.', 'info');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Alternate support route for duplicate issues
  const handleSupportDuplicate = async () => {
    if (!duplicateIssue) return;
    setIsSubmitting(true);
    try {
      const issueRef = doc(db, 'issues', duplicateIssue.id);
      const isAlreadyVoted = duplicateIssue.verifications?.includes(userId);
      
      if (isAlreadyVoted) {
        toast("You have already upvoted this existing issue!", "warning");
        onClose();
        return;
      }

      const updatedVerifications = [...(duplicateIssue.verifications || []), userId];
      
      // Save vote subcollection record
      await addDoc(collection(db, `issues/${duplicateIssue.id}/votes`), {
        issueId: duplicateIssue.id,
        userId: userId,
        type: 'confirm',
        createdAt: Date.now()
      });

      await updateDoc(issueRef, {
        verifications: updatedVerifications,
        verificationCount: updatedVerifications.length,
        updatedAt: Date.now()
      });

      // Reward points for duplicate reporting/supporting
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const curPoints = userData.points || 0;
        const curRep = userData.reputationScore || 100;
        await updateDoc(userRef, {
          points: curPoints + 15, // +15 points for validating
          reputationScore: curRep + 10 // +10 reputation
        });
      }

      toast("Thank you! You upvoted the existing complaint nearby to speed up municipal action. Awarded +15 Points!", "success");
      onSuccess();
    } catch (err) {
      console.error("Error supporting duplicate issue:", err);
      toast("Action failed. Try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Issue
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast('Title is required', 'warning');
      return;
    }
    if (!latitude || !longitude) {
      toast('Please select a location on the map', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedUrl = '';
      let uploadedType: 'image' | 'video' | undefined = undefined;

      if (mediaFile) {
        const uploadRes = await uploadMedia(mediaFile, 'issues');
        uploadedUrl = uploadRes.url;
        uploadedType = uploadRes.type;
      }

      // Ensure AI analysis is run or local fallback is ready
      let currentAiResult = aiAnalysis;
      if (!currentAiResult) {
        try {
          const response = await fetch('/api/gemini-categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: description || title,
              imageBase64: imageBase64
            }),
          });
          const raw = await response.json();
          currentAiResult = {
            category: raw.category || 'Other',
            severity: raw.severity || 'Medium',
            department: raw.department || 'General Civic Ops',
            summary: raw.summary || description || 'Civic issue.',
            urgencyScore: raw.urgencyScore || 50,
            riskLevel: raw.riskLevel || 'Medium',
            suggestedResolutionTime: raw.suggestedResolutionTime || '3 Days',
            emergency: raw.emergency || false,
            aiResolutionPlan: raw.aiResolutionPlan || [
              `1. Initial triage by ${raw.department || 'General Civic Ops'} engineers.`,
              '2. Field inspection and resource scoping.',
              '3. Execute repairs following default SLA standards.'
            ],
            publicSafetyAlert: raw.publicSafetyAlert || 'Caution is recommended around this location.',
            environmentalImpactIndex: raw.environmentalImpactIndex || (raw.severity === 'Critical' ? 5 : 2),
            predictedHotspotRisk: raw.predictedHotspotRisk || 'Medium'
          };
        } catch (e) {
          // Rule based fallback
          const d = (description || '').toLowerCase();
          const isEmergency = d.includes("collapse") || d.includes("fallen") || d.includes("burst");
          const fallbackDept = d.includes("pothole") ? "Road Maintenance" : d.includes("garbage") ? "Waste Management" : "General Civic Ops";
          currentAiResult = {
            category: 'Other',
            severity: isEmergency ? 'Critical' : 'Medium',
            department: fallbackDept,
            summary: description || 'Issue reported.',
            urgencyScore: 50,
            riskLevel: isEmergency ? 'Extremely High' : 'Medium',
            suggestedResolutionTime: isEmergency ? '24 Hours' : '3 Days',
            emergency: isEmergency,
            aiResolutionPlan: [
              `1. Flag and inspect report area for structural damage.`,
              `2. Schedule crew dispatch through ${fallbackDept}.`,
              '3. Resolve the issue and upload visual verification proof.'
            ],
            publicSafetyAlert: isEmergency ? '🚨 CRITICAL SAFETY RISK: Keep away from this coordination zone.' : 'Localized notice: caution advised nearby.',
            environmentalImpactIndex: isEmergency ? 5 : 2,
            predictedHotspotRisk: isEmergency ? 'Severe' : 'Medium'
          };
        }
      }

      const category = currentAiResult?.category || 'Other';
      const severity = currentAiResult?.severity || 'Medium';
      const department = currentAiResult?.department || 'General Civic Ops';
      const urgencyScore = currentAiResult?.urgencyScore || 50;
      const riskLevel = currentAiResult?.riskLevel || 'Medium';
      const suggestedResolutionTime = currentAiResult?.suggestedResolutionTime || '3 Days';
      const emergency = currentAiResult?.emergency || false;

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
        urgencyVotes: 0,
        duplicateVotes: 0,
        invalidVotes: 0,
        urgencyScore,
        riskLevel,
        suggestedResolutionTime,
        emergency,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        aiSummary: currentAiResult?.summary || '',
        aiResolutionPlan: currentAiResult?.aiResolutionPlan || [],
        publicSafetyAlert: currentAiResult?.publicSafetyAlert || '',
        environmentalImpactIndex: currentAiResult?.environmentalImpactIndex || 2,
        predictedHotspotRisk: currentAiResult?.predictedHotspotRisk || 'Medium'
      };

      if (uploadedUrl) {
        newIssue.mediaUrl = uploadedUrl;
        newIssue.mediaType = uploadedType;
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
        remarks: emergency 
          ? '🚨 CRITICAL SAFETY EMERGENCY ESCALATED! High priority emergency routing initiated immediately.'
          : 'Issue reported by citizen. AI automatically analyzed classification and routed to departmental team.',
        createdAt: Date.now()
      });

      // Award Points, Reputation Score, & Badges
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentPoints = userData.points || 0;
        const currentRep = userData.reputationScore || 100;
        const currentBadges: string[] = userData.badges || [];
        
        // Award +20 points and +15 reputation score
        const newPoints = currentPoints + 20;
        const newRep = currentRep + 15;
        const updatedBadges = [...currentBadges];

        // Badge checks
        if (!updatedBadges.includes('First Responder')) {
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
          reputationScore: newRep,
          badges: updatedBadges
        });
      }

      toast(emergency ? '🚨 Emergency escalations broadcasted! Issue submitted.' : 'Issue successfully reported!', 'success');
      onSuccess();
    } catch (err) {
      console.error('Error submitting issue:', err);
      toast('Failed to submit issue. Please check your network.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto font-sans">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-8 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('reportNewIssueBtn')}</h2>
            <p className="text-xs text-slate-500">{t('appSubtitle')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Emergency detected banner */}
          {aiAnalysis?.emergency && (
            <div className="flex items-center gap-3.5 bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl animate-pulse">
              <AlertOctagon className="h-6 w-6 text-red-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold">🚨 Critical Safety Hazard Escallated</h4>
                <p className="text-xs text-red-700">AI has flagged this issue as an extreme public safety risk. Dispatch alerts are broadcasted immediately!</p>
              </div>
            </div>
          )}

          {/* Duplicate complaint warning panel */}
          {showDuplicateWarning && duplicateIssue && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4.5 space-y-3.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Similar Complaint Detected Nearby!</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    An unresolved ticket for "<strong>{duplicateIssue.title}</strong>" is located within 400m from your pin. 
                    Support this existing ticket to help municipal departments prioritize resolution, rather than creating a duplicate.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSupportDuplicate}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>Upvote & Support Existing Ticket (+15 Pts)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateWarning(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold cursor-pointer"
                >
                  Ignore and submit a new ticket anyway
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Side: Fields & Image/Video Upload */}
            <div className="space-y-4.5">
              
              {/* Title input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Deep pothole at intersection, Broken water mains pipe"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-colors"
                />
              </div>

              {/* AI Voice Reporting Assistant Workspace */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 mb-4 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-teal-600 animate-pulse" />
                    AI Voice Reporting Assistant
                  </span>
                  
                  {/* Language Selector pills */}
                  <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-[10px] font-bold items-center gap-1">
                    <Languages className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
                    <button
                      type="button"
                      onClick={() => setVoiceLanguage('en')}
                      className={`px-2 py-1 rounded-md transition-colors ${voiceLanguage === 'en' ? 'bg-white text-teal-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceLanguage('ta')}
                      className={`px-2 py-1 rounded-md transition-colors ${voiceLanguage === 'ta' ? 'bg-white text-teal-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      தமிழ் (Tamil)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceLanguage('hi')}
                      className={`px-2 py-1 rounded-md transition-colors ${voiceLanguage === 'hi' ? 'bg-white text-teal-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      हिन्दी (Hindi)
                    </button>
                  </div>
                </div>

                {/* Recorder Control Button */}
                {!isRecordingVoice && !isProcessingVoice && (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 border border-teal-200/60 text-teal-900 rounded-xl py-3 px-4 transition-all cursor-pointer group shadow-xs hover:shadow-md"
                  >
                    <div className="bg-teal-600 group-hover:bg-teal-700 text-white p-2 rounded-full transition-colors shrink-0">
                      <Mic className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-teal-950">Record Voice Report with Gemini AI</span>
                      <span className="block text-[10px] text-teal-700 font-medium">Just speak in your selected language; Gemini extracts all details!</span>
                    </div>
                  </button>
                )}

                {isRecordingVoice && (
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="w-full flex items-center justify-center gap-3 bg-red-50 border border-red-200 text-red-900 rounded-xl py-3 px-4 animate-pulse transition-all cursor-pointer shadow-sm"
                  >
                    <div className="bg-red-600 text-white p-2 rounded-full relative shrink-0">
                      <MicOff className="h-4.5 w-4.5 animate-bounce" />
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-red-950">Recording Active... Click to Stop & Process</span>
                      <span className="block text-[10px] text-red-700 font-bold">Time: {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')} (Max 60 seconds)</span>
                    </div>
                  </button>
                )}

                {isProcessingVoice && (
                  <div className="w-full flex items-center justify-center gap-3 bg-slate-100/80 border border-slate-200 text-slate-800 rounded-xl py-3 px-4 animate-pulse">
                    <Loader2 className="h-5 w-5 text-teal-600 animate-spin shrink-0" />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-slate-950">Gemini AI Processing Audio...</span>
                      <span className="block text-[10px] text-slate-500 font-medium">Transcribing speech and extracting title, category, and severity</span>
                    </div>
                  </div>
                )}

                {voiceResultTranscript && (
                  <div className="bg-teal-50/40 border border-teal-100 rounded-xl p-3 text-xs leading-relaxed text-teal-950">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-teal-800 mb-1 flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5" />
                      AI Speech Transcript
                    </span>
                    <p className="italic text-slate-700 font-medium">"{voiceResultTranscript}"</p>
                  </div>
                )}
              </div>

              {/* Description field */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  
                  {/* Subtle link to backup browser speech recognition */}
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                      isListening 
                        ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' 
                        : 'bg-slate-100/60 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <Mic className="h-2.5 w-2.5" />
                    <span>{isListening ? "Listening..." : "Dictate to box"}</span>
                  </button>
                </div>

                <textarea
                  rows={3}
                  required
                  placeholder="Describe the issue. You can speak into the voice recorder above to let Gemini automatically auto-populate everything!"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-colors resize-none leading-relaxed"
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
                    dragActive ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {mediaPreview ? (
                    <div className="relative w-full max-h-48 overflow-hidden rounded-lg flex flex-col items-center justify-center bg-slate-50 border p-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('mediaPreview')}</span>
                      
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
                      
                      <p className="text-xs font-semibold text-slate-700 px-4">{t('uploadMediaDesc')}</p>
                      
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

              {/* AI Auto-generate triggers */}
              {(description || imageBase64) && (
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleAiAutoGenerate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 px-4 py-2.5 transition-colors text-xs font-bold shadow-md cursor-pointer disabled:opacity-65"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                      <span>Synthesizing Civic Data...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4.5 w-4.5 text-indigo-400 fill-indigo-400/35 animate-pulse" />
                      <span>✨ Auto-generate fields with AI</span>
                    </>
                  )}
                </button>
              )}

              {/* AI assessment review cards */}
              {aiAnalysis && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-3.5 relative overflow-hidden text-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-400 fill-indigo-500/20" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">AI Civic Assessment</span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg italic leading-relaxed">
                    "{aiAnalysis.summary}"
                  </p>

                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Predicted Category</span>
                      <p className="font-semibold text-white mt-0.5">{aiAnalysis.category}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Severity Scale</span>
                      <p className={`font-semibold mt-0.5 ${
                        aiAnalysis.severity === 'Critical' ? 'text-red-400' : aiAnalysis.severity === 'High' ? 'text-orange-400' : 'text-slate-100'
                      }`}>{aiAnalysis.severity}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Suggested Dept</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{aiAnalysis.department}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Risk Severity</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{aiAnalysis.riskLevel || 'Medium'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Target Resolution Duration</span>
                      <p className="font-semibold text-indigo-400 mt-0.5">{aiAnalysis.suggestedResolutionTime || '3 Days'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Urgency Assessment</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500" 
                            style={{ width: `${aiAnalysis.urgencyScore}%` }} 
                          />
                        </div>
                        <span className="font-bold text-white shrink-0">{aiAnalysis.urgencyScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Map Location Selection */}
            <div className="flex flex-col space-y-3 h-full min-h-[300px]">
              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('mapTitle')}</label>
                  <button
                    type="button"
                    onClick={requestCurrentLocation}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <MapPin className="h-3 w-3 text-slate-500" />
                    <span>{t('useCurrentLocation')}</span>
                  </button>
                </div>
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
                  <MapPin className="h-4.5 w-4.5 text-slate-600 shrink-0" />
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
              className="rounded-xl bg-slate-800 hover:bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
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
