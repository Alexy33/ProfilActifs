"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setError(result.error.message ?? "Unable to create account.");
        setLoading(false);
        return;
      }

      router.push("/candidate");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit} className="grid gap-5">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-base text-destructive"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="name" className="text-sm">Full name</Label>

          <Input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="John Doe"
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect="off"
            disabled={loading}
            required
            className="h-11 rounded-lg px-3.5 text-base md:text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm">Email</Label>

          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="john@example.com"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            disabled={loading}
            required
            className="h-11 rounded-lg px-3.5 text-base md:text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password" className="text-sm">Password</Label>

          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            minLength={8}
            disabled={loading}
            required
            className="h-11 rounded-lg px-3.5 text-base md:text-base"
          />
          <p className="text-sm text-muted-foreground">
            Must be at least 8 characters long.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="mt-1 h-11 w-full rounded-lg text-base"
        >
          {loading ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : null}
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="text-center text-base text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
