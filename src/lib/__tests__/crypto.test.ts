/**
 * src/lib/crypto.ts 암호화 유틸 테스트
 *
 * AES-256-GCM 암호화/복호화 라운드트립 및 엣지 케이스 검증
 */
import {
  decryptConductorNotes,
  encryptConductorNotes,
  generateEncryptionKey,
  validateEncryptionKey,
} from '../crypto';

// 테스트용 유효한 256비트(64자리 hex) 키
const VALID_KEY = 'a'.repeat(64);

describe('generateEncryptionKey', () => {
  it('64자리 16진수 키를 생성한다', () => {
    const key = generateEncryptionKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('호출할 때마다 다른 키를 생성한다', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    expect(key1).not.toBe(key2);
  });
});

describe('validateEncryptionKey', () => {
  const originalEnv = process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY;
    }
  });

  it('유효한 키가 설정되면 true', () => {
    process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY = VALID_KEY;
    expect(validateEncryptionKey()).toBe(true);
  });

  it('환경변수 없으면 false', () => {
    delete process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY;
    expect(validateEncryptionKey()).toBe(false);
  });

  it('잘못된 길이의 키면 false', () => {
    process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY = 'shortkey';
    expect(validateEncryptionKey()).toBe(false);
  });
});

describe('encryptConductorNotes / decryptConductorNotes', () => {
  const originalEnv = process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY;
    }
  });

  it('빈 문자열 암호화 → 빈 결과 반환', () => {
    const result = encryptConductorNotes('');
    expect(result).toEqual({ encryptedText: '', iv: '', authTag: '' });
  });

  it('빈 값 복호화 → 빈 문자열 반환', () => {
    expect(decryptConductorNotes('', '', '')).toBe('');
  });

  it('정상 암호화 후 iv와 authTag가 포함된다', () => {
    const { encryptedText, iv, authTag } = encryptConductorNotes('테스트 메모');
    expect(encryptedText).toBeTruthy();
    expect(iv).toBeTruthy();
    expect(authTag).toBeTruthy();
    // iv는 12바이트 = 24자리 hex
    expect(iv).toHaveLength(24);
  });

  it('암호화 → 복호화 라운드트립 성공', () => {
    const plainText = '지휘자 메모: 이번 주 소프라노 파트에 집중합시다.';
    const { encryptedText, iv, authTag } = encryptConductorNotes(plainText);
    const decrypted = decryptConductorNotes(encryptedText, iv, authTag);
    expect(decrypted).toBe(plainText);
  });

  it('같은 평문이라도 암호화 결과가 다르다 (랜덤 IV)', () => {
    const plainText = '동일한 메모';
    const result1 = encryptConductorNotes(plainText);
    const result2 = encryptConductorNotes(plainText);
    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.encryptedText).not.toBe(result2.encryptedText);
  });

  it('잘못된 키로 복호화 시 에러', () => {
    const { encryptedText, iv, authTag } = encryptConductorNotes('비밀 메모');

    // 다른 키로 복호화 시도
    process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY = 'b'.repeat(64);

    expect(() => decryptConductorNotes(encryptedText, iv, authTag)).toThrow(
      '지휘자 메모 복호화에 실패했습니다'
    );
  });

  it('손상된 암호문으로 복호화 시 에러', () => {
    const { iv, authTag } = encryptConductorNotes('원본 메모');
    const corruptedText = 'ff'.repeat(20);

    expect(() => decryptConductorNotes(corruptedText, iv, authTag)).toThrow(
      '지휘자 메모 복호화에 실패했습니다'
    );
  });

  it('환경변수 없이 암호화 시도하면 에러', () => {
    delete process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY;

    expect(() => encryptConductorNotes('메모')).toThrow('지휘자 메모 암호화에 실패했습니다');
  });
});
