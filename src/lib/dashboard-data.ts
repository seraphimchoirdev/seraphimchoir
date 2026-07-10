import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type DashboardContext,
  determineTimeContext,
  formatDate,
  getDayOfWeek,
  getNextSunday,
  isToday,
} from '@/lib/dashboard-context';
import type { MyDashboardStatusResponse, MyVote, MySeat } from '@/app/api/dashboard/my-status/route';
import type { ConductorStatusResponse, AttendanceSummaryItem } from '@/app/api/dashboard/conductor-status/route';
import type { PendingApprovalsResponse, PendingApproval } from '@/app/api/dashboard/pending-approvals/route';
import type { ArrangementStatus } from '@/types';

interface UserProfile {
  id: string;
  role: string | null;
  linked_member_id: string | null;
  link_status: 'pending' | 'approved' | 'rejected' | null;
}

/**
 * 대시보드 컨텍스트 데이터를 서버에서 직접 페칭합니다.
 * 기존 /api/dashboard/context 의 로직을 추출한 것입니다.
 */
export async function fetchDashboardContext(
  adminSupabase: SupabaseClient,
  profile: UserProfile
): Promise<DashboardContext> {
  const linkedMemberId = profile.linked_member_id;
  const isLinked = !!linkedMemberId && profile.link_status === 'approved';

  const nextSunday = getNextSunday();

  const [serviceSchedulesResult, voteDeadlineResult, attendanceResult, arrangementResult] =
    await Promise.all([
      adminSupabase
        .from('service_schedules')
        .select('*')
        .eq('date', nextSunday)
        .order('service_start_time', { ascending: true, nullsFirst: false }),

      adminSupabase
        .from('attendance_vote_deadlines')
        .select('deadline_at')
        .eq('service_date', nextSunday)
        .maybeSingle(),

      isLinked && linkedMemberId
        ? adminSupabase
            .from('attendances')
            .select('id')
            .eq('member_id', linkedMemberId)
            .eq('date', nextSunday)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      adminSupabase
        .from('arrangements')
        .select('id, status')
        .eq('date', nextSunday)
        .maybeSingle(),
    ]);

  const serviceSchedules = serviceSchedulesResult.data;
  const serviceSchedule =
    serviceSchedules?.find((s: { service_type: string }) => s.service_type === '주일 2부 예배') ??
    serviceSchedules?.[0] ??
    null;

  const deadlineAt = voteDeadlineResult.data?.deadline_at || null;
  const isVotePassed = deadlineAt ? new Date(deadlineAt) < new Date() : true;
  const hasVoted = !!attendanceResult.data;

  const arrangement = arrangementResult.data;
  const hasArrangement = !!arrangement;
  const arrangementStatus = (arrangement?.status as 'DRAFT' | 'SHARED' | 'CONFIRMED') || null;

  const timeContext = determineTimeContext({
    hasVoted,
    isVotePassed,
    hasArrangement,
    arrangementStatus,
    isServiceDay: isToday(nextSunday),
    hasUpcomingService: true,
  });

  let voteDeadlineDisplay: string | null = null;
  if (deadlineAt) {
    const deadline = new Date(deadlineAt);
    const dayOfWeek = getDayOfWeek(formatDate(deadline)).slice(0, 1);
    const hours = deadline.getHours();
    const minutes = deadline.getMinutes().toString().padStart(2, '0');
    voteDeadlineDisplay = `${dayOfWeek}요일 ${hours}:${minutes}`;
  }

  return {
    timeContext,
    nextServiceDate: nextSunday,
    nextServiceInfo: {
      date: nextSunday,
      dayOfWeek: getDayOfWeek(nextSunday),
      serviceType: serviceSchedule?.service_type || null,
      hymnName: serviceSchedule?.hymn_name || null,
      hoodColor: serviceSchedule?.hood_color || null,
      serviceStartTime: serviceSchedule?.service_start_time || null,
      prePracticeStartTime: serviceSchedule?.pre_practice_start_time || null,
    },
    voteDeadline: deadlineAt,
    voteDeadlineDisplay,
    isVotePassed,
    hasArrangement,
    arrangementStatus,
  };
}

/**
 * 대원용 대시보드 상태를 서버에서 직접 페칭합니다.
 * 기존 /api/dashboard/my-status 의 로직을 추출한 것입니다.
 */
