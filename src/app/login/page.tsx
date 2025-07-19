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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* macOS-style background texture */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.15)_1px,transparent_0)] bg-[length:32px_32px]"></div>
      </div>

      
      
      <Navbar />
      
      <div className="flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md relative">
          {/* macOS-style card with multiple shadows */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 relative overflow-hidden" 
               style={{
                 boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)'
               }}>
            
            {/* Gradient header section */}
            <div className="relative px-8 pt-8 pb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5"></div>
              
              <div className="relative text-center">
                
                
                <h1 className="text-3xl font-light text-gray-900 mb-2 tracking-tight">Welcome</h1>
                <p className="text-gray-600 font-light">Sign in to continue</p>
              </div>
            </div>

            {/* Form section */}
            <div className="px-8 pb-8">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Hall Ticket Field */}
                <div className="space-y-2">
                  <label htmlFor="hallticket" className="block text-sm font-medium text-gray-700 pt-2">
                    Hall Ticket Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="hallticket"
                      value={hallticket}
                      onChange={(e) => setHallticket(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 uppercase tracking-widest text-sm font-mono backdrop-blur-sm hover:bg-white/50 hover:border-gray-300"
                      placeholder="Enter hall ticket number"
                      required
                      style={{
                        boxShadow: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}
                    />
                  </div>
                </div>

                {/* Date of Birth Field */}
                <div className="space-y-2">
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="dob"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200/80 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 text-sm backdrop-blur-sm hover:bg-white/50 hover:border-gray-300 [color-scheme:light]"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      style={{
                        boxShadow: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/80 rounded-xl p-4" 
                       style={{boxShadow: 'inset 0 1px 2px 0 rgba(239, 68, 68, 0.1)'}}>
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-700 text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-6 rounded-xl font-medium text-base hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden active:scale-[0.98]"
                  style={{
                    boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {loading && (
                    <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}
                  <span className="relative z-10">
                    {loading ? "Signing in..." : "Sign In"}
                  </span>
                </button>
              </form>

              {/* Footer text */}
              <div className="mt-8 pt-6 border-t border-gray-100/60 text-center">
                <p className="text-gray-500 text-sm font-light">
                  Secure authentication powered by your credentials
                </p>
              </div>
            </div>
          </div>

          {/* macOS-style reflection */}
          <div className="absolute inset-0 top-1/2 bg-gradient-to-t from-white/10 to-transparent rounded-b-2xl pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}