"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import LottieCarousel from "../components/LottieCarousel";

function InputField({
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  togglePassword,
  showPassword,
}) {
  return (
    <div className="space-y-1">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <Icon size={18} />
        </div>
        <input
          type={togglePassword ? (showPassword ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full py-3.5 pl-11 pr-${togglePassword ? "11" : "4"} rounded-xl border bg-surface-elevated text-dark text-base placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
            error ? "border-red-400" : "border-border-default"
          }`}
        />
        {togglePassword && (
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-xs pl-1">{error}</p>}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const errs = {};

    if (!isLogin && !form.name.trim()) {
      errs.name = "Full name is required";
    }

    if (!form.email.trim()) {
      errs.email = isLogin ? "Email or username is required" : "Email is required";
    } else if (!isLogin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address";
    }

    if (!form.password) {
      errs.password = "Password is required";
    } else if (form.password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    }

    if (!isLogin) {
      if (!form.confirmPassword) {
        errs.confirmPassword = "Please confirm your password";
      } else if (form.confirmPassword !== form.password) {
        errs.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError("");

    const endpoint = isLogin ? "/api/login" : "/api/signup";
    const body = isLogin
      ? { email: form.email, password: form.password, username: form.email }
      : { email: form.email, password: form.password, username: form.name };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const token = typeof data === "string" ? data : data.token;
        localStorage.setItem("wc_token", token);
        if (data.username) localStorage.setItem("wc_username", data.username);
        if (data.user_id) localStorage.setItem("wc_user_id", data.user_id);
        router.push("/dashboard");
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        const fieldErrors = {};
        const fieldMap = { email: "email", password: "password", username: "name" };

        for (const err of data.detail || []) {
          const loc = err.loc || [];
          const fieldKey = loc.find((l) => fieldMap[l]);
          if (fieldKey) {
            fieldErrors[fieldMap[fieldKey]] = err.msg;
          }
        }

        if (Object.keys(fieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        } else {
          const msg = data.detail?.[0]?.msg || "Validation error. Please check your input.";
          setServerError(msg);
        }
      } else {
        const data = await res.json().catch(() => null);
        setServerError(data?.detail || `Something went wrong (${res.status}). Please try again.`);
      }
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setErrors({});
    setServerError("");
    setShowPassword(false);
    setShowConfirm(false);
  };

  return (
    <div className="flex min-h-dvh">
      {/* ── Left Panel: Form ─────────────────────────────────────── */}
      <div className="flex flex-col justify-center w-full lg:w-[45%] px-6 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-dark tracking-tight">
              {isLogin ? "Welcome" : "Create Account"}
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Simplify your wellness journey with{" "}
              <span className="font-semibold text-dark">WellCheck GH</span>.
              {isLogin
                ? " Log in to continue."
                : " Get started for free."}
            </p>
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <InputField
                icon={User}
                placeholder="Name"
                value={form.name}
                onChange={update("name")}
                error={errors.name}
              />
            )}

            <InputField
              icon={Mail}
              type="email"
              placeholder={isLogin ? "Email or Username" : "Email"}
              value={form.email}
              onChange={update("email")}
              error={errors.email}
            />

            <div>
              <InputField
                icon={Lock}
                placeholder="Password"
                value={form.password}
                onChange={update("password")}
                error={errors.password}
                togglePassword={() => setShowPassword((p) => !p)}
                showPassword={showPassword}
              />
              {isLogin && (
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    className="text-sm text-primary hover:text-primary-hover transition-colors font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {!isLogin && (
              <InputField
                icon={Lock}
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                error={errors.confirmPassword}
                togglePassword={() => setShowConfirm((p) => !p)}
                showPassword={showConfirm}
              />
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-base hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting
                ? "Please wait..."
                : isLogin
                  ? "Login"
                  : "Create Account"}
            </button>
          </form>

          <p className="text-sm text-text-secondary text-center">
            {isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary font-semibold hover:text-primary-hover transition-colors"
                >
                  Create one now
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary font-semibold hover:text-primary-hover transition-colors"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Right Panel: Lottie Illustration ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] bg-primary-muted flex-col items-center justify-center px-12 py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-muted via-white/40 to-primary-light opacity-60 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg">
          <LottieCarousel />

          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-dark leading-snug">
              Your daily wellness companion
            </h2>
            <p className="text-sm text-text-secondary">
              Powered by <span className="font-semibold text-primary">WellCheck GH</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
