import { redirect } from 'next/navigation';

export default function SignupBuyerPage() {
  redirect('/signup?role=buyer');
}
