import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SignUp, useAuth } from "../auth";


const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const websitePattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/\S*)?$/i;

export default function Signup() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const role = params.get("role") || "creator";
  const auth = useAuth();
  const isRecruiter = role === "recruiter";
  const roleLabel = isRecruiter ? "Recruiter" : role === "viewer" ? "Viewer" : "Creator";

 
  const targetProfilePath = isRecruiter 
    ? "/recruiter-profile" 
    : role === "viewer" 
    ? "/viewer-profile" 
    : "/creator-profile";

  const [companyName, setCompanyName] = useState(localStorage.getItem("companyName") || "");
  const [companyEmail, setCompanyEmail] = useState(localStorage.getItem("companyEmail") || "");
  const [companyWebsite, setCompanyWebsite] = useState(localStorage.getItem("companyWebsite") || "");
  const [hiringMember, setHiringMember] = useState(localStorage.getItem("hiringMember") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem("selectedRole", role);
  }, [role]);

  useEffect(() => {
    if (isRecruiter) {
      localStorage.setItem("companyName", companyName);
      localStorage.setItem("companyEmail", companyEmail);
      localStorage.setItem("companyWebsite", companyWebsite);
      localStorage.setItem("hiringMember", hiringMember);
    }
  }, [isRecruiter, companyName, companyEmail, companyWebsite, hiringMember]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (isRecruiter) {
      if (!companyName.trim() || !companyEmail.trim() || !hiringMember.trim()) {
        setError("Please complete your recruiter and company details.");
        return;
      }
      if (!emailPattern.test(companyEmail)) {
        setError("Please enter a valid company email.");
        return;
      }
    }

    auth.login({ email, password });


    if (role === "recruiter") {
      navigate("/recruiter-profile");
    } else if (role === "viewer") {
      navigate("/viewer-profile");
    } else {
      navigate("/creator-profile");
    }
  };


  if (!auth) {
   
    return <SignUp forceRedirectUrl={targetProfilePath} />;

  }

  if (auth.signedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-10 shadow-xl">
          <h2 className="text-3xl font-semibold text-slate-900 mb-4">You are already logged in</h2>
          <p className="text-slate-600 mb-6">
            You are already signed in. Go to your profile to continue building your account.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => navigate(targetProfilePath)}
              className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 transition"
            >
              Go to Profile
            </button>
            <button
              type="button"
              onClick={() => {
                auth.logout();
                navigate(`/signup?role=${role}`);
              }}
              className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50 transition"
            >
              Sign out and switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-fuchsia-100 py-10 px-4">
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={`rounded-[40px] p-10 shadow-[0_35px_120px_rgba(15,23,42,0.18)] ${isRecruiter ? "bg-gradient-to-br from-slate-950 via-blue-950 to-violet-900 text-white" : "bg-white text-slate-900"}`}>
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">{isRecruiter ? "Recruiter Signup" : `${roleLabel} Signup`}</p>
            <h1 className="mt-6 text-5xl font-semibold leading-tight">
              {isRecruiter
                ? "Create a recruiter profile that creators trust."
                : role === "viewer"
                ? "Browse creators and discover talent instantly."
                : "Showcase your work and get discovered by recruiters."}
            </h1>
            <p className={`mt-6 max-w-2xl text-lg leading-8 ${isRecruiter ? "text-slate-200" : "text-slate-600"}`}>
              {isRecruiter
                ? "Add your company credentials, secure your account with a password, and get ready to build a profile that attracts top creators."
                : role === "viewer"
                ? "Sign up to browse creators, save favorites, and discover talent for your next project."
                : "Create your account, share your work, and let recruiters find your portfolio."}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className={`rounded-3xl p-6 ring-1 ring-white/10 backdrop-blur-xl ${isRecruiter ? "bg-white/10" : "bg-slate-50"}`}>
                <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${isRecruiter ? "text-cyan-200" : "text-slate-600"}`}>{isRecruiter ? "Trusted presence" : "Fast access"}</p>
                <p className={`mt-3 text-sm ${isRecruiter ? "text-slate-200" : "text-slate-600"}`}>
                  {isRecruiter
                    ? "Creators can see your company email and website before they respond."
                    : "Get logged in quickly and start exploring opportunities immediately."}
                </p>
              </div>
              <div className={`rounded-3xl p-6 ring-1 ring-white/10 backdrop-blur-xl ${isRecruiter ? "bg-white/10" : "bg-slate-50"}`}>
                <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${isRecruiter ? "text-cyan-200" : "text-slate-600"}`}>{isRecruiter ? "Secure access" : "Personalized experience"}</p>
                <p className={`mt-3 text-sm ${isRecruiter ? "text-slate-200" : "text-slate-600"}`}>
                  {isRecruiter
                    ? "Set a password today so you can sign in and manage your recruiter profile anytime."
                    : "Keep your account secure and return anytime to update your profile."}
                </p>
              </div>
              <div className={`rounded-3xl p-6 ring-1 ring-white/10 backdrop-blur-xl ${isRecruiter ? "bg-white/10" : "bg-slate-50"}`}>
                <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${isRecruiter ? "text-cyan-200" : "text-slate-600"}`}>{isRecruiter ? "Company first" : "Profile ready"}</p>
                <p className={`mt-3 text-sm ${isRecruiter ? "text-slate-200" : "text-slate-600"}`}>
                  {isRecruiter
                    ? "Enter real company info so your outreach feels authentic and professional."
                    : "Complete the basics now so you can start using the platform quickly."}
                </p>
              </div>
              <div className={`rounded-3xl p-6 ring-1 ring-white/10 backdrop-blur-xl ${isRecruiter ? "bg-white/10" : "bg-slate-50"}`}>
                <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${isRecruiter ? "text-cyan-200" : "text-slate-600"}`}>{isRecruiter ? "Fast profile launch" : "Start exploring"}</p>
                <p className={`mt-3 text-sm ${isRecruiter ? "text-slate-200" : "text-slate-600"}`}>
                  {isRecruiter
                    ? "Complete signup and move straight into your recruiter dashboard."
                    : "Create your account and begin browsing profiles right away."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[40px] border border-white/70 bg-white/90 p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
            <div className="mb-8 rounded-3xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 p-6 text-white shadow-lg">
              <h2 className="text-3xl font-semibold">{isRecruiter ? "Recruiter account" : `${roleLabel} account`}</h2>
              <p className="mt-2 text-sm text-slate-100/90">
                {isRecruiter
                  ? "Sign up with your recruiter credentials and company details."
                  : role === "viewer"
                  ? "Create a viewer account to browse creators and save favorites."
                  : "Create your creator profile and share your portfolio with recruiters."}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isRecruiter && (
                <>
                  <div className="grid gap-4">
                    <label className="block text-sm font-semibold text-slate-800">Company Name</label>
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Talent Agency"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800">Company Email</label>
                      <input
                        type="email"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        placeholder="hello@acmeagency.com"
                        className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800">Website</label>
                      <input
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="https://acmeagency.com"
                        className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <label className="block text-sm font-semibold text-slate-800">Hiring Contact Name</label>
                    <input
                      value={hiringMember}
                      onChange={(e) => setHiringMember(e.target.value)}
                      placeholder="Priya Sharma"
                      className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                    />
                  </div>
                </>
              )}
              <div className="grid gap-4">
                <label className="block text-sm font-semibold text-slate-800">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-800">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                  />
                </div>
              </div>

              {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>}

              <button type="submit" className="w-full rounded-3xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-fuchsia-200/30 transition hover:scale-[1.01]">
                {isRecruiter ? "Create recruiter account" : `Create ${roleLabel} account`}
              </button>

              <p className="text-center text-sm text-slate-600">
                Already have an account? <Link to="/login" className="font-semibold text-fuchsia-600 hover:text-fuchsia-700">Log in</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}