
import { UserDetails } from "@/providers/user-provider";

export function canAccessResource(resource: any, userDetails: UserDetails | null, userRole?: string): boolean {
  if (userRole === 'Admin' || userRole === 'Trainer') return true;

  const visibleTo = resource.visibleTo || ['public']; // Default to public if missing

  // 1. Public Access
  if (visibleTo.includes('public')) return true;

  // 2. Role-based shortcuts
  if (visibleTo.includes('allSupervision') && userDetails?.supervisionGroupId) return true;
  if (visibleTo.includes('allTraining') && userDetails?.enrolledCourseId) return true;

  // 3. Specific Group ID Access
  if (userDetails?.supervisionGroupId && visibleTo.includes(userDetails.supervisionGroupId)) return true;
  if (userDetails?.enrolledCourseId && visibleTo.includes(userDetails.enrolledCourseId)) return true;

  return false;
}
