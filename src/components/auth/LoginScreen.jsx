import React, { useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from "firebase/auth";
import { auth } from '../../config/firebase';
import { logAnalyticsEvent } from '../../config/firebase';
import { 
  Sparkles, 
  Loader, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Camera,
  Zap,
  Star,
  Share2
} from 'lucide-react';

/**
 * Login/Signup screen component
 */
const LoginScreen = () => {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect result failed", error);
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      logAnalyticsEvent('user_login', { method: 'google' });
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error("Redirect login failed", redirectError);
          setError("Login failed. Please try again.");
        }
      } else {
        setError(error.message || "Login failed");
      }
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name or collection name");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: name.trim()
      });
      await userCredential.user.reload();
      await sendEmailVerification(userCredential.user);
      setVerificationSent(true);
      logAnalyticsEvent('user_registered', { method: 'email' });
    } catch (error) {
      let errorMessage = "Sign up failed";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Try signing in instead.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      logAnalyticsEvent('user_login', { method: 'email' });
    } catch (error) {
      let errorMessage = "Sign in failed";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "This account has been disabled";
      } else {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setError(""); 
      alert(`Password reset email sent to ${email}!\n\nPlease check your inbox and spam folder.`);
      setMode("login");
    } catch (error) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send reset email";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please try again later.";
      } else {
        errorMessage = `Failed to send email: ${error.message}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Camera, title: "Snap & Identify", desc: "AI identifies your items" },
    { icon: Zap, title: "Instant Valuation", desc: "Real-time price estimates" },
    { icon: Star, title: "Expert Analysis", desc: "Era, maker & materials" },
    { icon: Share2, title: "Share & Sell", desc: "Generate listings fast" },
  ];

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
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setVerificationSent(false);
                  }}
                  className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                    mode === "login" ? "text-stone-900" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  Sign In
                  {mode === "login" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setVerificationSent(false);
                    setName("");
                  }}
                  className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                    mode === "signup" ? "text-stone-900" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  Create Account
                  {mode === "signup" && (
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
                  <span>{mode === "signup" ? "Register with Gmail" : "Sign-In with Gmail"}</span>
                </button>

                {/* Divider */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
                  <span className="text-xs text-stone-400 font-medium">or continue with email</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
                </div>

                {/* Forms */}
                {mode === "forgot" ? (
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
                        "Send Reset Link"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setError("");
                      }}
                      className="w-full text-sm text-stone-500 hover:text-stone-700 py-2"
                    >
                      ← Back to Sign In
                    </button>
                  </form>
                ) : (
                  <form onSubmit={mode === "signup" ? handleSignUp : handleSignIn} className="space-y-4">
                    {mode === "signup" && (
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
                          type={showPassword ? "text" : "password"}
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

                    {mode === "signup" && (
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">
                          Confirm Password
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="w-full px-4 py-3.5 bg-white border-2 border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                          required
                        />
                      </div>
                    )}

                    {mode === "login" && (
                      <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-stone-500">
                          <input type="checkbox" className="rounded border-stone-300" />
                          <span>Remember me</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setMode("forgot");
                            setError("");
                          }}
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
                          <span>{mode === "signup" ? "Creating account..." : "Signing in..."}</span>
                        </>
                      ) : (
                        <span>{mode === "signup" ? "Create Account" : "Sign In"}</span>
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
          <div className="flex gap-6 px-8 justify-center flex-wrap">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-stone-100 shadow-sm">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">{feature.title}</p>
                  <p className="text-xs text-stone-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
