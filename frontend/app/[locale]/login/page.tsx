/**
 * Login page - redirects to home page with modal
 */

import { redirect } from 'next/navigation';

export default function LoginPage() {
  redirect('/');
}
