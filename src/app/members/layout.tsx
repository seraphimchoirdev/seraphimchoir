/**
 * 기존 /members 경로 호환성을 위한 레이아웃
 * 실제 컨텐츠는 /management/members로 이동됨
 */
export default function MembersRedirectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
