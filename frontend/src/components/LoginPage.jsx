import { useUser } from "@civic/auth/react";

export function LoginPage() {
  const { signIn, isLoading } = useUser();

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="8" fill="#111827" />
            <path d="M8 14h12M14 8v12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="login-copy">
          <h1 className="login-title">LaunchSense</h1>
          <p className="login-subtitle">
            Turn your idea into a complete go-to-market package in one conversation.
          </p>
        </div>

        <button
          type="button"
          className="login-btn"
          onClick={() => signIn()}
          disabled={isLoading}
        >
          {isLoading ? "Signing in…" : "Continue with Civic"}
        </button>

        <p className="login-terms">
          By continuing, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
