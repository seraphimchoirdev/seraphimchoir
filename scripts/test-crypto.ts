/**
 * 암호화/복호화 기능 테스트 스크립트
 *
 * 사용법:
 * npx tsx scripts/test-crypto.ts
 */

import 'dotenv/config';
import {
  encryptConductorNotes,
  decryptConductorNotes,
  validateEncryptionKey,
} from '../src/lib/crypto';

console.log('=== 지휘자 메모 암호화 기능 테스트 ===\n');

// 1. 암호화 키 검증
console.log('1. 암호화 키 검증...');
const isKeyValid = validateEncryptionKey();
if (!isKeyValid) {
  console.error('❌ 암호화 키가 설정되지 않았거나 올바르지 않습니다.');
  console.error('   .env 파일에 CONDUCTOR_NOTES_ENCRYPTION_KEY를 설정하세요.');
  process.exit(1);
}
console.log('✅ 암호화 키가 올바르게 설정되었습니다.\n');

// 2. 암호화 테스트
console.log('2. 암호화 테스트...');
const testMessage = '이 찬양대원은 높은 음역대에서 안정적입니다. 주요 솔로 파트에 적합합니다.';
console.log(`원본 메시지: "${testMessage}"`);

let encrypted;
try {
  encrypted = encryptConductorNotes(testMessage);
  console.log(`암호화된 텍스트: ${encrypted.encryptedText.substring(0, 50)}...`);
  console.log(`IV: ${encrypted.iv}`);
  console.log(`Auth Tag: ${encrypted.authTag}`);
  console.log('✅ 암호화 성공\n');
} catch (error) {
  console.error('❌ 암호화 실패:', error);
  process.exit(1);
}

// 3. 복호화 테스트
console.log('3. 복호화 테스트...');
try {
  const decrypted = decryptConductorNotes(
    encrypted.encryptedText,
    encrypted.iv,
    encrypted.authTag
  );
  console.log(`복호화된 메시지: "${decrypted}"`);

  if (decrypted === testMessage) {
    console.log('✅ 복호화 성공 - 원본과 일치\n');
  } else {
    console.error('❌ 복호화 실패 - 원본과 불일치');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ 복호화 실패:', error);
  process.exit(1);
}

// 4. 잘못된 데이터로 복호화 시도 (보안 검증)
console.log('4. 보안 검증 (잘못된 데이터 복호화 시도)...');
try {
  // IV를 변조하여 복호화 시도
  const tamperedIv = encrypted.iv.replace(/./g, '0');
  decryptConductorNotes(encrypted.encryptedText, tamperedIv, encrypted.authTag);
  console.error('❌ 보안 검증 실패 - 변조된 데이터가 복호화됨');
  process.exit(1);
} catch (error) {
  console.log('✅ 보안 검증 성공 - 변조된 데이터 감지\n');
}

// 5. 빈 문자열 처리
console.log('5. 빈 문자열 처리 테스트...');
const emptyEncrypted = encryptConductorNotes('');
if (
  emptyEncrypted.encryptedText === '' &&
  emptyEncrypted.iv === '' &&
  emptyEncrypted.authTag === ''
) {
  console.log('✅ 빈 문자열 처리 성공\n');
} else {
  console.error('❌ 빈 문자열 처리 실패');
  process.exit(1);
}

console.log('=== 모든 테스트 통과! ===');
console.log('\n다음 단계:');
console.log('1. Supabase 마이그레이션 실행: npx supabase db reset (로컬) 또는 npx supabase db push (원격)');
console.log('2. 개발 서버 시작: npm run dev');
console.log('3. 찬양대원 상세 페이지에서 지휘자 메모 기능 테스트');
