import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { contributionsService } from '../services/contributions.service';
import type { MemberRow } from '../types/contribution';

interface FinanceAccess {
  isValidator: boolean;
  member: MemberRow | null;
  members: MemberRow[];
  loading: boolean;
}

export function useFinanceAccess(): FinanceAccess {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    contributionsService
      .members()
      .then((data) => {
        if (!cancelled) setMembers(data);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const member =
    members.find(
      (item) =>
        item.userId === user?.id || item.email.toLowerCase() === user?.email.toLowerCase(),
    ) ?? null;

  return {
    isValidator: Boolean(member?.canValidate && member.status === 'ACTIVE'),
    member,
    members,
    loading,
  };
}
