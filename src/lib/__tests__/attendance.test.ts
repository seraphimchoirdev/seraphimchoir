import {
  validateAttendanceData,
  generateAttendanceTemplate,
  convertToAttendanceInserts,
  type ParsedAttendance,
  type MemberInfo,
} from '../attendance';

// parseAttendanceCSV는 File 객체와 papaparse가 필요하므로 제외
// (통합 테스트에서 다룰 예정)

const testMembers: MemberInfo[] = [
  { id: 'member-1', name: '김소프', part: 'SOPRANO' },
  { id: 'member-2', name: '이알토', part: 'ALTO' },
  { id: 'member-3', name: '박테너', part: 'TENOR' },
  { id: 'member-4', name: '최베이스', part: 'BASS' },
];

describe('attendance', () => {
  describe('validateAttendanceData', () => {
    it('유효한 데이터를 검증 통과시킨다', () => {
      const data: ParsedAttendance[] = [
        {
          member_id: 'member-1',
          member_name: '김소프',
          date: '2026-02-16',
          is_available: true,
          valid: true,
          rowIndex: 2,
        },
      ];

      const result = validateAttendanceData(data, testMembers);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0].valid).toBe(true);
    });

    it('존재하지 않는 member_id를 거부한다', () => {
      const data: ParsedAttendance[] = [
        {
          member_id: 'nonexistent',
          date: '2026-02-16',
          is_available: true,
          valid: true,
          rowIndex: 2,
        },
      ];

      const result = validateAttendanceData(data, testMembers);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('존재하지 않는 회원 ID');
    });

    it('이름으로 member_id를 찾는다', () => {
      const data: ParsedAttendance[] = [
        {
          member_name: '김소프',
          date: '2026-02-16',
          is_available: true,
          valid: true,
          rowIndex: 2,
        },
      ];

      const result = validateAttendanceData(data, testMembers);
      expect(result.valid).toBe(true);
      expect(result.data[0].member_id).toBe('member-1');
    });

    it('찾을 수 없는 이름을 에러 처리한다', () => {
      const data: ParsedAttendance[] = [
        {
          member_name: '없는사람',
          date: '2026-02-16',
          is_available: true,
          valid: true,
          rowIndex: 2,
        },
      ];

      const result = validateAttendanceData(data, testMembers);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('회원을 찾을 수 없습니다');
    });

    it('중복 출석 기록을 감지한다', () => {
      const data: ParsedAttendance[] = [
        {
          member_id: 'member-1',
          date: '2026-02-16',
          is_available: true,
          valid: true,
          rowIndex: 2,
        },
        {
          member_id: 'member-1',
          date: '2026-02-16',
          is_available: false,
          valid: true,
          rowIndex: 3,
        },
      ];

      const result = validateAttendanceData(data, testMembers);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('중복된 출석 기록'))).toBe(true);
    });

    it('이미 에러가 있는 데이터를 그대로 통과시킨다', () => {
      const data: ParsedAttendance[] = [
        {
          date: '',
          is_available: true,
          valid: false,
          errors: ['date가 필요합니다'],
          rowIndex: 2,
        },
      ];

      const result = validateAttendanceData(data, testMembers);
      expect(result.valid).toBe(false);
    });

    it('빈 데이터는 유효하다', () => {
      const result = validateAttendanceData([], testMembers);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('generateAttendanceTemplate', () => {
    it('CSV 헤더를 포함한다', () => {
      const csv = generateAttendanceTemplate(testMembers);
      const firstLine = csv.split('\n')[0];
      expect(firstLine).toBe('member_id,member_name,part,date,is_available,notes');
    });

    it('회원 수만큼 행을 생성한다', () => {
      const csv = generateAttendanceTemplate(testMembers);
      const lines = csv.split('\n');
      // 헤더 1줄 + 회원 4줄
      expect(lines).toHaveLength(5);
    });

    it('기본 날짜를 사용한다', () => {
      const csv = generateAttendanceTemplate(testMembers, '2026-03-01');
      expect(csv).toContain('2026-03-01');
    });

    it('기본값으로 참석(true)을 설정한다', () => {
      const csv = generateAttendanceTemplate(testMembers);
      const dataLines = csv.split('\n').slice(1);
      dataLines.forEach((line) => {
        expect(line).toContain('true');
      });
    });

    it('회원 정보를 올바르게 포함한다', () => {
      const csv = generateAttendanceTemplate(testMembers, '2026-03-01');
      expect(csv).toContain('member-1,김소프,SOPRANO');
      expect(csv).toContain('member-4,최베이스,BASS');
    });

    it('쉼표가 포함된 이름을 따옴표로 감싼다', () => {
      const members: MemberInfo[] = [{ id: 'm1', name: '김,소프', part: 'SOPRANO' }];
      const csv = generateAttendanceTemplate(members, '2026-03-01');
      expect(csv).toContain('"김,소프"');
    });
  });

  describe('convertToAttendanceInserts', () => {
    it('유효한 데이터만 변환한다', () => {
      const data: ParsedAttendance[] = [
        {
          member_id: 'member-1',
          date: '2026-02-16',
          is_available: true,
          valid: true,
        },
        {
          member_id: 'member-2',
          date: '2026-02-16',
          is_available: false,
          valid: false,
          errors: ['에러'],
        },
      ];

      const inserts = convertToAttendanceInserts(data);
      expect(inserts).toHaveLength(1);
      expect(inserts[0].member_id).toBe('member-1');
      expect(inserts[0].is_available).toBe(true);
    });

    it('member_id가 없는 데이터를 필터링한다', () => {
      const data: ParsedAttendance[] = [
        {
          member_name: '김소프',
          date: '2026-02-16',
          is_available: true,
          valid: true,
        },
      ];

      const inserts = convertToAttendanceInserts(data);
      expect(inserts).toHaveLength(0);
    });

    it('notes를 올바르게 처리한다', () => {
      const data: ParsedAttendance[] = [
        {
          member_id: 'member-1',
          date: '2026-02-16',
          is_available: true,
          notes: '지각 예정',
          valid: true,
        },
      ];

      const inserts = convertToAttendanceInserts(data);
      expect(inserts[0].notes).toBe('지각 예정');
    });
  });
});
