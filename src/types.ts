export type UserRole = 'citizen' | 'authority' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  points: number;
  reputationScore?: number; // Citizen reputation score (Trust Score, e.g., starting at 100)
  badges: string[];
  department?: string; // For authorities
  createdAt: number;
}

export type IssueStatus =
  | 'Reported'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: IssueSeverity;
  status: IssueStatus;
  latitude: number;
  longitude: number;
  address: string;
  imageUrl?: string;
  reporterId: string;
  reporterName: string;
  assignedTo?: string; // Authority user ID
  assignedToName?: string; // Authority user Name
  department?: string;
  verificationCount: number;
  verifications: string[]; // List of user IDs who upvoted
  urgencyVotes?: number;
  duplicateVotes?: number;
  invalidVotes?: number;
  urgencyScore?: number;
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Extremely High';
  suggestedResolutionTime?: string;
  emergency?: boolean; // Critical safety indicator
  resolutionConfidence?: number; // AI verification rating
  resolutionSummary?: string; // AI verification statement
  aiSummary?: string;
  aiResolutionPlan?: string[];
  publicSafetyAlert?: string;
  environmentalImpactIndex?: number; // 1-5 environmental footprint rating
  predictedHotspotRisk?: 'Low' | 'Medium' | 'High' | 'Severe'; // predictive hazard metric
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: number;
  updatedAt: number;
  officialRemarks?: string;
  resolutionImageUrl?: string;
}

export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  parentId?: string; // For nested sub-replies
  translatedText?: string; // Translated view
  createdAt: number;
}

export interface StatusUpdate {
  id: string;
  issueId: string;
  status: IssueStatus;
  updaterName: string;
  remarks: string;
  proofImageUrl?: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  sender: 'user' | 'ai';
  content: string;
  createdAt: number;
}

export interface AIInsight {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: number;
}
