import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ta' | 'hi';

export interface LanguageOption {
  code: Language;
  name: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'hi', name: 'हिन्दी' }
];

const translations = {
  en: {
    // Brand & General
    appName: "Community Hero",
    appSubtitle: "AI-Powered Hyperlocal Civic Platform",
    tagline: "Civic Action Platform",
    logout: "Logout",
    loading: "Connecting to Community Hero...",
    back: "Back",
    cancel: "Cancel",
    submit: "Submit",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    status: "Status",
    remarks: "Remarks",
    category: "Category",
    severity: "Severity",
    address: "Address",
    date: "Date",
    points: "Hero Points",
    badges: "Badges",
    portal: "Portal",
    active: "Active",
    resolved: "Resolved",
    inProgress: "In Progress",
    underReview: "Under Review",
    assigned: "Assigned",
    reported: "Reported",
    rejected: "Rejected",
    
    // Auth Screen
    loginTab: "Log In",
    registerTab: "Register Account",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "e.g., John Doe",
    emailLabel: "Email Address",
    emailPlaceholder: "e.g., citizen@email.com",
    passwordLabel: "Password",
    signUpAs: "Sign Up As",
    citizenOption: "Citizen",
    authorityOption: "Official Authority",
    departmentLabel: "Department",
    accessTerminal: "Access Terminal",
    createFreeAccount: "Create Free Account",
    bypassTitle: "Hackathon Quick Bypass Audits",
    authFailed: "Authentication failed. Please verify credentials.",
    emailInUse: "This email is already registered.",
    wrongPassword: "Incorrect password.",
    userNotFound: "No account matches this email.",
    
    // Departments
    deptRoads: "Roads",
    deptWaste: "Waste",
    deptWater: "Water",
    deptPower: "Power",
    deptDrainage: "Drainage",
    deptAnimals: "Animals",

    // Navbar
    heroPointsBadge: "{{points}} Hero Points",
    citizenPortal: "Citizen Portal",
    authorityPortal: "Official Portal",
    adminPortal: "Admin Portal",

    // Map UI
    mapTitle: "Civic Map Representation",
    clickMapToSelect: "👆 Click on the map to place issue marker",
    locationSelected: "✓ Location selected",
    useCurrentLocation: "Use current location",
    youAreHere: "You are here",
    markerUrgency: "Urgency Score",

    // Citizen Dashboard
    myDashboard: "My Citizen Dashboard",
    civicReportingEngine: "Civic Reporting Engine",
    submittingToCivicEngine: "Submitting issue...",
    myReportedIssues: "My Reported Issues",
    allCommunityIssues: "All Community Issues",
    reportNewIssueBtn: "Report New Issue",
    searchIssuesPlaceholder: "Search issues by title, category, or description...",
    noIssuesFound: "No issues reported in this area yet.",
    verifiedCount: "{{count}} Verifications",
    upvoteBtn: "Upvote",
    verifyBtn: "Verify",
    verifiedBtn: "Verified",
    addCommentPlaceholder: "Write a public comment...",
    commentsHeader: "Comments ({{count}})",
    postCommentBtn: "Post",
    aiAssistantTitle: "AI Civic Response Assistant",
    aiAssistantDesc: "AI-generated recommendations and impact assessment of this issue:",
    aiAnalyzing: "AI is analyzing this issue's civic impact...",
    aiSafetyWarning: "Emergency safety guidelines recommended.",

    // Authority Dashboard
    authorityDashboardTitle: "Authority Command Center",
    assignedIssues: "Assigned Issues",
    updateStatusTitle: "Update Status & Add Official Remarks",
    newStatusLabel: "New Status",
    officialRemarksPlaceholder: "Enter action details, timeline, or proof...",
    submittingUpdate: "Submitting update...",
    departmentIssuesOnly: "Showing issues for {{department}} department",

    // Admin Dashboard
    adminDashboardTitle: "Central System Administration",
    systemStats: "System-wide Statistics",
    totalUsers: "Total Registered Users",
    totalIssues: "Total Issues Reported",
    resolvedIssues: "Resolved Tickets",
    userDirectory: "User Profile Directory",
    addPointsTitle: "Adjust Hero Points",
    pointsAddedSuccess: "Points adjusted successfully!",

    // Video & Media Upload
    uploadMediaLabel: "Upload Photo or Video",
    uploadMediaDesc: "Drag & drop file or click to choose. Supports Images (JPG, PNG, WEBP) & Videos (MP4, WEBM, MOV) up to 25MB.",
    fileSizeError: "File exceeds 25MB size limit.",
    fileTypeError: "Invalid file format. Please upload JPG, PNG, WEBP images or MP4, WEBM, MOV videos.",
    mediaPreview: "Media Preview",
    viewVideo: "View Video Preview",
    mediaUploaded: "Media uploaded successfully",
    viewPhoto: "View Photo",
    mediaTypeImage: "Image",
    mediaTypeVideo: "Video",

    // AI Impact Categories
    aiUrgencyLabel: "AI Urgency Score",
    aiDepartmentLabel: "Assigned Department",
    aiAnalysisLabel: "Civic Impact Analysis"
  },
  ta: {
    // Brand & General
    appName: "சமூக நாயகன் (Community Hero)",
    appSubtitle: "செயற்கை நுண்ணறிவு மூலம் இயங்கும் உள்ளூர் குடிமை தளம்",
    tagline: "குடிமை நடவடிக்கை தளம்",
    logout: "வெளியேறு",
    loading: "சமூக நாயகனுடன் இணைக்கப்படுகிறது...",
    back: "பின்னால்",
    cancel: "ரத்து செய்",
    submit: "சமர்ப்பி",
    save: "சேமி",
    delete: "அழி",
    edit: "திருத்து",
    close: "மூடு",
    status: "நிலை",
    remarks: "கருத்துகள்",
    category: "வகை",
    severity: "தீவிரம்",
    address: "முகவரி",
    date: "தேதி",
    points: "நாயகன் புள்ளிகள்",
    badges: "பதக்கங்கள்",
    portal: "வலைவாசல்",
    active: "செயலில்",
    resolved: "தீர்க்கப்பட்டது",
    inProgress: "செயல்பாட்டில்",
    underReview: "மதிப்பாய்வில்",
    assigned: "ஒதுக்கப்பட்டது",
    reported: "அறிவிக்கப்பட்டது",
    rejected: "நிராகரிக்கப்பட்டது",
    
    // Auth Screen
    loginTab: "உள்நுழை",
    registerTab: "கணக்கை பதிவுசெய்",
    fullNameLabel: "முழு பெயர்",
    fullNamePlaceholder: "எ.கா., கார்த்திக்",
    emailLabel: "மின்னஞ்சல் முகவரி",
    emailPlaceholder: "எ.கா., citizen@email.com",
    passwordLabel: "கடவுச்சொல்",
    signUpAs: "பதிவு செய்ய",
    citizenOption: "குடிமகன்",
    authorityOption: "அரசு அதிகாரி",
    departmentLabel: "துறை",
    accessTerminal: "முனையத்தை அணுகவும்",
    createFreeAccount: "இலவச கணக்கை உருவாக்கு",
    bypassTitle: "ஹேக்கத்தான் விரைவு உள்நுழைவு",
    authFailed: "அங்கீகாரம் தோல்வியடைந்தது. விவரங்களை சரிபார்க்கவும்.",
    emailInUse: "இந்த மின்னஞ்சல் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.",
    wrongPassword: "தவறான கடவுச்சொல்.",
    userNotFound: "இந்த மின்னஞ்சலுடன் எந்த கணக்கும் பொருந்தவில்லை.",

    // Departments
    deptRoads: "சாலைகள் பராமரிப்பு",
    deptWaste: "கழிவு மேலாண்மை",
    deptWater: "குடிநீர் வழங்கல்",
    deptPower: "மின்சாரம் / தெருவிளக்கு",
    deptDrainage: "கழிவுநீர் வடிகால்",
    deptAnimals: "விலங்குகள் கட்டுப்பாடு",

    // Navbar
    heroPointsBadge: "{{points}} நாயகன் புள்ளிகள்",
    citizenPortal: "குடிமகன் வலைவாசல்",
    authorityPortal: "அதிகாரப்பூர்வ வலைவாசல்",
    adminPortal: "நிர்வாகி வலைவாசல்",

    // Map UI
    mapTitle: "குடிமை வரைபடம்",
    clickMapToSelect: "👆 வரைபடத்தில் குறிப்பானை வைக்க கிளிக் செய்யவும்",
    locationSelected: "✓ இடம் தேர்ந்தெடுக்கப்பட்டது",
    useCurrentLocation: "எனது தற்போதைய இடத்தைப் பயன்படுத்து",
    youAreHere: "நீங்கள் இங்கே இருக்கிறீர்கள்",
    markerUrgency: "அவசர மதிப்பெண்",

    // Citizen Dashboard
    myDashboard: "எனது குடிமகன் டாஷ்போர்டு",
    civicReportingEngine: "குடிமை அறிக்கை இயந்திரம்",
    submittingToCivicEngine: "பிரச்சனை சமர்ப்பிக்கப்படுகிறது...",
    myReportedIssues: "நான் புகாரளித்த பிரச்சனைகள்",
    allCommunityIssues: "அனைத்து சமூகப் பிரச்சனைகள்",
    reportNewIssueBtn: "புதிய பிரச்சனை புகாரளிக்கவும்",
    searchIssuesPlaceholder: "தலைப்பு, வகை அல்லது விளக்கம் மூலம் தேடவும்...",
    noIssuesFound: "இந்தப் பகுதியில் இன்னும் எந்தப் பிரச்சனையும் புகாரளிக்கப்படவில்லை.",
    verifiedCount: "{{count}} சரிபார்ப்புகள்",
    upvoteBtn: "விருப்பம்",
    verifyBtn: "சரிபார்",
    verifiedBtn: "சரிபார்க்கப்பட்டது",
    addCommentPlaceholder: "பொதுக் கருத்து ஒன்றை எழுதவும்...",
    commentsHeader: "கருத்துகள் ({{count}})",
    postCommentBtn: "பதிவிடு",
    aiAssistantTitle: "செயற்கை நுண்ணறிவு குடிமை உதவி",
    aiAssistantDesc: "பிரச்சனையின் தாக்கம் மற்றும் AI பரிந்துரைகள்:",
    aiAnalyzing: "AI குடிமை தாக்கத்தை பகுப்பாய்வு செய்கிறது...",
    aiSafetyWarning: "அவசர பாதுகாப்பு வழிகாட்டுதல்கள் பரிந்துரைக்கப்படுகின்றன.",

    // Authority Dashboard
    authorityDashboardTitle: "அதிகாரப்பூர்வ கட்டளை மையம்",
    assignedIssues: "ஒதுக்கப்பட்ட பிரச்சனைகள்",
    updateStatusTitle: "நிலையைப் புதுப்பித்து உத்தியோகபூர்வ கருத்துக்களைச் சேர்க்கவும்",
    newStatusLabel: "புதிய நிலை",
    officialRemarksPlaceholder: "நடவடிக்கை விவரங்கள், காலவரிசை அல்லது ஆதாரத்தை உள்ளிடவும்...",
    submittingUpdate: "புதுப்பிப்பு சமர்ப்பிக்கப்படுகிறது...",
    departmentIssuesOnly: "{{department}} துறைக்கான பிரச்சனைகள் மட்டும் காண்பிக்கப்படுகின்றன",

    // Admin Dashboard
    adminDashboardTitle: "மத்திய கணினி நிர்வாகம்",
    systemStats: "கணினி அளவிலான புள்ளிவிவரங்கள்",
    totalUsers: "மொத்த பதிவு செய்த பயனர்கள்",
    totalIssues: "மொத்தமாக புகாரளிக்கப்பட்ட பிரச்சனைகள்",
    resolvedIssues: "தீர்க்கப்பட்ட பிரச்சனைகள்",
    userDirectory: "பயனர் விவர அடைவு",
    addPointsTitle: "புள்ளிகளைச் சரிசெய்யவும்",
    pointsAddedSuccess: "புள்ளிகள் வெற்றிகரமாக மாற்றப்பட்டன!",

    // Video & Media Upload
    uploadMediaLabel: "புகைப்படம் அல்லது வீடியோவைப் பதிவேற்றவும்",
    uploadMediaDesc: "கோப்பை இழுத்து விடவும் அல்லது தேர்வு செய்ய கிளிக் செய்யவும். 25MB வரையிலான புகைப்படங்கள் (JPG, PNG, WEBP) மற்றும் வீடியோக்கள் (MP4, WEBM, MOV) ஆதரிக்கப்படும்.",
    fileSizeError: "கோப்பு 25MB வரம்பை மீறுகிறது.",
    fileTypeError: "தவறான வடிவம். JPG, PNG, WEBP புகைப்படங்கள் அல்லது MP4, WEBM, MOV வீடியோக்களைப் பதிவேற்றவும்.",
    mediaPreview: "முன்னோட்டம்",
    viewVideo: "வீடியோ முன்னோட்டத்தைக் காண்க",
    mediaUploaded: "கோப்பு வெற்றிகரமாகப் பதிவேற்றப்பட்டது",
    viewPhoto: "புகைப்படத்தைக் காண்க",
    mediaTypeImage: "புகைப்படம்",
    mediaTypeVideo: "வீடியோ",

    // AI Impact Categories
    aiUrgencyLabel: "AI அவசர மதிப்பெண்",
    aiDepartmentLabel: "ஒதுக்கப்பட்ட துறை",
    aiAnalysisLabel: "குடிமை தாக்க பகுப்பாய்வு"
  },
  hi: {
    // Brand & General
    appName: "कम्युनिटी हीरो (Community Hero)",
    appSubtitle: "एआई-द्वारा संचालित स्थानीय नागरिक मंच",
    tagline: "नागरिक कार्रवाई मंच",
    logout: "लॉग आउट",
    loading: "कम्युनिटी हीरो से जुड़ रहे हैं...",
    back: "पीछे",
    cancel: "रद्द करें",
    submit: "जमा करें",
    save: "सहेजें",
    delete: "हटाएं",
    edit: "संपादित करें",
    close: "बंद करें",
    status: "स्थिति",
    remarks: "टिप्पणियाँ",
    category: "श्रेणी",
    severity: "गंभीरता",
    address: "पता",
    date: "दिनांक",
    points: "हीरो अंक",
    badges: "बैज",
    portal: "पोर्टल",
    active: "सक्रिय",
    resolved: "सुलझाया गया",
    inProgress: "प्रगति पर है",
    underReview: "समीक्षा के अधीन",
    assigned: "सौंपा गया",
    reported: "सूचित",
    rejected: "अस्वीकृत",
    
    // Auth Screen
    loginTab: "लॉग इन",
    registerTab: "खाता पंजीकृत करें",
    fullNameLabel: "पूरा नाम",
    fullNamePlaceholder: "जैसे, राहुल कुमार",
    emailLabel: "ईमेल पता",
    emailPlaceholder: "जैसे, citizen@email.com",
    passwordLabel: "पासवर्ड",
    signUpAs: "साइन अप करें",
    citizenOption: "नागरिक",
    authorityOption: "आधिकारिक प्राधिकरण",
    departmentLabel: "विभाग",
    accessTerminal: "टर्मिनल खोलें",
    createFreeAccount: "निःशुल्क खाता बनाएं",
    bypassTitle: "हैकथॉन क्विक बाईपास लॉगिन",
    authFailed: "प्रमाणीकरण विफल। कृपया क्रेडेंशियल्स सत्यापित करें।",
    emailInUse: "यह ईमेल पहले से पंजीकृत है।",
    wrongPassword: "गलत पासवर्ड।",
    userNotFound: "कोई खाता इस ईमेल से मेल नहीं खाता।",

    // Departments
    deptRoads: "सड़कें रखरखाव",
    deptWaste: "कचरा प्रबंधन",
    deptWater: "जलापूर्ति विभाग",
    deptPower: "बिजली / स्ट्रीटलाइट",
    deptDrainage: "जल निकासी और सीवरेज",
    deptAnimals: "पशु नियंत्रण",

    // Navbar
    heroPointsBadge: "{{points}} हीरो अंक",
    citizenPortal: "नागरिक पोर्टल",
    authorityPortal: "आधिकारिक पोर्टल",
    adminPortal: "एडमिन पोर्टल",

    // Map UI
    mapTitle: "नागरिक मानचित्र",
    clickMapToSelect: "👆 समस्या का स्थान चुनने के लिए मानचित्र पर क्लिक करें",
    locationSelected: "✓ स्थान चुना गया",
    useCurrentLocation: "मेरे वर्तमान स्थान का उपयोग करें",
    youAreHere: "आप यहाँ हैं",
    markerUrgency: "तात्कालिकता स्कोर",

    // Citizen Dashboard
    myDashboard: "मेरा नागरिक डैशबोर्ड",
    civicReportingEngine: "नागरिक रिपोर्टिंग इंजन",
    submittingToCivicEngine: "समस्या जमा की जा रही है...",
    myReportedIssues: "मेरे द्वारा रिपोर्ट की गई समस्याएं",
    allCommunityIssues: "सभी सामुदायिक समस्याएं",
    reportNewIssueBtn: "नई समस्या रिपोर्ट करें",
    searchIssuesPlaceholder: "शीर्षक, श्रेणी या विवरण द्वारा समस्याएं खोजें...",
    noIssuesFound: "इस क्षेत्र में अभी तक कोई समस्या रिपोर्ट नहीं की गई है।",
    verifiedCount: "{{count}} सत्यापन",
    upvoteBtn: "अपवोट",
    verifyBtn: "सत्यापित करें",
    verifiedBtn: "सत्यापित",
    addCommentPlaceholder: "एक सार्वजनिक टिप्पणी लिखें...",
    commentsHeader: "टिप्पणियां ({{count}})",
    postCommentBtn: "पोस्ट करें",
    aiAssistantTitle: "एआई नागरिक प्रतिक्रिया सहायक",
    aiAssistantDesc: "एआई द्वारा जनरेटेड सिफारिशें और समस्या का आकलन:",
    aiAnalyzing: "एआई समस्या के नागरिक प्रभाव का विश्लेषण कर रहा है...",
    aiSafetyWarning: "आपातकालीन सुरक्षा दिशानिर्देशों की सिफारिश की जाती है।",

    // Authority Dashboard
    authorityDashboardTitle: "प्राधिकरण कमांड सेंटर",
    assignedIssues: "सौंपी गई समस्याएं",
    updateStatusTitle: "स्थिति अपडेट करें और आधिकारिक टिप्पणी जोड़ें",
    newStatusLabel: "नई स्थिति",
    officialRemarksPlaceholder: "कार्रवाई का विवरण, समयसीमा या प्रमाण दर्ज करें...",
    submittingUpdate: "अपडेट सबमिट किया जा रहा है...",
    departmentIssuesOnly: "केवल {{department}} विभाग की समस्याएं दिखाई दे रही हैं",

    // Admin Dashboard
    adminDashboardTitle: "केंद्रीय प्रणाली प्रशासन",
    systemStats: "प्रणाली-व्यापी सांख्यिकी",
    totalUsers: "कुल पंजीकृत उपयोगकर्ता",
    totalIssues: "कुल रिपोर्ट की गई समस्याएं",
    resolvedIssues: "हल किए गए टिकट",
    userDirectory: "उपयोगकर्ता प्रोफ़ाइल निर्देशिका",
    addPointsTitle: "हीरो अंक समायोजित करें",
    pointsAddedSuccess: "अंक सफलतापूर्वक समायोजित किए गए!",

    // Video & Media Upload
    uploadMediaLabel: "फ़ोटो या वीडियो अपलोड करें",
    uploadMediaDesc: "फ़ाइल को खींचें और छोड़ें या चुनने के लिए क्लिक करें। 25MB तक की फ़ोटो (JPG, PNG, WEBP) और वीडियो (MP4, WEBM, MOV) समर्थित हैं।",
    fileSizeError: "फ़ाइल 25MB आकार सीमा से अधिक है।",
    fileTypeError: "अमान्य फ़ाइल स्वरूप। कृपया JPG, PNG, WEBP छवियां या MP4, WEBM, MOV वीडियो अपलोड करें।",
    mediaPreview: "मीडिया पूर्वावलोकन",
    viewVideo: "वीडियो पूर्वावलोकन देखें",
    mediaUploaded: "मीडिया सफलतापूर्वक अपलोड किया गया",
    viewPhoto: "फ़ोटो देखें",
    mediaTypeImage: "छवि",
    mediaTypeVideo: "वीडियो",

    // AI Impact Categories
    aiUrgencyLabel: "एआई तात्कालिकता स्कोर",
    aiDepartmentLabel: "सौंपा गया विभाग",
    aiAnalysisLabel: "नागरिक प्रभाव विश्लेषण"
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en'], replace?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('community_hero_language') as Language;
    return (saved && (saved === 'en' || saved === 'ta' || saved === 'hi')) ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('community_hero_language', lang);
  };

  const t = (key: keyof typeof translations['en'], replace?: Record<string, string | number>): string => {
    const langDict = translations[language] || translations.en;
    let text = langDict[key] || translations.en[key] || String(key);
    
    if (replace) {
      Object.entries(replace).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
