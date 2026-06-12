import React, { useState } from 'react';
import { Settings } from '../types';
import { Save, Building, ShieldCheck, Mail, Globe, Phone, MapPin, Award } from 'lucide-react';

interface SettingsPanelProps {
  settings: Settings;
  onSave: (updated: Settings) => Promise<void>;
}

export default function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [form, setForm] = useState<Settings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSignatureDraw = () => {
    // Generate a simple template fake signature or let the user type custom text
    setForm(prev => ({ ...prev, tandaTanganDigital: "DISETUJUI-PTSP-" + Math.floor(Math.random() * 900000 + 100000) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await onSave(form);
      setSuccessMsg('Pengaturan Instansi berhasil disimpan dan diterapkan pada seluruh output PDF!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" id="instansi-settings">
      <div className="bg-brand-secondary p-6 text-white flex items-center gap-3">
        <Building className="w-6 h-6 text-brand-primary" />
        <div>
          <h2 className="text-xl font-bold font-sans">Pengaturan Instansi Pemerintah</h2>
          <p className="text-xs text-blue-200">Ubah profil lembaga, petugas PTSP default, dan kop surat untuk dinamisasi tanda terima</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {successMsg && (
          <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg text-emerald-800 text-sm font-medium animate-pulse flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Identitas Utama */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-brand-secondary flex items-center gap-2 border-b border-gray-100 pb-2">
              <Award className="w-4 h-4 text-brand-accent" />
              Identitas Instansi
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nama Instansi Lengkap</label>
              <input
                type="text"
                name="namaInstansi"
                value={form.namaInstansi}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="Kejaksaan Tinggi Lampung"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Singkatan / Kode Dinas</label>
              <input
                type="text"
                name="singkatanInstansi"
                value={form.singkatanInstansi}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="KEJATI LAMPUNG"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nama Klinik PTSP / Unit Layanan</label>
              <input
                type="text"
                name="namaPtsp"
                value={form.namaPtsp}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="PTSP Kejaksaan Tinggi Lampung"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Alamat Kantor Lengkap</label>
              <textarea
                name="alamat"
                value={form.alamat}
                onChange={handleChange}
                required
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm resize-none"
                placeholder="Jl. Terusan S. Parman No. 2, Bandar Lampung"
              />
            </div>
          </div>

          {/* Section 2: Kontak & Media */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-brand-secondary flex items-center gap-2 border-b border-gray-100 pb-2">
              <Phone className="w-4 h-4 text-brand-accent" />
              Kontak &amp; Publikasi
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nomor Telepon Dinas</label>
              <input
                type="text"
                name="telepon"
                value={form.telepon}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="0721-123456"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Email Resmi <span className="text-gray-400 font-normal lowercase">(opsional)</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="info@kejati-lampung.go.id"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Website URL Resmi</label>
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="kejati-lampung.go.id"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kop Header Cadangan / Teks Tambahan</label>
              <input
                type="text"
                name="kopSuratPdf"
                value={form.kopSuratPdf || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="Sistem Pelayanan Terpadu Satu Pintu Bidang Hukum"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Penerima PTSP default */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-bold text-brand-secondary flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
            <Award className="w-4 h-4 text-brand-accent" />
            Parameter Petugas Penerima Surat Default
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nama Petugas Penerima</label>
              <input
                type="text"
                name="namaPetugasDefault"
                value={form.namaPetugasDefault}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="Andi Wijaya, S.H."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Jabatan Petugas</label>
              <input
                type="text"
                name="jabatanPetugas"
                value={form.jabatanPetugas}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="Petugas Administrasi PTSP"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">NIP Pegawai</label>
              <input
                type="text"
                name="nipPetugas"
                value={form.nipPetugas}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="19880412 201212 1 002"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Tanda Tangan Digital */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-800">Sertifikasi &amp; Tanda Tangan Digital</h4>
              <p className="text-xs text-gray-500">Tanda tangan digital dalam bentuk hash verifikasi acak yang tercetak pada PDF tanda terima sebagai validasi otentisitas.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                name="tandaTanganDigital"
                value={form.tandaTanganDigital || ''}
                onChange={handleChange}
                className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-mono bg-gray-50 w-64 text-center text-brand-secondary focus:outline-none"
                placeholder="DISETUJUI-ELEKTRONIK"
              />
              <button
                type="button"
                onClick={handleSignatureDraw}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Acak Hash Baru
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-brand-secondary text-white hover:bg-brand-secondary-dark rounded-xl font-bold font-sans text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-brand-primary" />
            {saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
}
