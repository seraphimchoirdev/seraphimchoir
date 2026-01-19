#!/usr/bin/env tsx
/**
 * Redis 연결 확인 스크립트
 *
 * 사용법: npm run check:redis
 */

import { checkRedisConnection, validateRateLimitingForProduction } from '../src/lib/security/rate-limiter';
import { config } from 'dotenv';

// 환경변수 로드
config();

async function main() {
  console.log('🔍 Redis 연결 상태 확인 중...\n');

  // 환경변수 확인
  console.log('📋 환경변수 상태:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   UPSTASH_REDIS_REST_URL: ${process.env.UPSTASH_REDIS_REST_URL ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(`   UPSTASH_REDIS_REST_TOKEN: ${process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ 설정됨' : '❌ 없음'}\n`);

  // Redis 연결 테스트
  const status = await checkRedisConnection();

  console.log('🔗 연결 테스트 결과:');
  console.log(`   연결 상태: ${status.isConnected ? '✅ 연결됨' : '❌ 연결 실패'}`);
  console.log(`   환경: ${status.isProduction ? '프로덕션' : '개발'}`);

  if (status.error) {
    console.log(`   에러: ${status.error}`);
  }

  console.log();

  // 프로덕션 검증
  if (status.isProduction) {
    console.log('🚀 프로덕션 환경 검증 중...');
    try {
      await validateRateLimitingForProduction();
      console.log('   ✅ 프로덕션 Rate Limiting 검증 통과\n');
    } catch (error) {
      console.error('   ❌ 프로덕션 검증 실패:', error.message);
      process.exit(1);
    }
  } else {
    console.log('💡 개발 환경에서는 Rate Limiting이 선택사항입니다.\n');
  }

  // Rate Limit 테스트 (선택적)
  if (status.isConnected) {
    console.log('📊 Rate Limit 테스트:');
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      // 테스트 키로 카운터 증가
      const testKey = 'test:rate-limit:check';
      const count = await redis.incr(testKey);
      await redis.expire(testKey, 10); // 10초 후 자동 삭제

      console.log(`   ✅ Rate Limit 카운터 작동 중 (테스트 값: ${count})`);
      console.log('   ✅ Redis가 정상적으로 작동합니다!\n');
    } catch (error) {
      console.error('   ❌ Rate Limit 테스트 실패:', error);
    }
  }

  // 권장사항
  console.log('📝 권장사항:');
  if (!status.isConnected && status.isProduction) {
    console.log('   1. Upstash Console에서 Redis 데이터베이스를 생성하세요');
    console.log('   2. REST URL과 Token을 .env 파일에 추가하세요');
    console.log('   3. Vercel 환경변수에도 추가하세요');
  } else if (status.isConnected) {
    console.log('   ✅ Redis가 정상적으로 설정되었습니다!');
    console.log('   프로덕션 배포 준비가 완료되었습니다.');
  } else {
    console.log('   개발 환경에서는 Rate Limiting이 자동으로 비활성화됩니다.');
    console.log('   프로덕션 배포 전에는 반드시 Redis를 설정하세요.');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ 스크립트 실행 중 오류:', error);
  process.exit(1);
});