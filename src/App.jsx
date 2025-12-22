import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, getDocs, deleteDoc, where } from "firebase/firestore";
import { 
  Zap, Activity, Save, History, TrendingUp, AlertTriangle, Factory, CheckCircle2,
  BarChart3, Settings, Lock, Unlock, Calendar, DollarSign, TrendingDown, HelpCircle,
  FileText, Calculator, AlertCircle, Eye, Hash, BookOpen, Sun, Battery, MousePointerClick,
  Info, Wind, Gauge, Thermometer, Timer, Wrench, LayoutGrid, ArrowLeft, Clock, Edit2,
  ClipboardList, CheckSquare, PieChart, MapPin, Maximize2, Minimize2, Building2, Leaf,
  Database, User, Users, LogOut, Key, Shield, ChevronRight, X, Flame, Trash2, PlusCircle,
  Store, Droplets, Filter, Check, Image as ImageIcon
} from 'lucide-react';

// --- IMPORT CORRECT DEPUIS VOTRE FICHIER ---
import { db } from './firebase'; // On utilise votre fichier firebase.js qui marche déjà
import { collection } from "firebase/firestore";

// Helper simple pour garder votre code compatible
const getCollection = (name) => collection(db, name); 
// Note : J'ai retiré 'artifacts/appId...' car c'est spécifique à un autre outil.
// On utilise directement vos collections : "steg_logs", "air_logs", etc.

// --- COMPOSANT HORLOGE ---
const DateTimeDisplay = () => {
    const [date, setDate] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <div className="text-right">
            <div className="text-lg font-bold leading-none">{date.toLocaleTimeString('fr-FR')}</div>
            <div className="text-xs opacity-80">{date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
    );
};

// ==================================================================================
// 1. AUTHENTIFICATION
// ==================================================================================

const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (username === 'RMI' && password === 'RMI2026$') {
        setTimeout(() => {
            onLogin({ username: 'RMI', role: 'ADMIN' });
            setLoading(false);
        }, 800);
        return;
    }

    try {
      const q = query(getCollection('users'), where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        if (username === 'admin' && password === '0000') {
            onLogin({ username: 'Admin Test', role: 'ADMIN' });
            return;
        }
        setError("Utilisateur inconnu");
        setLoading(false);
        return;
      }

      let userFound = null;
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.password === password) {
            userFound = { ...userData, id: doc.id };
        }
      });

      if (userFound) {
        onLogin(userFound);
      } else {
        setError("Mot de passe incorrect");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur de connexion base de données");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md z-10">
            <div className="text-center mb-8">
                <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
                    <Factory size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-800">SMEn ITALCAR</h1>
                <p className="text-slate-400 text-sm">Système de Management de l'Énergie</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Identifiant</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input type="text" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 font-bold text-slate-700" placeholder="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mot de passe</label>
                    <div className="relative">
                        <Key className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input type="password" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 font-bold text-slate-700" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                </div>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-bold flex items-center justify-center"><AlertCircle size={16} className="mr-2"/>{error}</div>}
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all">{loading ? "Connexion..." : "Se Connecter"}</button>
            </form>
            <div className="mt-6 text-center text-xs text-slate-300">v7.0.3 Final • Production</div>
        </div>
    </div>
  );
};

// ==================================================================================
// 2. MODULE ÉNERGIE & FACTURATION (STEG)
// ==================================================================================

