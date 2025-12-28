import crypto from 'crypto';

/**
 * AES-256-GCM 암호화를 사용한 지휘자 메모 암호화/복호화 유틸리티
 *
 * 주요 특징:
 * - AES-256-GCM: 강력한 암호화 및 무결성 검증
 * - 환경 변수로 마스터 키 관리
 * - IV(Initialization Vector)를 DB에 저장하여 복호화 시 사용
 * - ADMIN도 DB에서 평문을 확인할 수 없음
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

/**
 * 환경 변수에서 암호화 키 가져오기
 * 없으면 에러를 발생시킵니다.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CONDUCTOR_NOTES_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'CONDUCTOR_NOTES_ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다. ' +
      '.env 파일에 64자리 16진수 키를 설정하세요.'
    );
  }

  // 16진수 문자열을 Buffer로 변환
  const keyBuffer = Buffer.from(key, 'hex');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `암호화 키는 ${KEY_LENGTH}바이트(64자리 16진수)여야 합니다. ` +
      `현재: ${keyBuffer.length}바이트`
    );
  }

  return keyBuffer;
}

/**
 * 텍스트를 암호화합니다.
 *
 * @param plainText - 암호화할 평문
 * @returns { encryptedText, iv, authTag } - 암호화된 텍스트, IV, 인증 태그
 */
export function encryptConductorNotes(plainText: string): {
  encryptedText: string;
  iv: string;
  authTag: string;
} {
  if (!plainText) {
    return { encryptedText: '', iv: '', authTag: '' };
  }

  try {
    const key = getEncryptionKey();

    // 랜덤 IV 생성 (12바이트 = 96비트, GCM 권장 크기)
    const iv = crypto.randomBytes(12);

    // 암호화 객체 생성
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 암호화 수행
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 인증 태그 가져오기 (GCM 모드에서 무결성 검증용)
    const authTag = cipher.getAuthTag();

    return {
      encryptedText: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    console.error('암호화 중 오류 발생:', error);
    throw new Error('지휘자 메모 암호화에 실패했습니다.');
  }
}

/**
 * 암호화된 텍스트를 복호화합니다.
 *
 * @param encryptedText - 암호화된 텍스트
 * @param iv - Initialization Vector
 * @param authTag - 인증 태그
 * @returns 복호화된 평문
 */
export function decryptConductorNotes(
  encryptedText: string,
  iv: string,
  authTag: string
): string {
  if (!encryptedText || !iv || !authTag) {
    return '';
  }

  try {
    const key = getEncryptionKey();

    // 16진수 문자열을 Buffer로 변환
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');

    // 복호화 객체 생성
    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);

    // 인증 태그 설정 (무결성 검증)
    decipher.setAuthTag(authTagBuffer);

    // 복호화 수행
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('복호화 중 오류 발생:', error);
    throw new Error('지휘자 메모 복호화에 실패했습니다. 데이터가 손상되었을 수 있습니다.');
  }
}

/**
 * 암호화 키 생성 헬퍼 함수
 * 개발 시 새로운 키를 생성할 때 사용
 *
 * @returns 64자리 16진수 암호화 키
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * 암호화 키가 올바르게 설정되었는지 확인
 */
export function validateEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
