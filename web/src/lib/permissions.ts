import { useAuthStore } from '@/store/auth';
import type { Role } from '@/types';

/** Role hierarchy weights — mirrors the backend ROLE_RANK. */
const RANK: Record<string, number> = {
  admin: 100,
  cto: 90,
  head_of_engineering: 80,
  engineering_manager: 60,
  engineer: 30,
  viewer: 10,
};

/** True if the signed-in user's role rank meets or exceeds `minRole`. */
export function useCan(minRole: Role): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return (role ? RANK[role] ?? 0 : 0) >= (RANK[minRole] ?? 999);
}
