// Shared API response types. Field names mirror the backend controllers.

export type Role = 'STUDENT' | 'FACULTY' | 'ADMIN';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'UNMARKED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  studentProfile?: StudentProfile;
  facultyProfile?: FacultyProfile;
}

export interface StudentProfile {
  userId: string;
  rollNo: string;
  course: string;
  branch: string;
  semester: number;
  enrollmentYear: number;
}

export interface FacultyProfile {
  userId: string;
  empId: string;
  department: string;
  designation: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  branch: string;
  semester: number;
  credits: number;
  faculty?: { id: string; name: string };
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
  meetsThreshold: boolean;
}

export interface SubjectAttendance {
  subject: Subject & { faculty?: { id: string; name: string } };
  summary: AttendanceSummary;
}

export interface BunkRow {
  subjectId: string;
  code: string;
  name: string;
  percentage: number;
  total: number;
  attended: number;
  canMiss: number;
  meetsThreshold: boolean;
}

export interface GradeSubject {
  subjectId: string;
  code: string;
  name: string;
  credits: number;
  totalMax: number;
  totalObtained: number;
  percentage: number;
  grade: string;
  gradePoint: number;
}

export interface GradeCard {
  currentSgpa: number;
  currentSemester: number;
  subjects: GradeSubject[];
  past: Array<{ semester: number; sgpa: number }>;
  trend: Array<{ semester: number; sgpa: number }>;
  cgpa: number;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  category: 'EXAM' | 'EVENT' | 'HOLIDAY' | 'GENERAL';
  createdAt: string;
  postedBy?: { id: string; name: string };
}

export interface StudentDashboard {
  role: 'STUDENT';
  attendance: { overall: AttendanceSummary; subjects: SubjectAttendance[]; threshold: number };
  upcomingAssignments: Array<{ id: string; title: string; dueDate: string; subjectCode: string; submitted: boolean }>;
  lastSemesterSgpa: number | null;
  notices: Notice[];
}

export interface FacultyDashboard {
  role: 'FACULTY';
  subjects: Array<{ id: string; code: string; name: string; branch: string; semester: number }>;
  pendingSubmissions: number;
  todayClasses: number;
  notices: Notice[];
}

export interface AdminDashboard {
  role: 'ADMIN';
  counts: { users: number; students: number; faculty: number; notices: number; openTickets: number };
  feesPaid: number;
  recentNotices: Notice[];
}

export type DashboardSummary = StudentDashboard | FacultyDashboard | AdminDashboard;

export interface Exam {
  id: string;
  name: string;
  type: 'INTERNAL' | 'ENDSEM';
  course: string;
  branch: string;
  semester: number;
  subjectId: string;
  date: string;
  maxMarks: number;
  subject?: { code: string; name: string };
}

export interface ExamRosterStudent {
  studentId: string;
  rollNo: string;
  name: string;
  obtained: number | null;
}

export interface Assignment {
  id: string;
  subjectId: string;
  facultyId: string;
  title: string;
  description?: string;
  dueDate: string;
  fileUrl?: string;
  createdAt: string;
  subject?: { id: string; code: string; name: string; branch: string; semester: number };
  faculty?: { id: string; name: string };
  submissions: Submission[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileUrl: string;
  submittedAt: string;
  grade?: number | null;
  feedback?: string | null;
  student?: { userId: string; rollNo: string; user: { name: string } };
}

export interface FeeItem {
  id: string;
  title: string;
  course: string;
  branch: string;
  semester: number;
  amount: number;
  dueDate: string;
}

export interface Payment {
  id: string;
  studentId: string;
  itemId: string;
  amount: number;
  status: 'PAID' | 'PENDING';
  paidAt?: string;
  receiptUrl?: string;
  student?: { user: { name: string; email: string } };
  item?: { id: string; title: string };
}

export interface FeeLedgerRow {
  item: FeeItem;
  payment: Payment | null;
  status: 'PAID' | 'PENDING' | 'UNPAID';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  totalCopies: number;
  available: number;
}

export interface BookIssue {
  id: string;
  bookId: string;
  studentId: string;
  issuedAt: string;
  dueDate: string;
  returnedAt?: string | null;
  fine?: number | null;
  book?: { id: string; title: string; author: string };
  student?: { rollNo: string; user: { name: string } };
}

export interface DocumentRequest {
  id: string;
  studentId: string;
  type: 'BONAFIDE' | 'TRANSCRIPT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note?: string;
  fileUrl?: string;
  requestedAt: string;
  processedAt?: string;
  student?: { user: { name: string; email: string } };
}

export interface Ticket {
  id: string;
  studentId: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  assignedTo?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  student?: { rollNo: string; user: { id: string; name: string } };
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: { id: string; name: string; role: Role };
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  branch: string;
  semester: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  subject?: { id: string; code: string; name: string };
}

export interface SyllabusTopic {
  id: string;
  subjectId: string;
  title: string;
  status: 'COVERED' | 'PENDING';
  coveredOn?: string | null;
}