export type UserRole = "entrepreneur" | "investor";

export interface StartupHistoryItem {
  startupName?: string;
  position?: string;
  foundedYear?: number;
  status?: string;
  summary?: string;
}

export interface InvestmentHistoryItem {
  companyName?: string;
  amount?: string;
  stage?: string;
  year?: number;
  status?: string;
  notes?: string;
}

export interface UserPreferences {
  industries?: string[];
  stages?: string[];
  locations?: string[];
  communication?: string[];
}

export interface DashboardData {
  dashboardType: "Investor" | "Entrepreneur";
  summary: Record<string, string | number>;
  highlights: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  walletBalance?: number;
  avatarUrl: string;
  profilePictureUrl?: string;
  bio: string;
  isOnline?: boolean;
  createdAt: string;
  startupHistory?: StartupHistoryItem[];
  investmentHistory?: InvestmentHistoryItem[];
  preferences?: UserPreferences;
  dashboardData?: DashboardData;

  startupName?: string;
  pitchSummary?: string;
  fundingNeeded?: string;
  industry?: string;
  location?: string;
  foundedYear?: number;
  teamSize?: number;

  investmentInterests?: string[];
  investmentStage?: string[];
  portfolioCompanies?: string[];
  totalInvestments?: number;
  minimumInvestment?: string;
  maximumInvestment?: string;
}

export interface Entrepreneur extends User {
  role: "entrepreneur";
  startupName: string;
  pitchSummary: string;
  fundingNeeded: string;
  industry: string;
  location: string;
  foundedYear: number;
  teamSize: number;
}

export interface Investor extends User {
  role: "investor";
  investmentInterests: string[];
  investmentStage: string[];
  portfolioCompanies: string[];
  totalInvestments: number;
  minimumInvestment: string;
  maximumInvestment: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: string;
}

export interface CollaborationRequest {
  id: string;
  investorId: string;
  entrepreneurId: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Document {
  id: string;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  storedFileName?: string;
  fileSize: number;
  version: number;
  status: "DRAFT" | "REVIEWED" | "SIGNED";
  signatureImage?: string;
  createdAt: string;
  updatedAt: string;
}

export type MeetingStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export interface MeetingParticipant {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  hostId: string;
  inviteeId: string;
  host?: MeetingParticipant;
  invitee?: MeetingParticipant;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  meetingLink: string;
  roomId?: string;
  createdAt: string;
}

export interface MeetingConflictError {
  success: false;
  code: "CONFLICT";
  message: string;
  details?: {
    clashingMeeting?: Meeting;
  };
}

export interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
    role: UserRole,
  ) => Promise<{ otpRequired: boolean; user?: User; otpToken?: string }>;
  verifyOtp: (otpToken: string, otp: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type PaymentTransactionType = "DEPOSIT" | "WITHDRAW" | "TRANSFER";
export type PaymentTransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface PaymentParty {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  recipientId?: string | null;
  user?: PaymentParty;
  recipient?: PaymentParty;
  type: PaymentTransactionType;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  stripePaymentIntentId?: string;
  createdAt: string;
}
