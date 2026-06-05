import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { BookOpenCheck, GraduationCap, Mail, Lock, User, Building2, Sparkles, Eye, EyeOff, ChevronLeft } from "lucide-react";

type AuthMode = "signin" | "signup";

interface AuthPageProps {
  onAuthenticated: () => void;
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        }
        throw new Error(error.message);
      }
      onAuthenticated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError("يرجى إدخال الاسم الكامل."); return; }
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل."); return; }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, institution, speciality }
        }
      });
      if (error) {
        if (error.message.includes("already registered") || error.message.includes("User already registered")) {
          throw new Error("هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول.");
        }
        throw new Error(error.message);
      }
      setSuccessMsg("تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...");
      // Auto sign in after signup
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInErr) {
        onAuthenticated();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2044 100%)" }}
      dir="rtl"
    >
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #0ea5e9, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #2563eb, transparent)" }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-2xl"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)" }}>
            <GraduationCap size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: "Tajawal, sans-serif" }}>
            الأستاذ الذكي
          </h1>
          <p className="text-blue-300 text-sm font-medium">مساعد المعلم الفائق بالذكاء الاصطناعي</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {/* Tabs */}
          <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {(["signin", "signup"] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccessMsg(null); }}
                className="flex-1 py-4 text-sm font-bold transition-all duration-200"
                style={{
                  color: mode === m ? "#fff" : "rgba(255,255,255,0.4)",
                  background: mode === m ? "rgba(37,99,235,0.3)" : "transparent",
                  borderBottom: mode === m ? "2px solid #3b82f6" : "2px solid transparent",
                }}
              >
                {m === "signin" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
              </button>
            ))}
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-5 p-3 rounded-lg text-sm text-red-200 flex items-center gap-2"
                  style={{ background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.3)" }}
                >
                  <span className="text-red-400">⚠</span>
                  {error}
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-5 p-3 rounded-lg text-sm text-green-200 flex items-center gap-2"
                  style={{ background: "rgba(22,163,74,0.2)", border: "1px solid rgba(22,163,74,0.3)" }}
                >
                  <span className="text-green-400">✓</span>
                  {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {mode === "signin" ? (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignIn}
                  className="space-y-5"
                >
                  <InputField
                    icon={<Mail size={16} />}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="البريد الإلكتروني"
                    required
                  />
                  <div className="relative">
                    <InputField
                      icon={<Lock size={16} />}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={setPassword}
                      placeholder="كلمة المرور"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <SubmitButton loading={loading} label="تسجيل الدخول" />
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignUp}
                  className="space-y-4"
                >
                  <InputField
                    icon={<User size={16} />}
                    type="text"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="الاسم الكامل (مثال: الأستاذ محمد عمر)"
                    required
                  />
                  <InputField
                    icon={<Mail size={16} />}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="البريد الإلكتروني"
                    required
                  />
                  <div className="relative">
                    <InputField
                      icon={<Lock size={16} />}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={setPassword}
                      placeholder="كلمة المرور (6 أحرف فأكثر)"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <InputField
                    icon={<Building2 size={16} />}
                    type="text"
                    value={institution}
                    onChange={setInstitution}
                    placeholder="اسم المؤسسة / المعهد (اختياري)"
                  />
                  <InputField
                    icon={<BookOpenCheck size={16} />}
                    type="text"
                    value={speciality}
                    onChange={setSpeciality}
                    placeholder="التخصص والمادة (اختياري)"
                  />
                  <SubmitButton loading={loading} label="إنشاء الحساب والبدء" />
                </motion.form>
              )}
            </AnimatePresence>

            <p className="mt-6 text-center text-xs text-blue-300 opacity-60">
              منصة الأستاذ الذكي · نظام التكوين والتعليم المهني بالجزائر
            </p>
          </div>
        </motion.div>

        {/* Features row */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-6 grid grid-cols-3 gap-3 text-center"
        >
          {[
            { icon: "📝", label: "مخططات الدروس" },
            { icon: "📊", label: "تقارير الأداء" },
            { icon: "✉️", label: "المراسلات الإدارية" },
          ].map((f) => (
            <div key={f.label}
              className="py-3 px-2 rounded-xl text-xs text-blue-300"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="text-lg mb-1">{f.icon}</div>
              {f.label}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function InputField({
  icon, type, value, onChange, placeholder, required
}: {
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full py-3 pr-10 pl-4 rounded-xl text-sm text-white placeholder-blue-300/50 outline-none transition-all duration-200 focus:ring-2"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontFamily: "Tajawal, sans-serif",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(59,130,246,0.6)"; e.target.style.boxShadow = "0 0 0 2px rgba(59,130,246,0.15)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
      style={{
        background: loading ? "rgba(37,99,235,0.4)" : "linear-gradient(135deg, #1d4ed8, #0ea5e9)",
        boxShadow: loading ? "none" : "0 4px 20px rgba(37,99,235,0.4)",
        fontFamily: "Tajawal, sans-serif",
      }}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          جاري المعالجة...
        </>
      ) : (
        <>
          <Sparkles size={16} />
          {label}
        </>
      )}
    </button>
  );
}
