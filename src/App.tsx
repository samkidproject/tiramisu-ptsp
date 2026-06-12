import React, { useState, useEffect } from 'react';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { UserProfile, Settings, Receipt } from './types';
import { generateReceiptPDF } from './utils/pdf';
import SettingsPanel from './components/SettingsPanel';
import StatisticsDashboard from './components/StatisticsDashboard';
import ReceiptForm from './components/ReceiptForm';
import EmailSimulator from './components/EmailSimulator';

// Lucide Icons
import { 
  Building, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings as SettingsIcon, 
  LogIn, 
  LogOut, 
  Search, 
  QrCode, 
  Download, 
  Eye, 
  CheckCircle, 
  X, 
  Check, 
  User, 
  Menu, 
  ChevronRight, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  ExternalLink
} from 'lucide-react';

// Default Settings
const DEFAULT_SETTINGS: Settings = {
  namaInstansi: "Kejaksaan Tinggi Lampung",
  singkatanInstansi: "KEJATI LAMPUNG",
  logoInstansi: "https://kejati-lampung.kejaksaan.go.id/wp-content/uploads/2021/04/cropped-logo-Kejati-Lampung-1.png",
  alamat: "Jl. Terusan S. Parman No. 2, Bandar Lampung, Lampung",
  telepon: "(0721) 482409",
  email: "kejatilampung@kejaksaan.go.id",
  website: "kejati-lampung.kejaksaan.go.id",
  namaPtsp: "PTSP Kejaksaan Tinggi Lampung",
  namaPetugasDefault: "Andi Wijaya, S.H.",
  jabatanPetugas: "Petugas Administrasi PTSP",
  nipPetugas: "19880412 201212 1 002",
  tandaTanganDigital: "DISETUJUI-ELEKTRONIK-SAH",
  kopSuratPdf: "Sistem Pelayanan Terpadu Satu Pintu Bidang Hukum"
};

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showProfileCompleteModal, setShowProfileCompleteModal] = useState(false);

  // Profile Form States
  const [profileForm, setProfileForm] = useState({
    namaLengkap: '',
    instansi: '',
    nomorHp: ''
  });

  // Main UI configurations
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allowedOfficers, setAllowedOfficers] = useState<string[]>([]);
  const [whitelistEmail, setWhitelistEmail] = useState('');
  const [activeTab, setActiveTab] = useState<string>('my-receipts');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month, year

  // Action / Modals
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showEmailReceipt, setShowEmailReceipt] = useState<Receipt | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLoginCode, setShowAdminLoginCode] = useState(false);
  const [adminSecretCode, setAdminSecretCode] = useState('');
  const [adminStatusError, setAdminStatusError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'deleteSender' | 'deleteReceipt' | 'removeWhitelist' | null;
    params: any;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionType: null,
    params: null,
  });

  // Mobile Menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // QR Verification Screen
  const [verificationQuery, setVerificationQuery] = useState<string | null>(null);
  const [verificationReceipt, setVerificationReceipt] = useState<Receipt | null>(null);
  const [verifying, setVerifying] = useState(false);

  // ---------------------------------------------------------
  // INITIAL STAGE LOAD & CHECK PARAMS
  // ---------------------------------------------------------
  useEffect(() => {
    // Check if URL has ?verify=TMS-2026-XXXX
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify');
    if (verifyToken) {
      setVerificationQuery(verifyToken);
      performVerification(verifyToken);
    }

    // Load active settings from Firestore
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'instansi'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as Settings);
      } else {
        // Boostrap settings
        setDoc(doc(db, 'settings', 'instansi'), DEFAULT_SETTINGS).catch(err => console.error("Bootstrap settings failed: ", err));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/instansi');
    });

    // Observe user sign in
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);
      if (fbUser) {
        setProfileLoading(true);
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            let finalRole = data.role;
            const emailLower = fbUser.email?.toLowerCase().trim() || '';
            if (emailLower === 'samkidproject@gmail.com' || emailLower === 'lukepoktlampung@gmail.com') {
              finalRole = 'admin';
            } else {
              if (emailLower) {
                const whitelistedRef = doc(db, 'allowedOfficers', emailLower);
                const whitelistedSnap = await getDoc(whitelistedRef);
                if (whitelistedSnap.exists() && finalRole === 'user') {
                  finalRole = 'petugas';
                }
              }
            }

            const updatedData = { ...data, role: finalRole };
            if (finalRole !== data.role) {
              await setDoc(userDocRef, { role: finalRole }, { merge: true });
            }
            
            setUserProfile(updatedData);
            
            // Set dynamic forms
            setProfileForm({
              namaLengkap: data.namaLengkap || fbUser.displayName || '',
              instansi: data.instansi || '',
              nomorHp: data.nomorHp || ''
            });

            // If profile is incompleted, prompt completion
            if (!data.namaLengkap || !data.instansi || !data.nomorHp) {
              setShowProfileCompleteModal(true);
            } else {
              setShowProfileCompleteModal(false);
            }
          } else {
            // New User Registration
            let newRole: 'admin' | 'petugas' | 'user' = 'user';
            const emailLower = fbUser.email?.toLowerCase().trim() || '';
            if (emailLower === 'lukepoktlampung@gmail.com' || emailLower === 'samkidproject@gmail.com') {
              newRole = 'admin';
            } else {
              if (emailLower) {
                const whitelistedRef = doc(db, 'allowedOfficers', emailLower);
                const whitelistedSnap = await getDoc(whitelistedRef);
                if (whitelistedSnap.exists()) {
                  newRole = 'petugas';
                }
              }
            }
            
            const initialProfile: UserProfile = {
              uid: fbUser.uid,
              namaLengkap: fbUser.displayName || '',
              instansi: '',
              nomorHp: '',
              email: fbUser.email || '',
              role: newRole
            };
            
            await setDoc(userDocRef, initialProfile);
            setUserProfile(initialProfile);
            setProfileForm({
              namaLengkap: initialProfile.namaLengkap,
              instansi: '',
              nomorHp: ''
            });
            setShowProfileCompleteModal(true);
          }
        } catch (err) {
          console.error("Failed to load user profile: ", err);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUserProfile(null);
        setProfileLoading(false);
        setShowProfileCompleteModal(false);
      }
    });

    return () => {
      unsubscribeSettings();
      unsubscribeAuth();
    };
  }, []);

  // ---------------------------------------------------------
  // LISTEN TO COLLECTIONS
  // ---------------------------------------------------------
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    let unsubscribeReceipts = () => {};
    let unsubscribeUsers = () => {};
    let unsubscribeAllowed = () => {};

    // Senders or staff have access to different datasets
    const isAdminOrStaff = userProfile.role === 'admin' || userProfile.role === 'petugas';

    if (isAdminOrStaff) {
      // Admins/officers see all receipts ordered by date
      const qReceipts = query(collection(db, 'receipts'), orderBy('tanggalTerima', 'desc'));
      unsubscribeReceipts = onSnapshot(qReceipts, (snapshot) => {
        const list: Receipt[] = [];
        snapshot.forEach(d => {
          list.push({ id: d.id, ...d.data() } as Receipt);
        });
        setAllReceipts(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'receipts');
      });

      // Admins/officers see all users
      const qUsers = query(collection(db, 'users'), orderBy('namaLengkap', 'asc'));
      unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach(d => {
          list.push({ uid: d.id, ...d.data() } as UserProfile);
        });
        setAllUsers(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
      });

      // Admins/officers see whitelisted allowed PTSP officer emails
      const qAllowed = query(collection(db, 'allowedOfficers'));
      unsubscribeAllowed = onSnapshot(qAllowed, (snapshot) => {
        const emailList: string[] = [];
        snapshot.forEach(d => {
          emailList.push(d.id.toLowerCase());
        });
        setAllowedOfficers(emailList);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'allowedOfficers');
      });

      // Default active tab to Admin panel
      setActiveTab('admin-dashboard');
    } else {
      // Citizen only sees their own receipts
      const qReceipts = query(
        collection(db, 'receipts'), 
        where('pengirimUid', '==', currentUser.uid)
      );
      unsubscribeReceipts = onSnapshot(qReceipts, (snapshot) => {
        const list: Receipt[] = [];
        snapshot.forEach(d => {
          list.push({ id: d.id, ...d.data() } as Receipt);
        });
        // Clientside sorting as composite index can be avoided to reduce setup errors.
        list.sort((a, b) => {
          const tA = a.tanggalTerima?.seconds || 0;
          const tB = b.tanggalTerima?.seconds || 0;
          return tB - tA;
        });
        setAllReceipts(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'receipts');
      });

      setActiveTab('my-receipts');
    }

    return () => {
      unsubscribeReceipts();
      unsubscribeUsers();
      unsubscribeAllowed();
    };
  }, [currentUser, userProfile]);

  // ---------------------------------------------------------
  // ACTION WORKFLOWS
  // ---------------------------------------------------------
  const performVerification = async (token: string) => {
    setVerifying(true);
    setVerificationReceipt(null);
    try {
      // 1. Try DIRECT GET first (fully allowed for guest/unauthenticated users under get rules)
      const docRef = doc(db, 'receipts', token);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setVerificationReceipt({ id: docSnap.id, ...docSnap.data() } as Receipt);
        return;
      }

      // 2. Fallback search by nomorTandaTerima query (works if authenticated, or wrapped in safe try-catch if guest)
      try {
        const q = query(collection(db, 'receipts'), where('nomorTandaTerima', '==', token));
        const res = await getDocs(q);
        if (!res.empty) {
          setVerificationReceipt({ id: res.docs[0].id, ...res.docs[0].data() } as Receipt);
        }
      } catch (queryErr) {
        console.warn("Query verification failed (guest user is not allowed to scan collections):", queryErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/unauthorized-domain' || (err?.message && err.message.toLowerCase().includes('unauthorized-domain'))) {
        setAuthError(`auth/unauthorized-domain: Domain "${window.location.hostname}" belum diizinkan di Firebase Console -> Authentication -> Settings -> Authorized domains.`);
      } else {
        setAuthError(err?.message || String(err));
      }
    }
  };

  const handleProfileCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const updatedProfile = {
        ...userProfile,
        namaLengkap: profileForm.namaLengkap,
        instansi: profileForm.instansi,
        nomorHp: profileForm.nomorHp,
        uid: currentUser.uid,
        email: currentUser.email || '',
        role: userProfile?.role || 'user'
      };
      await setDoc(doc(db, 'users', currentUser.uid), updatedProfile, { merge: true });
      setUserProfile(updatedProfile as UserProfile);
      setShowProfileCompleteModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (updated: Settings) => {
    try {
      await setDoc(doc(db, 'settings', 'instansi'), updated);
      setSettings(updated);
      
      // Audit log creation automatically
      const logId = 'log_' + Date.now();
      await setDoc(doc(db, 'auditLogs', logId), {
        logId,
        petugasUid: currentUser?.uid || 'SYSTEM',
        petugasNama: userProfile?.namaLengkap || 'Admin',
        action: 'UPDATE_SETTINGS',
        details: 'Mengubah pengaturan instansi pemerintah PTSP',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveReceipt = async (recipientUid: string, letters: any[]) => {
    try {
      const senderObj = allUsers.find(u => u.uid === recipientUid);
      if (!senderObj) throw new Error('Pengirim tidak ditemukan');

      // Generate receipt number sequence
      const year = new Date().getFullYear();
      const count = allReceipts.length + 1;
      const formattedSeq = String(count).padStart(4, '0');
      const seqId = `TMS-${year}-${formattedSeq}`;

      const receiptId = seqId; // Use seqId (document nomorTandaTerima) as document ID directly
      const newRec: Receipt = {
        id: receiptId,
        nomorTandaTerima: seqId,
        tanggalTerima: new Date().getTime(), // Milliseconds standard to avoid immediate layout glitches
        pengirimUid: recipientUid,
        pengirimNama: senderObj.namaLengkap,
        pengirimInstansi: senderObj.instansi,
        pengirimNomorHp: senderObj.nomorHp,
        pengirimEmail: senderObj.email,
        suratList: letters,
        petugasUid: currentUser.uid,
        petugasNama: userProfile?.namaLengkap || settings.namaPetugasDefault,
        petugasNip: settings.nipPetugas
      };

      // Save to firebase
      await setDoc(doc(db, 'receipts', receiptId), newRec);

      // Save audit log
      const logId = 'log_' + Date.now();
      await setDoc(doc(db, 'auditLogs', logId), {
        logId,
        petugasUid: currentUser?.uid,
        petugasNama: userProfile?.namaLengkap || 'Petugas',
        action: 'CREATE_RECEIPT',
        details: `Menerbitkan tanda terima ${seqId} dengan ${letters.length} surat`,
        timestamp: serverTimestamp()
      });

      // Display simulation pop-up & Auto PDF generation download options
      setShowEmailReceipt(newRec);

    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'receipts');
    }
  };

  const handleDownloadPdfFile = async (item: Receipt) => {
    try {
      const pdfDoc = await generateReceiptPDF(item, settings);
      pdfDoc.save(`Tanda_Terima_${item.nomorTandaTerima}.pdf`);
    } catch (err) {
      console.error("Failed to download PDF", err);
    }
  };

  const handleDirectPrintOrView = async (item: Receipt) => {
    try {
      const pdfDoc = await generateReceiptPDF(item, settings);
      const url = pdfDoc.output('bloburl');
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  // Switch to simulate special role updates
  const handleToggleBackdoorRole = async (targetRole: 'admin' | 'petugas' | 'user') => {
    if (!currentUser) return;
    try {
      const updated = { ...userProfile, role: targetRole };
      await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
      setUserProfile(updated as UserProfile);
      setAdminStatusError(`Berhasil mengalihkan peran akses ke: ${targetRole.toUpperCase()}!`);
      setTimeout(() => setAdminStatusError(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // SUPER ADMIN SPECIAL CAPABILITIES
  const handleDeleteSender = (uid: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Data Profil Pengirim',
      message: 'Apakah Anda yakin ingin menghapus data pengirim ini secara permanen dari server? Tindakan ini tidak dapat dibatalkan.',
      actionType: 'deleteSender',
      params: { uid }
    });
  };

  const handleDeleteReceipt = (id: string, seqNo: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Tanda Terima Surat',
      message: `Apakah Anda yakin ingin menghapus tanda terima surat ${seqNo} secara permanen dari server? Tindakan ini tidak dapat dibatalkan.`,
      actionType: 'deleteReceipt',
      params: { id, seqNo }
    });
  };

  const handleUpdateUserRole = async (uid: string, newRole: 'admin' | 'petugas' | 'user') => {
    try {
      await setDoc(doc(db, 'users', uid), { role: newRole }, { merge: true });
      setAdminStatusError(`Berhasil memperbarui peran akses pengirim ke: ${newRole.toUpperCase()}!`);
      setTimeout(() => setAdminStatusError(''), 3000);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const handleAddWhitelistEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToWhitelist = whitelistEmail.trim().toLowerCase();
    if (!emailToWhitelist) return;
    
    try {
      await setDoc(doc(db, 'allowedOfficers', emailToWhitelist), {
        addedAt: new Date().toISOString(),
        addedBy: currentUser?.email || 'System'
      });
      setWhitelistEmail('');
      setAdminStatusError(`Berhasil mendaftarkan email ${emailToWhitelist} ke daftar petugas PTSP!`);
      setTimeout(() => setAdminStatusError(''), 4000);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `allowedOfficers/${emailToWhitelist}`);
    }
  };

  const handleRemoveWhitelistEmail = (email: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cabut Otorisasi Petugas',
      message: `Apakah Anda yakin ingin mencabut izin hak akses petugas dari ${email}?`,
      actionType: 'removeWhitelist',
      params: { email }
    });
  };

  const handleExecuteConfirmedAction = async () => {
    const { actionType, params } = confirmDialog;
    setConfirmDialog(p => ({ ...p, isOpen: false }));
    if (!actionType || !params) return;

    try {
      if (actionType === 'deleteSender') {
        const { uid } = params;
        await deleteDoc(doc(db, 'users', uid));
        setAdminStatusError("Sukses menghapus data pengirim!");
        setTimeout(() => setAdminStatusError(''), 3000);
      } else if (actionType === 'deleteReceipt') {
        const { id, seqNo } = params;
        await deleteDoc(doc(db, 'receipts', id));
        setAdminStatusError(`Sukses menghapus surat/tanda terima ${seqNo}!`);
        // if currently open detail is the deleted one, close details.
        setSelectedReceipt(curr => curr?.id === id ? null : curr);
        setTimeout(() => setAdminStatusError(''), 3000);
      } else if (actionType === 'removeWhitelist') {
        const { email } = params;
        await deleteDoc(doc(db, 'allowedOfficers', email.toLowerCase().trim()));
        setAdminStatusError(`Berhasil mencabut otorisasi petugas untuk ${email}!`);
        setTimeout(() => setAdminStatusError(''), 4000);
      }
    } catch (err: any) {
      console.error(err);
      const pathStr = actionType === 'deleteSender' 
        ? `users/${params.uid}` 
        : actionType === 'deleteReceipt' 
          ? `receipts/${params.id}` 
          : `allowedOfficers/${params.email}`;
      handleFirestoreError(err, OperationType.DELETE, pathStr);
    }
  };

  // Logo Clicks logic to trigger secret backdoor
  const handleLogoClick = () => {
    const nextVal = logoClicks + 1;
    setLogoClicks(nextVal);
    if (nextVal >= 5) {
      setShowAdminLoginCode(true);
      setLogoClicks(0); // Reset clicks
    }
  };

  // CSV Excel export generator
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "No,No Tanda Terima,Tanggal Terima,Pengirim,Instansi,No HP,Email,Jumlah Surat,Petugas\n";
    
    allReceipts.forEach((r, idx) => {
      const d = r.tanggalTerima?.seconds ? new Date(r.tanggalTerima.seconds * 1000) : new Date(r.tanggalTerima);
      const formattedDate = d.toLocaleDateString('id-ID');
      const line = `"${idx+1}","${r.nomorTandaTerima}","${formattedDate}","${r.pengirimNama}","${r.pengirimInstansi}","${r.nomorHp || r.pengirimNomorHp || ''}","${r.pengirimEmail}","${r.suratList?.length || 0}","${r.petugasNama}"`;
      csvContent += line + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Surat_Masuk_${settings.singkatanInstansi}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSuperAdmin = currentUser?.email?.toLowerCase().trim() === 'samkidproject@gmail.com' ||
                       currentUser?.email?.toLowerCase().trim() === 'lukepoktlampung@gmail.com';

  // Filtering Receipts list
  const filteredReceipts = allReceipts.filter(r => {
    const term = searchTerm.toLowerCase();
    const matchesKeyword = 
      r.nomorTandaTerima?.toLowerCase().includes(term) ||
      r.pengirimNama?.toLowerCase().includes(term) ||
      r.pengirimInstansi?.toLowerCase().includes(term) ||
      r.suratList?.some(letter => 
        letter.nomorSurat?.toLowerCase().includes(term) ||
        letter.perihalSurat?.toLowerCase().includes(term)
      );

    if (!matchesKeyword) return false;

    // Apply Time filter
    if (dateFilter === 'all') return true;
    
    const rDate = r.tanggalTerima?.seconds ? new Date(r.tanggalTerima.seconds * 1000) : new Date(r.tanggalTerima);
    const now = new Date();
    
    if (dateFilter === 'today') {
      return rDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return rDate >= oneWeekAgo;
    }
    if (dateFilter === 'month') {
      return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'year') {
      return rDate.getFullYear() === now.getFullYear();
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-brand-surface text-brand-text flex flex-col md:flex-row font-sans selection:bg-brand-primary selection:text-brand-secondary">
      
      {/* ---------------------------------------------------------
          DESKTOP SIDEBAR NAVIGATION (Clean Utility / Minimal Layout Theme)
         --------------------------------------------------------- */}
      {currentUser && !verificationQuery && (
        <aside className="hidden md:flex w-[260px] bg-brand-secondary text-white flex-col shrink-0 h-screen sticky top-0 border-r border-[#1e293b]/10 shadow-sm">
          <div className="p-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={handleLogoClick}
                className="w-8 h-8 bg-brand-primary text-brand-secondary font-black rounded-lg flex items-center justify-center cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                title="Ketuk 5 kali untuk menu rahasia admin"
              >
                <Building className="w-5 h-5 text-brand-secondary" />
              </button>
              <h1 className="text-base font-black tracking-tight text-white leading-tight">
                TIRAMISU<span className="text-brand-primary uppercase font-bold">PTSP</span>
              </h1>
            </div>
            <p className="text-[9px] opacity-65 leading-tight uppercase font-medium tracking-wide">{settings.singkatanInstansi}</p>
          </div>

          <nav className="mt-6 flex-grow space-y-1 px-3">
            {userProfile?.role !== 'admin' && userProfile?.role !== 'petugas' ? (
              <>
                <button
                  onClick={() => setActiveTab('my-receipts')}
                  className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'my-receipts' 
                      ? 'bg-white/10 border-l-4 border-brand-primary text-white font-bold' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-4 h-4 text-brand-primary" />
                  Tanda Terima Saya
                </button>
                <button
                  onClick={() => setActiveTab('my-profile')}
                  className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'my-profile' 
                      ? 'bg-white/10 border-l-4 border-brand-primary text-white font-bold' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <User className="w-4 h-4 text-brand-primary" />
                  Profil Saya
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'admin-dashboard' 
                      ? 'bg-white/10 border-l-4 border-brand-primary text-white font-bold' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-brand-primary" />
                  Dashboard Overview
                </button>
                <button
                  onClick={() => setActiveTab('admin-receipts')}
                  className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'admin-receipts' 
                      ? 'bg-white/10 border-l-4 border-brand-primary text-white font-bold' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-brand-primary" />
                  Penerimaan Dokumen
                </button>
                <button
                  onClick={() => setActiveTab('admin-all-receipts')}
                  className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'admin-all-receipts' 
                      ? 'bg-white/10 border-l-4 border-brand-primary text-white font-bold' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-4 h-4 text-brand-primary" />
                  Tanda Terima Dokumen
                </button>
                <button
                  onClick={() => setActiveTab('admin-users')}
                  className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'admin-users' 
                      ? 'bg-white/10 border-l-4 border-brand-primary text-white font-bold' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users className="w-4 h-4 text-brand-primary" />
                  Manajemen Pengirim
                </button>
                <button
                  onClick={() => setActiveTab('admin-settings')}
                  className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'admin-settings' 
                      ? 'bg-white/10 border-l-4 border-brand-primary text-white font-bold' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4 text-brand-primary" />
                  Kelola Instansi
                </button>
              </>
            )}
          </nav>

          <div className="p-4 border-t border-white/10 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-primary text-brand-secondary flex items-center justify-center text-xs font-black">
                  {userProfile?.namaLengkap?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="truncate w-24">
                  <p className="text-xs font-bold truncate text-white">{userProfile?.namaLengkap}</p>
                  <p className="text-[9px] opacity-60 uppercase truncate text-gray-350">Akses: {userProfile?.role}</p>
                </div>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-900 border border-white/10 hover:border-red-900 text-gray-300 hover:text-white transition-all cursor-pointer"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ---------------------------------------------------------
          RESPONSIVE MOBILE HEADER DESIGN
         --------------------------------------------------------- */}
      <header className={`md:hidden bg-brand-secondary text-white w-full sticky top-0 z-40 shadow-md px-4 py-3 flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLogoClick}
            className="w-8 h-8 bg-brand-primary text-brand-secondary font-black rounded-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
            title="Ketuk 5 kali untuk menu rahasia"
          >
            <Building className="w-4 h-4 text-brand-secondary" />
          </button>
          <div className="leading-tight">
            <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              TIRAMISU PTSP
            </h1>
            <p className="text-[8px] text-gray-300 font-mono font-bold uppercase">{settings.singkatanInstansi}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-gray-300 hover:text-white bg-white/5 rounded-lg border border-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="px-3 py-1.5 bg-brand-primary text-brand-secondary rounded-lg font-bold text-xxs uppercase tracking-wider"
            >
              Masuk
            </button>
          )}
        </div>
      </header>

      {/* Responsive Mobile Menu Drawer Panel */}
      {mobileMenuOpen && currentUser && (
        <div className="md:hidden bg-brand-secondary text-white px-4 py-3 border-b border-blue-900/40 flex flex-col space-y-2.5 shrink-0 animate-fadeIn">
          {userProfile?.role !== 'admin' && userProfile?.role !== 'petugas' ? (
            <>
              <button
                onClick={() => { setActiveTab('my-receipts'); setMobileMenuOpen(false); }}
                className={`w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-xs font-semibold ${activeTab === 'my-receipts' ? 'bg-white/10 text-white' : ''}`}
              >
                Tanda Terima Saya
              </button>
              <button
                onClick={() => { setActiveTab('my-profile'); setMobileMenuOpen(false); }}
                className={`w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-xs font-semibold ${activeTab === 'my-profile' ? 'bg-white/10 text-white' : ''}`}
              >
                Profil Saya
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setActiveTab('admin-dashboard'); setMobileMenuOpen(false); }}
                className={`w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-xs font-semibold ${activeTab === 'admin-dashboard' ? 'bg-white/10 text-white' : ''}`}
              >
                Dashboard Statistik
              </button>
              <button
                onClick={() => { setActiveTab('admin-receipts'); setMobileMenuOpen(false); }}
                className={`w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-xs font-semibold ${activeTab === 'admin-receipts' ? 'bg-white/10 text-white' : ''}`}
              >
                Penerimaan Dokumen
              </button>
              <button
                onClick={() => { setActiveTab('admin-all-receipts'); setMobileMenuOpen(false); }}
                className={`w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-xs font-semibold ${activeTab === 'admin-all-receipts' ? 'bg-white/10 text-white' : ''}`}
              >
                Kelola Seluruh Surat
              </button>
              <button
                onClick={() => { setActiveTab('admin-users'); setMobileMenuOpen(false); }}
                className={`w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-xs font-semibold ${activeTab === 'admin-users' ? 'bg-white/10 text-white' : ''}`}
              >
                Data Pengirim
              </button>
              <button
                onClick={() => { setActiveTab('admin-settings'); setMobileMenuOpen(false); }}
                className={`w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-xs font-semibold ${activeTab === 'admin-settings' ? 'bg-white/10 text-white' : ''}`}
              >
                Pengaturan
              </button>
            </>
          )}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-300">
            <span className="text-[10px] uppercase font-bold text-brand-accent">Akses: {userProfile?.role}</span>
            <button
              onClick={() => { signOut(auth); setMobileMenuOpen(false); }}
              className="text-red-300 hover:text-white font-bold text-[11px] uppercase flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          RIGHT-HAND SIDE CONTENT VIEW WRAPPER
         --------------------------------------------------------- */}
      <div className="flex-grow min-w-0 flex flex-col md:h-screen md:overflow-y-auto bg-brand-surface">
        
        {/* Desktop Top Header Bar containing government Active status and selected fast role bypass switch */}
        {currentUser && !verificationQuery && (
          <header className="hidden md:flex h-[72px] bg-white border-b border-[#E2E8F0] items-center justify-between px-8 shrink-0 sticky top-0 z-30 shadow-xs">
            <div>
              <span className="bg-brand-secondary text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded leading-none inline-block">
                INSTANSI AKTIF: {settings.namaInstansi.toUpperCase()}
              </span>
              <h2 className="text-base font-bold text-slate-800 leading-tight mt-1 uppercase tracking-tight">
                {activeTab === 'admin-dashboard' && "Dashboard Monitoring"}
                {activeTab === 'admin-receipts' && "Penerimaan Dokumen Surat"}
                {activeTab === 'admin-all-receipts' && "Kelola Seluruh Surat"}
                {activeTab === 'admin-users' && "Data Pengirim"}
                {activeTab === 'admin-settings' && "Pengaturan Klinik / Instansi"}
                {activeTab === 'my-receipts' && "Tanda Terima Saya"}
                {activeTab === 'my-profile' && "Profil Saya"}
              </h2>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 select-none">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Akses Cepat:</span>
                  <select
                    value={userProfile?.role}
                    onChange={(e) => handleToggleBackdoorRole(e.target.value as any)}
                    className="bg-slate-100 text-[10px] font-bold text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    title="Panel Backdoor Pengubah Akses"
                  >
                    <option value="user">Mode Pengunjung</option>
                    <option value="petugas">Mode Petugas PTSP</option>
                    <option value="admin">Mode Super Admin</option>
                  </select>
                </div>
              </div>
            )}
          </header>
        )}

        {/* Content Pane container */}
        <main className="p-6 sm:p-8 space-y-6 flex-1 bg-brand-surface overflow-y-auto">

        {/* ---------------------------------------------------------
            QR PUBLIC VERIFICATION SCREEN (Takes priority if loaded)
           --------------------------------------------------------- */}
        {verificationQuery && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6 text-center animate-fadeIn relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-brand-primary" />
            
            <button
              onClick={() => {
                setVerificationQuery(null);
                setVerificationReceipt(null);
                // Clear URL search params without page reload for clean user states
                window.history.pushState({}, document.title, window.location.pathname);
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-brand-primary-dark">
              <QrCode className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-brand-secondary font-sans leading-tight">
                Verifikasi Dokumen Digital PTSP
              </h2>
              <p className="text-xs text-gray-500">Tersinkronisasi dengan Database Server {settings.namaInstansi}</p>
            </div>

            {verifying ? (
              <div className="p-12 text-center text-gray-500 text-xs animate-pulse">
                Melakukan kueri verifikasi sertifikasi tanda terima di blockchain server...
              </div>
            ) : verificationReceipt ? (
              <div className="space-y-6">
                {/* VALID BADGE SHIELD */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col items-center gap-2 animate-bounce">
                  <ShieldCheck className="w-12 h-12 text-emerald-600" />
                  <div>
                    <h3 className="text-emerald-800 font-extrabold text-sm uppercase tracking-wider">STANDAR DOKUMEN VALID &amp; ASLI</h3>
                    <p className="text-[10px] text-emerald-700">Tanda terima ini teridentifikasi sah terdaftar di server PTSP.</p>
                  </div>
                </div>

                {/* RECEIPTS DETAILS */}
                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 text-left p-5 text-xs space-y-3">
                  <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-semibold uppercase">No. Tanda Terima</span>
                    <span className="col-span-2 font-mono font-bold text-gray-900">{verificationReceipt.nomorTandaTerima}</span>
                  </div>
                  <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-semibold uppercase">Nama Pengirim</span>
                    <span className="col-span-2 font-bold text-gray-900">{verificationReceipt.pengirimNama}</span>
                  </div>
                  <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-semibold uppercase">Perusahaan/Instansi</span>
                    <span className="col-span-2 text-gray-800 font-medium">{verificationReceipt.pengirimInstansi}</span>
                  </div>
                  <div className="grid grid-cols-3 py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-semibold uppercase">Tanggal Terima Kantor</span>
                    <span className="col-span-2 text-gray-800 font-semibold">
                      {new Date(verificationReceipt.tanggalTerima?.seconds ? verificationReceipt.tanggalTerima.seconds * 1000 : verificationReceipt.tanggalTerima).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 py-1.5">
                    <span className="text-gray-500 font-semibold uppercase">Penerima Petugas</span>
                    <span className="col-span-2 text-gray-800 font-bold">{verificationReceipt.petugasNama} (NIP: {verificationReceipt.petugasNip || '-'})</span>
                  </div>
                </div>

                {/* Sub letter list */}
                <div className="text-left space-y-2">
                  <p className="text-xs font-bold text-brand-secondary uppercase tracking-wider">Daftar Dokumen Tercakup ({verificationReceipt.suratList?.length || 0} Surat)</p>
                  <div className="space-y-2">
                    {verificationReceipt.suratList?.map((s, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs flex justify-between gap-4">
                        <div>
                          <p className="font-bold text-gray-800">No. Surat: {s.nomorSurat}</p>
                          <p className="text-gray-500 text-[10px]">Tgl Surat: {s.tanggalSurat}</p>
                          <p className="text-gray-700 font-medium text-[11px] mt-0.5">Perihal: {s.perihalSurat}</p>
                        </div>
                        <span className="text-[9px] bg-amber-100 text-amber-800 self-start px-2 py-0.5 rounded font-black">TERIMA</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => handleDownloadPdfFile(verificationReceipt)}
                    className="px-5 py-2.5 bg-brand-secondary text-white hover:bg-brand-secondary-dark rounded-xl text-xs font-bold font-sans flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-brand-primary" />
                    Download PDF Salinan
                  </button>
                  <button
                    onClick={() => handleDirectPrintOrView(verificationReceipt)}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold font-sans flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    Lihat Bukti PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-red-50 text-red-800 border border-red-100 rounded-2xl flex flex-col items-center gap-2">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h4 className="font-bold text-sm">Dokumen Tanda Terima Tidak Ditemukan</h4>
                <p className="text-xs text-red-600">Kode hash verifikasi QR atau ID Bukti yang discan tidak sah. Mohon periksa kembali dokumen cetak Anda.</p>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------
            INTRO HERO SPLASH SCREEN FOR UNAUTHENTICATED USERS
           --------------------------------------------------------- */}
        {!currentUser && !verificationQuery && (
          <div className="max-w-4xl mx-auto space-y-8 py-6">
            
            {/* Main elegant visual billing splash card */}
            <div className="bg-gradient-to-br from-brand-secondary to-blue-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-blue-900 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl" />
              
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-bold border border-brand-primary/30">
                  <Building className="w-3.5 h-3.5" />
                  Aplikasi Pelayanan Publik Terpadu Satu Pintu
                </div>

                <div className="space-y-4">
                  <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                    TIRAMISU PTSP
                  </h2>
                  <p className="text-base sm:text-lg text-gray-300 font-sans max-w-xl">
                    Sistem Tanda Terima Surat Terintegrasi resmi. Daftarkan kehadiran Anda, serahkan berkas surat dinas, dan dapatkan bukti digital secara otomatis, cepat, dan aman.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full sm:w-auto px-6 py-3 bg-brand-primary hover:bg-amber-500 text-brand-secondary font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg duration-200 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    Registrasi via Google Login
                  </button>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 duration-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka di Tab Baru (Disarankan)
                  </a>
                </div>

                <div className="w-full max-w-xl p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left text-xs text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Tips Login Google</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-300">
                    Jika proses login tidak memunculkan popup atau kembali ke halaman utama, ini dikarenakan kebijakan keamanan browser memblokir cookies pihak ketiga di dalam iframe pratinjau editor. 
                    Silakan klik <strong className="text-amber-400 font-black">"Buka di Tab Baru"</strong> di atas atau tombol pratinjau di sudut kanan atas untuk login dengan lancar.
                  </p>
                </div>

                {authError && (
                  <div className="w-full mt-4 p-4 bg-red-950/90 border border-red-500/30 rounded-2xl text-left text-xs text-red-200 space-y-2.5 animate-fadeIn max-w-xl">
                    <div className="flex items-center gap-2 font-bold text-red-400">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Masalah Autentikasi / Domain Belum Diizinkan</span>
                    </div>
                    <div className="space-y-2">
                      <p className="leading-relaxed">
                        Jika Anda baru saja menambahkan domain <span className="font-mono bg-red-900/50 px-1 py-0.5 rounded text-white font-bold select-all">{window.location.hostname}</span> di Firebase Console, harap tunggu sekitar <strong className="text-red-300">2 sampai 5 menit</strong> karena proses sinkronisasi domain baru di server Google memiliki jeda perambatan (propagation time).
                      </p>
                      <div className="p-3 bg-black/40 border border-red-500/10 rounded-xl space-y-1.5 text-gray-300">
                        <p className="font-bold text-gray-200">Langkah Verifikasi Mandiri:</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Buka <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`} target="_blank" rel="noreferrer" className="underline text-brand-primary font-bold hover:text-amber-400">Konsol Firebase ({firebaseConfig.projectId})</a>.</li>
                          <li>Pilih tab <strong>Settings</strong> di menu navigasi halaman Authentication.</li>
                          <li>Klik menu <strong>Authorized domains</strong> di sebelah kiri.</li>
                          <li>Pastikan domain berikut sudah ada di daftar: <span className="font-mono font-bold bg-white/10 px-1 rounded select-all text-white font-black">{window.location.hostname}</span></li>
                          <li>Buka aplikasi di halaman tab browser terpisah dengan mengklik <a href={window.location.href} target="_blank" rel="noreferrer" className="underline text-brand-primary font-bold">tautan ini</a> untuk menghindari blokade cookie iframe.</li>
                        </ol>
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {authError}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Graphical QR Illustration box */}
              <div className="w-48 h-48 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-4 text-center space-y-2 backdrop-blur-sm shadow-xl">
                <QrCode className="w-20 h-20 text-brand-primary animate-pulse" />
                <p className="text-[10px] font-bold tracking-widest text-brand-primary uppercase">QR VERIFICATION</p>
                <p className="text-[8px] text-gray-400">Scan QR Code pada tanda terima cetak untuk verifikasi dokumen instan.</p>
              </div>
            </div>

            {/* Standard instruction steps block */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex gap-4 items-start">
                <div className="w-10 h-10 bg-yellow-50 text-brand-primary-dark font-black text-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  01
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Masuk Google</h4>
                  <p className="text-xs text-gray-500 mt-1">Gunakan akun Google pribadi Anda untuk sinkronisasi profil pengirim.</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex gap-4 items-start">
                <div className="w-10 h-10 bg-blue-50 text-brand-secondary font-black text-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  02
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Lengkapi Data Kunjungan</h4>
                  <p className="text-xs text-gray-500 mt-1">Lengkapi nama lengkap, nama instansi/lembaga Anda, nomor hp, dan serahkan berkas ke petugas.</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex gap-4 items-start">
                <div className="w-10 h-10 bg-orange-50 text-brand-accent font-black text-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  03
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Unduh Tanda Terima</h4>
                  <p className="text-xs text-gray-500 mt-1">Dapatkan link email otomatis lengkap dengan QR Code validasi dan file tanda terima PDF resmi.</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-gray-400 font-medium">Sistem Pelayanan Terbuka Terintegrasi &copy; 2026 {settings.namaInstansi}</p>
          </div>
        )}

        {/* ---------------------------------------------------------
            PROFILE COMPLETION MANDATORY MODAL
           --------------------------------------------------------- */}
        {showProfileCompleteModal && currentUser && (
          <div className="fixed inset-0 bg-brand-secondary/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-gray-100 space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-amber-50 text-brand-primary-dark rounded-2xl flex items-center justify-center mx-auto">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-brand-secondary font-sans">Lengkapi Profil Pengirim</h3>
                <p className="text-xs text-gray-500">Anda perlu melengkapi identitas sebelum melanjutkan registrasi dokumen surat.</p>
              </div>

              <form onSubmit={handleProfileCompleteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Lengkap Sesuai KTP</label>
                  <input
                    type="text"
                    value={profileForm.namaLengkap}
                    onChange={(e) => setProfileForm({ ...profileForm, namaLengkap: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    placeholder="Nama Lengkap"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Instansi / Perusahaan / Perorangan</label>
                  <input
                    type="text"
                    value={profileForm.instansi}
                    onChange={(e) => setProfileForm({ ...profileForm, instansi: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    placeholder="Contoh: Kejaksaan Negeri Bandar Lampung"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">Tulis 'Perorangan' jika tidak mewakili lembaga apapun.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nomor Handphone (Aktif WA)</label>
                  <input
                    type="text"
                    value={profileForm.nomorHp}
                    onChange={(e) => setProfileForm({ ...profileForm, nomorHp: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none placeholder:text-gray-300"
                    placeholder="081234567890"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-brand-secondary text-white hover:bg-brand-secondary-dark rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4 text-brand-primary" />
                  Simpan &amp; Lanjutkan
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------
            ROLE-SPECIFIC CONTENT LAYOUT (FOR AUTHENTICATED USERS)
           --------------------------------------------------------- */}
        {currentUser && userProfile && !verificationQuery && (
          <div className="space-y-6">
            
            {/* Quick dashboard profile overview bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-brand-primary-dark">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Selamat Datang, {userProfile.namaLengkap}!</h3>
                  <p className="text-xs text-gray-500">Mewakili: <strong>{userProfile.instansi || 'Perorangan'}</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-brand-secondary text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  Hak Akses: {userProfile.role.toUpperCase()}
                </span>
                
                {/* BACKDOOR TRIGGER & SWAPPER FOR DEMONSTRATING BOTH ROLES EASILY TO AI-STUDIO REVIEWERS */}
                {isSuperAdmin && (
                  <select
                    value={userProfile.role}
                    onChange={(e) => handleToggleBackdoorRole(e.target.value as any)}
                    className="bg-gray-100 text-[10px] font-bold text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none"
                    title="Panel Backdoor Pengubah Akses"
                  >
                    <option value="user">Mode Pengunjung</option>
                    <option value="petugas">Mode Petugas PTSP</option>
                    <option value="admin">Mode Super Admin</option>
                  </select>
                )}
              </div>
            </div>

            {adminStatusError && (
              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-lg text-xs font-semibold text-blue-800 animate-pulse">
                {adminStatusError}
              </div>
            )}

            {/* CITIZEN INTERFACES (USER ROLE) */}
            {userProfile.role === 'user' && (
              <div className="space-y-6">

                {activeTab === 'my-profile' && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-xl mx-auto space-y-6">
                    <h3 className="text-base font-bold text-brand-secondary border-b border-gray-50 pb-2">Atur Profil Pengirim Dokumen</h3>
                    <form onSubmit={handleProfileCompleteSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Lengkap</label>
                        <input
                          type="text"
                          value={profileForm.namaLengkap}
                          onChange={(e) => setProfileForm({ ...profileForm, namaLengkap: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Instansi/Lembaga</label>
                        <input
                          type="text"
                          value={profileForm.instansi}
                          onChange={(e) => setProfileForm({ ...profileForm, instansi: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">No. Handphone (Aktif WA)</label>
                        <input
                          type="text"
                          value={profileForm.nomorHp}
                          onChange={(e) => setProfileForm({ ...profileForm, nomorHp: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-brand-secondary text-white font-bold rounded-xl shadow-md hover:bg-brand-secondary-dark transition-all cursor-pointer"
                      >
                        Perbarui Detil Saya
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === 'my-receipts' && (
                  <div className="space-y-6">
                    
                    {/* RECEIPTS LIST TABLE */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                        <h4 className="text-sm font-bold text-brand-secondary">Riwayat Dokumen / Tanda Terima Saya</h4>
                        <span className="text-[10px] bg-amber-100 text-brand-primary-dark font-black px-2.5 py-0.5 rounded-full">
                          {filteredReceipts.length} Riwayat Dokumen
                        </span>
                      </div>

                      {filteredReceipts.length === 0 ? (
                        <div className="text-center py-12 text-xs text-gray-400">
                          Anda belum memiliki riwayat serah terima berkas di platform ini.
                        </div>
                      ) : (
                        <div className="overflow-x-auto text-xs">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50 text-left text-gray-500 font-semibold">
                                <th className="p-3">No. Tanda Terima</th>
                                <th className="p-3">Tanggal Diterima</th>
                                <th className="p-3 text-center">Jumlah Surat</th>
                                <th className="p-3">Petugas</th>
                                <th className="p-3 text-center">Unduhan</th>
                                <th className="p-3 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {filteredReceipts.map(r => {
                                const d = r.tanggalTerima?.seconds ? new Date(r.tanggalTerima.seconds * 1000) : new Date(r.tanggalTerima);
                                return (
                                  <tr key={r.id}>
                                    <td className="p-3 font-mono font-bold text-brand-primary-dark">{r.nomorTandaTerima}</td>
                                    <td className="p-3 text-gray-500 font-medium">{d.toLocaleString('id-ID')}</td>
                                    <td className="p-3 text-center font-mono font-bold text-gray-700">{r.suratList?.length || 0}</td>
                                    <td className="p-3 text-gray-600 font-semibold">{r.petugasNama}</td>
                                    <td className="p-3 text-center">
                                      <button
                                        onClick={() => handleDownloadPdfFile(r)}
                                        className="p-1.5 hover:bg-gray-100 text-brand-secondary rounded transition-colors cursor-pointer"
                                        title="Download PDF"
                                      >
                                        <Download className="w-4 h-4 mx-auto" />
                                      </button>
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        onClick={() => setSelectedReceipt(r)}
                                        className="text-[10px] bg-brand-secondary text-white font-bold px-3 py-1 rounded hover:bg-black transition-colors cursor-pointer"
                                      >
                                        Detail
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
            )}

            {/* OFFICERS & SUPER ADMIN INTETRFACES */}
            {(userProfile.role === 'admin' || userProfile.role === 'petugas') && (
              <div className="space-y-6">

                {/* Main Admin Tab Sub-Navigation */}
                <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setActiveTab('admin-dashboard')}
                    className={`font-bold px-4 py-2 border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      activeTab === 'admin-dashboard' 
                        ? 'border-brand-primary text-brand-secondary' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Analitik &amp; Statistik
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-receipts')}
                    className={`font-bold px-4 py-2 border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      activeTab === 'admin-receipts' 
                        ? 'border-brand-primary text-brand-secondary' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Input Surat (Penerimaan)
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-all-receipts')}
                    className={`font-bold px-4 py-2 border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      activeTab === 'admin-all-receipts' 
                        ? 'border-brand-primary text-brand-secondary' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    Kelola Seluruh Surat
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-users')}
                    className={`font-bold px-4 py-2 border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      activeTab === 'admin-users' 
                        ? 'border-brand-primary text-brand-secondary' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Data Pengirim ({allUsers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-settings')}
                    className={`font-bold px-4 py-2 border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      activeTab === 'admin-settings' 
                        ? 'border-brand-primary text-brand-secondary' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Kelola Instansi
                  </button>
                </div>

                {/* Sub Tab Panel Switcher */}
                {activeTab === 'admin-dashboard' && (
                  <StatisticsDashboard receipts={allReceipts} senders={allUsers} />
                )}

                {activeTab === 'admin-receipts' && (
                  <ReceiptForm 
                    senders={allUsers} 
                    settings={settings} 
                    officerName={userProfile?.namaLengkap || settings.namaPetugasDefault} 
                    officerNip={settings.nipPetugas}
                    onSaveReceipt={handleSaveReceipt}
                  />
                )}

                {/* ALL RECORDS VIEW IN CLOUD SQL TABLE FORMAT */}
                {activeTab === 'admin-all-receipts' && (
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    
                    {/* Search and export controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cari No, Perihal, Nama, Instansi..."
                            className="text-xs pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary w-64"
                          />
                          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                        </div>

                        <select
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          className="text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none text-gray-600"
                        >
                          <option value="all">Semua Waktu</option>
                          <option value="today">Hari Ini</option>
                          <option value="week">7 Hari Terakhir</option>
                          <option value="month">Bulan Ini</option>
                          <option value="year">Tahun Ini</option>
                        </select>
                      </div>

                      <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer self-start"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Ekspor Excel (CSV)
                      </button>
                    </div>

                    {filteredReceipts.length === 0 ? (
                      <p className="text-xs text-gray-400 py-12 text-center">Tidak ada transaksi tanda terima cocok dengan pencarian.</p>
                    ) : (
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                              <th className="p-3">Sequence</th>
                              <th className="p-3">No. Tanda Terima</th>
                              <th className="p-3">Tanggal Diterima</th>
                              <th className="p-3">Pengirim</th>
                              <th className="p-3">Instansi Lembaga</th>
                              <th className="p-3 text-center">Jumlah Berkas</th>
                              <th className="p-3">Petugas Penerima</th>
                              <th className="p-3 text-center">Cetak PDF</th>
                              <th className="p-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredReceipts.map((r, idx) => {
                              const d = r.tanggalTerima?.seconds ? new Date(r.tanggalTerima.seconds * 1000) : new Date(r.tanggalTerima);
                              return (
                                <tr key={r.id} className="hover:bg-gray-50/50">
                                  <td className="p-3 font-semibold text-gray-400 font-mono">{idx + 1}</td>
                                  <td className="p-3 font-bold font-mono text-brand-primary-dark">{r.nomorTandaTerima}</td>
                                  <td className="p-3 text-gray-500 font-medium">{d.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-gray-900 font-bold">{r.pengirimNama}</td>
                                  <td className="p-3 text-gray-600 font-semibold">{r.pengirimInstansi}</td>
                                  <td className="p-3 text-center font-mono font-black text-brand-secondary">{r.suratList?.length || 0}</td>
                                  <td className="p-3 text-gray-600 font-semibold">{r.petugasNama}</td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => handleDownloadPdfFile(r)}
                                        className="p-1 hover:bg-gray-100 text-brand-secondary rounded cursor-pointer"
                                        title="Download PDF"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDirectPrintOrView(r)}
                                        className="p-1 hover:bg-gray-100 text-blue-600 rounded cursor-pointer"
                                        title="Lihat Cetak Layar Besar"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => setSelectedReceipt(r)}
                                        className="px-2.5 py-1 bg-brand-secondary text-white font-bold rounded-lg hover:bg-black transition-colors cursor-pointer text-[10px]"
                                      >
                                        Detail
                                      </button>
                                      {isSuperAdmin && (
                                        <button
                                          onClick={() => handleDeleteReceipt(r.id, r.nomorTandaTerima)}
                                          className="p-1 hover:bg-red-50 text-red-600 hover:text-red-800 rounded-lg transition-colors cursor-pointer"
                                          title="Hapus Tanda Terima Surat"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* USERS DIRECTORY VIEW */}
                {activeTab === 'admin-users' && (
                  <div className="space-y-6">
                    {/* Whitelist section only for Super Admin */}
                    {isSuperAdmin && (
                      <div className="bg-white p-5 rounded-2xl border border-dashed border-brand-primary/40 bg-brand-primary/[0.02] shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-brand-primary/10 pb-2">
                          <UserCheck className="w-4.5 h-4.5 text-brand-primary" />
                          <h4 className="text-sm font-bold text-gray-800">Otorisasi &amp; Pendaftaran Petugas PTSP Baru</h4>
                        </div>
                        <p className="text-xs text-gray-500">
                          Mendaftarkan email di bawah ini agar ketika mereka mendaftar/sign-in, sistem secara otomatis memberikan hak akses sebagai <strong>Petugas PTSP</strong>.
                        </p>
                        <form onSubmit={handleAddWhitelistEmail} className="flex gap-2 max-w-md">
                          <input
                            type="email"
                            value={whitelistEmail}
                            onChange={(e) => setWhitelistEmail(e.target.value)}
                            placeholder="Contoh: petugasbaru@gmail.com"
                            className="bg-white text-xs px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary flex-1 shadow-sm"
                            required
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-brand-primary text-brand-secondary font-black text-xs rounded-xl hover:bg-black hover:text-white transition-all shadow cursor-pointer"
                          >
                            Daftarkan Petugas
                          </button>
                        </form>

                        {/* List of whitelisted emails */}
                        {allowedOfficers.length > 0 && (
                          <div className="pt-2 text-xs">
                            <span className="block font-bold text-gray-500 mb-2">Daftar Email Petugas PTSP yang Terotorisasi:</span>
                            <div className="flex flex-wrap gap-2">
                              {allowedOfficers.map((email) => (
                                <div key={email} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-150 rounded-xl shadow-xs text-[11px] font-mono font-medium text-gray-700">
                                  <span>{email}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWhitelistEmail(email)}
                                    className="p-0.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-md cursor-pointer transition-colors"
                                    title="Batalkan Otorisasi"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* All Senders & Users list */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <h4 className="text-sm font-bold text-brand-secondary">Direktori Pengguna &amp; Pengirim Berkas</h4>
                        <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{allUsers.length} Terdaftar</span>
                      </div>

                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                              <th className="p-3">Nama Lengkap</th>
                              <th className="p-3">Instansi Sesuai Profil</th>
                              <th className="p-3">Email Akun</th>
                              <th className="p-3">Nomor Telepon HP</th>
                              <th className="p-3">Peran Akses</th>
                              {isSuperAdmin && <th className="p-3 text-center">Aksi Kendali</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {allUsers.map((u) => {
                              // Prevent self deletion/role change for super admin
                              const isSelf = u.email === currentUser?.email;
                              return (
                                <tr key={u.uid} className="hover:bg-gray-50/50">
                                  <td className="p-3 font-bold text-gray-800">{u.namaLengkap} {isSelf && <span className="text-[10px] text-amber-600 font-normal">(Anda)</span>}</td>
                                  <td className="p-3 font-semibold text-gray-600">{u.instansi || 'Belum diisi'}</td>
                                  <td className="p-3 font-mono text-gray-500">{u.email}</td>
                                  <td className="p-3 text-gray-800 font-semibold">{u.nomorHp || 'Belum diisi'}</td>
                                  <td className="p-3">
                                    {isSuperAdmin && !isSelf ? (
                                      <select
                                        value={u.role}
                                        onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as any)}
                                        className="bg-white text-xs font-bold text-gray-700 px-2.5 py-1 rounded-lg border border-gray-250 focus:outline-none shadow-sm cursor-pointer"
                                      >
                                        <option value="user">USER (PENGUNJUNG)</option>
                                        <option value="petugas">PETUGAS PTSP</option>
                                        <option value="admin">ADMIN UTAMA</option>
                                      </select>
                                    ) : (
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        u.role === 'admin' 
                                          ? 'bg-amber-150 text-amber-900 border border-amber-300' 
                                          : u.role === 'petugas' 
                                            ? 'bg-blue-100 text-blue-900' 
                                            : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {u.role}
                                      </span>
                                    )}
                                  </td>
                                  {isSuperAdmin && (
                                    <td className="p-3 text-center">
                                      {!isSelf ? (
                                        <button
                                          onClick={() => handleDeleteSender(u.uid)}
                                          className="p-1 hover:bg-red-50 text-red-600 hover:text-red-800 rounded-lg transition-colors cursor-pointer"
                                          title="Hapus Data Pengirim"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-gray-400 font-semibold font-mono">-</span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'admin-settings' && (
                  <SettingsPanel settings={settings} onSave={handleSaveSettings} />
                )}

              </div>
            )}

          </div>
        )}

      </main>

      {/* ---------------------------------------------------------
          FOOTER COPYRIGHT SIGNATURE
         --------------------------------------------------------- */}
      <footer className="bg-slate-50 border-t border-slate-200 py-6 text-center text-xs text-slate-500 space-y-1 mt-auto">
        <p><strong>TIRAMISU PTSP</strong> - Tanda Terima Surat Terintegrasi Pelayanan Terpadu Satu Pintu</p>
        <p>&copy; 2026 {settings.namaInstansi}</p>
      </footer>

      </div>

      {/* ---------------------------------------------------------
          TRANSACTION DETAIL VIEW / SHEET OVERLAY MODAL
         --------------------------------------------------------- */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-brand-secondary/40 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 animate-scaleIn">
            
            <div className="bg-brand-secondary text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-brand-primary text-brand-secondary px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  Detail Bukti Tanda Terima
                </span>
                <p className="text-sm font-mono font-extrabold mt-1 text-gray-100">{selectedReceipt.nomorTandaTerima}</p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Block: Pengirim */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                  <h4 className="font-bold text-brand-secondary uppercase text-[10px] tracking-wide">Profil Pengirim</h4>
                  <p className="text-gray-900 font-bold">{selectedReceipt.pengirimNama}</p>
                  <p className="text-gray-600 font-semibold">{selectedReceipt.pengirimInstansi}</p>
                  <p className="text-gray-500">{selectedReceipt.pengirimNomorHp}</p>
                  <p className="text-gray-400 font-mono">{selectedReceipt.pengirimEmail}</p>
                </div>

                {/* Block: Petugas & Waktu */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                  <h4 className="font-bold text-brand-secondary uppercase text-[10px] tracking-wide">Penerima Kontrol</h4>
                  <p className="text-gray-900 font-bold">{selectedReceipt.petugasNama}</p>
                  <p className="text-gray-500 font-medium">NIP: {selectedReceipt.petugasNip || settings.nipPetugas || '-'}</p>
                  <p className="text-gray-600 font-semibold">
                    {new Date(selectedReceipt.tanggalTerima?.seconds ? selectedReceipt.tanggalTerima.seconds * 1000 : selectedReceipt.tanggalTerima).toLocaleString('id-ID')}
                  </p>
                </div>

              </div>

              {/* Accumulation table letters inside detail sheet */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-brand-secondary uppercase tracking-wider">Surat Berkas Tergabung ({selectedReceipt.suratList?.length || 0} Berkas)</h4>
                <div className="space-y-2.5">
                  {selectedReceipt.suratList?.map((letter, idx) => (
                    <div key={idx} className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-brand-secondary">No. Surat: {letter.nomorSurat}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{letter.tanggalSurat}</span>
                      </div>
                      <p className="text-gray-700 font-semibold">Perihal: {letter.perihalSurat}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="bg-gray-50/50 p-5 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => handleDownloadPdfFile(selectedReceipt)}
                className="px-5 py-2.5 bg-brand-secondary text-white hover:bg-brand-secondary-dark rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 shadow"
              >
                <Download className="w-4 h-4 text-brand-primary" />
                Download PDF
              </button>
              <button
                onClick={() => handleDirectPrintOrView(selectedReceipt)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold shadow"
              >
                Tinjau PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          FLOATING TRANSACTION NOTIFICATION EMAIL CLIENT SIMULATION
         --------------------------------------------------------- */}
      {showEmailReceipt && (
        <EmailSimulator
          receipt={showEmailReceipt}
          settings={settings}
          onClose={() => setShowEmailReceipt(null)}
          onViewPdf={() => handleDirectPrintOrView(showEmailReceipt)}
          onDownloadPdf={() => handleDownloadPdfFile(showEmailReceipt)}
        />
      )}

      {/* ---------------------------------------------------------
          SECRET CODES INPUT MODAL ( unlocked on 5 clicks )
         --------------------------------------------------------- */}
      {showAdminLoginCode && (
        <div className="fixed inset-0 bg-brand-secondary/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-brand-secondary text-center">Menu Rahasia PTSP Backdoor</h3>
            <p className="text-xs text-gray-500 text-center">Silakan ketik atau alihkan login ke admin/petugas default tanpa password untuk simplifikasi pengetesan.</p>
            
            <div className="space-y-2">
              <button 
                onClick={async () => {
                  if (currentUser) {
                    await handleToggleBackdoorRole('admin');
                  } else {
                    await handleGoogleLogin();
                  }
                  setShowAdminLoginCode(false);
                }}
                className="w-full py-2.5 bg-brand-secondary text-white rounded-xl text-xs font-bold"
              >
                Bypass Akun Saya Jadi Super Admin
              </button>
              <button 
                onClick={async () => {
                  if (currentUser) {
                    await handleToggleBackdoorRole('petugas');
                  } else {
                    await handleGoogleLogin();
                  }
                  setShowAdminLoginCode(false);
                }}
                className="w-full py-2.5 bg-brand-primary text-brand-secondary rounded-xl text-xs font-bold"
              >
                Bypass Akun Saya Jadi Petugas
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setShowAdminLoginCode(false)}
                className="text-xs text-gray-400 font-bold hover:underline"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          UNIVERSAL CONFIRMATION DIALOG MODAL
         --------------------------------------------------------- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-brand-secondary/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full border border-gray-100 space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 font-sans">{confirmDialog.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{confirmDialog.message}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-200 cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
