"use client";

import React, { useState } from "react";
import { Envelope, Lock, Eye, EyeSlash, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { loginSchema } from "@/lib/validations";

import { login } from "./actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Client-side validation via Zod
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid input");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    const response = await login(formData);
    if (response?.error) { 
        setError(response.error); 
    }

    setIsLoading(false);
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans"
      style={{ backgroundColor: "#ffffff", fontFamily: "var(--body)" }}
    >
      {/* Coral ambient blob — top right */}
      <div
        className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] rounded-full opacity-30 pointer-events-none blur-[100px] mix-blend-multiply"
        style={{ background: "radial-gradient(circle, var(--coral) 0%, transparent 70%)" }}
      />
      {/* Coral ambient blob — bottom left */}
      <div
        className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] rounded-full opacity-30 pointer-events-none blur-[80px] mix-blend-multiply"
        style={{ background: "radial-gradient(circle, var(--coral-soft) 0%, transparent 70%)" }}
      />

      <main className="relative z-10 w-full max-w-[420px] px-4 py-8">

        {/* ── Card ── */}
        <div
          className="w-full bg-white flex flex-col items-center px-8 pt-8 pb-10"
          style={{
            borderRadius: "var(--r-xl)",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--line)",
          }}
        >
          {/* Logo */}
          <div className="relative w-36 h-14 mb-6">
            <Image
              src="/mmcy-logo.png"
              alt="MMCY Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Coral divider */}
          <div
            className="w-12 h-[3px] rounded-full mb-6"
            style={{ background: "linear-gradient(to right, var(--coral), var(--coral-soft))" }}
          />

          {/* Heading */}
          <div className="text-center mb-7">
            <h1
              className="text-[22px] font-bold leading-snug"
              style={{ color: "var(--ink)", fontFamily: "var(--display)" }}
            >
              Authentication
            </h1>
            <p className="text-sm mt-1 font-medium text-gray-600">
              Enter credentials to access portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">

            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-[13px] font-semibold"
                style={{ color: "var(--ink-2)" }}
              >
                Email
              </Label>
              <div
                className="flex items-center h-[50px] px-3 transition-all duration-200 bg-white"
                style={{ border: "1.5px solid var(--line)", borderRadius: "var(--r)" }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--coral)")}
                onBlurCapture={(e)  => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                <Envelope className="h-5 w-5 shrink-0 ml-1" style={{ color: "var(--muted-2)" }} />
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-full ml-3 border-none outline-none focus-visible:outline-none bg-transparent text-[15px] placeholder:text-gray-400"
                  style={{ color: "var(--ink)" }}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-[13px] font-semibold"
                style={{ color: "var(--ink-2)" }}
              >
                Password
              </Label>
              <div
                className="relative flex items-center h-[50px] px-3 transition-all duration-200 bg-white"
                style={{ border: "1.5px solid var(--line)", borderRadius: "var(--r)" }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--coral)")}
                onBlurCapture={(e)  => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                <Lock className="h-5 w-5 shrink-0 ml-1" style={{ color: "var(--muted-2)" }} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-full ml-3 border-none outline-none focus-visible:outline-none bg-transparent text-[15px] placeholder:text-gray-400 pr-10"
                  style={{ color: "var(--ink)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                  style={{ color: "var(--muted-2)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlash className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Validation error */}
            {error && (
              <div
                className="text-[13px] font-medium p-3 text-center"
                style={{
                  color: "var(--coral-600)",
                  backgroundColor: "var(--coral-tint)",
                  border: "1px solid var(--coral-soft)",
                  borderRadius: "var(--r-sm)",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-[50px] text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-all mt-1"
              style={{
                backgroundColor: "var(--coral)",
                borderRadius: "9999px",
                boxShadow: "0 4px 14px color-mix(in srgb, var(--coral) 30%, transparent)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--coral-600)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--coral)")}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

          </form>

          {/* Footer note */}
          <div
            className="text-[11px] mt-8 text-center font-semibold tracking-wider leading-[1.6]"
            style={{ color: "var(--muted-2)" }}
          >
            ISO CERTIFIED <br />
            MMCY {new Date().getFullYear()}
          </div>
        </div>
      </main>
    </div>
  );
}
