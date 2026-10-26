export const metadata = { title: "Organizations — WorkSphere AI" };
import { requireUser } from '../../lib/session';
import { AccountNav } from '../../components/account-nav';
import { Organizations } from '../../components/organizations';
export const dynamic = 'force-dynamic';
export default async function OrganizationPage() { const {user}=await requireUser();return <><AccountNav name={user.displayName}/><Organizations/></>; }
