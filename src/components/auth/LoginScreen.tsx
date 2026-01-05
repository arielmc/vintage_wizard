import React, { useState } from 'react';
import {
  Sparkles,
  Loader,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../contexts';

type AuthMode = 'login' | 'signup' | 'forgot';

/**
 * LoginScreen - Authentication component using useAuth hook
 * Supports Google OAuth, email/password login, signup, and password reset
 */
const LoginScreen: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    resetPassword,
    error: authError,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Combine auth context error with local validation errors
  const error = localError || authError || '';

  const handleGoogleLogin = async () => {
    clearError();
    setLocalError('');
    await loginWithGoogle();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!name.trim()) {
      setLocalError('Please enter your name or collection name');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signupWithEmail(email, password, name.trim());
      setVerificationSent(true);
    } catch {
      // Error is handled by the context
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    setLoading(true);

    try {
      await loginWithEmail(email, password);
    } catch {
      // Error is handled by the context
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email) {
      setLocalError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      alert(`Password reset email sent to ${email}!\n\nPlease check your inbox and spam folder.`);
      setMode('login');
    } catch {
      // Error is handled by the context
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setLocalError('');
    clearError();
    setVerificationSent(false);
    if (newMode === 'signup') {
      setName('');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,black_1px,transparent_0)] bg-[length:24px_24px]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-rose-50/40 to-amber-50/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-stone-50/50 to-blue-50/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      {/* Main Content */}
      <div className="relative z-10 w-full flex-1 flex flex-col">
        <div className="flex flex-col justify-center p-8 lg:p-16 xl:p-20 flex-1">
          <div className="max-w-md mx-auto w-full">
            {/* Logo */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-lg shadow-rose-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" strokeWidth={2} fill="currentColor" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
                  Vintage Wizard
                </h1>
              </div>
              <p className="text-stone-600 text-sm ml-14">Your stuff — researched, organized & ready</p>
            </div>

            {/* Auth Card */}
            <div className="bg-white rounded-3xl shadow-2xl shadow-stone-900/5 border border-stone-200/60 overflow-hidden">
              {/* Tab Switcher */}
              <div className="flex border-b border-stone-100 bg-stone-50/50">
                <button
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                    mode === 'login' ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Sign In
                  {mode === 'login' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
                  )}
                </button>
                <button
                  onClick={() => switchMode('signup')}
                  className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                    mode === 'signup' ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Create Account
                  {mode === 'signup' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
                  )}
                </button>
              </div>

              <div className="p-8">
                {/* Verification Success */}
                {verificationSent && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Verification email sent!</strong> Please check your inbox and click the link to verify your account.
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Google Sign In */}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full bg-white hover:bg-stone-50 text-stone-900 font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 border-2 border-stone-200 hover:border-stone-300 shadow-sm hover:shadow-md mb-6 group"
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    className="w-5 h-5 group-hover:scale-110 transition-transform"
                    alt="G"
                  />
                  <span>{mode === 'signup' ? 'Register with Gmail' : 'Sign-In with Gmail'}</span>
                </button>

                {/* Divider */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
                  <span className="text-xs text-stone-400 font-medium">or continue with email</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
                </div>

                {/* Forms */}
                {mode === 'forgot' ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="w-full text-sm text-stone-500 hover:text-stone-700 py-2"
                    >
                      ← Back to Sign In
                    </button>
                  </form>
                ) : (
                  <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} className="space-y-4">
                    {mode === 'signup' && (
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">
                          First Name or Collection Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="NiceHuman"
                          className="w-full px-4 py-3.5 bg-white border-2 border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3.5 bg-white border-2 border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1.5 rounded-lg hover:bg-stone-100"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {mode === 'signup' && (
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">
                          Confirm Password
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="w-full px-4 py-3.5 bg-white border-2 border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                          required
                        />
                      </div>
                    )}

                    {mode === 'login' && (
                      <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-stone-500">
                          <input type="checkbox" className="rounded border-stone-300" />
                          <span>Remember me</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-rose-600 hover:text-rose-700 font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-stone-900 to-stone-800 hover:from-stone-800 hover:to-stone-700 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 hover:shadow-xl hover:shadow-stone-900/30 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
                        </>
                      ) : (
                        <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features Strip */}
        <div className="w-full bg-stone-50/50 border-t border-stone-200/60 py-8 overflow-hidden">
          <style>{`
            @keyframes scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(calc(-256px * 5 - 24px * 5)); }
            }
            .animate-scroll {
              animation: scroll 30s linear infinite;
            }
            .animate-scroll:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="flex gap-6 animate-scroll">
            {[
              { emoji: '📷', title: 'Add pic(s) + details', desc: 'Upload photos and optional details on any item(s) & AI will get to work' },
              { emoji: '💰', title: "See what it's worth", desc: 'Price ranges + links to sold comparables' },
              { emoji: '🗂️', title: 'Build a visual vault', desc: 'Catalog everything, with AI categorization, searchable & synced' },
              { emoji: '✍️', title: 'Sell smarter', desc: 'Auto-generated listings ready for eBay, Poshmark, etc.' },
              { emoji: '🔗', title: 'Share with anyone', desc: 'Buyers, appraisers, insurance, friends & family' },
            ].map((feature, i) => (
              <React.Fragment key={i}>
                <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
                  <div className="text-3xl mb-2">{feature.emoji}</div>
                  <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">{feature.title}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{feature.desc}</p>
                </div>
                {/* Duplicate for seamless loop */}
                <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
                  <div className="text-3xl mb-2">{feature.emoji}</div>
                  <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">{feature.title}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{feature.desc}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
