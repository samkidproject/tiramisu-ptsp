import React, { useState } from 'react';
import { UserProfile, LetterItem, Settings } from '../types';
import { Plus, Trash2, CheckCircle, Search, User, ClipboardList, PenTool, Calendar, ShieldCheck } from 'lucide-react';

interface ReceiptFormProps {
  senders: UserProfile[];
  settings: Settings;
  officerName: string;
  officerNip: string;
  onSaveReceipt: (recipientUid: string, letters: LetterItem[]) => Promise<void>;
}

export default function ReceiptForm({ senders, settings, officerName, officerNip, onSaveReceipt }: ReceiptFormProps) {
  // States
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [searchSender, setSearchSender] = useState<string>('');
  
  // Single letter inputs
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState('');
  const [perihalSurat, setPerihalSurat] = useState('');

  // Accumulated letters list
  const [lettersList, setLettersList] = useState<LetterItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Senders filter
  const filteredSenders = senders.filter(s => {
    const term = searchSender.toLowerCase();
    return s.namaLengkap?.toLowerCase().includes(term) ||
           s.email?.toLowerCase().includes(term) ||
           s.nomorHp?.includes(term) ||
           s.instansi?.toLowerCase().includes(term);
  });

  const selectedSenderObj = senders.find(s => s.uid === selectedSenderId);

  const handleAddLetter = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nomorSurat || !tanggalSurat || !perihalSurat) {
      setErrorMsg('Harap lengkapi semua data surat!');
      return;
    }
    const newLetter: LetterItem = {
      nomorSurat,
      tanggalSurat,
      perihalSurat,
    };
    setLettersList(prev => [...prev, newLetter]);
    // Reset inputs but preserve common elements
    setNomorSurat('');
    setTanggalSurat('');
    setPerihalSurat('');
  };

  const handleRemoveLetter = (index: number) => {
    setLettersList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAll = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!selectedSenderId) {
      setErrorMsg('Harap pilih pengirim dokumen terlebih dahulu!');
      return;
    }
    if (lettersList.length === 0) {
      setErrorMsg('Minimal harus memasukkan 1 surat untuk didaftarkan!');
      return;
    }

    setSaving(true);
    try {
      await onSaveReceipt(selectedSenderId, lettersList);
      setSuccessMsg(`Tanda Terima berhasil diterbitkan!`);
      // Reset form
      setLettersList([]);
      setSelectedSenderId('');
      setSearchSender('');
    } catch (err: any) {
      setErrorMsg('Gagal memproses tanda terima. Cek koneksi Anda.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="receipt-entry-form">
      {/* Sender Picker block */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-brand-secondary flex items-center gap-2 border-b border-gray-100 pb-2">
          <User className="w-4 h-4 text-brand-primary-dark" />
          1. Pilih Pengirim Terdaftar
        </h3>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cari Pengirim (Nama/No. HP/Email/Instansi)</label>
          <div className="relative">
            <input
              type="text"
              value={searchSender}
              onChange={(e) => {
                setSearchSender(e.target.value);
                if (selectedSenderId) setSelectedSenderId(''); // Reset selection if they edit filter
              }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ketik kata kunci pencarian..."
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* List of senders */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {filteredSenders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Pengirim tidak ditemukan</p>
          ) : (
            filteredSenders.map(s => {
              const isSelected = selectedSenderId === s.uid;
              return (
                <button
                  key={s.uid}
                  type="button"
                  onClick={() => {
                    setSelectedSenderId(s.uid);
                    setSearchSender(s.namaLengkap);
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2 cursor-pointer ${
                    isSelected
                      ? 'border-brand-primary bg-amber-50/50 ring-2 ring-brand-primary/20'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-7 h-7 bg-brand-secondary text-brand-primary text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {s.namaLengkap?.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-gray-800">{s.namaLengkap}</p>
                    <p className="text-gray-500 text-[10px] truncate">{s.instansi}</p>
                    <p className="text-gray-400 text-[10px]">{s.nomorHp} | {s.email}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {selectedSenderObj && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 tracking-wide uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Terpilih &amp; Terverifikasi
            </span>
            <p className="text-xs font-semibold text-gray-800">{selectedSenderObj.namaLengkap}</p>
            <p className="text-[10px] text-gray-600 font-medium">{selectedSenderObj.instansi}</p>
          </div>
        )}
      </div>

      {/* Letters accumulating inputs */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-brand-secondary flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
            <ClipboardList className="w-4 h-4 text-brand-accent animate-pulse" />
            2. Input Surat Dokumen Fisik
          </h3>

          <form onSubmit={handleAddLetter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nomor Surat</label>
              <input
                type="text"
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-primary focus:outline-none"
                placeholder="B-123/L.3/06/2026"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tanggal Surat</label>
              <input
                type="date"
                value={tanggalSurat}
                onChange={(e) => setTanggalSurat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Perihal / Hal Surat</label>
              <input
                type="text"
                value={perihalSurat}
                onChange={(e) => setPerihalSurat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-primary focus:outline-none"
                placeholder="Permohonan Audiensi / Pelaporan Berkas Tahap II"
              />
            </div>

            <div className="md:col-span-2 flex justify-between items-center pt-2">
              <p className="text-[10px] text-gray-400">Petugas Penerima: <strong>{officerName}</strong></p>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Surat Ke Daftar
              </button>
            </div>
          </form>
        </div>

        {/* Accumulated list table */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold text-brand-secondary flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-brand-primary-dark" />
              Daftar Akumulasi Surat ({lettersList.length} Unit)
            </h3>
            {lettersList.length > 0 && (
              <button
                onClick={() => setLettersList([])}
                className="text-[10px] text-red-600 font-bold hover:underline"
              >
                Kosongkan Semua
              </button>
            )}
          </div>

          {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}
          {successMsg && <p className="text-xs text-emerald-600 font-bold">{successMsg}</p>}

          {lettersList.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
              <p className="text-xs text-gray-400">Belum ada surat yang dimasukkan ke kunjungan ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600">
                    <th className="p-2.5 rounded-l-lg font-bold">No</th>
                    <th className="p-2.5 font-bold">Nomor Surat</th>
                    <th className="p-2.5 font-bold">Tanggal</th>
                    <th className="p-2.5 font-bold">Perihal/Isi</th>
                    <th className="p-2.5 rounded-r-lg font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lettersList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-2.5 font-semibold text-gray-500">{idx + 1}</td>
                      <td className="p-2.5 font-mono text-gray-700 font-medium">{item.nomorSurat}</td>
                      <td className="p-2.5 text-gray-500">{item.tanggalSurat}</td>
                      <td className="p-2.5 text-gray-700 truncate max-w-xs">{item.perihalSurat}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLetter(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitAll}
                  disabled={saving}
                  className="px-6 py-2.5 bg-brand-secondary text-white hover:bg-brand-secondary-dark rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 text-brand-primary" />
                  {saving ? 'Memproses...' : 'Simpan & Cetak Tanda Terima'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
