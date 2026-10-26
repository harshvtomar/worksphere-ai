'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="team-page"><div className="notice error" role="alert"><h1>We couldn’t load your organization.</h1><p>Please retry, or sign in again if your session expired.</p><button onClick={reset}>Try again</button> <a href="/login">Sign in</a></div></main>;}
