"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { ICONS } from '../../constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // New features state
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (forgotPasswordMode) {
        // Forgot Password Flow
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/resetar-senha`,
        });
        if (error) throw error;
        setMessage('Se o email estiver cadastrado, você receberá um link de recuperação.');
        setForgotPasswordMode(false);
      } else if (isLogin) {
        // Login Flow
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: email.split('@')[0] }
          }
        });
        if (error) throw error;

        if (data.session) {
          router.push('/dashboard');
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else {
          setMessage('Cadastro realizado! Se o login automático não ocorrer, verifique seu email para confirmar a conta.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Ocorreu um erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Conselho de Bolso</h1>
          <p className="text-slate-500 mt-2">Gestão inteligente para sua empresa.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg mb-6 text-sm border border-emerald-100">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 text-slate-900"
              placeholder="seu@email.com"
            />
          </div>

          {!forgotPasswordMode && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 text-slate-900 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center shadow-lg shadow-indigo-200"
          >
            {loading ? 'Processando...' : (forgotPasswordMode ? 'Enviar Link de Recuperação' : isLogin ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          {!forgotPasswordMode && (
            <button
              type="button"
              onClick={() => { setForgotPasswordMode(true); setError(null); setMessage(null); }}
              className="block w-full text-sm text-slate-500 hover:text-slate-700 hover:underline"
            >
              Esqueci minha senha
            </button>
          )}

          {forgotPasswordMode ? (
            <button
              type="button"
              onClick={() => { setForgotPasswordMode(false); setError(null); setMessage(null); }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Voltar para Login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}