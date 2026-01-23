import { redirect } from 'next/navigation';

/**
 * 기존 /statistics 경로를 /management/statistics로 리다이렉트
 * SEO를 위해 301 영구 리다이렉트 사용
 */
export default function StatisticsRedirectPage() {
  redirect('/management/statistics');
}
