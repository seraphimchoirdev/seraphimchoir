import { redirect } from 'next/navigation';

export default async function MemberDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/management/members/${id}`);
}
