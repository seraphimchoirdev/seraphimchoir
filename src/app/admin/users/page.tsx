'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Search,
  UserCog,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { UserRole, RoleLabels } from '@/app/api/auth/types';

interface UserProfileWithMember {
  id: string;
  email: string;
  name: string;
  role: UserRole | null;
  title: string | null;
  linked_member_id: string | null;
  link_status: string | null;
  created_at: string;
  member?: {
    name: string;
    part: string;
  } | null;
}

const ROLES: UserRole[] = ['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF', 'PART_LEADER', 'MEMBER'];

const COMMON_TITLES = [
  '총무', '부총무', '대장', '회계', '부회계', '서기', '부서기',
  '악보계', '후원회장', '후원회계', '소프라노 부대장', '알토 부대장',
  '테너 부대장', '베이스 부대장',
];

export default function UsersPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  // 사용자 목록 조회
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', searchQuery, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          name,
          role,
          title,
          linked_member_id,
          link_status,
          created_at,
          member:members!linked_member_id (
            name,
            part
          )
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      if (roleFilter) {
        if (roleFilter === 'NULL') {
          query = query.is('role', null);
        } else {
          query = query.eq('role', roleFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      // Supabase는 관계가 배열로 반환될 수 있음 - 첫 번째 요소만 사용
      return (data || []).map((item) => ({
        ...item,
        member: Array.isArray(item.member) ? item.member[0] || null : item.member,
      })) as UserProfileWithMember[];
    },
  });

  // 역할 업데이트
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
      title,
    }: {
      userId: string;
      role: UserRole | null;
      title: string | null;
    }) => {
      const response = await fetch('/api/auth/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, title }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '역할 업데이트 실패');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'role-stats'] });
      setEditingUserId(null);
    },
  });

  const startEditing = (user: UserProfileWithMember) => {
    setEditingUserId(user.id);
    setEditRole(user.role as UserRole | null);
    setEditTitle(user.title || '');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditRole(null);
    setEditTitle('');
  };

  const saveChanges = async (userId: string) => {
    await updateRoleMutation.mutateAsync({
      userId,
      role: editRole,
      title: editTitle || null,
    });
  };

  const getPartLabel = (part: string | undefined) => {
    const labels: Record<string, string> = {
      SOPRANO: '소프라노',
      ALTO: '알토',
      TENOR: '테너',
      BASS: '베이스',
      SPECIAL: '특별',
    };
    return part ? labels[part] || part : '';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          사용자 관리
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          사용자의 역할과 직책을 설정하고 관리합니다.
        </p>
      </div>

      {/* 필터 */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름 또는 이메일로 검색..."
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]"
        >
          <option value="">전체 역할</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {RoleLabels[role]}
            </option>
          ))}
          <option value="NULL">미지정</option>
        </select>
      </div>

      {/* 에러 표시 */}
      {error && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>
            데이터를 불러오는 중 오류가 발생했습니다.
          </AlertDescription>
        </Alert>
      )}

      {updateRoleMutation.error && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>
            {updateRoleMutation.error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      )}

      {/* 사용자 목록 */}
      {!isLoading && users && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-background-secondary)]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                    사용자
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                    연결된 대원
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                    역할
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                    직책
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {user.name}
                          </p>
                          <p className="text-sm text-[var(--color-text-tertiary)]">
                            {user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.member ? (
                          <div>
                            <p className="text-[var(--color-text-primary)]">
                              {user.member.name}
                            </p>
                            <p className="text-sm text-[var(--color-text-tertiary)]">
                              {getPartLabel(user.member.part)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-tertiary)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingUserId === user.id ? (
                          <select
                            value={editRole || ''}
                            onChange={(e) => setEditRole(e.target.value as UserRole || null)}
                            className="px-2 py-1 border border-[var(--color-border)] rounded text-sm bg-[var(--color-surface)]"
                          >
                            <option value="">미지정</option>
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {RoleLabels[role]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              user.role
                                ? 'bg-[var(--color-primary-50)] text-[var(--color-primary)]'
                                : 'bg-[var(--color-background-tertiary)] text-[var(--color-text-tertiary)]'
                            }`}
                          >
                            {user.role ? RoleLabels[user.role as UserRole] : '미지정'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingUserId === user.id ? (
                          <div className="relative">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="직책 입력"
                              list="title-suggestions"
                              className="text-sm h-8"
                            />
                            <datalist id="title-suggestions">
                              {COMMON_TITLES.map((title) => (
                                <option key={title} value={title} />
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-primary)]">
                            {user.title || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingUserId === user.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              disabled={updateRoleMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveChanges(user.id)}
                              disabled={updateRoleMutation.isPending}
                            >
                              {updateRoleMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(user)}
                          >
                            편집
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
