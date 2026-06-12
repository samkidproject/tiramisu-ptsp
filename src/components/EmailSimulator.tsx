import React from 'react';
import { Mail, ArrowRight, Download, Eye, X, CheckSquare, Award } from 'lucide-react';
import { Receipt, Settings } from '../types';

interface EmailSimulatorProps {
  receipt: Receipt | null;
  settings: Settings;
  onClose: () => void;
  onViewPdf: () => void;
  onDownloadPdf: () => void;
}

export default function EmailSimulator({ receipt, settings, onClose, onViewPdf, onDownloadPdf }: EmailSimulatorProps) {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 bg-brand-secondary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Email Client Header */}
        <div className="bg-gradient-to-r from-brand-secondary to-blue-900 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-accent animate-bounce" />
            <div>
              <span className="text-xs font-bold text-blue-200">Simulasi Notifikasi Email Server</span>
              <p className="text-[10px] text-gray-300">Terkirim Otomatis oleh Sistem TIRAMISU</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-gray-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Outer Email Headers */}
        <div className="bg-gray-50 p-4 border-b border-gray-100 text-xs space-y-1 text-gray-600">
          <p><strong>Dari:</strong> PTSP Digital {settings.namaInstansi} &lt;ptsp-noreply@{settings.website}&gt;</p>
          <p><strong>Kepada:</strong> {receipt.pengirimNama} &lt;{receipt.pengirimEmail}&gt;</p>
          <p><strong>Subjek:</strong> [TIRAMISU PTSP] Tanda Terima Dokumen Anda Telah Diterbitkan - # {receipt.nomorTandaTerima}</p>
        </div>

        {/* Email Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-700 leading-relaxed font-sans flex-1">
          {/* Official Emblem Logo */}
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 bg-brand-primary text-brand-secondary rounded-full flex items-center justify-center font-black">
              {settings.singkatanInstansi.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-xs text-brand-secondary uppercase">{settings.namaInstansi}</h4>
              <p className="text-[10px] text-gray-500 font-medium">Sistem Tanda Terima Terintegrasi TIRAMISU</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-gray-800">Yth. {receipt.pengirimNama},</p>
            <p>
              Tanda terima dokumen kunjungan Anda ke <strong>{settings.namaPtsp}</strong> telah resmi diterbitkan oleh sistem kami.
            </p>
            <p>
              Berikut adalah detail ringkasan penerimaan surat Anda yang telah tercatat secara sah di server instansi kami:
            </p>
          </div>

          {/* Structured Detail Table */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60 text-xs space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-gray-500 font-semibold uppercase">Nomor Tanda Terima</span>
              <span className="col-span-2 font-mono font-bold text-brand-primary-dark">{receipt.nomorTandaTerima}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-gray-500 font-semibold uppercase">Instansi Pengirim</span>
              <span className="col-span-2 font-semibold text-gray-800">{receipt.pengirimInstansi}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-gray-500 font-semibold uppercase">Jumlah Surat</span>
              <span className="col-span-2 font-semibold text-gray-800 font-mono">{receipt.suratList.length} Berkas Surat</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-gray-500 font-semibold uppercase">Petugas Penerima</span>
              <span className="col-span-2 font-semibold text-gray-800">{receipt.petugasNama} (NIP: {receipt.petugasNip || '-'})</span>
            </div>
          </div>

          {/* Primary Call To Actions */}
          <div className="py-4 border-y border-gray-100 space-y-4">
            <p className="text-xs text-gray-500 text-center font-medium">Silakan lihat atau download dokumen PDF Tanda Terima resmi di bawah ini:</p>
            
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <button
                type="button"
                onClick={onViewPdf}
                className="w-full sm:w-auto px-5 py-2.5 bg-brand-secondary hover:bg-brand-secondary-dark text-white rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                <Eye className="w-4 h-4 text-brand-primary" />
                Lihat PDF
              </button>

              <button
                type="button"
                onClick={onDownloadPdf}
                className="w-full sm:w-auto px-5 py-2.5 bg-brand-primary hover:bg-amber-500 text-brand-secondary rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Email Footer Disclaimer */}
          <div className="text-[10px] text-gray-400 border-t border-gray-100 pt-4 space-y-1 text-center">
            <p>Pemberitahuan ini dikirim secara otomatis oleh server. Harap tidak membalas email ini.</p>
            <p>© 2026 {settings.namaInstansi}. All rights reserved.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
