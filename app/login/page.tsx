'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'rgr@rgr.pe' && password === '123456') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('isAuthenticated', 'true');
      }
      router.push('/');
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e] p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-[#0a4a7a] mb-2">RGR - Sistema Disciplinario</h1>
        <p className="text-sm text-muted-foreground mb-4">Inicie sesión para continuar</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a4a7a]"
              placeholder="rgr@rgr.pe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a4a7a]"
              placeholder="******"
              required
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <button type="submit" className="w-full px-4 py-2 bg-[#0a4a7a] text-white rounded-lg">Iniciar sesión</button>
          </div>
        </form>
      </div>
    </div>
  );
}
