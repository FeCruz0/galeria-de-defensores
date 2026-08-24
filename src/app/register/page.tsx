'use client';

import React, { useState, useEffect, useActionState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Mail, Lock, Shield, User, ArrowRight, Loader2, Check, AlertCircle } from 'lucide-react';
import { registerSchema } from '@/lib/validations/auth';
import { translateAuthError } from '@/lib/authErrors';
import { registerUserAction } from '@/actions/authActions';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, payload: any) => {
      const res = await registerUserAction(payload);
      if (res.success) {
        setSuccessMsg('Cadastro realizado com sucesso! Redirecionando...');
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1500);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
      return res;
    },
    { success: false }
  );

  // Live validation states
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);

  // Debounced check for Username availability
  useEffect(() => {
    if (!username) {
      setUsernameError(null);
      setUsernameValid(null);
      setUsernameChecking(false);
      return;
    }

    const parsed = registerSchema.shape.username.safeParse(username);
    if (!parsed.success) {
      setUsernameError(parsed.error.issues[0]?.message || 'Nome de usuário inválido.');
      setUsernameValid(false);
      setUsernameChecking(false);
      return;
    } else {
      setUsernameError(null);
    }

    setUsernameChecking(true);

    const checkAvailability = setTimeout(async () => {
      try {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim())
          .maybeSingle();

        if (existingUser) {
          setUsernameError('Este nome de usuário já está sendo utilizado por outra conta.');
          setUsernameValid(false);
        } else {
          setUsernameError(null);
          setUsernameValid(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUsernameChecking(false);
      }
    }, 450);

    return () => clearTimeout(checkAvailability);
  }, [username, supabase]);

  // Live Email check
  useEffect(() => {
    if (!email) {
      setEmailError(null);
      setEmailValid(null);
      return;
    }

    const parsed = registerSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message || 'Endereço de e-mail inválido.');
      setEmailValid(false);
    } else {
      setEmailError(null);
      setEmailValid(true);
    }
  }, [email]);

  // Live Password check
  useEffect(() => {
    if (!password) {
      setPasswordError(null);
      setPasswordValid(null);
      return;
    }

    const parsed = registerSchema.shape.password.safeParse(password);
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message || 'A senha deve ter pelo menos 6 caracteres.');
      setPasswordValid(false);
    } else {
      setPasswordError(null);
      setPasswordValid(true);
    }
  }, [password]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!usernameValid || !emailValid || !passwordValid) {
      setErrorMsg('Por favor, corrija os erros antes de cadastrar.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(() => {
      formAction({
        username,
        email,
        password
      });
    });
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#070b19] overflow-hidden px-4">
      {/* Elementos visuais de background com gradiente neon */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-700/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Card Principal com Glassmorphism */}
      <div className="relative w-full max-w-md bg-[#0f172a]/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent tracking-wide">
            Crie sua Conta
          </h1>
          <p className="text-slate-400 text-sm mt-1">Junte-se à galeria de defensores</p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        {/* Mensagem de Sucesso */}
        {successMsg && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg text-center">
            {successMsg}
          </div>
        )}
 
        {/* Formulário */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Nome de Usuário
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nome_do_jogador"
                className={`w-full bg-[#1e293b]/50 border rounded-xl py-3 pl-10 pr-10 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors ${
                  usernameChecking ? 'border-purple-500/50' :
                  usernameValid === true ? 'border-emerald-500/50 focus:border-emerald-500' :
                  usernameValid === false ? 'border-rose-500/50 focus:border-rose-500' :
                  'border-slate-700/50 focus:border-purple-500'
                }`}
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {usernameChecking && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                {!usernameChecking && usernameValid === true && <Check className="w-4 h-4 text-emerald-400" />}
                {!usernameChecking && usernameValid === false && <AlertCircle className="w-4 h-4 text-rose-400" />}
              </span>
            </div>
            {usernameError && (
              <p className="text-rose-400 text-[11px] mt-1 ml-1 leading-normal animate-fade-in font-medium">
                {usernameError}
              </p>
            )}
            {!usernameError && usernameValid === true && (
              <p className="text-emerald-400 text-[11px] mt-1 ml-1 leading-normal animate-fade-in font-medium">
                Nome de usuário disponível!
              </p>
            )}
          </div>
 
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@gmail.com"
                className={`w-full bg-[#1e293b]/50 border rounded-xl py-3 pl-10 pr-10 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors ${
                  emailValid === true ? 'border-emerald-500/50 focus:border-emerald-500' :
                  emailValid === false ? 'border-rose-500/50 focus:border-rose-500' :
                  'border-slate-700/50 focus:border-purple-500'
                }`}
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {emailValid === true && <Check className="w-4 h-4 text-emerald-400" />}
                {emailValid === false && <AlertCircle className="w-4 h-4 text-rose-400" />}
              </span>
            </div>
            {emailError && (
              <p className="text-rose-400 text-[11px] mt-1 ml-1 leading-normal animate-fade-in font-medium">
                {emailError}
              </p>
            )}
          </div>
 
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Senha
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={`w-full bg-[#1e293b]/50 border rounded-xl py-3 pl-10 pr-10 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors ${
                  passwordValid === true ? 'border-emerald-500/50 focus:border-emerald-500' :
                  passwordValid === false ? 'border-rose-500/50 focus:border-rose-500' :
                  'border-slate-700/50 focus:border-purple-500'
                }`}
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {passwordValid === true && <Check className="w-4 h-4 text-emerald-400" />}
                {passwordValid === false && <AlertCircle className="w-4 h-4 text-rose-400" />}
              </span>
            </div>
            {passwordError && (
              <p className="text-rose-400 text-[11px] mt-1 ml-1 leading-normal animate-fade-in font-medium">
                {passwordError}
              </p>
            )}
          </div>
 
          <button
            type="submit"
            disabled={isPending || !usernameValid || !emailValid || !passwordValid}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Cadastrar
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center text-sm text-slate-400">
          Já tem uma conta?{' '}
          <Link
            href="/login"
            className="font-medium text-purple-400 hover:text-purple-300 hover:underline transition-colors"
          >
            Faça Login
          </Link>
        </div>
      </div>
    </div>
  );
}
