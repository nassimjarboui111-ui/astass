import React, { useState } from 'react';
import { ArrowLeft, KeyRound, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiVerifyTotp } from '../services/apiClient';
import { BrandLogo } from '../components/BrandLogo';

interface AuthScreenProps {
  initialMode?: 'login' | 'register' | 'reset';
  onBackHome: () => void;
  onOpenLegal: (doc: 'privacy' | 'terms' | 'scanning') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  onBackHome,
  onOpenLegal,
}) => {
  const { t } = useLanguage();
  const { signInGoogle, signInEmail, registerEmail, sendResetEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'register' && !acceptedPolicy) {
      setError('You must accept the Privacy Policy, Terms & Conditions, and Authorized Scanning Policy.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signInEmail(email, password);
      } else if (mode === 'register') {
        await registerEmail({ email, password, name, orgName });
        setNotice('Account created. A verification link has been sent to your email.');
      } else {
        await sendResetEmail(email);
        setNotice('Password reset link sent to your email if the account exists.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication error.';
      if (msg.includes('operation-not-allowed')) {
        setError(
          'Email/Password sign-in is not yet enabled in the Firebase Console (Authentication -> Sign-in method -> Email/Password). Use "Continue with Google" below or enable Email/Password in Firebase Console.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-[#0D1628] border border-slate-800 rounded-xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <BrandLogo compact />
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </button>
        </div>

        <div>
          <h1 className="text-xl font-bold text-white">
            {mode === 'login' ? t.auth.signInTitle : mode === 'register' ? t.auth.registerTitle : t.auth.resetTitle}
          </h1>
          <p className="text-xs text-slate-400 mt-1">{t.tagline}</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 leading-relaxed">
            {error}
          </div>
        )}

        {notice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 leading-relaxed">
            {notice}
          </div>
        )}

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={handleGoogle}
              className="w-full py-2.5 px-4 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>G</span>
              <span>{t.auth.googleBtn}</span>
            </button>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="h-px flex-1 bg-slate-800" />
              <span>or</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">{t.auth.nameLabel}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">{t.auth.orgNameLabel}</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">{t.auth.emailLabel}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">{t.auth.passwordLabel}</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#060B14] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00C8E8]"
              />
            </div>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedPolicy}
                onChange={(e) => setAcceptedPolicy(e.target.checked)}
                className="mt-0.5 accent-[#00C8E8]"
              />
              <span>
                {t.auth.acceptPolicy}{' '}
                <button type="button" onClick={() => onOpenLegal('privacy')} className="text-[#22D3EE] underline cursor-pointer">
                  {t.legal.privacy}
                </button>
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {mode === 'login' ? t.auth.signInBtn : mode === 'register' ? t.auth.registerBtn : t.auth.resetBtn}
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
          {mode === 'login' ? (
            <>
              <button type="button" onClick={() => setMode('register')} className="hover:text-[#22D3EE] cursor-pointer">
                {t.auth.switchRegister}
              </button>
              <button type="button" onClick={() => setMode('reset')} className="hover:text-[#22D3EE] cursor-pointer">
                {t.auth.forgotPassword}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMode('login')} className="hover:text-[#22D3EE] cursor-pointer">
              {t.auth.switchLogin}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const EmailVerificationGate: React.FC = () => {
  const { t } = useLanguage();
  const { user, resendVerification, refreshUserVerification, logout } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleResend = async () => {
    setBusy(true);
    try {
      await resendVerification();
      setMsg('Verification link re-sent. Check your inbox and spam folder.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to resend email right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    const verified = await refreshUserVerification();
    if (!verified) {
      setMsg('Email is not marked verified yet. Click the link in your inbox first.');
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0D1628] border border-slate-800 rounded-xl p-8 space-y-5">
        <div className="flex items-center gap-3 text-[#22D3EE]">
          <MailCheck className="w-7 h-7" />
          <h1 className="text-xl font-bold text-white">{t.auth.verifyEmailTitle}</h1>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{t.auth.verifyEmailBody}</p>
        <div className="text-xs font-mono text-slate-400 bg-[#060B14] border border-slate-800 rounded-lg px-3 py-2">
          {user?.email}
        </div>
        {msg && <p className="text-xs text-[#22D3EE]">{msg}</p>}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleRefresh}
            className="w-full py-2.5 px-4 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            {t.auth.refreshStatus}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleResend}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-lg cursor-pointer"
          >
            {t.auth.resendEmail}
          </button>
          <button
            type="button"
            onClick={logout}
            className="text-xs text-slate-400 hover:text-white underline self-center pt-2 cursor-pointer"
          >
            {t.auth.signOut}
          </button>
        </div>
      </div>
    </div>
  );
};

export const TotpChallengeGate: React.FC = () => {
  const { t } = useLanguage();
  const { totpSecretBase32, verifyTotpSession, logout } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSecretBase32) return;
    setError(null);
    setBusy(true);
    try {
      const ok = await apiVerifyTotp(totpSecretBase32, code);
      if (ok) {
        verifyTotpSession();
      } else {
        setError('Invalid 6-digit authenticator code. Try again.');
      }
    } catch {
      setError('Unable to validate TOTP code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0D1628] border border-slate-800 rounded-xl p-8 space-y-5">
        <div className="flex items-center gap-3 text-[#22D3EE]">
          <KeyRound className="w-7 h-7" />
          <h1 className="text-xl font-bold text-white">{t.auth.totpChallengeTitle}</h1>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{t.auth.totpChallengeBody}</p>
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
            {error}
          </div>
        )}
        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 bg-[#060B14] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#00C8E8]"
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="w-full py-2.5 px-4 bg-[#00C8E8] hover:bg-[#22D3EE] text-[#060B14] font-semibold text-sm rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {t.auth.totpVerifyBtn}
          </button>
        </form>
        <button
          type="button"
          onClick={logout}
          className="text-xs text-slate-400 hover:text-white underline block mx-auto cursor-pointer"
        >
          {t.auth.signOut}
        </button>
      </div>
    </div>
  );
};
