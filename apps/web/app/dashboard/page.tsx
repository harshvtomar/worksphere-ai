export const metadata = { title: "Dashboard — WorkSphere AI" };
import { requireUser } from '../../lib/session';
import { AccountNav } from '../../components/account-nav';
import Preview from '../page';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const { user } = await requireUser();
  return <><AccountNav name={user.displayName}/><Preview/></>;
}
