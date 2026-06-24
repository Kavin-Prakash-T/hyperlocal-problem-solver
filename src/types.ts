export type UserRole = 'citizen' | 'authority' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  points: number;
  badges: string[];
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
  createdAt: number;
  updatedAt: number;
  officialRemarks?: string;
  resolutionImageUrl?: string;
  urgencyScore?: number;
  aiSummary?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
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
