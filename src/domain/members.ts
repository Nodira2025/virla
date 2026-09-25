export type MemberRole = 'admin' | 'director' | 'staff';
export interface Member { id: string; email: string; display_name: string; role: MemberRole | null; active: boolean }
export const ROLE_LABELS: Record<MemberRole, string> = { admin: 'Admin', director: 'Director', staff: 'Personal' };
export const canApprove = (member: Member | null) => Boolean(member?.active && (member.role === 'director' || member.role === 'admin'));