export async function fetchMyDashboardStatus(
  adminSupabase: SupabaseClient,
  profile: UserProfile
): Promise<MyDashboardStatusResponse> {
  const linkedMemberId = profile.linked_member_id;
  const linkStatus = profile.link_status;
  const userRole = profile.role;
  const isLinked = !!linkedMemberId && linkStatus === 'approved';
  const hasStaffRole = !!userRole && ['ADMIN', 'CONDUCTOR', 'MANAGER'].includes(userRole);

  const nextSunday = getNextSunday();

  if (!isLinked && !hasStaffRole) {
    return {
      isLinked: false,
      linkStatus,
      linkedMemberName: null,
      linkedMemberPart: null,
      myVote: null,
      mySeat: null,
      nextServiceDate: nextSunday,
    };
  }

  if (!linkedMemberId) {
    return {
      isLinked: true,
      linkStatus,
      linkedMemberName: profile.role || null,
      linkedMemberPart: null,
      myVote: null,
      mySeat: null,
      nextServiceDate: nextSunday,
    };
  }

  const [memberResult, attendanceResult, arrangementResult] = await Promise.all([
    adminSupabase.from('members').select('name, part').eq('id', linkedMemberId).single(),

    adminSupabase
      .from('attendances')
      .select('date, is_service_available, notes')
      .eq('member_id', linkedMemberId)
      .eq('date', nextSunday)
      .maybeSingle(),

    adminSupabase
      .from('arrangements')
      .select('id, date, status')
      .eq('date', nextSunday)
      .in('status', ['SHARED', 'CONFIRMED'])
      .maybeSingle(),
  ]);

  const member = memberResult.data;

  const myVote: MyVote | null = attendanceResult.data
    ? {
        date: attendanceResult.data.date,
        isAvailable: attendanceResult.data.is_service_available,
        notes: attendanceResult.data.notes,
      }
    : null;

  let mySeat: MySeat | null = null;
  const arrangement = arrangementResult.data;

  if (arrangement) {
    const { data: seat } = await adminSupabase
      .from('seats')
      .select('seat_row, seat_column, is_row_leader')
      .eq('arrangement_id', arrangement.id)
      .eq('member_id', linkedMemberId)
      .maybeSingle();

    if (seat) {
      mySeat = {
        arrangementId: arrangement.id,
        arrangementDate: arrangement.date,
        arrangementStatus: arrangement.status as ArrangementStatus | null,
        row: seat.seat_row,
        column: seat.seat_column,
        isRowLeader: seat.is_row_leader || false,
      };
    }
  }

  return {
    isLinked: true,
    linkStatus,
    linkedMemberName: member?.name || null,
    linkedMemberPart: member?.part || null,
    myVote,
    mySeat,
    nextServiceDate: nextSunday,
  };
}

/**
 * 지휘자용 대시보드 상태를 서버에서 직접 페칭합니다.
 * 기존 /api/dashboard/conductor-status 의 로직을 추출한 것입니다.
 */
