export const metadata = { title: "Sign in — WorkSphere AI" };
import { LoginForm } from '../../components/login-form';
export default function LoginPage() { return <main className="auth-page"><a className="account-brand" href="/">WorkSphere<span>AI</span></a><LoginForm/><p className="auth-footnote">Secure sign-in · Organization access · Your team in sync</p></main>; }
