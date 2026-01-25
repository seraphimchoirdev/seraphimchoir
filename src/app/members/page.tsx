import { redirect } from 'next/navigation';

/**
 * /members → /management/members 리다이렉트
 * 기존 URL 호환성을 위해 유지
 */
export default function MembersRedirectPage() {
  redirect('/management/members');
}
