'use client';

import React, { useState, useEffect } from 'react';
import { User, Loader2, Camera, Sparkles } from 'lucide-react';
import { Profile } from '../types/game';
import { updateProfileAction, uploadAvatarAction } from '../actions/profileActions';
import { compressAndResizeImage } from '../lib/imageOptimizer';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSave: (updatedProfile: Profile) => void;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
  profile,
  onSave
}: ProfileEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [about, setAbout] = useState('');

  useEffect(() => {
    if (profile && isOpen) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
      setAbout(profile.about || '');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  // Handle avatar upload via file selector
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    try {
      // Otimiza a imagem no cliente (limita a 300x300 e converte para WebP leve)
      const optimizedFile = await compressAndResizeImage(file, {
        maxWidth: 300,
        maxHeight: 300,
        outputFormat: 'image/webp',
        quality: 0.85
      });

      const formData = new FormData();
      formData.append('avatar', optimizedFile);
      formData.append('userId', profile.id);

      const res = await uploadAvatarAction(formData);
      if (res.success && res.data) {
        setAvatarUrl(res.data.publicUrl);
        setSuccessMsg('Avatar enviado com sucesso!');
      } else {
        setErrorMsg(res.error || 'Erro ao enviar imagem de perfil.');
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro no upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  // Save profile updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      username: username.trim(),
      avatar_url: avatarUrl.trim(),
      about: about.trim(),
      cep: profile.cep || '',
      country: profile.country || 'Brasil',
      state: profile.state || '',
      city: profile.city || ''
    };

    try {
      const res = await updateProfileAction(profile.id, payload);
      if (res.success && res.data) {
        onSave(res.data);
        setSuccessMsg('Perfil atualizado com sucesso!');
        setTimeout(() => onClose(), 800);
      } else {
        setErrorMsg(res.error || 'Não foi possível atualizar o perfil.');
      }
    } catch (err) {
      setErrorMsg('Erro inesperado ao salvar alterações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col overflow-hidden animate-fade-in relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50 transition-all cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Configurações de Perfil
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Edite suas informações públicas e foto de perfil.</p>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs p-3 rounded-xl animate-shake">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs p-3 rounded-xl animate-fade-in">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
          <div className="space-y-4 flex-1">
            {/* Avatar Selector and Upload */}
            <div className="flex items-center gap-4 bg-slate-950/30 p-3 rounded-2xl border border-slate-800/60">
              <div className="relative w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-purple-400 font-bold overflow-hidden group shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  username.charAt(0).toUpperCase() || <User className="w-6 h-6" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Foto de Perfil</span>
                <div className="flex gap-2">
                  <label className="bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95">
                    <Camera className="w-3.5 h-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                      disabled={uploading || loading}
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="Ou cole URL da foto..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-350">Nome de Usuário</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nome de usuário..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Biography Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-350">Sobre Mim (Biografia)</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Conte um pouco sobre suas campanhas e personagens..."
                rows={3}
                maxLength={500}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
