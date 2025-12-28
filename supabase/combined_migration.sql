-- ============================================
-- 찬양대 자리배치 시스템 - 전체 마이그레이션
-- Supabase Dashboard SQL Editor에서 실행하세요
-- ============================================

-- 이 파일은 모든 마이그레이션을 순서대로 포함합니다:
-- 1. 20250118000000_initial_schema.sql - 초기 스키마
-- 2. 20250119000000_add_member_status.sql - 멤버 상태 추가
-- 3. 20250119020000_fix_rls_infinite_recursion.sql - RLS 무한 재귀 수정
-- 4. 20250119030000_setup_storage_buckets.sql - Storage 버킷 설정

-- Supabase Dashboard > SQL Editor에서 이 파일 전체를 복사하여 실행하세요.
-- URL: https://supabase.com/dashboard/project/gjxvxcqujimkalloedbe/sql/new

-- ============================================
-- MIGRATION 1: Initial Schema
-- ============================================
