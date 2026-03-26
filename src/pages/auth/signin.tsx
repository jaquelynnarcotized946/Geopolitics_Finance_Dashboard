import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import PublicLayout from "../../components/layout/PublicLayout";
import InputField from "../../components/ui/InputField";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError("Invalid credentials. Please try again.");
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <PublicLayout>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="surface-card p-8">
          <p className="text-[10px] uppercase tracking-widest text-slate">Welcome back</p>
          <h1 className="mt-3 text-2xl font-bold text-ink">Sign in to GeoPulse</h1>
          <p className="mt-2 text-sm text-slate">Access your intelligence dashboard.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <InputField
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <InputField
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error ? <p className="text-xs text-danger">{error}</p> : null}
            <button type="submit" className="btn-primary w-full">
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate">
            No account?{" "}
            <Link href="/auth/signup" className="font-semibold !text-emerald">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
