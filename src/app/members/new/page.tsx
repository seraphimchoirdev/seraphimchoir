import { redirect } from 'next/navigation';

export default function NewMemberRedirectPage() {
  redirect('/management/members/new');
}
