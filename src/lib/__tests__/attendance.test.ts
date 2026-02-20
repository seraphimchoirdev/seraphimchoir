import {
  validateAttendanceData,
  generateAttendanceTemplate,
  convertToAttendanceInserts,
  downloadCSV,
  parseAttendanceCSV,
  type ParsedAttendance,
  type MemberInfo,
} from '../attendance';

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

    it('빈 배열 → 빈 배열', () => {
      const inserts = convertToAttendanceInserts([]);
      expect(inserts).toEqual([]);
    });

    it('notes가 없으면 null로 변환', () => {
      const data: ParsedAttendance[] = [
        {
          member_id: 'member-1',
          date: '2026-02-16',
          is_available: true,
          valid: true,
        },
      ];

      const inserts = convertToAttendanceInserts(data);
      expect(inserts[0].notes).toBeNull();
    });
  });

  describe('downloadCSV', () => {
    let createElementSpy: jest.SpyInstance;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;
    let createObjectURLSpy: jest.SpyInstance;
    let revokeObjectURLSpy: jest.SpyInstance;

    beforeEach(() => {
      const mockLink = {
        setAttribute: jest.fn(),
        click: jest.fn(),
        style: {} as CSSStyleDeclaration,
      };

      createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
      appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
      createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation();
    });

    afterEach(() => {
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('BOM 포함 Blob 생성', () => {
      downloadCSV('test,content', 'test.csv');

      expect(createObjectURLSpy).toHaveBeenCalled();
      const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv;charset=utf-8;');
    });

    it('올바른 filename 설정', () => {
      downloadCSV('data', 'export_2026.csv');

      const mockLink = createElementSpy.mock.results[0].value;
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'export_2026.csv');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:test-url');
    });

    it('링크 생성 후 클릭 트리거 및 정리', () => {
      downloadCSV('data', 'test.csv');

      const mockLink = createElementSpy.mock.results[0].value;
      expect(appendChildSpy).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');
    });
  });

  describe('parseAttendanceCSV', () => {
    function createCSVFile(content: string, name = 'test.csv', type = 'text/csv'): File {
      return new File([content], name, { type });
    }

    it('정상 CSV 파싱', async () => {
      const csv = 'member_id,date,is_available\nmember-1,2026-02-16,true\nmember-2,2026-02-16,false';
      const file = createCSVFile(csv);

      const result = await parseAttendanceCSV(file);
      expect(result).toHaveLength(2);
      expect(result[0].member_id).toBe('member-1');
      expect(result[0].is_available).toBe(true);
      expect(result[0].valid).toBe(true);
      expect(result[1].is_available).toBe(false);
    });

    it('파일 크기 초과 → 에러', async () => {
      // 5MB 초과 파일 생성 (5MB + 1 byte)
      const bigContent = 'x'.repeat(5 * 1024 * 1024 + 1);
      const file = createCSVFile(bigContent);

      await expect(parseAttendanceCSV(file)).rejects.toThrow('파일 크기는 5MB를 초과할 수 없습니다');
    });

    it('CSV가 아닌 파일 → 에러', async () => {
      const file = new File(['data'], 'test.txt', { type: 'text/plain' });

      await expect(parseAttendanceCSV(file)).rejects.toThrow('CSV 파일만 업로드 가능합니다');
    });

    it('한국어 is_available 값 처리 (참석/불참)', async () => {
      const csv = 'member_id,date,is_available\nmember-1,2026-02-16,참석\nmember-2,2026-02-16,불참';
      const file = createCSVFile(csv);

      const result = await parseAttendanceCSV(file);
      expect(result[0].is_available).toBe(true);
      expect(result[1].is_available).toBe(false);
    });

    it('필수 필드 누락 시 에러 표시', async () => {
      const csv = 'member_id,date,is_available\n,2026-02-16,true';
      const file = createCSVFile(csv);

      const result = await parseAttendanceCSV(file);
      expect(result[0].valid).toBe(false);
      expect(result[0].errors).toContain('member_id 또는 member_name이 필요합니다');
    });

    it('잘못된 날짜 형식 에러', async () => {
      const csv = 'member_id,date,is_available\nmember-1,2026/02/16,true';
      const file = createCSVFile(csv);

      const result = await parseAttendanceCSV(file);
      expect(result[0].valid).toBe(false);
      expect(result[0].errors).toContain('날짜 형식은 YYYY-MM-DD여야 합니다');
    });

    it('o/x 값 처리', async () => {
      const csv = 'member_id,date,is_available\nmember-1,2026-02-16,o\nmember-2,2026-02-16,x';
      const file = createCSVFile(csv);

      const result = await parseAttendanceCSV(file);
      expect(result[0].is_available).toBe(true);
      expect(result[1].is_available).toBe(false);
    });
  });
});
