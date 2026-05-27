'use client';

import React, { useState, useEffect } from 'react';
import { getStores, saveStore } from '../../../lib/supabase/dataManager';
import { Store } from '../../../types';

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [allowedDomain, setAllowedDomain] = useState('');
  const [supportsSync, setSupportsSync] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchStoresList = async () => {
    try {
      const data = await getStores();
      setStores(data);
    } catch (err) {
      console.error('Failed to load stores', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchStoresList);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const slugified = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(slugified);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === '' || slug.trim() === '') return;

    setSaving(true);
    try {
      const storePayload: Partial<Store> = {
        name,
        slug,
        allowed_domain: allowedDomain,
        supports_price_sync: supportsSync,
        is_active: isActive,
      };

      await saveStore(storePayload);
      
      // Reset form
      setName('');
      setSlug('');
      setAllowedDomain('');
      setSupportsSync(false);
      setIsActive(true);

      // Refresh list
      await fetchStoresList();
    } catch {
      alert('Erro ao salvar loja.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && stores.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-8 h-8 border-4 border-[#8C6D62]/20 border-t-[#8C6D62] rounded-full animate-spin"></div>
        <p className="text-xs uppercase font-extrabold text-[#8A7A78] tracking-widest">Carregando lojas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header breadcrumb */}
      <div className="border-b border-[#E8E2D5]/60 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#4A3D3C] font-serif">
          Gerenciar Lojas Parceiras
        </h1>
        <p className="text-xs text-[#8A7A78] mt-0.5">
          Cadastre redes afiliadas e gerencie domínios e permissões de sincronização.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Grid: Stores Table */}
        <div className="lg:col-span-2 bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm">
          <h3 className="font-extrabold text-[#4A3D3C] text-xs uppercase tracking-wider border-b border-[#E8E2D5]/60 pb-3 mb-3 flex items-center gap-2">
            <span>🏪</span> Redes Afiliadas Ativas
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E8E2D5]/60 text-[#8A7A78] uppercase tracking-wider font-bold">
                  <th className="py-3 pr-4">Nome da Loja</th>
                  <th className="py-3 px-4 text-center">Domínio Permitido</th>
                  <th className="py-3 px-4 text-center">Sincronização</th>
                  <th className="py-3 pl-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D5]/30">
                {stores.map((s) => (
                  <tr key={s.id} className="text-[#5C4D4C] hover:bg-[#FDFBF7]/40 transition-colors">
                    <td className="py-3.5 pr-4 font-extrabold text-[#4A3D3C]">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#8A7A78] text-center font-mono">
                      {s.allowed_domain || 'Livre'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] ${
                        s.supports_price_sync ? 'bg-orange-100 text-orange-700' : 'bg-[#EAE4D8]/50 text-[#8A7A78]'
                      }`}>
                        {s.supports_price_sync ? 'Shopee Sync' : 'Sem Sync'}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {s.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Form: Register a new store */}
        <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm h-fit">
          <h3 className="font-extrabold text-[#4A3D3C] text-xs uppercase tracking-wider border-b border-[#E8E2D5]/60 pb-3 mb-4 flex items-center gap-2">
            <span>➕</span> Cadastrar Nova Loja
          </h3>

          <form onSubmit={handleSaveStore} className="flex flex-col gap-4">
            {/* Store Name */}
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Nome da Loja
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="Ex: AliExpress"
                className="mt-1.5 block w-full px-3.5 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Slug Loja
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="aliexpress"
                className="mt-1.5 block w-full px-3.5 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none"
              />
            </div>

            {/* Allowed Domain */}
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Domínio de Afiliado (Segurança)
              </label>
              <input
                type="text"
                value={allowedDomain}
                onChange={(e) => setAllowedDomain(e.target.value)}
                placeholder="aliexpress.com"
                className="mt-1.5 block w-full px-3.5 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none"
              />
            </div>

            {/* Checks: Supports Price Sync & Active */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E2D5]/50 mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#5C4D4C]">
                <input
                  type="checkbox"
                  checked={supportsSync}
                  onChange={(e) => setSupportsSync(e.target.checked)}
                  className="rounded text-[#8C6D62] focus:ring-[#8C6D62] w-4 h-4 border-[#DFD7C7]"
                />
                Suporta Sincronização de Preço
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#5C4D4C]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-[#8C6D62] focus:ring-[#8C6D62] w-4 h-4 border-[#DFD7C7]"
                />
                Loja Ativa
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-2 w-full bg-[#5C4033] hover:bg-[#4A3227] text-white text-xs font-bold py-3.5 rounded-xl uppercase tracking-wider cursor-pointer"
            >
              {saving ? 'Cadastrando...' : 'Cadastrar Loja'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
