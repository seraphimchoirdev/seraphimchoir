import { redirect } from 'next/navigation';

/**
 * 기존 /documents 경로를 /management/documents로 리다이렉트
 * SEO를 위해 301 영구 리다이렉트 사용
 */
export default function DocumentsRedirectPage() {
  redirect('/management/documents');
}
