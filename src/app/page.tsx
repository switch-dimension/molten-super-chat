import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';

const linkBase =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 h-9 px-4';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="w-full max-w-lg space-y-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Molten Super Chat
        </h1>
        <p className="text-muted-foreground">
          Chat with any model. Compare answers from multiple AI models side by side.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className={`${linkBase} border border-border bg-background hover:bg-muted hover:text-foreground`}
          >
            <LogIn className="size-4" />
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={`${linkBase} bg-primary text-primary-foreground hover:opacity-90`}
          >
            <UserPlus className="size-4" />
            Sign up
          </Link>
        </div>
      </main>
    </div>
  );
}
