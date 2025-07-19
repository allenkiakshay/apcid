"use client";
import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function LoginPage() {
  const [hallticket, setHallticket] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const res = await signIn("credentials", {
      redirect: false,
      hallticket,
      dob,
    });
    
    setLoading(false);
    
    if (res?.ok) {
      router.push("/");
    } else {
      setError("Invalid hall ticket number or date of birth");
    }
  }

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [router, session]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-purple-200 to-white-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
      </div>
      
      <Navbar />
      
      <div className="flex items-center justify-center min-h-screen px-4 py-12 relative z-10">
        <div className="w-full max-w-md relative">
          {/* Glassmorphism card */}
          <div className="bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/10 relative overflow-hidden">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-500/10 rounded-3xl blur-xl"></div>

            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-white/70">Sign in to your account</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {/* Hall Ticket Field */}
                <div className="group">
                  <label htmlFor="hallticket" className="block text-sm font-medium text-white mb-2">
                    Hall Ticket Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="hallticket"
                      value={hallticket}
                      onChange={(e) => setHallticket(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm uppercase tracking-wider"
                      placeholder="Enter your hall ticket number"
                      required
                    />
                  </div>
                </div>

                {/* Date of Birth Field */}
                <div className="group">
                  <label htmlFor="dob" className="block text-sm font-medium text-white/90 mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="date"
                      id="dob"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm [color-scheme:dark]"
                      required
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <p className="text-white/50 text-xs mt-1">Select your date of birth</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 backdrop-blur-sm">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-red-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.632 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-red-300 text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-800 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-800 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg relative overflow-hidden"
                >
                  {loading && (
                    <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}