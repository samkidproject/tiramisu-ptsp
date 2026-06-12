export interface UserProfile {
  uid: string;
  namaLengkap: string;
  instansi: string; // "Nama Instansi / Perusahaan / Perorangan"
  nomorHp: string;
  email: string;
  role: 'admin' | 'petugas' | 'user';
  createdAt?: any;
}

export interface Settings {
  namaInstansi: string;
  singkatanInstansi: string;
  logoInstansi: string; // Base64 or URL path
  alamat: string;
  telepon: string;
  email?: string;
  website: string;
  namaPtsp: string;
  namaPetugasDefault: string;
  jabatanPetugas: string;
  nipPetugas: string;
  tandaTanganDigital?: string; // Optional digital signature line/base64
  kopSuratPdf?: string; // Standard header copy
}

export interface LetterItem {
  nomorSurat: string;
  tanggalSurat: string;
  perihalSurat: string;
}

export interface Receipt {
  id?: string;
  nomorTandaTerima: string;
  tanggalTerima: any; // Firestore timestamp
  pengirimUid: string;
  pengirimNama: string;
  pengirimInstansi: string;
  pengirimNomorHp: string;
  pengirimEmail: string;
  suratList: LetterItem[];
  petugasUid: string;
  petugasNama: string;
  petugasNip: string;
  createdAt?: any;
}

export interface AuditLog {
  id?: string;
  logId: string;
  petugasUid: string;
  petugasNama: string;
  action: string;
  details: string;
  timestamp: any;
}