const StegModule = ({ onBack, userRole }) => {
  const [currentSite, setCurrentSite] = useState(1);
  const [logs, setLogs] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingPrev, setEditingPrev] = useState(false);

  useEffect(() => {
    const q = query(getCollection('steg_logs'), orderBy('id', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  const SITES = [
    { id: 1, name: "MT 1 - Mégrine", code: "MEG-001", type: "MT", icon: Factory },
    { id: 2, name: "MT 2 - El Khadhra", code: "ELK-002", type: "MT", icon: Building2 },
    { id: 3, name: "MT 3 - Naassen", code: "NAS-003", type: "MT", icon: Building2 },
    { id: 4, name: "BT 1 - Showroom Lac", code: "SHR-001", type: "BT_PV", icon: Store }, 
    { id: 5, name: "BT 2 - Azur City", code: "AZU-002", type: "BT", icon: Store },
    { id: 6, name: "BT 3 - Rue de Carthage", code: "CAR-003", type: "BT", icon: Store }
  ];

  // Configuration par défaut selon demandes
  const [globalConfig, setGlobalConfig] = useState({
    unitPriceKwh: 0.291, powerUnitPrice: 5.000, 
    unitPriceKwhBT: 0.391, fixedFeesBT: 115.500, servicesBT: 0.000, fteGazBT: 0.000,
    vatRate: 19, rtt: 3.500, municipalTaxRate: 0.010,
    taxCLRate: 0.005, taxFTERate: 0.005,
    powerOverrunPenalty: 25.000 
  });

  const [siteConfigs, setSiteConfigs] = useState({
    1: { subscribedPower: 250, emptyLosses: 1300 }, 
    2: { subscribedPower: 70, emptyLosses: 670 }, 
    3: { subscribedPower: 30, emptyLosses: 160 }, 
    4: { subscribedPower: 30, emptyLosses: 0 },
    5: { subscribedPower: 20, emptyLosses: 0 },
    6: { subscribedPower: 15, emptyLosses: 0 }
  });

  const [isConfigUnlocked, setIsConfigUnlocked] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 7),
    lastIndex: '', newIndex: '', 
    lastIndexPv: '', newIndexPv: '', 
    previousBalance: '',
    cosPhi: '', reactiveCons: '', maxPower: '', 
    lateFees: '', relanceFees: '', adjustment: '',
  });

  const formatMoney = (amount) => amount?.toLocaleString('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 3 });
  const formatNumber = (num) => num?.toLocaleString('fr-TN', { maximumFractionDigits: 2 });
  const formatInputDisplay = (val) => { if (val === '' || val === undefined || val === null) return ''; const cleanVal = val.toString().replace(/[^0-9.-]/g, ''); return cleanVal.replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
  const parseInputValue = (val) => val.replace(/\s/g, ''); 

  useEffect(() => {
    const siteLogs = logs.filter(l => l.siteId === currentSite).sort((a, b) => b.id - a.id);
    if (siteLogs.length > 0) {
      const lastLog = siteLogs[0];
      const currentSiteType = SITES.find(s => s.id === currentSite).type;
      setFormData(prev => ({
        ...prev,
        lastIndex: lastLog.newIndex,
        ...(currentSiteType === 'BT_PV' ? { lastIndexPv: lastLog.newIndexPv, previousBalance: lastLog.newCarryOver } : {}),
        manualLastIndex: false
      }));
    } else {
         setFormData(prev => ({ ...prev, lastIndex: '', lastIndexPv: '', previousBalance: '' }));
    }
  }, [currentSite, logs]);

  const handleInputChange = (field, value) => {
    const cleanValue = ['lastIndex', 'newIndex', 'lastIndexPv', 'newIndexPv', 'previousBalance', 'maxPower', 'reactiveCons'].includes(field) ? parseInputValue(value) : value;
    setFormData(prev => ({ ...prev, [field]: cleanValue }));
  };

  const handleGlobalConfigChange = (field, value) => setGlobalConfig(prev => ({ ...prev, [field]: value }));
  const handleSiteConfigChange = (field, value) => setSiteConfigs(prev => ({ ...prev, [currentSite]: { ...prev[currentSite], [field]: value } }));

  // --- MOTEUR DE CALCUL ---
  const calculateMetrics = () => {
    const site = SITES.find(s => s.id === currentSite);
    const sConf = siteConfigs[currentSite];
    const gConf = globalConfig;
    
    const newIdx = parseFloat(formData.newIndex) || 0;
    const oldIdx = parseFloat(formData.lastIndex) || 0;
    const consumptionGrid = Math.max(0, newIdx - oldIdx);

    const lateFees = parseFloat(formData.lateFees) || 0;
    const relanceFees = parseFloat(formData.relanceFees) || 0;
    const adjustment = parseFloat(formData.adjustment) || 0;
    const rtt = parseFloat(gConf.rtt) || 0;
    const vat = (parseFloat(gConf.vatRate) || 0) / 100;

    // === CAS BT (PV & Standard) ===
    if (site.type.startsWith('BT')) {
        let billedKwh = consumptionGrid;
        let newCarryOver = 0;
        let productionPv = 0;
        let prevBalance = 0;
        let currentMonthBalance = 0;
        let totalBalance = 0;

        if (site.type === 'BT_PV') {
            const newIdxPv = parseFloat(formData.newIndexPv) || 0;
            const oldIdxPv = parseFloat(formData.lastIndexPv) || 0;
            prevBalance = parseFloat(formData.previousBalance) || 0;
            productionPv = Math.max(0, newIdxPv - oldIdxPv);
            currentMonthBalance = consumptionGrid - productionPv;
            totalBalance = currentMonthBalance + prevBalance;
            if (totalBalance > 0) { billedKwh = totalBalance; newCarryOver = 0; } 
            else { billedKwh = 0; newCarryOver = totalBalance; }
        }

        const unitPriceBT = parseFloat(gConf.unitPriceKwhBT) || 0.391;
        const fixedFees = parseFloat(gConf.fixedFeesBT) || 115.5;
        const services = parseFloat(gConf.servicesBT) || 0;
        
        const consoAmountHT = billedKwh * unitPriceBT;
        const fixedAmountHT = fixedFees + services;
        const totalHT = consoAmountHT + fixedAmountHT;
        const totalTTC = totalHT * (1 + vat);
        
        const contributionCL = billedKwh * (parseFloat(gConf.taxCLRate)||0.005);
        const fteElec = billedKwh * (parseFloat(gConf.taxFTERate)||0.005);
        const fteGaz = parseFloat(gConf.fteGazBT) || 0;
        
        const totalFinalTTC = totalTTC + contributionCL + rtt + fteElec + fteGaz;
        const netToPay = totalFinalTTC + adjustment + lateFees + relanceFees;
        
        return { 
            type: site.type, consumptionGrid, productionPv, currentMonthBalance, prevBalance, totalBalance, 
            billedKwh, newCarryOver, consoAmountHT, fixedAmountHT, totalTTC, contributionCL, fteElec, fteGaz, netToPay, totalFinalTTC, totalHT 
        };
    }
    // === CAS MT ===
    else {
        const cosPhi = parseFloat(formData.cosPhi) || 1;
        const maxPower = parseFloat(formData.maxPower) || 0;
        const reactiveCons = parseFloat(formData.reactiveCons) || 0;
        
        const unitPrice = parseFloat(gConf.unitPriceKwh) || 0.291;
        const subPower = parseFloat(sConf.subscribedPower) || 0;
        const powerPrice = parseFloat(gConf.powerUnitPrice) || 5.000;
        const muniTaxRate = parseFloat(gConf.municipalTaxRate) || 0.010;
        const emptyLosses = parseFloat(sConf.emptyLosses) || 0;
        const powerOverrunPrice = parseFloat(gConf.powerOverrunPenalty) || 25.000;

        const loadLosses = consumptionGrid * 0.02; 
        const billedKwh = consumptionGrid + emptyLosses + loadLosses;
        const baseEnergyAmountHT = billedKwh * unitPrice;

        let adjustmentRate = 0;
        let adjustmentType = 'none';
        if (cosPhi >= 0.91 && cosPhi <= 1) { 
            adjustmentRate = -(Math.round((cosPhi - 0.90) * 100) * 0.005); adjustmentType = 'bonus'; 
        } else if (cosPhi >= 0.80 && cosPhi <= 0.90) { 
            adjustmentRate = 0; adjustmentType = 'neutral'; 
        } else { 
            adjustmentType = 'penalty'; 
            let p = 0; 
            if(cosPhi<0.8) p+=Math.round((0.8-Math.max(cosPhi,0.75))*100)*0.005; 
            if(cosPhi<0.75) p+=Math.round((0.75-Math.max(cosPhi,0.7))*100)*0.01; 
            if(cosPhi<0.7) p+=Math.round((0.7-Math.max(cosPhi,0.6))*100)*0.015; 
            if(cosPhi<0.6) p+=Math.round((0.6-cosPhi)*100)*0.02; 
            adjustmentRate = p; 
        }
        const cosPhiAdjustmentAmount = baseEnergyAmountHT * adjustmentRate;

        const powerOverrun = Math.max(0, maxPower - subPower);
        const powerOverrunAmount = powerOverrun * powerOverrunPrice;

        const total1_HT = baseEnergyAmountHT + cosPhiAdjustmentAmount;
        const total1_TTC = total1_HT * (1 + vat);
        
        const powerPremium = subPower * powerPrice;
        const total2_HT = powerPremium + lateFees + relanceFees + powerOverrunAmount;
        const total2_TTC = total2_HT * (1 + vat);
        
        const municipalTax = billedKwh * muniTaxRate;

        const netToPay = total1_TTC + total2_TTC + rtt + municipalTax + adjustment;

        return { 
            type: 'MT', energyRecorded: consumptionGrid, loadLosses, billedKwh, 
            baseEnergyAmountHT, adjustmentRate, adjustmentType, cosPhiAdjustmentAmount, 
            total1_TTC, total1_HT, powerPremium, total2_HT, total2_TTC, municipalTax, 
            netToPay, powerOverrun, powerOverrunAmount, reactiveCons, subPower
        };
    }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      const site = SITES.find(s => s.id === currentSite);
      const metrics = calculateMetrics();
      const newLog = {
          id: Date.now(),
          recordDate: formData.date,
          timestamp: new Date().toLocaleTimeString('fr-FR'),
          siteId: currentSite, siteName: site.name, siteType: site.type,
          ...formData, ...metrics
      };
      try {
          await addDoc(getCollection('steg_logs'), newLog);
          setNotification({ msg: "Relevé enregistré dans le Cloud", type: 'success' });
          setFormData(prev => ({
            ...prev,
            lastIndex: formData.newIndex, newIndex: '',
            ...(site.type === 'BT_PV' ? { lastIndexPv: formData.newIndexPv, newIndexPv: '', previousBalance: metrics.newCarryOver } : {}),
            cosPhi: '', reactiveCons: '', maxPower: '', lateFees: '', relanceFees: '', adjustment: '', manualLastIndex: false
          }));
      } catch (err) { setNotification({ msg: "Erreur sauvegarde", type: 'error' }); }
      setTimeout(() => setNotification(null), 3000);
  };
  
  const liveMetrics = calculateMetrics();
  const siteLogs = logs.filter(l => l.siteId === currentSite);
  const currentSiteObj = SITES.find(s => s.id === currentSite);
  const isBT = currentSiteObj.type.startsWith('BT');
  const displayMetrics = liveMetrics;
  const CurrentIcon = currentSiteObj.icon;
  
  return (
    <div className="bg-slate-50 min-h-screen pb-10">
        <header className={`text-white shadow-lg sticky top-0 z-30 transition-colors duration-500 ${isBT ? 'bg-gradient-to-r from-red-800 to-orange-900' : 'bg-gradient-to-r from-blue-900 to-slate-900'}`}>
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-4 mb-2 md:mb-0">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-2 transition-colors"><ArrowLeft size={20} /></button>
                    <div className={`p-2 rounded-xl text-slate-900 shadow-lg ${isBT ? 'bg-white' : 'bg-yellow-500'}`}>
                        <CurrentIcon size={28} className={isBT ? 'text-red-600' : 'text-blue-900'} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight leading-tight">Facturation {currentSiteObj.name}</h1>
                        <div className="flex items-center space-x-2 text-xs opacity-90 mt-1">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${isBT ? 'bg-red-700 border border-red-600' : 'bg-blue-800 border border-blue-700'}`}>
                                {isBT ? 'BASSE TENSION' : 'MOYENNE TENSION'}
                            </span>
                            <span className="flex items-center"><MapPin size={10} className="mr-1"/> {currentSiteObj.code}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                   <DateTimeDisplay />
                   <div className="flex gap-2">
                       <button onClick={() => setShowUserGuide(true)} className="flex items-center bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold border border-white/20"><BookOpen size={16} className="mr-2" /> Guide</button>
                       {!isBT && <button onClick={() => setShowHelp(true)} className="flex items-center bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold border border-white/20"><HelpCircle size={16} className="mr-2" /> Cos φ</button>}
                   </div>
                </div>
            </div>
        </header>

        {showUserGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowUserGuide(false)}>
                <div className="bg-white p-8 rounded-2xl max-w-4xl w-full shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 flex items-center">
                                <BookOpen className="mr-3 text-blue-600" size={28}/> 
                                Guide d'Utilisation
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Comment utiliser le module Facturation & Énergie</p>
                        </div>
                        <button onClick={() => setShowUserGuide(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} className="text-slate-600"/></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section 1: Workflow App */}
                        <div className="space-y-6">
                            <h4 className="text-lg font-bold text-blue-800 mb-4 flex items-center"><Activity className="mr-2"/> Workflow Application</h4>
                            
                            <div className="relative border-l-4 border-blue-200 pl-6 space-y-6">
                                <div className="relative">
                                    <span className="absolute -left-[34px] bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white">1</span>
                                    <h5 className="font-bold text-slate-800">Sélection du Site</h5>
                                    <p className="text-sm text-slate-600">Choisissez le compteur (MT ou BT) dans la grille supérieure. L'interface s'adapte automatiquement au type de comptage.</p>
                                </div>
                                <div className="relative">
                                    <span className="absolute -left-[34px] bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white">2</span>
                                    <h5 className="font-bold text-slate-800">Saisie des Données</h5>
                                    <p className="text-sm text-slate-600">Entrez le <strong>Nouvel Index</strong> (kWh). Pour les sites MT, ajoutez la <strong>Puissance Max</strong> et le <strong>Cos φ</strong>.</p>
                                </div>
                                <div className="relative">
                                    <span className="absolute -left-[34px] bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white">3</span>
                                    <h5 className="font-bold text-slate-800">Analyse Instantanée</h5>
                                    <p className="text-sm text-slate-600">Le système calcule immédiatement la consommation, les pénalités éventuelles et le montant estimé de la facture.</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Relevé Physique */}
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Eye className="mr-2 text-slate-500"/> Relevé Physique</h4>
                            <ul className="space-y-4">
                                <li className="flex items-start bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                                    <MousePointerClick className="text-blue-500 mr-3 mt-1 flex-shrink-0" size={20}/>
                                    <div>
                                        <span className="block font-bold text-slate-700 text-sm">Navigation Compteur</span>
                                        <span className="text-xs text-slate-500">Utilisez le bouton de défilement (généralement bleu) pour faire défiler les écrans LCD du compteur STEG.</span>
                                    </div>
                                </li>
                                <li className="flex items-start bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                                    <FileText className="text-blue-500 mr-3 mt-1 flex-shrink-0" size={20}/>
                                    <div>
                                        <span className="block font-bold text-slate-700 text-sm">Index Énergie Active</span>
                                        <span className="text-xs text-slate-500">Relevez la valeur en <strong>kWh</strong> (souvent code 1.8.0 ou cumul Jour/Nuit/Pointe).</span>
                                    </div>
                                </li>
                                <li className="flex items-start bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                                    <Zap className="text-orange-500 mr-3 mt-1 flex-shrink-0" size={20}/>
                                    <div>
                                        <span className="block font-bold text-slate-700 text-sm">Données Puissance (MT)</span>
                                        <span className="text-xs text-slate-500">Notez la P.Max atteinte (kVA) et le Cos φ instantané ou moyen si affiché.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showHelp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
                <div className="bg-white p-8 rounded-2xl max-w-3xl w-full shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 flex items-center">
                                <HelpCircle className="mr-3 text-emerald-600" size={28}/> 
                                Comprendre le Cos φ
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Impact sur la facturation et l'efficacité énergétique</p>
                        </div>
                        <button onClick={() => setShowHelp(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} className="text-slate-600"/></button>
                    </div>

                    {/* Visual Explanation */}
                    <div className="mb-8">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                            <span>Zone de Pénalité</span>
                            <span>Zone Neutre</span>
                            <span>Zone de Bonus</span>
                        </div>
                        {/* The Gauge Visual */}
                        <div className="h-12 w-full rounded-xl flex overflow-hidden shadow-inner border border-slate-200">
                            <div className="w-[80%] bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-center text-white font-bold text-xs relative group cursor-help">
                                &lt; 0.80
                                <span className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Mauvais rendement = Pénalités</span>
                            </div>
                            <div className="w-[10%] bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs border-l border-r border-white relative group cursor-help">
                                0.8-0.9
                                <span className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Standard = Aucune incidence</span>
                            </div>
                            <div className="w-[10%] bg-emerald-500 flex items-center justify-center text-white font-bold text-xs relative group cursor-help">
                                &gt; 0.90
                                <span className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Excellent = Bonus sur facture</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Concept */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 text-lg">Qu'est-ce que c'est ?</h4>
                            <p className="text-sm text-slate-600 leading-relaxed text-justify">
                                Le Cosinus Phi (Facteur de Puissance) mesure l'efficacité avec laquelle votre installation utilise l'électricité. 
                                C'est le rapport entre la <strong>puissance active</strong> (celle qui crée du travail : moteurs, lumière) et la <strong>puissance apparente</strong> (celle fournie par le réseau).
                            </p>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex items-center text-blue-800 font-bold text-sm mb-2">
                                    <Info size={16} className="mr-2"/> Analogie simple
                                </div>
                                <p className="text-xs text-blue-700 italic">
                                    Imaginez un verre de bière. Le liquide est la puissance active (utile). La mousse est la puissance réactive (inutile mais occupe de la place). Le Cos φ est le ratio de liquide par rapport au verre total. Plus il y a de mousse (réactif), moins c'est efficace.
                                </p>
                            </div>
                        </div>

                        {/* Impact Financier */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 text-lg">Impact Financier</h4>
                            
                            <div className="space-y-3">
                                <div className="flex items-start p-3 bg-red-50 rounded-xl border border-red-100">
                                    <div className="bg-red-200 p-2 rounded-lg text-red-700 mr-3"><TrendingDown size={18}/></div>
                                    <div>
                                        <span className="block font-bold text-red-800 text-sm">Pénalités (Cos φ &lt; 0.8)</span>
                                        <span className="text-xs text-red-600 leading-tight">La STEG facture l'énergie réactive consommée au-delà du seuil toléré. Cela peut représenter un surcoût important.</span>
                                    </div>
                                </div>

                                <div className="flex items-start p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <div className="bg-emerald-200 p-2 rounded-lg text-emerald-700 mr-3"><TrendingUp size={18}/></div>
                                    <div>
                                        <span className="block font-bold text-emerald-800 text-sm">Bonus (Cos φ &gt; 0.9)</span>
                                        <span className="text-xs text-emerald-600 leading-tight">Si votre installation est très efficace, la STEG applique une réduction sur le montant de l'énergie active.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
                <div className="grid grid-cols-3 gap-2">
                    {SITES.map((site) => (
                        <button key={site.id} onClick={() => setCurrentSite(site.id)} 
                            className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center text-center h-20 group relative overflow-hidden
                            ${currentSite === site.id 
                                ? (site.type.startsWith('BT') ? 'bg-white border-red-500 shadow-md ring-2 ring-red-100 text-red-700' : 'bg-white border-blue-500 shadow-md ring-2 ring-blue-100 text-blue-700') 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                            <site.icon size={20} className="mb-1 opacity-80 group-hover:scale-110 transition-transform"/>
                            <span>{site.name}</span>
                        </button>
                    ))}
                </div>
                
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center">
                            <Calendar className="mr-2 text-slate-400" size={20} /> Période de Facturation
                        </h2>
                        <input type="month" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="bg-slate-100 border border-slate-200 rounded px-3 py-1.5 font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><Zap size={12} className="mr-1"/> Index Actif</h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 relative">
                                <div>
                                    <label className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                        Ancien Index
                                        {userRole === 'ADMIN' && <Edit2 size={12} className="cursor-pointer text-slate-400 hover:text-blue-600" onClick={() => setEditingPrev(!editingPrev)} />}
                                    </label>
                                    <div className="relative">
                                        <input type="text" value={formatInputDisplay(formData.lastIndex)} 
                                            onChange={(e) => handleInputChange('lastIndex', e.target.value)} 
                                            readOnly={userRole !== 'ADMIN' && !editingPrev}
                                            className={`w-full border rounded p-2 text-sm font-mono ${userRole !== 'ADMIN' && !editingPrev ? 'bg-slate-200 text-slate-500' : 'bg-white border-orange-300'}`} />
                                    {userRole !== 'ADMIN' && !editingPrev && <Lock size={12} className="absolute right-3 top-3 text-slate-400"/>}
                                    </div>
                                    {editingPrev && <p className="text-[10px] text-orange-600 mt-1 flex items-center"><AlertTriangle size={10} className="mr-1"/> Modification manuelle activée</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-blue-700 mb-1 block">Nouvel Index *</label>
                                    <input type="text" required value={formatInputDisplay(formData.newIndex)} onChange={(e) => handleInputChange('newIndex', e.target.value)} className="w-full text-lg border-2 border-blue-200 rounded p-2 font-mono focus:border-blue-600 outline-none" />
                                </div>
                                <div className="text-right text-xs font-bold text-blue-600">Conso: {formatNumber(liveMetrics.consumptionGrid || liveMetrics.energyRecorded)} kWh</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                {isBT ? <Sun size={12} className="mr-1"/> : <Settings size={12} className="mr-1"/>} 
                                {isBT ? 'Photovoltaïque & Solde' : 'Paramètres Techniques'}
                            </h3>
                            
                            {currentSiteObj.type === 'BT_PV' ? (
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-[10px] font-bold text-orange-800">Ancien PV</label><input type="text" value={formatInputDisplay(formData.lastIndexPv)} onChange={e => handleInputChange('lastIndexPv', e.target.value)} className="w-full text-xs p-1 border rounded" /></div>
                                        <div><label className="text-[10px] font-bold text-orange-800">Nouveau PV</label><input type="text" value={formatInputDisplay(formData.newIndexPv)} onChange={e => handleInputChange('newIndexPv', e.target.value)} className="w-full text-xs p-1 border rounded font-mono" /></div>
                                    </div>
                                    <div><label className="text-xs font-bold text-slate-600">Solde N-1</label><input type="text" value={formatInputDisplay(formData.previousBalance)} onChange={e => handleInputChange('previousBalance', e.target.value)} className="w-full text-sm p-2 border rounded" /></div>
                                </div>
                            ) : currentSiteObj.type === 'MT' ? (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-[10px] font-bold text-slate-500">Cos φ *</label><input type="number" step="0.01" required value={formData.cosPhi} onChange={e => handleInputChange('cosPhi', e.target.value)} className="w-full border p-2 rounded text-sm" /></div>
                                        <div><label className="text-[10px] font-bold text-slate-500">P. Max (kVA) *</label><input type="number" required value={formData.maxPower} onChange={e => handleInputChange('maxPower', e.target.value)} className="w-full border p-2 rounded text-sm" /></div>
                                    </div>
                                    <div><label className="text-[10px] font-bold text-slate-500">Réactif (kVarh)</label><input type="number" value={formData.reactiveCons} onChange={e => handleInputChange('reactiveCons', e.target.value)} className="w-full border p-2 rounded text-sm" /></div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-500 text-center italic">
                                    Site BT Standard - Paramètres fixes appliqués.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Frais & Ajustements</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="relative"><span className="absolute left-2 top-2 text-slate-400 text-xs">DT</span><input type="number" placeholder="Retard" value={formData.lateFees} onChange={e => handleInputChange('lateFees', e.target.value)} className="w-full pl-8 p-2 border rounded text-sm" /></div>
                            <div className="relative"><span className="absolute left-2 top-2 text-slate-400 text-xs">DT</span><input type="number" placeholder="Relance" value={formData.relanceFees} onChange={e => handleInputChange('relanceFees', e.target.value)} className="w-full pl-8 p-2 border rounded text-sm" /></div>
                            <div className="relative"><span className="absolute left-2 top-2 text-slate-400 text-xs">DT</span><input type="number" placeholder="Ajustement" value={formData.adjustment} onChange={e => handleInputChange('adjustment', e.target.value)} className="w-full pl-8 p-2 border rounded text-sm" /></div>
                        </div>
                    </div>

                    <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center ${isBT ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
                        <Save size={18} className="mr-2" /> Valider & Sauvegarder
                    </button>
                </form>

                {/* Configuration Admin - Séparée MT/BT */}
                <div className="bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                    <button onClick={() => setIsConfigUnlocked(!isConfigUnlocked)} className="w-full px-6 py-3 flex justify-between items-center text-xs font-bold text-slate-500 uppercase hover:bg-slate-200">
                        <span><Settings size={14} className="inline mr-2" /> Configuration Avancée ({isBT ? 'BT' : 'MT'})</span>
                        {isConfigUnlocked ? <Unlock size={14} className="text-red-500" /> : <Lock size={14} />}
                    </button>
                    {isConfigUnlocked && (
                        <div className="p-4 bg-white border-t border-slate-200 animate-in slide-in-from-top-2">
                             {/* AFFICHAGE CONDITIONNEL SELON TYPE DE SITE */}
                             {!isBT ? (
                                // --- CONFIGURATION MT ---
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div className="col-span-full mb-1 text-[10px] font-black text-blue-800 uppercase tracking-widest border-b pb-1">Paramètres Moyenne Tension</div>
                                    
                                    <div><label className="block text-slate-400 mb-1">P. Souscrite (kVA)</label><input type="number" value={siteConfigs[currentSite].subscribedPower} onChange={e => handleSiteConfigChange('subscribedPower', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">Prix Énergie (DT/kWh)</label><input type="number" value={globalConfig.unitPriceKwh} onChange={e => handleGlobalConfigChange('unitPriceKwh', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">Prix Puissance (DT/kVA)</label><input type="number" value={globalConfig.powerUnitPrice} onChange={e => handleGlobalConfigChange('powerUnitPrice', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">TVA (%)</label><input type="number" value={globalConfig.vatRate} onChange={e => handleGlobalConfigChange('vatRate', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    
                                    <div><label className="block text-slate-400 mb-1">Pénalité Dépassement</label><input type="number" value={globalConfig.powerOverrunPenalty} onChange={e => handleGlobalConfigChange('powerOverrunPenalty', e.target.value)} className="border p-1 w-full rounded font-mono bg-red-50" /></div>
                                    <div><label className="block text-slate-400 mb-1">Pertes à Vide (kWh)</label><input type="number" value={siteConfigs[currentSite].emptyLosses} onChange={e => handleSiteConfigChange('emptyLosses', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">RTT (DT)</label><input type="number" value={globalConfig.rtt} onChange={e => handleGlobalConfigChange('rtt', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                </div>
                             ) : (
                                // --- CONFIGURATION BT ---
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                    <div className="col-span-full mb-1 text-[10px] font-black text-red-800 uppercase tracking-widest border-b pb-1">Paramètres Basse Tension</div>

                                    <div><label className="block text-slate-400 mb-1">Prix kWh BT</label><input type="number" value={globalConfig.unitPriceKwhBT} onChange={e => handleGlobalConfigChange('unitPriceKwhBT', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">Redevance Fixe</label><input type="number" value={globalConfig.fixedFeesBT} onChange={e => handleGlobalConfigChange('fixedFeesBT', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">Services</label><input type="number" value={globalConfig.servicesBT} onChange={e => handleGlobalConfigChange('servicesBT', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    
                                    <div><label className="block text-slate-400 mb-1">Taxe CL (Taux)</label><input type="number" value={globalConfig.taxCLRate} onChange={e => handleGlobalConfigChange('taxCLRate', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">FTE Elec (Taux)</label><input type="number" value={globalConfig.taxFTERate} onChange={e => handleGlobalConfigChange('taxFTERate', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">FTE Gaz (Montant)</label><input type="number" value={globalConfig.fteGazBT} onChange={e => handleGlobalConfigChange('fteGazBT', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="lg:col-span-5 space-y-4">
                <div className={`bg-white p-6 rounded-xl shadow-lg border transition-all duration-300 relative overflow-hidden ${isBT ? 'border-red-200 ring-2 ring-red-50' : 'border-blue-200 ring-2 ring-blue-50'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">{isBT ? <Sun size={100}/> : <Zap size={100}/>}</div>
                    <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4 mb-4">
                         <div>
                            <h3 className={`text-sm font-bold uppercase ${isBT ? 'text-red-700' : 'text-blue-600'}`}>{isBT ? "FACTURE BT" : "FACTURE MT"}</h3>
                            <p className="text-xs text-slate-400">{currentSiteObj.name}</p>
                         </div>
                         <div className="text-right"><p className="text-xs text-slate-400 font-mono">{formData.date}</p></div>
                    </div>

                    <div className="space-y-3 text-sm">
                        {currentSiteObj.type === 'BT_PV' ? (
                             <>
                               <div className="pb-3 border-b border-slate-50 border-dashed space-y-2">
                                  <div className="flex justify-between text-slate-600"><span>Conso Réseau</span><span className="font-mono">{formatNumber(displayMetrics.consumptionGrid)} kWh</span></div>
                                  <div className="flex justify-between text-orange-600"><span>Prod Photovoltaïque</span><span className="font-mono">-{formatNumber(displayMetrics.productionPv)} kWh</span></div>
                                  <div className="flex justify-between text-slate-500 text-xs bg-slate-50 p-1 rounded"><span>Solde N-1</span><span className="font-mono">{formatNumber(displayMetrics.prevBalance)} kWh</span></div>
                                  <div className={`flex justify-between font-bold p-2 rounded ${displayMetrics.totalBalance > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}><span>Solde Final</span><span>{formatNumber(displayMetrics.totalBalance)} kWh</span></div>
                                  {displayMetrics.totalBalance <= 0 ? <div className="text-xs text-center text-emerald-600 italic">Crédit reporté au mois prochain</div> : <div className="flex justify-between text-slate-800 font-bold border-t pt-2"><span>Facturé ({formatNumber(displayMetrics.billedKwh)} kWh)</span><span>{formatMoney(displayMetrics.consoAmountHT)}</span></div>}
                                </div>
                                <div className="space-y-1 text-xs text-slate-500 pt-2">
                                  <div className="flex justify-between"><span>Redevances Fixes</span><span>{formatMoney(displayMetrics.fixedAmountHT)}</span></div>
                                  <div className="flex justify-between"><span>Taxes (TVA, CL, FTE)</span><span>{formatMoney(displayMetrics.totalFinalTTC - (displayMetrics.consoAmountHT + displayMetrics.fixedAmountHT))}</span></div>
                               </div>
                             </>
                        ) : !isBT ? (
                             <>
                               <div className="pb-3 border-b border-slate-50 border-dashed">
                                  <div className="flex justify-between text-slate-600"><span>Énergie Enregistrée</span><span className="font-mono">{formatNumber(displayMetrics.energyRecorded)} kWh</span></div>
                                  <div className="flex justify-between text-slate-500 text-xs pl-2"><span>+ Pertes</span><span className="font-mono">{formatNumber(displayMetrics.billedKwh - displayMetrics.energyRecorded)}</span></div>
                                  <div className="flex justify-between font-bold text-slate-700 mt-1 bg-slate-50 px-2 py-1 rounded"><span>Facturé</span><span>{formatMoney(displayMetrics.baseEnergyAmountHT)}</span></div>
                               </div>
                               <div className="pb-3 border-b border-slate-50 border-dashed space-y-1 pt-2">
                                  <div className={`flex justify-between text-xs ${displayMetrics.cosPhiAdjustmentAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                     <span>Ajustement Cos φ</span><span>{formatMoney(displayMetrics.cosPhiAdjustmentAmount)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-slate-600"><span>Prime Fixe ({displayMetrics.subPower}kVA x {formatNumber(globalConfig.powerUnitPrice)})</span><span>{formatMoney(displayMetrics.powerPremium)}</span></div>
                                  {displayMetrics.powerOverrunAmount > 0 && <div className="flex justify-between text-xs text-red-600 font-bold bg-red-50 p-1 rounded"><span>Pénalité Puissance ({formatNumber(displayMetrics.powerOverrun)} kVA x {globalConfig.powerOverrunPenalty})</span><span>{formatMoney(displayMetrics.powerOverrunAmount)}</span></div>}
                               </div>
                               <div className="text-xs text-slate-500 pt-2 space-y-1 border-t mt-2">
                                  <div className="flex justify-between"><span>Total Énergie TTC</span><span>{formatMoney(displayMetrics.total1_TTC)}</span></div>
                                  <div className="flex justify-between"><span>Total Fixe TTC</span><span>{formatMoney(displayMetrics.total2_TTC)}</span></div>
                                  <div className="flex justify-between"><span>Taxes (RTT+Muni)</span><span>{formatMoney(globalConfig.rtt + displayMetrics.municipalTax)}</span></div>
                               </div>
                             </>
                        ) : (
                             <>
                                <div className="pb-3 border-b border-slate-50 border-dashed">
                                    <div className="flex justify-between font-bold text-slate-700"><span>Conso ({formatNumber(displayMetrics.consumptionGrid)} kWh)</span><span>{formatMoney(displayMetrics.consoAmountHT)}</span></div>
                                </div>
                                <div className="space-y-1 text-xs text-slate-500 pt-2">
                                    <div className="flex justify-between"><span>Redevances (Fixe + Serv)</span><span>{formatMoney(displayMetrics.fixedAmountHT)}</span></div>
                                    <div className="flex justify-between"><span>Taxes (TVA,CL,FTE)</span><span>{formatMoney(displayMetrics.totalFinalTTC - displayMetrics.totalHT)}</span></div>
                                </div>
                             </>
                        )}

                        {(parseFloat(formData.lateFees) > 0 || parseFloat(formData.relanceFees) > 0 || parseFloat(formData.adjustment) !== 0) && (
                            <div className="pt-2 text-xs text-orange-600 border-t mt-2 flex justify-between font-bold">
                                <span>Frais & Ajustements</span>
                                <span>{formatMoney((parseFloat(formData.lateFees)||0) + (parseFloat(formData.relanceFees)||0) + (parseFloat(formData.adjustment)||0))}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 border-t-2 border-slate-800 pt-4">
                       <div className="flex justify-between items-end">
                         <span className="text-lg font-black text-slate-900 uppercase">Net à Payer</span>
                         <span className={`text-3xl font-black font-mono tracking-tight ${isBT ? 'text-red-700' : 'text-blue-700'}`}>{formatMoney(displayMetrics.netToPay)}</span>
                       </div>
                    </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 h-[400px] flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center"><Database size={12} className="mr-1"/> Historique Cloud</h3>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {siteLogs.map(log => (
                            <div key={log.docId} className="p-3 border rounded-lg bg-slate-50 text-xs hover:bg-blue-50 transition-colors">
                                <div className="flex justify-between font-bold text-slate-700 mb-1">
                                    <span className="flex items-center"><Calendar size={12} className="mr-1"/> {log.recordDate}</span>
                                    <span className="text-blue-600">{formatMoney(log.netToPay)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mt-2 border-t pt-2 border-slate-200">
                                    <div>Conso: <span className="font-mono text-slate-700">{formatNumber(log.type === 'MT' ? log.energyRecorded : log.consumptionGrid)}</span> kWh</div>
                                    <div>{log.type === 'MT' ? `P.Max: ${log.maxPower} kVA` : (log.type === 'BT_PV' ? `PV: ${formatNumber(log.productionPv)}` : 'Standard')}</div>
                                    {log.type === 'MT' && <div>Cos φ: <span className={log.cosPhi < 0.8 ? 'text-red-500 font-bold' : 'text-emerald-600'}>{log.cosPhi}</span></div>}
                                    {log.type === 'MT' && log.reactiveCons > 0 && <div>Réactif: {log.reactiveCons}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
        {notification && <div className="fixed bottom-6 right-6 px-6 py-4 bg-emerald-600 text-white rounded-xl shadow-xl">{notification.msg}</div>}
    </div>
  );
};

// ==================================================================================
// 4. MODULE GESTION AIR COMPRIMÉ (Complet)
// ==================================================================================

const AirModule = ({ onBack, userRole }) => {
  const [activeCompressor, setActiveCompressor] = useState(1);
  const [logs, setLogs] = useState([]);
  const [showMaintPopup, setShowMaintPopup] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [notif, setNotif] = useState(null);
  const [week, setWeek] = useState(getWeekNumber(new Date()));
  const [editingPrev, setEditingPrev] = useState(false);
  const [config, setConfig] = useState({ elecPrice: 0.291, offLoadFactor: 0.3 });
  
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }

  useEffect(() => {
    const q = query(getCollection('air_logs'), orderBy('id', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  const COMPRESSORS = [
    { id: 1, name: "Compresseur 1", serial: "CAI 827281", model: "Ceccato CSB 30", power: 22 },
    { id: 2, name: "Compresseur 2", serial: "CAI 808264", model: "Ceccato CSB 30", power: 22 }
  ];

  const MAINT_INTERVALS = { oilFilter: 2000, airFilter: 2000, separator: 4000, oil: 2000, general: 500 };
  const MAINT_LABELS = { oilFilter: "Filtre à Huile", airFilter: "Filtre à Air", separator: "Séparateur", oil: "Huile", general: "Inspection" };
  const MAINT_ICONS = { oilFilter: Filter, airFilter: Wind, separator: Droplets, oil: Droplets, general: SearchIcon };
  function SearchIcon(props) { return <Eye {...props}/> } 

  const [formData, setFormData] = useState({
    1: { lastRun: 19960, newRun: '', lastLoad: 10500, newLoad: '', description: '', lastMaint: { oilFilter: 18000, airFilter: 18000, separator: 16000, oil: 18000, general: 19500 } },
    2: { lastRun: 18500, newRun: '', lastLoad: 9200, newLoad: '', description: '', lastMaint: { oilFilter: 16000, airFilter: 16000, separator: 14000, oil: 16000, general: 18000 } }
  });
  
  useEffect(() => {
      const compLogs = logs.filter(l => l.compName === COMPRESSORS.find(c => c.id === activeCompressor).name).sort((a,b) => b.id - a.id);
      if(compLogs.length > 0) {
          setFormData(prev => ({
              ...prev,
              [activeCompressor]: {
                  ...prev[activeCompressor],
                  lastRun: compLogs[0].newRun,
                  lastLoad: compLogs[0].newLoad,
              }
          }));
      }
  }, [activeCompressor, logs]);

  const handleInput = (field, value) => setFormData(prev => ({...prev, [activeCompressor]: {...prev[activeCompressor], [field]: value}}));
  
  const calculateKPIs = () => {
     const data = formData[activeCompressor];
     const comp = COMPRESSORS.find(c => c.id === activeCompressor);
     const runDelta = Math.max(0, (parseFloat(data.newRun)||0) - (parseFloat(data.lastRun)||0));
     const loadDelta = Math.max(0, (parseFloat(data.newLoad)||0) - (parseFloat(data.lastLoad)||0));
     const loadRate = runDelta > 0 ? (loadDelta / runDelta) * 100 : 0;
     const utilRate = (runDelta / 47.5) * 100;
     const energyKwh = (loadDelta * comp.power) + ((runDelta - loadDelta) * comp.power * config.offLoadFactor);
     
     const currentTotal = parseFloat(data.newRun) || parseFloat(data.lastRun) || 0;
     const maintStatus = {};
     Object.keys(MAINT_INTERVALS).forEach(key => {
        const lastDone = data.lastMaint[key] || 0;
        const remaining = (lastDone + MAINT_INTERVALS[key]) - currentTotal;
        maintStatus[key] = { remaining };
     });

     return { runDelta, loadDelta, loadRate, utilRate, energyKwh, costHT: energyKwh * config.elecPrice, maintStatus };
  };

  const handleSubmit = async () => {
     const kpis = calculateKPIs();
     const data = formData[activeCompressor];
     if(!data.newRun) { setNotif("Index manquant"); return; }
     
     const newLog = {
         id: Date.now(),
         type: 'WEEKLY_REPORT',
         week: week,
         compName: COMPRESSORS.find(c => c.id === activeCompressor).name,
         ...data, ...kpis
     };
     await addDoc(getCollection('air_logs'), newLog);
     setFormData(prev => ({
         ...prev,
         [activeCompressor]: { ...prev[activeCompressor], lastRun: data.newRun, newRun: '', lastLoad: data.newLoad, newLoad: '', description: '' }
     }));
     setNotif("Enregistré");
     setTimeout(() => setNotif(null), 3000);
  };

  const handleMaintenanceDone = (type, details) => {
      const currentRun = parseFloat(formData[activeCompressor].newRun) || parseFloat(formData[activeCompressor].lastRun);
      const newMaint = { ...formData[activeCompressor].lastMaint, [type]: currentRun };
      setFormData(prev => ({
          ...prev,
          [activeCompressor]: { ...prev[activeCompressor], lastMaint: newMaint }
      }));
      
      const newLog = {
          id: Date.now(),
          type: 'MAINTENANCE',
          date: new Date().toLocaleDateString(),
          compName: COMPRESSORS.find(c => c.id === activeCompressor).name,
          maintType: MAINT_LABELS[type],
          indexDone: currentRun,
          details: details
      };
      addDoc(getCollection('air_logs'), newLog);
      
      setShowMaintPopup(null);
      setNotif("Maintenance validée");
  };

  const kpis = calculateKPIs();
  const getStatusColor = (rem) => rem <= 0 ? 'text-red-600 font-bold' : (rem < 200 ? 'text-orange-500' : 'text-emerald-600');

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
        <header className="bg-gradient-to-r from-sky-700 to-blue-800 text-white shadow-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={onBack} className="mr-4"><ArrowLeft /></button>
              <div>
                  <h1 className="font-bold text-xl">Gestion Air Comprimé</h1>
                  <DateTimeDisplay />
              </div>
            </div>
            <div className="flex gap-4">
                <button onClick={() => setShowGuide(true)} className="flex items-center bg-white/10 px-3 py-2 rounded text-xs font-bold border border-white/20 hover:bg-white/20"><BookOpen size={14} className="mr-2" /> Procédure ES 3000</button>
            </div>
        </header>

        {showGuide && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowGuide(false)}>
                <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl relative" onClick={e=>e.stopPropagation()}>
                    <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg"><Eye className="mr-2 text-sky-600" /> Relevé Heures - Contrôleur ES 3000</h3>
                    <div className="space-y-4 text-sm text-slate-600">
                        <div className="bg-slate-50 p-4 rounded border">
                            <p className="font-bold text-slate-800 mb-2">Utilisation du Bouton 3 (Flèche/Tab)</p>
                            <ul className="list-disc ml-5 space-y-2">
                                <li><strong>Appui 1 :</strong> Pression & Température</li>
                                <li><strong>Appui 2 :</strong> Heures Totales de Marche (Symbole Horloge)</li>
                                <li><strong>Appui 3 :</strong> Heures en Charge (Symbole Piston/Charge)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <main className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
                <div className="flex gap-2">
                    {COMPRESSORS.map(c => (
                        <button key={c.id} onClick={() => setActiveCompressor(c.id)} className={`flex-1 p-4 rounded-xl border text-left ${activeCompressor === c.id ? 'bg-white border-sky-500 shadow-md ring-2 ring-sky-100' : 'bg-white border-slate-200'}`}>
                            <div className="font-bold text-slate-700">{c.name}</div>
                            <div className="text-xs text-slate-400">{c.model} - {c.serial}</div>
                        </button>
                    ))}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold flex items-center text-slate-800"><Timer className="mr-2 text-sky-600"/> Saisie Relevé</h2>
                        <input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className="text-slate-800 text-sm px-2 py-1 rounded outline-none border font-bold" />
                     </div>
                     <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-bold text-slate-500">Marche (H)</label>
                                {userRole === 'ADMIN' && <button onClick={() => setEditingPrev(!editingPrev)} className="text-[10px] text-blue-500">Edit</button>}
                            </div>
                            <input type="number" readOnly={!editingPrev} className={`w-full text-xs mb-2 bg-transparent ${editingPrev ? 'border rounded bg-white' : ''}`} value={formData[activeCompressor].lastRun} onChange={e => handleInput('lastRun', e.target.value)} />
                            <input type="number" className="w-full border-2 border-sky-100 p-2 rounded text-lg font-mono focus:border-sky-500 outline-none" placeholder="Nouveau" value={formData[activeCompressor].newRun} onChange={e => handleInput('newRun', e.target.value)} />
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Charge (H)</label>
                            <input type="number" readOnly={!editingPrev} className={`w-full text-xs mb-2 bg-transparent ${editingPrev ? 'border rounded bg-white' : ''}`} value={formData[activeCompressor].lastLoad} onChange={e => handleInput('lastLoad', e.target.value)} />
                            <input type="number" className="w-full border-2 border-sky-100 p-2 rounded text-lg font-mono focus:border-sky-500 outline-none" placeholder="Nouveau" value={formData[activeCompressor].newLoad} onChange={e => handleInput('newLoad', e.target.value)} />
                        </div>
                     </div>
                     <textarea className="w-full border p-2 rounded text-sm mb-4" placeholder="Note / Justification..." value={formData[activeCompressor].description} onChange={e => handleInput('description', e.target.value)}></textarea>
                     <button onClick={handleSubmit} className="w-full bg-sky-600 text-white py-3 rounded-xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-200 transition-all">Valider Relevé</button>
                </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center"><TrendingUp className="mr-2 text-sky-500"/> Analyse Performance</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50 p-3 rounded">
                            <div className="text-xs text-slate-500">Taux Charge</div>
                            <div className="font-bold text-lg">{kpis.loadRate.toFixed(1)}%</div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1"><div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${kpis.loadRate}%`}}></div></div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded">
                            <div className="text-xs text-slate-500">Taux Utilisation</div>
                            <div className="font-bold text-lg">{kpis.utilRate.toFixed(1)}%</div>
                            <div className="text-[10px] text-slate-400">Base 47.5h</div>
                        </div>
                    </div>
                    <div className="text-center bg-blue-50 p-2 rounded text-blue-700 font-bold">Coût Est. : {kpis.costHT.toFixed(0)} DT</div>
                </div>

                 {/* Historique Air */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 h-[300px] flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Historique</h3>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {logs.filter(l => l.compName === COMPRESSORS.find(c => c.id === activeCompressor).name).sort((a,b)=>b.id-a.id).map(log => (
                            <div key={log.docId} className={`p-2 border rounded text-xs ${log.type === 'MAINTENANCE' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50'}`}>
                                {log.type === 'MAINTENANCE' ? (
                                    <div className="flex justify-between font-bold text-emerald-800">
                                        <span><Wrench size={10} className="inline mr-1"/> {log.maintType}</span>
                                        <span>{log.date}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between">
                                        <span>{log.weekDate}</span>
                                        <span className="font-bold text-sky-700">{log.costHT?.toFixed(0)} DT</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* NEW Maintenance Section */}
            <div className="lg:col-span-12">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center"><Wrench className="mr-2 text-amber-500"/> Tableau de Maintenance</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.keys(MAINT_INTERVALS).map(key => {
                            const Icon = MAINT_ICONS[key];
                            return (
                                <div key={key} className="flex flex-col p-4 border rounded-xl hover:shadow-lg transition-all bg-slate-50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Icon size={40}/></div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">{MAINT_LABELS[key]}</div>
                                    <div className={`text-xl font-black mb-2 ${getStatusColor(kpis.maintStatus[key].remaining)}`}>{kpis.maintStatus[key].remaining} h</div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-4 overflow-hidden">
                                        <div className={`h-full ${kpis.maintStatus[key].remaining < 200 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(100, (kpis.maintStatus[key].remaining/MAINT_INTERVALS[key])*100)}%`}}></div>
                                    </div>
                                    <button onClick={() => setShowMaintPopup(key)} className="mt-auto w-full py-2 bg-white border border-slate-200 rounded text-xs font-bold hover:bg-slate-800 hover:text-white transition-colors">Faire Maint.</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
        
        {/* Popup Maintenance */}
        {showMaintPopup && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                    <h3 className="font-bold mb-4">Valider : {MAINT_LABELS[showMaintPopup]}</h3>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        handleMaintenanceDone(showMaintPopup, { date: fd.get('date'), tech: fd.get('tech'), notes: fd.get('notes') });
                    }}>
                        <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border p-2 rounded mb-2 text-sm" />
                        <input name="tech" placeholder="Intervenant" required className="w-full border p-2 rounded mb-2 text-sm" />
                        <textarea name="notes" placeholder="Notes" className="w-full border p-2 rounded mb-4 text-sm"></textarea>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowMaintPopup(null)} className="px-4 py-2 text-slate-500">Annuler</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded font-bold">Confirmer</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        {notif && <div className="fixed bottom-6 right-6 px-6 py-4 bg-sky-600 text-white rounded-xl shadow-xl">{notif}</div>}
    </div>
  );
};

// ==================================================================================
// 5. MODULE TABLEAU DE BORD SITES (Complet)
// ==================================================================================

const SitesDashboard = ({ onBack, userRole }) => {
  const [activeSiteTab, setActiveSiteTab] = useState('MEGRINE');
  const [historyData, setHistoryData] = useState({});
  const [showHistoryInput, setShowHistoryInput] = useState(false);
  const [refYear, setRefYear] = useState('2023'); // Default reference year for visualization
  const [notif, setNotif] = useState(null);
  const [avgTempHistory] = useState([
      { year: 2018, temp: 19.2 }, { year: 2019, temp: 19.5 }, { year: 2020, temp: 19.8 },
      { year: 2021, temp: 20.1 }, { year: 2022, temp: 20.4 }, { year: 2023, temp: 20.8 }, { year: 2024, temp: 21.0 }
  ]);
  
  useEffect(() => {
    getDocs(getCollection('site_history')).then(snap => {
        const data = {};
        snap.forEach(doc => {
            const [site, year] = doc.id.split('_');
            if(!data[site]) data[site] = {};
            data[site][year] = doc.data().months;
        });
        setHistoryData(prev => ({...prev, ...data}));
    });
  }, []);

  const initHistory = (site) => {
      if (!historyData[site]) {
          const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 'REF'];
          const emptyYear = Array(12).fill('');
          const newData = {};
          years.forEach(y => newData[y] = emptyYear);
          setHistoryData(prev => ({...prev, [site]: newData}));
      }
  };

  const SITES_DATA = {
    MEGRINE: { name: "Mégrine", area: 32500, covered: 30000, open: 2500, details: "Showroom 1000m² • Atelier FIAT 10000m² • Atelier IVECO 9000m² • ITALCAR Gros 10000m²", energyMix: [{ name: "Électricité", value: 97, color: "#3b82f6" }, { name: "Gaz", value: 3, color: "#f97316" }], elecUsage: [{ name: "Clim/Chauffage", value: 40, kpi: "kWh/m²", significant: true }, { name: "Éclairage", value: 27, kpi: "kWh/m²", significant: true }, { name: "Air Comprimé", value: 17, kpi: "kWh/Nm³", significant: true }, { name: "Informatique", value: 8, kpi: "-", significant: false }, { name: "Services", value: 5, kpi: "-", significant: false }, { name: "Gaz (Four)", value: 3, kpi: "kWh/Véhicule", significant: false, note: "Non-Significatif" }] },
    ELKHADHRA: { name: "El Khadhra", area: 9500, covered: 7000, open: 2500, details: "Réception 1000m² • Atelier FIAT 3000m² • ITALCAR Gros 3000m²", energyMix: [{ name: "Électricité", value: 100, color: "#3b82f6" }], elecUsage: [{ name: "Clim/Chauffage", value: 61, kpi: "kWh/m²", significant: true }, { name: "Éclairage", value: 23, kpi: "kWh/m²", significant: true }, { name: "Air Comprimé", value: 6, kpi: "kWh/Nm³", significant: false }, { name: "Informatique", value: 5, kpi: "-", significant: false }, { name: "Services", value: 5, kpi: "-", significant: false }] },
    NAASSEN: { name: "Naassen", area: 32500, covered: 1820, open: 30680, details: "Admin 920m² • Atelier 900m² • Parc Neuf 30680m²", energyMix: [{ name: "Électricité", value: 100, color: "#3b82f6" }], elecUsage: [{ name: "Éclairage (80% Ext)", value: 78, kpi: "kWh/m²", significant: true }, { name: "Clim/Chauffage", value: 14, kpi: "kWh/m²", significant: false }, { name: "Air Comprimé", value: 5, kpi: "kWh/Nm³", significant: false }, { name: "Services", value: 2, kpi: "-", significant: false }, { name: "Informatique", value: 1, kpi: "-", significant: false }] },
    LAC: { name: "Lac", area: 2050, covered: 850, open: 1200, details: "Showroom 850m² • Espace Ouvert 1200m²", energyMix: [{ name: "Électricité", value: 100, color: "#3b82f6" }], elecUsage: [{ name: "Éclairage (60% Int)", value: 58, kpi: "kWh/m²", significant: true }, { name: "Clim/Chauffage", value: 36, kpi: "kWh/m²", significant: true }, { name: "Informatique", value: 3, kpi: "-", significant: false }, { name: "Services", value: 3, kpi: "-", significant: false }] }
  };
  
  const currentData = SITES_DATA[activeSiteTab];

  const handleHistoryChange = (year, monthIdx, val) => {
      setHistoryData(prev => ({
          ...prev,
          [activeSiteTab]: {
              ...prev[activeSiteTab],
              [year]: prev[activeSiteTab][year].map((v, i) => i === monthIdx ? val : v)
          }
      }));
  };

  const saveHistory = async () => {
      const site = activeSiteTab;
      if (!historyData[site]) return;
      try {
        for (const year of Object.keys(historyData[site])) {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_history', `${site}_${year}`), { months: historyData[site][year] });
        }
        setNotif("Historique sauvegardé");
        setShowHistoryInput(false);
      } catch(e) { setNotif("Erreur"); }
      setTimeout(() => setNotif(null), 3000);
  };

  const HistoricalAnalysis = () => {
      const data2024 = historyData[activeSiteTab]?.[2024] || Array(12).fill(0);
      const dataRef = historyData[activeSiteTab]?.[refYear] || Array(12).fill(0);
      
      const total2024 = data2024.reduce((a,b) => a + (parseFloat(b)||0), 0);
      const totalRef = dataRef.reduce((a,b) => a + (parseFloat(b)||0), 0);
      const diff = totalRef > 0 ? ((total2024 - totalRef) / totalRef) * 100 : 0;

      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 mt-6 shadow-lg animate-in fade-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-700 flex items-center"><BarChart3 className="mr-2 text-blue-600"/> Analyse Comparative</h3>
                <div className="flex items-center gap-4">
                    <div className="text-sm">
                        <span className="font-bold text-slate-500">2024 vs </span>
                        <select className="border-none bg-slate-100 rounded px-2 font-bold text-blue-600 cursor-pointer" value={refYear} onChange={e => setRefYear(e.target.value)}>
                            <option value="REF">REF</option>
                            {[2018,2019,2020,2021,2022,2023].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${diff > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                    </div>
                </div>
             </div>
             
             {/* Simple Bar Chart */}
             <div className="h-48 flex items-end gap-2">
                 {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => {
                     const val2024 = parseFloat(data2024[i]) || 0;
                     const valRef = parseFloat(dataRef[i]) || 0;
                     const max = Math.max(...data2024.map(v=>parseFloat(v)||0), ...dataRef.map(v=>parseFloat(v)||0), 100);
                     
                     return (
                         <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                             <div className="w-full bg-slate-200 rounded-t relative hover:bg-slate-300 transition-all" style={{height: `${(valRef/max)*100}%`}}>
                                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-1 rounded mb-1">{valRef}</div>
                             </div>
                             <div className="w-full bg-blue-500 rounded-t relative hover:bg-blue-600 transition-all opacity-80" style={{height: `${(val2024/max)*100}%`}}>
                                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-blue-900 text-white text-[10px] p-1 rounded mb-1">{val2024}</div>
                             </div>
                             <div className="text-[10px] text-center text-slate-400 font-bold border-t border-slate-200 pt-1">{m}</div>
                         </div>
                     );
                 })}
             </div>
             <div className="flex justify-center gap-6 mt-4 text-xs font-bold">
                 <div className="flex items-center"><div className="w-3 h-3 bg-blue-500 rounded mr-2"></div> 2024 (Conso)</div>
                 <div className="flex items-center"><div className="w-3 h-3 bg-slate-200 rounded mr-2"></div> {refYear} (Référence)</div>
             </div>
        </div>
      );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
        <header className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
                <button onClick={onBack} className="mr-4"><ArrowLeft /></button>
                <div>
                    <h1 className="font-bold text-xl">Tableau de Bord Sites (Cloud)</h1>
                    <div className="flex items-center text-xs opacity-80 mt-1 space-x-4">
                        <DateTimeDisplay />
                        <span className="flex items-center"><Thermometer size={12} className="mr-1"/> 24°C</span>
                    </div>
                </div>
            </div>
            {userRole === 'ADMIN' && (
                <button onClick={() => { initHistory(activeSiteTab); setShowHistoryInput(true); }} className="flex items-center bg-white/10 px-3 py-2 rounded text-xs font-bold border border-white/20 hover:bg-white/20">
                    <Database size={14} className="mr-2" /> Saisir Historique
                </button>
            )}
        </header>

        {showHistoryInput && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold">Historique - {currentData.name}</h3>
                        <button onClick={() => setShowHistoryInput(false)}><X /></button>
                    </div>
                    <div className="overflow-y-auto flex-1 pr-2 space-y-6">
                        {['REF', 2018, 2019, 2020, 2021, 2022, 2023, 2024].map(year => (
                            <div key={year} className={`border rounded ${year === 'REF' ? 'border-orange-300 ring-2 ring-orange-50 bg-orange-50/20' : ''}`}>
                                <div className={`p-2 font-bold text-sm flex justify-between ${year === 'REF' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100'}`}>
                                    <span>{year === 'REF' ? 'ANNÉE DE RÉFÉRENCE' : year}</span>
                                    <span>Total: {historyData[activeSiteTab]?.[year]?.reduce((a,b)=>a+(parseFloat(b)||0),0).toLocaleString()} kWh</span>
                                </div>
                                <div className="grid grid-cols-6 gap-px bg-slate-200">
                                    {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => (
                                        <div key={i} className="bg-white p-2">
                                            <label className="text-[10px] text-slate-400">{m}</label>
                                            <input type="number" className="w-full text-xs outline-none" placeholder="0" 
                                                value={historyData[activeSiteTab]?.[year]?.[i] || ''} 
                                                onChange={e => handleHistoryChange(year, i, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={saveHistory} className="bg-emerald-600 text-white px-6 py-2 rounded font-bold">Enregistrer</button>
                    </div>
                </div>
            </div>
        )}

        <main className="p-8 max-w-7xl mx-auto">
            {/* KPI HEADERS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center"><div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4"><Maximize2 size={20} /></div><div><div className="text-xs text-slate-500 uppercase font-bold">Surface</div><div className="text-xl font-black text-slate-800">{currentData.area.toLocaleString()} m²</div></div></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center"><div className="p-3 rounded-full bg-emerald-50 text-emerald-600 mr-4"><Zap size={20} /></div><div><div className="text-xs text-slate-500 uppercase font-bold">Source Principale</div><div className="text-xl font-black text-slate-800">{currentData.energyMix[0].name}</div></div></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center"><div className="p-3 rounded-full bg-amber-50 text-amber-600 mr-4"><TrendingUp size={20} /></div><div><div className="text-xs text-slate-500 uppercase font-bold">Poste #1</div><div className="text-xl font-black text-slate-800">{currentData.elecUsage[0].name}</div></div></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center"><div className="p-3 rounded-full bg-purple-50 text-purple-600 mr-4"><Leaf size={20} /></div><div><div className="text-xs text-slate-500 uppercase font-bold">Ratio 2023</div><div className="text-xl font-black text-slate-800">-- <span className="text-xs font-normal text-slate-400">kWh/m²</span></div></div></div>
            </div>

            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {Object.keys(SITES_DATA).map(key => (
                    <button key={key} onClick={() => setActiveSiteTab(key)} className={`px-4 py-2 rounded font-bold whitespace-nowrap ${activeSiteTab === key ? 'bg-emerald-600 text-white' : 'bg-white'}`}>{SITES_DATA[key].name}</button>
                ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
                    <h3 className="font-bold text-slate-500 uppercase mb-4">Fiche Technique</h3>
                    <div className="text-3xl font-black text-slate-800 mb-2">{currentData.area.toLocaleString()} m²</div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-slate-50 p-2 rounded text-xs"><span className="block font-bold">Couvert</span>{currentData.covered} m²</div>
                        <div className="bg-slate-50 p-2 rounded text-xs"><span className="block font-bold">Ouvert</span>{currentData.open} m²</div>
                    </div>
                    <div className="text-xs text-slate-500 border-t pt-4">{currentData.details}</div>
                    
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Température Moyenne Annuelle</h4>
                        <div className="flex items-end gap-1 h-16">
                            {avgTempHistory.map(d => (
                                <div key={d.year} className="flex-1 bg-orange-100 rounded-t relative group" style={{height: `${(d.temp/30)*100}%`}}>
                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1 rounded mb-1">{d.temp}°</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>2018</span><span>2024</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 md:col-span-2">
                    <h3 className="font-bold text-slate-500 uppercase mb-4">Répartition Énergétique</h3>
                    <div className="space-y-3">
                        {currentData.elecUsage.map((u, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center w-1/3">
                                    {u.significant && <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" title="Significatif"></div>}
                                    <span className="text-sm font-bold text-slate-700">{u.name}</span>
                                    {u.note && <span className="text-[10px] text-orange-500 ml-2 italic">{u.note}</span>}
                                </div>
                                <div className="flex items-center flex-1">
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full mr-2 overflow-hidden">
                                        <div className={`h-full rounded-full ${u.name.includes('Gaz') ? 'bg-orange-500' : 'bg-blue-500'}`} style={{width: `${u.value}%`}}></div>
                                    </div>
                                    <span className="text-xs font-bold w-8 text-right">{u.value}%</span>
                                    <span className="text-[9px] text-slate-400 w-16 text-right">{u.kpi}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Visualisation Historique */}
            <HistoricalAnalysis />
        </main>
        {notif && <div className="fixed bottom-6 right-6 px-6 py-4 bg-emerald-600 text-white rounded-xl shadow-xl">{notif}</div>}
    </div>
  );
};

// ==================================================================================
// 6. MODULE ADMINISTRATION (NEW - To fix missing component)
// ==================================================================================
const AdminPanel = ({ onBack }) => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'RESP_ENERGIE' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query(getCollection('users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return () => unsubscribe();
    }, []);

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password) return;
        setLoading(true);
        await addDoc(getCollection('users'), newUser);
        setNewUser({ username: '', password: '', role: 'RESP_ENERGIE' });
        setLoading(false);
    };

    const handleDeleteUser = async (id) => {
        if(confirm("Supprimer cet utilisateur ?")) {
            await deleteDoc(doc(getCollection('users'), id));
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <header className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
                 <div className="flex items-center">
                    <button onClick={onBack} className="mr-4 p-2 bg-white rounded-full shadow hover:bg-slate-50"><ArrowLeft size={20} /></button>
                    <h1 className="text-2xl font-black text-slate-800">Administration Utilisateurs</h1>
                 </div>
            </header>
            <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="font-bold text-lg mb-4 flex items-center"><PlusCircle className="mr-2 text-blue-600"/> Ajouter Utilisateur</h2>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Nom d'utilisateur</label>
                            <input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full border p-2 rounded" placeholder="ex: Maintenance" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Mot de passe</label>
                            <input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full border p-2 rounded" placeholder="******" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Rôle</label>
                            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full border p-2 rounded bg-white">
                                <option value="RESP_ENERGIE">Responsable Énergie</option>
                                <option value="RESP_MAINTENANCE">Responsable Maintenance</option>
                                <option value="DIRECTION">Direction</option>
                                <option value="ADMIN">Administrateur</option>
                            </select>
                        </div>
                        <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">{loading ? '...' : 'Ajouter'}</button>
                    </form>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-lg mb-4 flex items-center"><Users className="mr-2 text-slate-600"/> Liste Utilisateurs ({users.length})</h2>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {users.map(u => (
                            <div key={u.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 group">
                                <div>
                                    <div className="font-bold">{u.username}</div>
                                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-fit">{u.role}</div>
                                </div>
                                <button onClick={() => handleDeleteUser(u.id)} className="text-slate-300 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        {users.length === 0 && <div className="text-center text-slate-400 text-sm italic py-4">Aucun utilisateur configuré</div>}
                    </div>
                </div>
            </main>
        </div>
    );
};

// ==================================================================================
// APPLICATION RACINE & NAVIGATION
// ==================================================================================

const MainDashboard = ({ user, onNavigate, onLogout }) => {
  const canAccess = (module) => {
      if (user.role === 'ADMIN') return true;
      if (user.role === 'DIRECTION') return module === 'sites';
      if (user.role === 'RESP_ENERGIE') return module === 'steg' || module === 'sites';
      if (user.role === 'RESP_MAINTENANCE') return module === 'air';
      return false;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
        </div>

        <div className="z-10 w-full max-w-6xl flex justify-between items-center mb-12">
            <div>
                <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">Système de Gestion Industriel</h1>
                <p className="text-slate-400 text-lg">Bienvenue, <span className="text-white font-bold">{user.username}</span> ({user.role})</p>
            </div>
            <div className="flex gap-4">
                {user.role === 'ADMIN' && <button onClick={() => onNavigate('admin')} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold flex items-center"><Shield className="mr-2"/> Admin</button>}
                <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold flex items-center"><LogOut className="mr-2"/> Déconnexion</button>
            </div>
        </div>

        <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
            <button disabled={!canAccess('steg')} onClick={() => onNavigate('steg')} className={`group relative border-2 rounded-3xl p-6 transition-all text-left ${canAccess('steg') ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-blue-500' : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'}`}>
                <div className={`absolute top-4 right-4 p-2 rounded-xl ${canAccess('steg') ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-600'}`}><Zap size={24} /></div>
                <h2 className="text-xl font-bold mb-2">Énergie & Facturation</h2>
                <p className="text-slate-400 text-xs mb-4 pr-8">Relevés STEG (MT/BT), Calcul Cos φ.</p>
            </button>

            <button disabled={!canAccess('air')} onClick={() => onNavigate('air')} className={`group relative border-2 rounded-3xl p-6 transition-all text-left ${canAccess('air') ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-sky-500' : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'}`}>
                <div className={`absolute top-4 right-4 p-2 rounded-xl ${canAccess('air') ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-600'}`}><Wind size={24} /></div>
                <h2 className="text-xl font-bold mb-2">Air Comprimé</h2>
                <p className="text-slate-400 text-xs mb-4 pr-8">Suivi Compresseurs, Maintenance.</p>
            </button>

            <button disabled={!canAccess('sites')} onClick={() => onNavigate('sites')} className={`group relative border-2 rounded-3xl p-6 transition-all text-left ${canAccess('sites') ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-emerald-500' : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'}`}>
                <div className={`absolute top-4 right-4 p-2 rounded-xl ${canAccess('sites') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}><LayoutGrid size={24} /></div>
                <h2 className="text-xl font-bold mb-2">Tableau de Bord Sites</h2>
                <p className="text-slate-400 text-xs mb-4 pr-8">Superficies, Usages, KPIs.</p>
            </button>
        </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null); 
  const [currentModule, setCurrentModule] = useState('dashboard');
  
  useEffect(() => {
    const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    };
    initAuth();
  }, []);

  const handleLogin = (userData) => {
      setUser(userData);
      setCurrentModule('dashboard');
  };

  const handleLogout = () => {
      setUser(null);
      setCurrentModule('dashboard');
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <>
      {currentModule === 'dashboard' && <MainDashboard user={user} onNavigate={setCurrentModule} onLogout={handleLogout} />}
      {currentModule === 'admin' && <AdminPanel onBack={() => setCurrentModule('dashboard')} />}
      {currentModule === 'steg' && <StegModule onBack={() => setCurrentModule('dashboard')} userRole={user.role} />}
      {currentModule === 'air' && <AirModule onBack={() => setCurrentModule('dashboard')} userRole={user.role} />}
      {currentModule === 'sites' && <SitesDashboard onBack={() => setCurrentModule('dashboard')} userRole={user.role} />}
    </>
  );
};

export default App;
