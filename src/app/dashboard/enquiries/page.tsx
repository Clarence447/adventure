import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/owner-auth';
import { OwnerWorkspace } from '@/components/owner-workspace';
export const dynamic = 'force-dynamic';
export default async function EnquiriesPage() {
  if (process.env.RR_STORAGE !== 'sqlite') notFound();
  await requireOwner();
  return <OwnerWorkspace enquiries />;
}
