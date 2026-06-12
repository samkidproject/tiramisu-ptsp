import React from 'react';
import { Receipt, UserProfile } from '../types';
import { FileText, Calendar, Database, Users, TrendingUp, Landmark, Building, MapPin } from 'lucide-react';

interface StatisticsDashboardProps {
  receipts: Receipt[];
  senders: UserProfile[];
}

export default function StatisticsDashboard({ receipts, senders }: StatisticsDashboardProps) {
  // Counters Calculations
  const totalReceipts = receipts.length;
  
  // Total letters sum
  const totalLetters = receipts.reduce((acc, r) => acc + (r.suratList?.length || 0), 0);

  // Today's letters count
  const todayStr = new Date().toDateString();
  const todayReceipts = receipts.filter(r => {
    const d = r.tanggalTerima?.seconds ? new Date(r.tanggalTerima.seconds * 1000) : new Date(r.tanggalTerima);
    return d.toDateString() === todayStr;
  });
  const todayLetters = todayReceipts.reduce((acc, r) => acc + (r.suratList?.length || 0), 0);

  // This Month's letters count
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthReceipts = receipts.filter(r => {
    const d = r.tanggalTerima?.seconds ? new Date(r.tanggalTerima.seconds * 1000) : new Date(r.tanggalTerima);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthLetters = monthReceipts.reduce((acc, r) => acc + (r.suratList?.length || 0), 0);

  const totalSenders = senders.length;

  // Let's analyze letter origins (asal surat) based on receipts' pengirimInstansi
  const instansiTypes: { [key: string]: number } = {
    'Kejaksaan / APH': 0,
    'Instansi Pemerintah': 0,
    'Perusahaan Swasta / BUMN': 0,
    'Lembaga Masyarakat / Ormas': 0,
    'Perorangan': 0,
  };

  receipts.forEach(r => {
    const inst = r.pengirimInstansi?.toLowerCase() || '';
    if (inst.includes('kejari') || inst.includes('kejaksaan') || inst.includes('polres') || inst.includes('polda') || inst.includes('pengadilan')) {
      instansiTypes['Kejaksaan / APH']++;
    } else if (inst.includes('dinas') || inst.includes('pemprov') || inst.includes('pemkot') || inst.includes('badan') || inst.includes('kementerian')) {
      instansiTypes['Instansi Pemerintah']++;
    } else if (inst.includes('pt') || inst.includes('cv') || inst.includes('bumn') || inst.includes('bank') || inst.includes('persero')) {
      instansiTypes['Perusahaan Swasta / BUMN']++;
    } else if (inst.includes('lsm') || inst.includes('ormas') || inst.includes('yayasan') || inst.includes('perkumpulan')) {
      instansiTypes['Lembaga Masyarakat / Ormas']++;
    } else {
      instansiTypes['Perorangan']++;
    }
  });

  // Calculate percentages
  const totalClassified = Object.values(instansiTypes).reduce((a, b) => a + b, 0) || 1;

  // Render a beautiful daily chart (past 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  const chartData = last7Days.map(day => {
    const dayStr = day.toDateString();
    const dayLabel = day.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    const dayReceipts = receipts.filter(r => {
      const d = r.tanggalTerima?.seconds ? new Date(r.tanggalTerima.seconds * 1000) : new Date(r.tanggalTerima);
      return d.toDateString() === dayStr;
    });
    const letterCount = dayReceipts.reduce((acc, r) => acc + (r.suratList?.length || 0), 0);
    return { label: dayLabel, count: letterCount };
  });

  const maxVal = Math.max(...chartData.map(d => d.count), 5);

  return (
    <div className="space-y-6" id="dashboard-statistics">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Letters */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Surat Hari Ini</p>
            <h3 className="text-3xl font-bold text-brand-secondary font-mono">{todayLetters}</h3>
            <p className="text-[10px] text-emerald-600 font-medium">+{todayReceipts.length} kunjungan</p>
          </div>
          <div className="p-3 bg-amber-50 text-brand-primary rounded-xl">
            <Calendar className="w-6 h-6 text-brand-primary-dark" />
          </div>
        </div>

        {/* This Month's Letters */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Surat Bulan Ini</p>
            <h3 className="text-3xl font-bold text-brand-secondary font-mono">{monthLetters}</h3>
            <p className="text-[10px] text-gray-500">Mulai 1 {new Date().toLocaleDateString('id-ID', { month: 'long' })}</p>
          </div>
          <div className="p-3 bg-blue-50 text-brand-secondary rounded-xl">
            <FileText className="w-6 h-6 text-brand-secondary" />
          </div>
        </div>

        {/* Total Documents Accumulated */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Surat Masuk</p>
            <h3 className="text-3xl font-bold text-brand-secondary font-mono">{totalLetters}</h3>
            <p className="text-[10px] text-brand-primary-dark font-semibold">{totalReceipts} Tanda Terima</p>
          </div>
          <div className="p-3 bg-orange-50 text-brand-accent rounded-xl">
            <Database className="w-6 h-6 text-brand-accent" />
          </div>
        </div>

        {/* Total Senders Registered */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Pengirim</p>
            <h3 className="text-3xl font-bold text-brand-secondary font-mono">{totalSenders}</h3>
            <p className="text-[10px] text-emerald-600 font-medium">Masyarakat &amp; Instansi</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphic SVG Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-brand-secondary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-primary-dark" />
              Grafik Surat Masuk (7 Hari Terakhir)
            </h4>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">Tersinkronisasi</span>
          </div>

          <div className="relative h-48 w-full flex items-end justify-between pt-6 px-4 border-b border-gray-100">
            {chartData.map((d, index) => {
              const petcentage = (d.count / maxVal) * 100;
              return (
                <div key={index} className="flex flex-col items-center flex-1 group">
                  {/* Tooltip on hover */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-brand-secondary text-white text-[10px] px-2 py-0.5 rounded absolute -top-1 font-mono">
                    {d.count} surat
                  </span>
                  
                  {/* Column Bar */}
                  <div className="w-6 bg-gradient-to-t from-brand-secondary to-brand-primary rounded-t-md transition-all duration-500 hover:brightness-110 cursor-pointer shadow-sm" style={{ height: `${Math.max(petcentage, 4)}%` }} />
                  
                  {/* Label */}
                  <span className="text-[10px] text-gray-500 mt-2 font-medium text-center truncate w-full">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instansi Breakdown Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="text-sm font-bold text-brand-secondary flex items-center gap-2 mb-4">
            <Landmark className="w-4 h-4 text-brand-accent" />
            Statistik Asal Surat (Instansi)
          </h4>

          <div className="space-y-3">
            {Object.entries(instansiTypes).map(([name, count]) => {
              const percent = Math.round((count / totalClassified) * 100);
              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className="font-mono text-gray-500 font-semibold">{count} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-secondary h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