export async function fetchConductorStatus(
  adminSupabase: SupabaseClient
): Promise<ConductorStatusResponse> {
  const nextSunday = getNextSunday();

  const [arrangementResult, activeMembersResult, attendancesResult, serviceSchedulesResult] = await Promise.all([
    adminSupabase
      .from('arrangements')
      .select('id, date, title, status')
      .eq('date', nextSunday)
      .maybeSingle()
      .then(async ({ data: nextArrangement }) => {
        if (nextArrangement) return nextArrangement;
        const { data: latestArrangement } = await adminSupabase
          .from('arrangements')
          .select('id, date, title, status')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        return latestArrangement;
      }),

    adminSupabase
      .from('members')
      .select('id, part')
      .in('member_status', ['REGULAR', 'NEW'])
      .eq('is_singer', true),

    adminSupabase
      .from('attendances')
      .select('member_id, is_service_available, service_schedule_id')
      .eq('date', nextSunday),

    adminSupabase
      .from('service_schedules')
      .select('id, service_type, service_start_time')
      .eq('date', nextSunday)
      .order('service_start_time', { ascending: true }),
  ]);

  const arrangement = arrangementResult;
  const { data: activeMembers } = activeMembersResult;
  const { data: attendances } = attendancesResult;
  const { data: serviceSchedules } = serviceSchedulesResult;

  let seatCount = 0;
  let hasRowLeaders = false;

  if (arrangement) {
    const { data: seats } = await adminSupabase
      .from('seats')
      .select('id, is_row_leader')
      .eq('arrangement_id', arrangement.id);

    seatCount = seats?.length || 0;
    hasRowLeaders = seats?.some((s: { is_row_leader: boolean | null }) => s.is_row_leader) || false;
  }

  const parts = ['SOPRANO', 'ALTO', 'TENOR', 'BASS'];
  const totalMembers = activeMembers?.length || 0;

  function aggregateAttendance(
    filteredAttendances: { member_id: string; is_service_available: boolean }[]
  ) {
    const attendanceMap = new Map(
      filteredAttendances.map((a: { member_id: string; is_service_available: boolean }) => [a.member_id, a.is_service_available])
    );

    const partCounts: Record<
      string,
      { total: number; available: number; unavailable: number; noResponse: number }
    > = {};
    parts.forEach((part) => {
      partCounts[part] = { total: 0, available: 0, unavailable: 0, noResponse: 0 };
    });

    let totalAvailable = 0;
    let totalUnavailable = 0;

    activeMembers?.forEach((member: { id: string; part: string }) => {
      const part = member.part;
      if (!partCounts[part]) {
        partCounts[part] = { total: 0, available: 0, unavailable: 0, noResponse: 0 };
      }
      partCounts[part].total++;

      const isAvailable = attendanceMap.has(member.id)
        ? attendanceMap.get(member.id)
        : true;

      if (isAvailable) {
        partCounts[part].available++;
        totalAvailable++;
      } else {
        partCounts[part].unavailable++;
        totalUnavailable++;
      }
    });

    return {
      totalMembers,
      availableCount: totalAvailable,
      unavailableCount: totalUnavailable,
      noResponseCount: 0,
      byPart: parts.map((part) => ({
        part,
        total: partCounts[part]?.total || 0,
        available: partCounts[part]?.available || 0,
        unavailable: partCounts[part]?.unavailable || 0,
        noResponse: partCounts[part]?.noResponse || 0,
      })),
    };
  }

  const allAttendances = attendances || [];
  let attendanceSummaries: AttendanceSummaryItem[];

  if (serviceSchedules && serviceSchedules.length > 0) {
    attendanceSummaries = serviceSchedules.map((schedule: { id: string; service_type: string; service_start_time: string | null }) => {
      const filtered = allAttendances.filter(
        (a: { service_schedule_id: string | null }) => a.service_schedule_id === schedule.id || a.service_schedule_id === null
      );
      const agg = aggregateAttendance(filtered);
      return {
        serviceScheduleId: schedule.id,
        serviceType: schedule.service_type,
        serviceStartTime: schedule.service_start_time,
        ...agg,
      };
    });
  } else {
    const agg = aggregateAttendance(allAttendances);
    attendanceSummaries = [{
      serviceScheduleId: null,
      serviceType: '예배',
      serviceStartTime: null,
      ...agg,
    }];
  }

  const firstSummary = attendanceSummaries[0];

  return {
    latestArrangement: arrangement
      ? {
          id: arrangement.id,
          date: arrangement.date,
          title: arrangement.title,
          status: arrangement.status as ArrangementStatus | null,
          seatCount,
          hasRowLeaders,
        }
      : null,
    attendanceSummary: {
      totalMembers: firstSummary.totalMembers,
      availableCount: firstSummary.availableCount,
      unavailableCount: firstSummary.unavailableCount,
      noResponseCount: firstSummary.noResponseCount,
      byPart: firstSummary.byPart,
    },
    attendanceSummaries,
    nextServiceDate: nextSunday,
  };
}

/**
 * 승인 대기 건을 서버에서 직접 페칭합니다.
 * 기존 /api/dashboard/pending-approvals 의 로직을 추출한 것입니다.
 */
export async function fetchPendingApprovals(
  adminSupabase: SupabaseClient
): Promise<PendingApprovalsResponse> {
  const { data: pendingProfiles, error: profilesError } = await adminSupabase
    .from('user_profiles')
    .select('id, name, email, linked_member_id, link_requested_at')
    .eq('link_status', 'pending')
    .not('linked_member_id', 'is', null)
    .order('link_requested_at', { ascending: true });

  if (profilesError) throw profilesError;

  const memberIds = pendingProfiles?.map((p: { linked_member_id: string | null }) => p.linked_member_id).filter(Boolean) || [];
  let membersMap: Map<string, { name: string; part: string }> = new Map();

  if (memberIds.length > 0) {
    const { data: members } = await adminSupabase
      .from('members')
      .select('id, name, part')
      .in('id', memberIds);

    if (members) {
      membersMap = new Map(members.map((m: { id: string; name: string; part: string }) => [m.id, { name: m.name, part: m.part }]));
    }
  }

  const pendingApprovals: PendingApproval[] =
    pendingProfiles?.map((p: { id: string; name: string; email: string; linked_member_id: string | null; link_requested_at: string | null }) => {
      const member = membersMap.get(p.linked_member_id!);
      return {
        userId: p.id,
        userName: p.name,
        userEmail: p.email,
        requestedMemberId: p.linked_member_id!,
        requestedMemberName: member?.name || '알 수 없음',
        requestedMemberPart: member?.part || '',
        requestedAt: p.link_requested_at || '',
      };
    }) || [];

  return {
    pendingApprovals,
    totalCount: pendingApprovals.length,
  };
}
