import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Activity, Save, History, TrendingUp, AlertTriangle, Factory, CheckCircle2,
  BarChart3, Settings, Lock, Unlock, Calendar, HelpCircle,
  FileText, Eye, BookOpen, Sun, MousePointerClick,
  Info, Wind, Thermometer, Timer, Wrench, LayoutGrid, ArrowLeft, Edit2,
  PieChart, MapPin, Maximize2, Building2, Leaf, CloudSun, Flag,
  Database, User, Users, LogOut, Key, Shield, X, Trash2, PlusCircle,
  Store, Droplets, Filter, Check, Printer, TrendingDown, Download, Sliders,
  Target, Flame, Lightbulb, ThermometerSun
} from 'lucide-react';

// --- CONFIGURATION DU SERVEUR LOCAL (VOTRE TUNNEL) ---
// Remplacez cette URL si votre tunnel change
const API_URL = "https://raleigh-assessing-units-accompanied.trycloudflare.com/donnees";

// --- MOTEUR DE DONNÉES LOCAL (Remplacement de Firebase) ---
// Hook personnalisé pour lire les données du PC en temps réel (Polling)
const useData = (collectionName) => {
    const [data, setData] = useState([]);
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error("Erreur réseau");
                const allData = await response.json();
                
                // On filtre pour ne garder que la collection demandée
                // et on trie pour avoir les plus récents en premier (simulation de l'ordre décroissant)
                const filtered = allData
                    .filter(item => item.collection === collectionName)
                    .sort((a, b) => new Date(b._created || 0) - new Date(a._created || 0));
                
                if (isMounted) setData(filtered);
            } catch (error) {
                console.error("Erreur de connexion au PC:", error);
            }
        };

        fetchData(); // Premier chargement immédiat
        const interval = setInterval(fetchData, 2000); // Rafraichissement toutes les 2 sec
        return () => { isMounted = false; clearInterval(interval); };
    }, [collectionName]);
    return data;
};

// Fonction pour sauvegarder (Envoi vers le PC)
const saveData = async (collectionName, data) => {
    try {
        const payload = {
            ...data,
            collection: collectionName,
            _id: data.id || Date.now().toString(), // Génération d'ID si absent
            _created: new Date().toISOString()
        };
        
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) {
        alert("Impossible de sauvegarder : Vérifiez que votre PC serveur est allumé et le tunnel actif.");
        return false;
    }
};

// --- CONFIGURATION CHARTE GRAPHIQUE ---
const LOGO_URL = "https://italcar.tn/wp-content/uploads/2020/12/logo-italcar.png"; 
const BRAND = {
    primary: "bg-blue-900",
    primaryText: "text-blue-900",
    accent: "bg-red-600",
    accentText: "text-red-600",
    lightBg: "bg-slate-50"
};

const BrandLogo = ({ size = "h-10" }) => (
    <img 
        src={LOGO_URL} 
        alt="ITALCAR Logo" 
        className={`${size} object-contain`} 
        onError={(e) => {
            e.target.onerror = null; 
            e.target.style.display = 'none'; 
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }} 
    />
);
const FallbackLogo = () => (
    <div className="hidden items-center justify-center bg-blue-900 text-white font-black p-2 rounded text-xs">
        ITALCAR
    </div>
);

// --- COMPOSANT HORLOGE & MÉTÉO (API LIVE) ---
const HeaderInfoDisplay = ({ darkText = false }) => {
    const [date, setDate] = useState(new Date());
    const [weather, setWeather] = useState({ temp: '--', code: 0 });

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        const fetchWeather = async () => {
            try {
                const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=36.8065&longitude=10.1815&current_weather=true');
                const data = await res.json();
                if(data.current_weather) {
                    setWeather({ temp: data.current_weather.temperature, code: data.current_weather.weathercode });
                }
            } catch (e) { console.log("Weather fetch failed"); }
        };
        fetchWeather();
        const weatherTimer = setInterval(fetchWeather, 600000);
        return () => { clearInterval(timer); clearInterval(weatherTimer); };
    }, []);

    const textColor = darkText ? "text-slate-800" : "text-white";
    const subTextColor = darkText ? "text-slate-500" : "text-white/80";

    return (
        <div className={`flex items-center gap-8 ${textColor}`}>
             <div className="flex flex-col items-end">
                <div className="text-3xl font-black leading-none flex items-center gap-2">
                    {weather.temp}° <Thermometer size={20} className="text-orange-500"/>
                </div>
                <div className={`text-[10px] uppercase font-bold tracking-widest ${subTextColor}`}>Tunis</div>
            </div>
            <div className={`h-10 w-px ${darkText ? 'bg-slate-300' : 'bg-white/30'}`}></div>
            <div className="flex flex-col items-end">
                <div className="text-3xl font-black leading-none">{date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</div>
                <div className={`text-[10px] uppercase font-bold tracking-widest ${subTextColor}`}>{date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
            </div>
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
  
  // Chargement des utilisateurs depuis le PC
  const users = useData('users');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Backdoor Administrateur (Toujours active en cas de problème réseau)
    if (username === 'RMI' && password === 'RMI2026$') {
        setTimeout(() => {
            onLogin({ username: 'RMI', role: 'ADMIN' });
            setLoading(false);
        }, 800);
        return;
    }
    
    // Test admin par défaut si DB vide
    if (username === 'admin' && password === '0000') {
        onLogin({ username: 'Admin Test', role: 'ADMIN' });
        setLoading(false);
        return;
    }

    // Vérification avec la base de données du PC
    const userFound = users.find(u => u.username === username && u.password === password);

    if (userFound) {
        onLogin(userFound);
    } else {
        setError("Utilisateur inconnu ou mot de passe incorrect");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-200 skew-x-12 opacity-50"></div>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-10 w-full max-w-md z-10 border-t-4 border-blue-900">
            <div className="text-center mb-10">
                <div className="flex justify-center mb-4">
                    <BrandLogo size="h-16" />
                    <FallbackLogo />
                </div>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Système de Management de l'Énergie</h1>
                <p className="text-slate-400 text-sm mt-1 font-medium">Certifié ISO 50001</p>
                <div className="mt-2 text-xs text-green-600 bg-green-50 inline-block px-2 py-1 rounded font-bold border border-green-200">
                    ● Connecté au Serveur
                </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Identifiant</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input type="text" className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-blue-900 focus:ring-1 focus:ring-blue-900 font-bold text-slate-700 outline-none transition-all" placeholder="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mot de passe</label>
                    <div className="relative">
                        <Key className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input type="password" className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-blue-900 focus:ring-1 focus:ring-blue-900 font-bold text-slate-700 outline-none transition-all" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                </div>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-bold flex items-center justify-center border border-red-100"><AlertTriangle size={16} className="mr-2"/>{error}</div>}
                <button type="submit" disabled={loading} className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-900/20 transition-all uppercase tracking-wide text-sm">{loading ? "Connexion..." : "Se Connecter"}</button>
            </form>
            <div className="mt-8 text-center text-[10px] text-slate-400 font-mono">v1.2.1 (BETA) • ITALCAR S.A.</div>
        </div>
    </div>
  );
};

// ==================================================================================
// 2. MODULE ÉNERGIE & FACTURATION (STEG)
// ==================================================================================
const StegModule = ({ onBack, userRole }) => {
  const [currentSite, setCurrentSite] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingPrev, setEditingPrev] = useState(false);

  // CHARGEMENT DONNÉES DEPUIS PC
  const logs = useData('steg_logs');

  const SITES = [
    { id: 1, name: "MT 1 - Mégrine", code: "MEG-001", type: "MT", icon: Factory },
    { id: 2, name: "MT 2 - El Khadhra", code: "ELK-002", type: "MT", icon: Building2 },
    { id: 3, name: "MT 3 - Naassen", code: "NAS-003", type: "MT", icon: Building2 },
    { id: 4, name: "BT 1 - Showroom Lac", code: "LAC-001", type: "BT_PV", icon: Store }, 
    { id: 5, name: "BT 2 - Azur City", code: "AZU-002", type: "BT", icon: Store },
    { id: 6, name: "BT 3 - Rue de Carthage", code: "CAR-003", type: "BT", icon: Store }
  ];

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
    const siteLogs = logs.filter(l => l.siteId === currentSite);
    if (siteLogs.length > 0) {
      // Les logs sont déjà triés par useData
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
      
      // SAUVEGARDE SUR PC
      const success = await saveData('steg_logs', newLog);
      
      if(success) {
          setNotification({ msg: "Relevé enregistré sur le PC", type: 'success' });
          setFormData(prev => ({
            ...prev,
            lastIndex: formData.newIndex, newIndex: '',
            ...(site.type === 'BT_PV' ? { lastIndexPv: formData.newIndexPv, newIndexPv: '', previousBalance: metrics.newCarryOver } : {}),
            cosPhi: '', reactiveCons: '', maxPower: '', lateFees: '', relanceFees: '', adjustment: '', manualLastIndex: false
          }));
      } else {
          setNotification({ msg: "Erreur sauvegarde", type: 'error' });
      }
      setTimeout(() => setNotification(null), 3000);
  };
    
  const liveMetrics = calculateMetrics();
  const siteLogs = logs.filter(l => l.siteId === currentSite);
  const currentSiteObj = SITES.find(s => s.id === currentSite);
  const isBT = currentSiteObj.type.startsWith('BT');
  const isMT = currentSiteObj.type === 'MT';
  const displayMetrics = liveMetrics;
  const CurrentIcon = currentSiteObj.icon;
    
  return (
    <div className="bg-slate-50 min-h-screen pb-10">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-4 mb-2 md:mb-0">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full mr-2 transition-colors text-slate-500"><ArrowLeft size={20} /></button>
                    <div className={`p-2 rounded-lg ${isBT ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-900'}`}>
                        <CurrentIcon size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">Facturation {currentSiteObj.name}</h1>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${isBT ? 'bg-red-600 text-white' : 'bg-blue-900 text-white'}`}>
                                {isBT ? 'BASSE TENSION' : 'MOYENNE TENSION'}
                            </span>
                            <span className="flex items-center"><MapPin size={10} className="mr-1"/> {currentSiteObj.code}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <HeaderInfoDisplay darkText={true} />
                    <div className="flex gap-2">
                        <button onClick={() => setShowUserGuide(true)} className="flex items-center bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 transition-colors"><BookOpen size={16} className="mr-2" /> Guide</button>
                        {isMT && <button onClick={() => setShowHelp(true)} className="flex items-center bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg text-xs font-bold text-blue-600 transition-colors border border-blue-100"><HelpCircle size={16} className="mr-2" /> Cos φ</button>}
                    </div>
                </div>
            </div>
        </header>

        {showUserGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowUserGuide(false)}>
                <div className="bg-white p-8 rounded-2xl max-w-4xl w-full shadow-2xl relative overflow-hidden h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 flex items-center">
                                <BookOpen className="mr-3 text-blue-900" size={28}/> Guide de Collecte
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Procédures physiques pour les relevés d'index</p>
                        </div>
                        <button onClick={() => setShowUserGuide(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full"><X size={20} className="text-slate-600"/></button>
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-8 pr-2">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center"><Factory className="mr-2"/> Compteurs Moyenne Tension (MT)</h4>
                            <p className="text-sm text-slate-600 mb-4">Concerne : Mégrine, El Khadhra, Naassen.</p>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-900">
                                    <h5 className="font-bold text-slate-800 mb-2">Procédure de Relevé</h5>
                                    <p className="text-xs text-slate-500 leading-relaxed text-justify">
                                        Pour la lecture des données du compteur, Appuyer brièvement sur le bouton poussoir supérieur (Disp.) pour faire apparaître le contrôle display puis Appuyer brièvement une seconde fois, l'indication ST-DATA s'affiche.
                                        <br/><br/>
                                        Ensuite, Appuyer et maintenir la pression, jusqu'à l'apparition du premier affichage (n°compteur).
                                        <br/><br/>
                                        Puis, une brève impulsion sur ce même bouton fait avancer d'un pas le défilement des index. A la fin de la liste, END s'affiche.
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                    <h5 className="font-bold text-slate-800 mb-2">Codes OBIS à Relever</h5>
                                    <ul className="text-xs text-slate-500 space-y-1 font-mono">
                                        <li><strong>1.8.0</strong> : Cumul Énergie Active (kWh) [Puissance]</li>
                                        <li><strong>Réactif</strong> : (Index Energie Réactive)</li>
                                        <li><strong>Cos Phi</strong> : Relever le facteur de puissance affiché</li>
                                        <li className="text-slate-400 italic">(Pas de relevé Soir/Nuit ni Pointe requis)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                            <h4 className="text-lg font-bold text-orange-800 mb-4 flex items-center"><Sun className="mr-2"/> Photovoltaïque & BT</h4>
                            <p className="text-sm text-slate-600 mb-4">Concerne : Showroom Lac (BT+PV).</p>
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-lg border border-orange-100">
                                    <h5 className="font-bold text-slate-800 mb-1">Compteur STEG Bidirectionnel</h5>
                                    <p className="text-xs text-slate-500 mb-2">Ce compteur affiche deux sens de flux :</p>
                                    <ul className="text-xs text-slate-500 list-disc pl-5">
                                        <li><strong>Code 1.8.0</strong> : Consommation prise du réseau (Import).</li>
                                        <li><strong>Code 2.8.0</strong> : Surplus injecté dans le réseau (Export).</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showHelp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
                <div className="bg-white p-8 rounded-2xl max-w-3xl w-full shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 flex items-center">
                                <HelpCircle className="mr-3 text-blue-600" size={28}/> Comprendre le Cos φ
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Impact sur la facturation et l'efficacité énergétique</p>
                        </div>
                        <button onClick={() => setShowHelp(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full"><X size={20} className="text-slate-600"/></button>
                    </div>

                    <div className="mb-8">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider px-1">
                            <span className="text-red-600">Pénalité</span>
                            <span className="text-slate-500">Neutre</span>
                            <span className="text-emerald-600">Bonus</span>
                        </div>
                        <div className="h-12 w-full rounded-xl flex overflow-hidden shadow-inner border border-slate-200 relative">
                            <div className="w-[40%] bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs border-r border-white" title="< 0.8">
                                &lt; 0.80
                            </div>
                            <div className="w-[30%] bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border-r border-white" title="0.8 - 0.9">
                                0.8 - 0.90
                            </div>
                            <div className="w-[30%] bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs" title="> 0.9">
                                &gt; 0.90
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                            <span>0.50</span>
                            <span>0.80</span>
                            <span>0.90</span>
                            <span>1.00</span>
                        </div>
                    </div>
                    <div className="text-sm text-slate-600 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p><strong>Note :</strong> Le Cosinus Phi mesure l'efficacité de votre installation. Un mauvais Cos φ (inférieur à 0.8) entraîne une facturation de l'énergie réactive par la STEG. Assurez-vous que vos batteries de condensateurs fonctionnent correctement.</p>
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
                                ? (site.type.startsWith('BT') ? 'bg-red-600 text-white shadow-lg border-red-600' : 'bg-blue-900 text-white shadow-lg border-blue-900') 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}>
                            <site.icon size={20} className={`mb-1 transition-transform ${currentSite === site.id ? 'opacity-100' : 'opacity-60 group-hover:scale-110'}`}/>
                            <span>{site.name}</span>
                        </button>
                    ))}
                </div>
                
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center">
                            <Calendar className="mr-2 text-slate-400" size={20} /> Période de Facturation
                        </h2>
                        <input type="month" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-900 outline-none" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><Zap size={12} className="mr-1"/> Index Actif</h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 relative">
                                <div>
                                    <label className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                        Ancien Index
                                        {userRole === 'ADMIN' && <Edit2 size={12} className="cursor-pointer text-slate-400 hover:text-blue-900" onClick={() => setEditingPrev(!editingPrev)} />}
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
                                    <label className="text-xs font-bold text-blue-900 mb-1 block">Nouvel Index *</label>
                                    <input type="text" required value={formatInputDisplay(formData.newIndex)} onChange={(e) => handleInputChange('newIndex', e.target.value)} className="w-full text-lg border-2 border-blue-200 rounded p-2 font-mono focus:border-blue-900 outline-none" />
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

                    <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center ${isBT ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-900 hover:bg-blue-800'}`}>
                        <Save size={18} className="mr-2" /> Valider & Sauvegarder sur PC
                    </button>
                </form>

                <div className="bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                    <button onClick={() => setIsConfigUnlocked(!isConfigUnlocked)} className="w-full px-6 py-3 flex justify-between items-center text-xs font-bold text-slate-500 uppercase hover:bg-slate-200">
                        <span><Settings size={14} className="inline mr-2" /> Configuration Avancée ({isBT ? 'BT' : 'MT'})</span>
                        {isConfigUnlocked ? <Unlock size={14} className="text-red-500" /> : <Lock size={14} />}
                    </button>
                    {isConfigUnlocked && (
                        <div className="p-4 bg-white border-t border-slate-200 animate-in slide-in-from-top-2">
                             {!isBT ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div className="col-span-full mb-1 text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-1">Paramètres Moyenne Tension</div>
                                    <div><label className="block text-slate-400 mb-1">P. Souscrite (kVA)</label><input type="number" value={siteConfigs[currentSite].subscribedPower} onChange={e => handleSiteConfigChange('subscribedPower', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">Prix Énergie (DT/kWh)</label><input type="number" value={globalConfig.unitPriceKwh} onChange={e => handleGlobalConfigChange('unitPriceKwh', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">Prix Puissance (DT/kVA)</label><input type="number" value={globalConfig.powerUnitPrice} onChange={e => handleGlobalConfigChange('powerUnitPrice', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">TVA (%)</label><input type="number" value={globalConfig.vatRate} onChange={e => handleGlobalConfigChange('vatRate', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    
                                    <div><label className="block text-slate-400 mb-1">Pénalité Dépassement</label><input type="number" value={globalConfig.powerOverrunPenalty} onChange={e => handleGlobalConfigChange('powerOverrunPenalty', e.target.value)} className="border p-1 w-full rounded font-mono bg-red-50" /></div>
                                    <div><label className="block text-slate-400 mb-1">Pertes à Vide (kWh)</label><input type="number" value={siteConfigs[currentSite].emptyLosses} onChange={e => handleSiteConfigChange('emptyLosses', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                    <div><label className="block text-slate-400 mb-1">RTT (DT)</label><input type="number" value={globalConfig.rtt} onChange={e => handleGlobalConfigChange('rtt', e.target.value)} className="border p-1 w-full rounded font-mono" /></div>
                                </div>
                             ) : (
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
                            <h3 className={`text-sm font-bold uppercase ${isBT ? 'text-red-600' : 'text-blue-900'}`}>{isBT ? "FACTURE BT" : "FACTURE MT"}</h3>
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
                          <span className={`text-3xl font-black font-mono tracking-tight ${isBT ? 'text-red-700' : 'text-blue-900'}`}>{formatMoney(displayMetrics.netToPay)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 h-[400px] flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center"><Database size={12} className="mr-1"/> Historique PC</h3>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {siteLogs.map(log => (
                            <div key={log._id || log.id} className="p-3 border rounded-lg bg-slate-50 text-xs hover:bg-blue-50 transition-colors">
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
// 6. MODULE GESTION AIR COMPRIMÉ (Complet & Revisé)
// ==================================================================================
const AirModule = ({ onBack, userRole }) => {
  const [activeCompressor, setActiveCompressor] = useState(1);
  const [showMaintPopup, setShowMaintPopup] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [notif, setNotif] = useState(null);
  const [week, setWeek] = useState(getWeekNumber(new Date()));
  const [editingPrev, setEditingPrev] = useState(false);
  const [config, setConfig] = useState({ elecPrice: 0.291, offLoadFactor: 0.4 });
    
  // Chargement logs PC
  const logs = useData('air_logs');

  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }

  const COMPRESSORS = [
    { id: 1, name: "Compresseur 1", serial: "CAI 827281", model: "Ceccato CSB 30", power: 22 },
    { id: 2, name: "Compresseur 2", serial: "CAI 808264", model: "Ceccato CSB 30", power: 22 }
  ];

  const MAINT_INTERVALS = { oilFilter: 2000, airFilter: 2000, separator: 2000, oil: 2000, general: 500 };
  const MAINT_LABELS = { oilFilter: "Filtre à Huile", airFilter: "Filtre à Air", separator: "Séparateur", oil: "Huile", general: "Inspection" };
  const MAINT_ICONS = { oilFilter: Filter, airFilter: Wind, separator: Droplets, oil: Droplets, general: Eye };

  const [formData, setFormData] = useState({
    1: { lastRun: 19960, newRun: '', lastLoad: 10500, newLoad: '', description: '', lastMaint: { oilFilter: 19960, airFilter: 19960, separator: 19960, oil: 19960, general: 19960 } },
    2: { lastRun: 18500, newRun: '', lastLoad: 9200, newLoad: '', description: '', lastMaint: { oilFilter: 18500, airFilter: 18500, separator: 18500, oil: 18500, general: 18500 } }
  });
    
  useEffect(() => {
      const compLogs = logs.filter(l => l.compName === COMPRESSORS.find(c => c.id === activeCompressor).name);
      
      if(compLogs.length > 0) {
          const latestRunLog = compLogs.find(l => l.type === 'WEEKLY_REPORT');
          const currentRun = latestRunLog ? latestRunLog.newRun : formData[activeCompressor].lastRun;
          const currentLoad = latestRunLog ? latestRunLog.newLoad : formData[activeCompressor].lastLoad;

          const maintenanceStatus = { ...formData[activeCompressor].lastMaint };
          Object.keys(MAINT_INTERVALS).forEach(type => {
              const lastMaintLog = compLogs.find(l => l.type === 'MAINTENANCE' && l.maintType === MAINT_LABELS[type]);
              if (lastMaintLog) {
                  maintenanceStatus[type] = lastMaintLog.indexDone;
              }
          });

          setFormData(prev => ({
              ...prev,
              [activeCompressor]: {
                  ...prev[activeCompressor],
                  lastRun: currentRun,
                  lastLoad: currentLoad,
                  lastMaint: maintenanceStatus
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
      
      await saveData('air_logs', newLog);
      
      setFormData(prev => ({
          ...prev,
          [activeCompressor]: { ...prev[activeCompressor], lastRun: data.newRun, newRun: '', lastLoad: data.newLoad, newLoad: '', description: '' }
      }));
      setNotif("Enregistré");
      setTimeout(() => setNotif(null), 3000);
  };

  const handleMaintenanceDone = async (type, details) => {
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
      await saveData('air_logs', newLog);
      
      setShowMaintPopup(null);
      setNotif("Maintenance validée");
  };

  const kpis = calculateKPIs();
  const getStatusColor = (rem, total) => {
      if (rem <= 0) return 'text-red-600 font-bold';
      if (rem < (total * 0.2)) return 'text-amber-500 font-bold'; 
      return 'text-emerald-600';
  };
  const getProgressColor = (rem, total) => {
      if (rem <= 0) return 'bg-red-600';
      if (rem < (total * 0.2)) return 'bg-amber-500';
      return 'bg-emerald-500';
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center gap-4 mb-2 md:mb-0">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full mr-2 transition-colors text-slate-500"><ArrowLeft size={20} /></button>
                    <BrandLogo size="h-8"/>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div>
                        <h1 className="text-lg font-black text-blue-900 flex items-center"><Wind className="mr-2" size={20}/> Air Comprimé</h1>
                        <div className="flex items-center text-xs text-slate-500 mt-1">
                            <MapPin size={10} className="mr-1"/> Site Mégrine
                            <span className="mx-2">•</span>
                            <Calendar size={10} className="mr-1"/> Semaine {week.split('-W')[1]} {week.split('-W')[0]}
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setShowGuide(true)} className="flex items-center bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 transition-colors"><BookOpen size={16} className="mr-2" /> Guide & Consignes</button>
                </div>
            </div>
        </header>

        {showGuide && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowGuide(false)}>
                <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl relative" onClick={e=>e.stopPropagation()}>
                    <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center text-lg"><BookOpen className="mr-2 text-blue-900" /> Instructions ES3000</h3>
                    
                    <div className="space-y-6 overflow-y-auto max-h-[60vh]">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-blue-900 mb-3 flex items-center"><Activity size={16} className="mr-2"/> Navigation Contrôleur</h4>
                            <ol className="text-sm text-slate-600 space-y-3 list-decimal pl-5">
                                <li>L'écran affiche par défaut la <strong>Pression de sortie</strong>.</li>
                                <li>Appuyez sur la flèche <strong>DROITE</strong> (Tab) pour faire défiler le menu principal.</li>
                                <li>
                                    <strong>Heures Totales :</strong> Cherchez le symbole 🕒 (Horloge pleine). Notez la valeur.
                                </li>
                                <li>
                                    <strong>Heures en Charge :</strong> Continuez de défiler jusqu'au symbole ⚡ (Piston/Éclair). C'est le temps de travail effectif.
                                </li>
                                <li>Pour revenir, appuyez sur <strong>C (Cancel)</strong> ou attendez 30s.</li>
                            </ol>
                        </div>
                        
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                            <h4 className="font-bold text-orange-900 mb-3 flex items-center"><AlertTriangle size={16} className="mr-2"/> Bonnes Pratiques & Sécurité</h4>
                            <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5">
                                <li>Vérifier le niveau d'huile visuel avant chaque démarrage ou relevé (hublot latéral).</li>
                                <li>Écouter s'il y a des bruits anormaux ou des fuites d'air audibles lors de la mise en charge.</li>
                                <li>Purger le réservoir d'air quotidiennement si la purge auto est défaillante.</li>
                                <li>Ne jamais ouvrir le capot machine en marche.</li>
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
                        <button key={c.id} onClick={() => setActiveCompressor(c.id)} className={`flex-1 p-4 rounded-xl border text-left transition-all ${activeCompressor === c.id ? 'bg-white border-blue-900 shadow-md ring-1 ring-blue-900' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                            <div className="font-bold text-slate-700">{c.name}</div>
                            <div className="text-xs text-slate-400">{c.model} - {c.serial}</div>
                        </button>
                    ))}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                        <h2 className="font-bold flex items-center text-slate-800"><Timer className="mr-2 text-blue-900"/> Saisie Relevé</h2>
                        <div className="flex items-center text-sm bg-slate-100 px-3 py-1 rounded-lg">
                            <span className="font-bold text-slate-500 mr-2">Semaine :</span>
                            <input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Heures Marche</label>
                                {userRole === 'ADMIN' && <button onClick={() => setEditingPrev(!editingPrev)} className="text-[10px] text-blue-900 hover:underline">Modifier Précédent</button>}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-slate-400">Préc:</span>
                                <input type="number" readOnly={!editingPrev} className={`w-full text-xs bg-transparent font-mono ${editingPrev ? 'border rounded bg-white p-1' : ''}`} value={formData[activeCompressor].lastRun || ''} onChange={e => handleInput('lastRun', e.target.value)} />
                            </div>
                            <input type="number" className="w-full border-2 border-slate-200 p-2 rounded-lg text-lg font-mono font-bold focus:border-blue-900 outline-none transition-colors" placeholder="Nouveau..." value={formData[activeCompressor].newRun || ''} onChange={e => handleInput('newRun', e.target.value)} />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Heures Charge</label>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-slate-400">Préc:</span>
                                <input type="number" readOnly={!editingPrev} className={`w-full text-xs bg-transparent font-mono ${editingPrev ? 'border rounded bg-white p-1' : ''}`} value={formData[activeCompressor].lastLoad || ''} onChange={e => handleInput('lastLoad', e.target.value)} />
                            </div>
                            <input type="number" className="w-full border-2 border-slate-200 p-2 rounded-lg text-lg font-mono font-bold focus:border-blue-900 outline-none transition-colors" placeholder="Nouveau..." value={formData[activeCompressor].newLoad || ''} onChange={e => handleInput('newLoad', e.target.value)} />
                        </div>
                      </div>
                      <textarea className="w-full border p-3 rounded-lg text-sm mb-2 focus:border-blue-900 outline-none" rows="3" placeholder="Note / Observation sur l'état du compresseur..." value={formData[activeCompressor].description} onChange={e => handleInput('description', e.target.value)}></textarea>
                </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center border-b pb-2"><Activity className="mr-2 text-blue-900"/> Analyse Performance</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Taux Charge</div>
                            <div className="font-black text-2xl text-emerald-800">{kpis.loadRate.toFixed(1)}%</div>
                            <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{width: `${kpis.loadRate}%`}}></div></div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Taux Utilisation</div>
                            <div className="font-black text-2xl text-blue-800">{kpis.utilRate.toFixed(1)}%</div>
                            <div className="text-[10px] text-blue-400 mt-1">Base hebdo 47.5h</div>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6">
                        <span className="text-xs font-bold text-slate-500 uppercase">Coût Élec. Estimé</span>
                        <span className="font-mono font-black text-slate-800 text-lg">{kpis.costHT.toFixed(0)} <span className="text-xs">DT</span></span>
                    </div>

                    <button onClick={handleSubmit} className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 shadow-lg transition-all flex items-center justify-center">
                        <CheckCircle2 size={18} className="mr-2"/> Valider Relevé
                    </button>
                </div>
            </div>

            <div className="lg:col-span-12">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center"><Wrench className="mr-2 text-red-600"/> Tableau de Maintenance</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.keys(MAINT_INTERVALS).map(key => {
                            const Icon = MAINT_ICONS[key];
                            const rem = kpis.maintStatus[key].remaining;
                            const total = MAINT_INTERVALS[key];
                            const isWarning = rem < (total * 0.2);
                            
                            return (
                                <div key={key} className={`flex flex-col p-4 border rounded-xl hover:shadow-lg transition-all relative overflow-hidden group ${isWarning ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Icon size={40}/></div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">{MAINT_LABELS[key]}</div>
                                    <div className={`text-xl font-black mb-2 ${getStatusColor(rem, total)}`}>{rem} h</div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
                                        <div className={`h-full ${getProgressColor(rem, total)}`} style={{width: `${Math.min(100, (rem/total)*100)}%`}}></div>
                                    </div>
                                    {isWarning && <div className="text-[10px] text-red-600 font-bold mb-2 flex items-center"><AlertTriangle size={10} className="mr-1"/> Planifier</div>}
                                    <button onClick={() => setShowMaintPopup(key)} className="mt-auto w-full py-2 bg-white border border-slate-200 rounded text-xs font-bold hover:bg-slate-800 hover:text-white transition-colors">Faire Maint.</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-12">
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center tracking-wider"><History size={16} className="mr-2"/> Historique Détaillé</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-3 rounded-l-lg">Date / Semaine</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Détails / Index</th>
                                    <th className="p-3">Technicien</th>
                                    <th className="p-3 text-right rounded-r-lg">Coût / Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.filter(l => l.compName === COMPRESSORS.find(c => c.id === activeCompressor).name).sort((a,b)=> new Date(b._created || 0) - new Date(a._created || 0)).map(log => (
                                    <tr key={log._id || log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-medium text-slate-700">
                                            {log.type === 'MAINTENANCE' ? log.date : `Semaine ${log.week?.split('-W')[1] || '?'}`}
                                        </td>
                                        <td className="p-3">
                                            {log.type === 'MAINTENANCE' ? 
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold"><Wrench size={10} className="mr-1"/> {log.maintType}</span> : 
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold"><Activity size={10} className="mr-1"/> Relevé</span>
                                            }
                                        </td>
                                        <td className="p-3 text-slate-600 text-xs">
                                            {log.type === 'MAINTENANCE' ? `Effectué à ${log.indexDone} h` : `Marche: ${log.newRun}h | Charge: ${log.newLoad}h`}
                                        </td>
                                        <td className="p-3 text-slate-500 text-xs font-mono">
                                            {log.type === 'MAINTENANCE' ? log.details?.tech : '-'}
                                        </td>
                                        <td className="p-3 text-right font-bold">
                                            {log.type === 'MAINTENANCE' ? <span className="text-emerald-600">OK</span> : <span className="text-slate-700">{log.costHT?.toFixed(0)} DT</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {logs.length === 0 && <div className="text-center p-8 text-slate-400 italic">Aucun historique disponible sur le PC</div>}
                    </div>
                </div>
            </div>
        </main>
        
        {showMaintPopup && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl transform transition-all scale-100">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-slate-800 flex items-center"><Wrench className="mr-2 text-red-600" size={20}/> Validation Maint.</h3>
                        <button onClick={() => setShowMaintPopup(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <div className="mb-4 text-sm text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        Vous validez la maintenance : <strong>{MAINT_LABELS[showMaintPopup]}</strong>
                    </div>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        handleMaintenanceDone(showMaintPopup, { date: fd.get('date'), tech: fd.get('tech'), ref: fd.get('ref'), notes: fd.get('notes') });
                    }}>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Date Intervention *</label>
                                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:border-red-600 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Intervenant / Technicien *</label>
                                <input name="tech" placeholder="Nom du technicien" required className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:border-red-600 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Réf. Fiche Intervention *</label>
                                <input name="ref" placeholder="ex: FI-2024-001" required className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:border-red-600 outline-none font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Notes / Observations</label>
                                <textarea name="notes" placeholder="Détails supplémentaires..." className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:border-red-600 outline-none" rows="2"></textarea>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setShowMaintPopup(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Annuler</button>
                            <button type="submit" className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg transition-all flex items-center">
                                <Check size={18} className="mr-2"/> Valider
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        {notif && <div className="fixed bottom-6 right-6 px-6 py-4 bg-emerald-600 text-white rounded-xl shadow-xl z-50 font-bold flex items-center"><CheckCircle2 className="mr-2"/> {notif}</div>}
    </div>
  );
};

// ==================================================================================
// 7. MODULE ADMINISTRATION
// ==================================================================================
const AdminPanel = ({ onBack }) => {
    // Liste des users depuis le PC
    const users = useData('users');
    
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'EQUIPE_ENERGIE' });
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password) return;
        setLoading(true);
        await saveData('users', newUser);
        setNewUser({ username: '', password: '', role: 'EQUIPE_ENERGIE' });
        setLoading(false);
    };

    // Note : Le serveur PC actuel ne supporte pas la suppression (append only). 
    // On simule une suppression visuelle pour l'instant ou on avertit l'user.
    const handleDeleteUser = async (id) => {
       alert("Le serveur local ne supporte pas encore la suppression définitive. L'utilisateur restera dans le fichier JSON.");
    };

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <header className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
                 <div className="flex items-center">
                    <button onClick={onBack} className="mr-4 p-2 bg-white rounded-full shadow hover:bg-slate-50"><ArrowLeft size={20} /></button>
                    <BrandLogo size="h-8"/>
                    <h1 className="text-2xl font-black text-slate-800 ml-4">Administration</h1>
                 </div>
            </header>
            <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="font-bold text-lg mb-4 flex items-center text-blue-900"><PlusCircle className="mr-2"/> Ajouter Utilisateur</h2>
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
                            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full border p-2 rounded bg-white font-bold text-slate-700">
                                <option value="ADMIN">Administrateur (Accès Total)</option>
                                <option value="EQUIPE_ENERGIE">Équipe Énergie (Saisie)</option>
                                <option value="DIRECTION">Direction (Visuel Uniquement)</option>
                            </select>
                        </div>
                        <button disabled={loading} className="w-full bg-blue-900 text-white py-2 rounded font-bold hover:bg-blue-800">{loading ? '...' : 'Ajouter au PC'}</button>
                    </form>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-lg mb-4 flex items-center text-slate-700"><Users className="mr-2"/> Liste Utilisateurs PC ({users.length})</h2>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {users.map(u => (
                            <div key={u._id || u.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 group">
                                <div>
                                    <div className="font-bold">{u.username}</div>
                                    <div className={`text-[10px] px-2 py-0.5 rounded w-fit uppercase font-bold 
                                        ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 
                                          u.role === 'DIRECTION' ? 'bg-amber-100 text-amber-700' : 
                                          'bg-blue-100 text-blue-700'}`}>
                                        {u.role === 'ADMIN' ? 'Admin' : u.role === 'DIRECTION' ? 'Direction' : 'Équipe'}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDeleteUser(u.id)} 
                                    className="p-2 rounded transition-all flex items-center text-slate-300 hover:text-red-600"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

// ==================================================================================
// 5. MODULE TABLEAU DE BORD SITES
// ==================================================================================

// STYLES D'IMPRESSION INJECTÉS DYNAMIQUEMENT
const PrintStyles = () => (
    <style>{`
      @media print {
        @page { size: landscape; margin: 0; }
        body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; background: white; }
        .no-print { display: none !important; }
        /* Force container to fill page */
        .print-container { 
            position: absolute; top: 0; left: 0; 
            width: 100vw; height: 100vh; 
            margin: 0; padding: 0; 
            overflow: hidden; 
            z-index: 9999; 
            background: white;
        }
        /* Ajustements pour que tout tienne */
        .print-scale { transform: scale(0.95); transform-origin: top center; height: 100%; }
      }
    `}</style>
);

const SitesDashboard = ({ onBack, userRole }) => {
  const [activeSiteTab, setActiveSiteTab] = useState('MEGRINE');
  const [historyData, setHistoryData] = useState({});
  const [showHistoryInput, setShowHistoryInput] = useState(false);
  const [showUsageConfig, setShowUsageConfig] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const [reportMonth, setReportMonth] = useState(prevMonth.toISOString().slice(0, 7));
  const [notif, setNotif] = useState(null);

  // Pour simplifier l'historique sur le serveur simple, on charge tout 'site_history'
  const allHistory = useData('site_history');

  const [sitesDataState, setSitesDataState] = useState({
    MEGRINE: { 
        name: "Mégrine", 
        area: 32500, covered: 30100, open: 2400, glazed: 365,
        coveredBreakdown: [
            { label: "Zone A (Atelier FIAT)", value: 10100 },
            { label: "ITALCAR Gros (Magasin)", value: 10000 },
            { label: "Zone B (Atelier IVECO)", value: 9000 },
            { label: "Showroom & Réception", value: 1000 }
        ],
        energyMix: [{ name: "Électricité", value: 97, color: "bg-blue-900" }, { name: "Gaz", value: 3, color: "bg-orange-500" }], 
        elecUsage: [
            { name: "Clim/Chauffage", value: 40, ratio: "35 kWh/m²", significant: true, subUsages: [{name: "CTA", value: 60}, {name: "Split", value: 40}] }, 
            { name: "Éclairage", value: 27, ratio: "12 kWh/m²", significant: true, subUsages: [{name: "Atelier", value: 70}, {name: "Admin", value: 30}] }, 
            { name: "Air Comprimé", value: 17, ratio: "0.12 kWh/Nm³", significant: true, subUsages: [{name: "Comp 1", value: 50}, {name: "Comp 2", value: 50}] }, 
            { name: "Informatique", value: 8, ratio: "-", significant: false, subUsages: [] }, 
            { name: "Services", value: 5, ratio: "-", significant: false, subUsages: [] }, 
            { name: "Gaz (Primaire)", value: 3, ratio: "-", significant: false, subUsages: [] } 
        ],
        targets: { reduction2030: 10, renewable2030: 40 }
    },
    ELKHADHRA: { 
        name: "El Khadhra", area: 9500, covered: 7000, open: 2500, glazed: 40,
        coveredBreakdown: [{ label: "Atelier FIAT", value: 3000 }, { label: "ITALCAR Gros", value: 3000 }, { label: "Réception", value: 1000 }],
        energyMix: [{ name: "Électricité", value: 100, color: "bg-blue-900" }], 
        elecUsage: [
            { name: "Clim/Chauffage", value: 60, ratio: "45 kWh/m²", significant: true, subUsages: [] }, 
            { name: "Éclairage", value: 25, ratio: "15 kWh/m²", significant: true, subUsages: [] }, 
            { name: "Air Comprimé", value: 5, ratio: "-", significant: false, subUsages: [] }, 
            { name: "Divers", value: 10, ratio: "-", significant: false, subUsages: [] }
        ],
        targets: { reduction2030: 15, renewable2030: 20 }
    },
    LAC: { 
        name: "Lac", area: 2050, covered: 850, open: 1200, glazed: 116, 
        coveredBreakdown: [{label:"Showroom", value: 850}], 
        energyMix: [], 
        elecUsage: [
             { name: "Éclairage", value: 45, ratio: "22 kWh/m²", significant: true, subUsages: [] }, 
             { name: "Climatisation", value: 45, ratio: "25 kWh/m²", significant: true, subUsages: [] },
             { name: "Informatique", value: 10, ratio: "-", significant: false, subUsages: [] }
        ],
        targets: { reduction2030: 30, renewable2030: 50 }
    },
    NAASSEN: { 
        name: "Naassen", area: 32500, covered: 1850, open: 30680, glazed: 0, 
        coveredBreakdown: [{label:"Réception", value: 920}, {label:"Atelier FIAT", value: 900}], 
        energyMix: [{ name: "Élec", value: 100, color: "bg-blue-900" }], elecUsage: [],
        targets: { reduction2030: 10, renewable2030: 10 }
    },
    CARTHAGE: { 
        name: "Rue de Carthage", area: 320, covered: 320, open: 0, glazed: 70, 
        coveredBreakdown: [{label:"Showroom", value: 320}], 
        energyMix: [{ name: "Élec", value: 100, color: "bg-blue-900" }], elecUsage: [],
        targets: { reduction2030: 5, renewable2030: 0 }
    },
    AZUR: { 
        name: "Azur City", area: 130, covered: 130, open: 0, glazed: 0, 
        coveredBreakdown: [{label:"Showroom", value: 130}], 
        energyMix: [{ name: "Élec", value: 100, color: "bg-blue-900" }], elecUsage: [],
        targets: { reduction2030: 5, renewable2030: 0 }
    }
  });


  // --- GESTION DES USAGES PRINCIPAUX ---
  const handleUsageAdd = () => {
    setSitesDataState(prev => {
        const newData = { ...prev };
        const site = newData[activeSiteTab];
        site.elecUsage = [...site.elecUsage, { name: "Nouvel Usage", value: 0, ratio: "-", significant: false, subUsages: [] }];
        return newData;
    });
  };

  const handleUsageDelete = (usageIndex) => {
    setSitesDataState(prev => {
        const newData = { ...prev };
        const site = newData[activeSiteTab];
        site.elecUsage = site.elecUsage.filter((_, i) => i !== usageIndex);
        return newData;
    });
  };

  const handleUsageChange = (index, field, value) => {
      setSitesDataState(prev => {
          const newData = { ...prev };
          const site = newData[activeSiteTab];
          const newUsages = [...site.elecUsage];
          newUsages[index] = { ...newUsages[index], [field]: value };
          site.elecUsage = newUsages;
          return newData;
      });
  };

  // --- GESTION DES SOUS-USAGES ---
  
  const handleSubUsageAdd = (usageIndex) => {
    setSitesDataState(prev => {
        const newData = { ...prev };
        const site = newData[activeSiteTab];
        const newUsages = [...site.elecUsage];
        if(!newUsages[usageIndex].subUsages) newUsages[usageIndex].subUsages = [];
        newUsages[usageIndex].subUsages.push({name: "Nouveau", value: 0});
        return newData;
    });
  };

  const handleSubUsageDelete = (usageIndex, subIndex) => {
    setSitesDataState(prev => {
        const newData = { ...prev };
        const site = newData[activeSiteTab];
        const newUsages = [...site.elecUsage];
        newUsages[usageIndex].subUsages = newUsages[usageIndex].subUsages.filter((_, i) => i !== subIndex);
        return newData;
    });
  };

  const handleSubUsageChange = (usageIndex, subIndex, field, value) => {
    setSitesDataState(prev => {
        const newData = { ...prev };
        const site = newData[activeSiteTab];
        const newUsages = [...site.elecUsage];
        const subUsages = [...newUsages[usageIndex].subUsages];
        subUsages[subIndex] = { ...subUsages[subIndex], [field]: value };
        newUsages[usageIndex].subUsages = subUsages;
        site.elecUsage = newUsages;
        return newData;
    });
  };

  const yearsRange = ['REF', 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]; 
  
  // Reconstitution de l'historique depuis les données "plates" du serveur
  useEffect(() => {
    if(allHistory.length > 0) {
        const constructed = {};
        allHistory.forEach(item => {
            if(item.historyId) {
                const [site, year] = item.historyId.split('_');
                if(!constructed[site]) constructed[site] = {};
                constructed[site][year] = item;
            }
        });
        setHistoryData(constructed);
        
        // Mettre à jour les cibles si elles existent dans l'historique (stocké dans un "year" spécial ou config)
        // Ici on simplifie en assumant que c'est sauvegardé dans la config locale pour l'instant
    }
  }, [allHistory]);

  const initHistory = (site) => {
      if (!historyData[site]) {
          const newData = {};
          yearsRange.forEach(y => { 
              if(site === 'LAC') newData[y] = { grid: Array(12).fill(''), pvProd: Array(12).fill(''), pvExport: Array(12).fill(''), temperature: Array(12).fill('') };
              else newData[y] = { months: Array(12).fill(''), temperature: Array(12).fill('') }; 
          });
          setHistoryData(prev => ({...prev, [site]: newData}));
      }
  };

  const getSiteData = (site, year, type = 'months') => {
      const yData = historyData[site]?.[year];
      if (!yData) return Array(12).fill('');
      return yData[type] || Array(12).fill('');
  };

  const handleHistoryChange = (year, monthIdx, val, type = 'months') => {
      setHistoryData(prev => {
          const siteData = prev[activeSiteTab] || {};
          const yearData = siteData[year] || {};
          const currentArray = yearData[type] ? [...yearData[type]] : Array(12).fill('');
          currentArray[monthIdx] = val;
          return { ...prev, [activeSiteTab]: { ...siteData, [year]: { ...yearData, [type]: currentArray } } }
      });
  };

  const saveHistory = async () => {
      const site = activeSiteTab;
      if (!historyData[site]) return;
      try {
        for (const year of Object.keys(historyData[site])) {
            const dataToSave = {
                historyId: `${site}_${year}`, 
                ...historyData[site][year]
            };
            await saveData('site_history', dataToSave);
        }
        setNotif("Historique sauvegardé sur le PC");
        setShowHistoryInput(false);
      } catch(e) { console.error(e); setNotif("Erreur"); }
      setTimeout(() => setNotif(null), 3000);
  };

  const currentData = sitesDataState[activeSiteTab];
  const currentYear = new Date().getFullYear(); 
  const currentMonthIdx = new Date().getMonth() - 1; 

  const PerformanceWidget = () => {
      const refMonths = getSiteData(activeSiteTab, 'REF', activeSiteTab === 'LAC' ? 'grid' : 'months');
      const curMonths = getSiteData(activeSiteTab, currentYear, activeSiteTab === 'LAC' ? 'grid' : 'months');
      
      let valRefMonth = parseFloat(refMonths[currentMonthIdx]) || 0;
      let valCurMonth = parseFloat(curMonths[currentMonthIdx]) || 0;

      if (activeSiteTab === 'LAC') {
          const refProd = getSiteData(activeSiteTab, 'REF', 'pvProd')[currentMonthIdx] || 0;
          const refExp = getSiteData(activeSiteTab, 'REF', 'pvExport')[currentMonthIdx] || 0;
          const curProd = getSiteData(activeSiteTab, currentYear, 'pvProd')[currentMonthIdx] || 0;
          const curExp = getSiteData(activeSiteTab, currentYear, 'pvExport')[currentMonthIdx] || 0;
          valRefMonth += Math.max(0, refProd - refExp);
          valCurMonth += Math.max(0, curProd - curExp);
      }

      const diffMonth = valRefMonth > 0 ? ((valCurMonth - valRefMonth) / valRefMonth) * 100 : 0;
      let sumRefYTD = 0, sumCurYTD = 0;

      for (let i = 0; i <= currentMonthIdx; i++) {
          let r = parseFloat(refMonths[i]) || 0;
          let c = parseFloat(curMonths[i]) || 0;
          if (activeSiteTab === 'LAC') {
              const rp = parseFloat(getSiteData(activeSiteTab, 'REF', 'pvProd')[i]) || 0;
              const re = parseFloat(getSiteData(activeSiteTab, 'REF', 'pvExport')[i]) || 0;
              const cp = parseFloat(getSiteData(activeSiteTab, currentYear, 'pvProd')[i]) || 0;
              const ce = parseFloat(getSiteData(activeSiteTab, currentYear, 'pvExport')[i]) || 0;
              r += Math.max(0, rp - re);
              c += Math.max(0, cp - ce);
          }
          sumRefYTD += r;
          sumCurYTD += c;
      }

      const diffYTD = sumRefYTD > 0 ? ((sumCurYTD - sumRefYTD) / sumRefYTD) * 100 : 0;
      const monthName = new Date(currentYear, currentMonthIdx).toLocaleString('fr-FR', { month: 'long' });

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Performance Mensuelle</div>
                      <div className="text-xl font-black text-slate-800 capitalize mb-4">{monthName} {currentYear} <span className="text-sm font-normal text-slate-400">vs Réf.</span></div>
                      
                      <div className="flex items-end justify-between">
                          <div>
                              <div className="text-3xl font-black text-blue-900">{valCurMonth.toLocaleString()} <span className="text-sm text-slate-400 font-bold">kWh</span></div>
                              <div className="text-xs text-slate-500 mt-1">Réf: {valRefMonth.toLocaleString()} kWh</div>
                          </div>
                          <div className={`px-4 py-2 rounded-xl font-bold text-lg flex items-center ${diffMonth <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {diffMonth > 0 ? <TrendingUp size={20} className="mr-2"/> : <TrendingDown size={20} className="mr-2"/>}
                              {diffMonth > 0 ? '+' : ''}{diffMonth.toFixed(1)}%
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Performance Cumulée (YTD)</div>
                      <div className="text-xl font-black text-slate-800 capitalize mb-4">Jan - {monthName} <span className="text-sm font-normal text-slate-400">vs Réf.</span></div>
                      
                      <div className="flex items-end justify-between">
                          <div>
                              <div className="text-3xl font-black text-indigo-900">{sumCurYTD.toLocaleString()} <span className="text-sm text-slate-400 font-bold">kWh</span></div>
                              <div className="text-xs text-slate-500 mt-1">Réf: {sumRefYTD.toLocaleString()} kWh</div>
                          </div>
                          <div className={`px-4 py-2 rounded-xl font-bold text-lg flex items-center ${diffYTD <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {diffYTD > 0 ? <TrendingUp size={20} className="mr-2"/> : <TrendingDown size={20} className="mr-2"/>}
                              {diffYTD > 0 ? '+' : ''}{diffYTD.toFixed(1)}%
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const EnergyMixWidget = () => {
      const pvShare = activeSiteTab === 'LAC' ? 35 : 0; 
      const gridShare = 100 - pvShare;
      return (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col justify-between overflow-hidden relative">
              <div className="flex items-center gap-2 mb-4 relative z-10">
                  <Leaf size={20} className="text-emerald-500"/>
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Origine Énergie</span>
              </div>
              <div className="flex items-center justify-center relative z-10 py-2">
                  <div className="relative w-32 h-32">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                          <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" />
                          <path className="text-emerald-500" strokeDasharray={`${pvShare}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" />
                      </svg>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                          <div className="text-2xl font-black text-slate-800">{pvShare}%</div>
                          <div className="text-[8px] uppercase font-bold text-emerald-600">Renouvelable</div>
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center relative z-10">
                  <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Réseau</div>
                      <div className="font-bold text-slate-700">{gridShare}%</div>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                      <div className="text-[10px] text-emerald-600 uppercase font-bold">Solaire</div>
                      <div className="font-bold text-emerald-800">{pvShare}%</div>
                  </div>
              </div>
          </div>
      );
  };

  const TechSpecsWidget = () => (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Building2 size={120}/></div>
          <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-2 relative z-10">
              <MapPin size={20} className="text-red-600"/>
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Fiche Technique</span>
          </div>
          <div className="relative z-10">
              <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-black text-slate-800">{currentData.area.toLocaleString()}</span>
                  <span className="ml-2 text-sm font-bold text-slate-400">m² Totaux</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase">Espace Couvert</span>
                      <span className="font-black text-slate-800">{currentData.covered.toLocaleString()} m²</span>
                  </div>
                  <div className="space-y-1 pl-2">
                      {currentData.coveredBreakdown.map((zone, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                              <span className="text-slate-500">• {zone.label}</span>
                              <span className="font-bold text-slate-600">{zone.value.toLocaleString()} m²</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
  );

  // --- WIDGET SAISONNALITÉ MODIFIÉ (Temp N vs N-1) ---
  const ClimateInfoWidget = () => {
    const tempsCurrent = getSiteData(activeSiteTab, currentYear, 'temperature');
    const tempsPrev = getSiteData(activeSiteTab, currentYear - 1, 'temperature');
    
    // Mois actuel pour l'affichage (défaut Janvier si pas de données)
    const displayMonthIdx = currentMonthIdx >= 0 ? currentMonthIdx : 0;
    
    const tCurr = parseFloat(tempsCurrent[displayMonthIdx]) || 0;
    const tPrev = parseFloat(tempsPrev[displayMonthIdx]) || 0;
    const diff = tCurr - tPrev;
    const monthName = new Date(currentYear, displayMonthIdx).toLocaleString('fr-FR', { month: 'long' });

    // Interprétation automatique
    let constat = "Températures similaires à N-1.";
    let impact = "Impact neutre sur CVC.";
    if (diff > 1.5) {
        const isSummer = [5,6,7,8].includes(displayMonthIdx);
        constat = `Mois de ${monthName} plus chaud (+${diff.toFixed(1)}°C)`;
        impact = isSummer ? "Surconsommation Climatisation probable." : "Baisse besoins Chauffage.";
    } else if (diff < -1.5) {
        const isWinter = [0,1,2,10,11].includes(displayMonthIdx);
        constat = `Mois de ${monthName} plus froid (${diff.toFixed(1)}°C)`;
        impact = isWinter ? "Surconsommation Chauffage probable." : "Baisse besoins Climatisation.";
    }

    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col relative overflow-hidden">
           <div className="flex items-center gap-2 mb-4">
               <ThermometerSun size={20} className="text-amber-500"/>
               <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Saisonnalité & Impact</span>
           </div>

           <div className="flex items-end gap-4 mb-4">
                <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Temp. {monthName} {currentYear}</div>
                    <div className="text-3xl font-black text-slate-800">{tCurr > 0 ? tCurr : '--'} <span className="text-sm font-normal text-slate-400">°C</span></div>
                </div>
                <div className="mb-1 text-xs font-bold text-slate-400">vs</div>
                <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Temp. REF</div>
                    <div className="text-xl font-bold text-slate-500">{tPrev > 0 ? tPrev : '--'} <span className="text-xs font-normal text-slate-400">°C</span></div>
                </div>
           </div>

           <div className={`mt-auto p-3 rounded-xl border ${diff > 1.5 ? 'bg-orange-50 border-orange-100' : diff < -1.5 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-start gap-2">
                    <Info size={16} className={diff > 1.5 ? 'text-orange-500' : diff < -1.5 ? 'text-blue-500' : 'text-slate-400'}/>
                    <div>
                        <div className="text-[10px] font-bold uppercase mb-1 opacity-70">Constat & Interprétation</div>
                        <div className="text-xs font-bold text-slate-700">{constat}</div>
                        <div className="text-xs text-slate-500">{impact}</div>
                    </div>
                </div>
           </div>
      </div>
    );
  };

  // --- WIDGET VISION 2030 (Ex-VisionWidget) ---
  const VisionWidget = () => {
    // Calcul de la conso 2024 (Basé sur l'historique dispo)
    const months2024 = getSiteData(activeSiteTab, 2024, activeSiteTab === 'LAC' ? 'grid' : 'months');
    const total2024 = months2024.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    
    // Projection 2025 (Basé sur 2024 pour l'instant ou partiel 2025)
    const months2025 = getSiteData(activeSiteTab, 2025, activeSiteTab === 'LAC' ? 'grid' : 'months');
    const total2025 = months2025.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    const display2025 = total2025 > 0 ? total2025 : total2024; // Si 2025 vide, on affiche prévision basée sur 2024

    // Cibles
    const reductionTarget = currentData.targets?.reduction2030 || 10;
    const renewableTarget = currentData.targets?.renewable2030 || 20;
    
    // Baseline (Ref)
    const monthsRef = getSiteData(activeSiteTab, 'REF', activeSiteTab === 'LAC' ? 'grid' : 'months');
    const totalRef = monthsRef.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    
    const targetConso2030 = totalRef * (1 - (reductionTarget / 100));

    return (
    <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 rounded-2xl shadow-lg mt-8 text-white relative overflow-hidden">
         <div className="absolute right-0 top-0 opacity-10 transform translate-x-10 -translate-y-10">
             <Leaf size={200} />
         </div>
         
         <div className="flex flex-col md:flex-row justify-between items-start relative z-10 gap-8">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <Target className="text-emerald-400" size={24}/>
                    <h3 className="font-black text-xl uppercase tracking-tight">Vision 2030</h3>
                </div>
                <div className="text-emerald-200 text-sm space-y-1 mb-6">
                    <p>🎯 Réduire la consommation énergétique de <strong>{reductionTarget}%</strong> d'ici 2030.</p>
                    <p>☀️ Atteindre <strong>{renewableTarget}%</strong> d'approvisionnement en énergie renouvelable.</p>
                </div>
                
                <div className="flex gap-8">
                    <div>
                        <div className="text-3xl font-black">{total2024 > 0 ? total2024.toLocaleString() : '--'} <span className="text-sm font-normal text-emerald-400">kWh</span></div>
                        <div className="text-[10px] uppercase font-bold text-emerald-300">Conso 2024</div>
                    </div>
                     <div>
                        <div className="text-3xl font-black">{display2025.toLocaleString()} <span className="text-sm font-normal text-emerald-400">kWh</span></div>
                        <div className="text-[10px] uppercase font-bold text-emerald-300">Conso 2025 (Est.)</div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-emerald-300 border-b-2 border-emerald-400 inline-block">{targetConso2030.toLocaleString()} <span className="text-sm font-normal text-emerald-400">kWh</span></div>
                        <div className="text-[10px] uppercase font-bold text-emerald-300 mt-1">Cible 2030</div>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-1/3 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold uppercase text-emerald-300 mb-1">
                        <span>Trajectoire Efficacité</span>
                        <span>Obj: -{reductionTarget}%</span>
                    </div>
                    <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                        {/* Barre inversée: plus on est proche de la cible, plus c'est rempli */}
                        <div className="bg-emerald-400 h-full rounded-full" style={{width: '45%'}}></div> 
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs font-bold uppercase text-emerald-300 mb-1">
                        <span>Part Renouvelable</span>
                        <span>Obj: {renewableTarget}%</span>
                    </div>
                    <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{width: `${activeSiteTab === 'LAC' ? 35 : 0}%`}}></div>
                    </div>
                    <div className="text-[10px] text-emerald-200 mt-1 text-right">Actuel: {activeSiteTab === 'LAC' ? '35%' : '0%'}</div>
                </div>
            </div>
         </div>
    </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 relative font-sans text-slate-600">
        <PrintStyles />
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="font-bold text-xl text-slate-800 tracking-tight">DASHBOARD ÉNERGIE</h1>
                        <p className="text-xs text-slate-400 font-medium">Vision Globale & Performance</p>
                    </div>
                </div>
                <div className="flex bg-white rounded-full shadow-sm border border-slate-200 p-1.5 gap-1 mt-4 md:mt-0 overflow-x-auto max-w-full">
                    {Object.keys(sitesDataState).map(key => (
                        <button key={key} onClick={() => setActiveSiteTab(key)} 
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center whitespace-nowrap ${activeSiteTab === key ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                            {activeSiteTab === key && <CheckCircle2 size={12} className="mr-2"/>} {sitesDataState[key].name}
                        </button>
                    ))}
                </div>
            </div>
        </header>

        <main className="max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
            <PerformanceWidget />

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 relative">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center"><PieChart className="mr-2"/> Répartition des Usages (UES)</h3>
                    {userRole === 'ADMIN' && (
                        <button onClick={() => setShowUsageConfig(true)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-900 transition-colors">
                            <Settings size={16}/>
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentData.elecUsage.length > 0 ? currentData.elecUsage.map((u, i) => (
                        <div key={i} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-sm ${u.significant ? 'font-bold text-blue-900' : 'text-slate-500 font-medium'}`}>{u.name}</span>
                                <span className="bg-white border px-2 py-0.5 rounded text-xs font-black shadow-sm">{u.value}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
                                <div className={`h-full ${u.significant ? 'bg-blue-900' : 'bg-slate-400'}`} style={{width: `${u.value}%`}}></div>
                            </div>
                            {/* Affichage des sous-usages */}
                            {u.subUsages && u.subUsages.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-slate-200 space-y-1">
                                    {u.subUsages.map((sub, idx) => (
                                        <div key={idx} className="flex justify-between text-[10px] text-slate-500">
                                            <span>• {sub.name}</span>
                                            <span className="font-mono font-bold text-slate-600">{sub.value}% <span className="text-[8px] text-slate-400">(cat)</span></span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                                <span>Ratio: <b>{u.ratio}</b></span>
                                {u.significant && <span className="text-orange-600 font-bold flex items-center"><AlertTriangle size={10} className="mr-1"/> Significatif</span>}
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-3 text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed">Données de répartition non disponibles pour ce site.</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <TechSpecsWidget />
                 <EnergyMixWidget />
                 <ClimateInfoWidget />
            </div>

            <VisionWidget />
        </main>

        {/* MODAL CONFIGURATION USAGES AVEC SOUS-USAGES */}
        {showUsageConfig && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-3xl p-6 shadow-2xl relative">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center"><Settings className="mr-2 text-blue-900"/> Configuration Répartition - {currentData.name}</h3>
                        <button onClick={() => setShowUsageConfig(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                    </div>
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                        {currentData.elecUsage.map((u, i) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="grid grid-cols-12 gap-4 items-center mb-4">
                                    <div className="col-span-4 font-bold text-sm text-slate-700">{u.name}</div>
                                    <div className="col-span-3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block">Part Globale (%)</label>
                                        <input type="number" value={u.value} onChange={e => handleUsageChange(i, 'value', parseInt(e.target.value))} className="w-full p-1 border rounded text-sm font-bold"/>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block">Ratio</label>
                                        <input type="text" value={u.ratio} onChange={e => handleUsageChange(i, 'ratio', e.target.value)} className="w-full p-1 border rounded text-xs"/>
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <button onClick={() => handleUsageChange(i, 'significant', !u.significant)} className={`p-2 rounded-full ${u.significant ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400'}`}>
                                            <AlertTriangle size={16}/>
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Section Sous-usages */}
                                <div className="pl-4 border-l-2 border-slate-200 ml-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex justify-between items-center">
                                        <span>Sous-Usages (Total doit faire 100%)</span>
                                        <button onClick={() => handleSubUsageAdd(i)} className="text-blue-600 hover:underline flex items-center"><PlusCircle size={10} className="mr-1"/> Ajouter</button>
                                    </div>
                                    {u.subUsages && u.subUsages.map((sub, idx) => (
                                        <div key={idx} className="flex gap-2 mb-2">
                                            <input type="text" value={sub.name} onChange={e => handleSubUsageChange(i, idx, 'name', e.target.value)} className="flex-1 p-1 text-xs border rounded" placeholder="Nom"/>
                                            <div className="relative w-20">
                                                <input type="number" value={sub.value} onChange={e => handleSubUsageChange(i, idx, 'value', parseInt(e.target.value))} className="w-full p-1 text-xs border rounded font-mono"/>
                                                <span className="absolute right-4 top-1 text-[10px] text-slate-400">%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                        <div className="text-xs text-slate-400 italic">La somme des parts globales doit être égale à 100%.</div>
                        <button onClick={() => setShowUsageConfig(false)} className="bg-blue-900 text-white px-6 py-2 rounded-lg font-bold">Terminer</button>
                    </div>
                </div>
            </div>
        )}

        {showHistoryInput && (
             <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                     <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                         <h3 className="font-bold text-lg text-slate-800 flex items-center"><Database className="mr-2 text-blue-900"/> Saisie Historique - {currentData.name}</h3>
                         <button onClick={() => setShowHistoryInput(false)}><X size={20}/></button>
                     </div>
                     
                     <div className="overflow-y-auto flex-1 p-6 space-y-8 bg-slate-50/50">
                         {/* NOUVEAU: Saisie des objectifs Vision 2030 */}
                         <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6">
                             <h4 className="font-bold text-emerald-800 mb-4 flex items-center text-sm uppercase"><Target size={16} className="mr-2"/> Objectifs Vision 2030 (Admin)</h4>
                             <div className="grid grid-cols-2 gap-8 max-w-2xl">
                                 <div>
                                     <label className="block text-xs font-bold text-emerald-700 mb-1">Cible Réduction Consommation (%)</label>
                                     <input type="number" 
                                        defaultValue={currentData.targets?.reduction2030} 
                                        onChange={(e) => {
                                            // Mise à jour locale temporaire pour la démo (idéalement via un handler global)
                                            currentData.targets = { ...currentData.targets, reduction2030: parseInt(e.target.value) };
                                        }}
                                        className="border border-emerald-200 rounded p-2 w-full font-bold text-emerald-900" />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-emerald-700 mb-1">Cible Énergie Renouvelable (%)</label>
                                     <input type="number" 
                                        defaultValue={currentData.targets?.renewable2030} 
                                        onChange={(e) => {
                                             currentData.targets = { ...currentData.targets, renewable2030: parseInt(e.target.value) };
                                        }}
                                        className="border border-emerald-200 rounded p-2 w-full font-bold text-emerald-900" />
                                 </div>
                             </div>
                         </div>

                         {yearsRange.map(year => (
                             <div key={year} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                 <div className="flex items-center gap-2 mb-4">
                                     <span className={`font-bold text-sm px-3 py-1 rounded-full ${year === 'REF' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                         {year === 'REF' ? 'BASELINE (Réf)' : year}
                                     </span>
                                     <div className="h-px bg-slate-100 flex-1"></div>
                                 </div>
                                 
                                 <div className="overflow-x-auto">
                                     <div className="min-w-max">
                                         <div className="flex gap-2 mb-2 pl-32">
                                             {['JAN','FÉV','MAR','AVR','MAI','JUN','JUL','AOÛ','SEP','OCT','NOV','DÉC'].map(m => (
                                                 <div key={m} className="w-20 text-center text-[10px] font-bold text-slate-400">{m}</div>
                                             ))}
                                         </div>

                                         {activeSiteTab === 'LAC' ? (
                                             <>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-32 text-xs font-bold text-blue-900 uppercase">Réseau STEG</div>
                                                    {getSiteData('LAC', year, 'grid').map((val, i) => (
                                                        <input key={i} type="number" className="w-20 p-2 text-center text-xs border rounded focus:border-blue-900 outline-none" placeholder="-"
                                                            value={val} onChange={e => handleHistoryChange(year, i, e.target.value, 'grid')} />
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-32 text-xs font-bold text-orange-600 uppercase">Prod. PV</div>
                                                    {getSiteData('LAC', year, 'pvProd').map((val, i) => (
                                                        <input key={i} type="number" className="w-20 p-2 text-center text-xs border border-orange-200 rounded focus:border-orange-600 outline-none bg-orange-50" placeholder="-"
                                                            value={val} onChange={e => handleHistoryChange(year, i, e.target.value, 'pvProd')} />
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-32 text-xs font-bold text-green-600 uppercase">Export STEG</div>
                                                    {getSiteData('LAC', year, 'pvExport').map((val, i) => (
                                                        <input key={i} type="number" className="w-20 p-2 text-center text-xs border border-green-200 rounded focus:border-green-600 outline-none bg-green-50" placeholder="-"
                                                            value={val} onChange={e => handleHistoryChange(year, i, e.target.value, 'pvExport')} />
                                                    ))}
                                                </div>
                                             </>
                                         ) : (
                                             <div className="flex items-center gap-2 mb-2">
                                                 <div className="w-32 text-xs font-bold text-slate-600 uppercase">Consommation</div>
                                                 {getSiteData(activeSiteTab, year).map((val, i) => (
                                                     <input key={i} type="number" className="w-20 p-2 text-center text-xs border rounded focus:border-blue-900 outline-none" placeholder="-"
                                                         value={val} onChange={e => handleHistoryChange(year, i, e.target.value)} />
                                                 ))}
                                             </div>
                                         )}
                                         
                                         {/* LIGNE TEMPÉRATURE AJOUTÉE */}
                                         <div className="flex items-center gap-2 mt-2 border-t border-slate-50 pt-2">
                                             <div className="w-32 text-xs font-bold text-amber-500 uppercase flex items-center"><Thermometer size={12} className="mr-1"/> Temp. Moy (°C)</div>
                                             {getSiteData(activeSiteTab, year, 'temperature').map((val, i) => (
                                                 <input key={i} type="number" className="w-20 p-2 text-center text-xs border border-amber-100 bg-amber-50/30 rounded focus:border-amber-500 outline-none" placeholder="°C"
                                                     value={val} onChange={e => handleHistoryChange(year, i, e.target.value, 'temperature')} />
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                     <div className="p-4 border-t bg-white flex justify-end gap-2">
                         <button onClick={saveHistory} className="bg-blue-900 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center"><Save size={18} className="mr-2"/> Enregistrer sur PC</button>
                     </div>
                 </div>
             </div>
        )}

        {showReport && (
            <div className="fixed inset-0 bg-slate-900/90 z-[70] overflow-auto flex justify-center items-center p-0 print-container">
                <div className="bg-white shadow-2xl relative overflow-hidden flex flex-col print-scale" style={{width: '29.7cm', height: '21cm'}}> 
                    
                    {/* Floating Toolbar - Cachée à l'impression grâce à "no-print" */}
                    <div className="absolute top-1/2 right-[-80px] -translate-y-1/2 no-print flex flex-col gap-3 z-50 bg-white/90 p-2 rounded-l-xl shadow-lg border border-slate-200 backdrop-blur-sm transform hover:translate-x-[-10px] transition-transform">
                        <div className="flex flex-col items-center gap-2">
                            <input type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} className="bg-transparent border border-slate-200 rounded text-xs font-bold p-1 outline-none text-slate-700 w-24"/>
                            <button onClick={() => window.print()} className="bg-blue-900 text-white p-3 rounded-full hover:bg-blue-800 shadow-md transition-all active:scale-95" title="Imprimer"><Printer size={20}/></button>
                            <button onClick={() => setShowReport(false)} className="bg-red-50 text-red-600 p-3 rounded-full hover:bg-red-100 border border-red-100" title="Fermer"><X size={20}/></button>
                        </div>
                    </div>

                    <div className="h-full p-8 flex flex-col bg-white">
                        {/* Header A4 */}
                        <div className="flex justify-between items-center border-b-4 border-blue-900 pb-4 mb-6">
                            <div className="flex items-center gap-6">
                                <BrandLogo size="h-16"/>
                                <div className="h-12 w-px bg-slate-200"></div>
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Rapport Mensuel</h1>
                                    <div className="text-blue-900 font-bold uppercase tracking-widest text-sm">Performance Énergétique & ISO 50001</div>
                                </div>
                            </div>
                            <div className="text-right bg-slate-50 px-6 py-3 rounded-xl border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Période concernée</div>
                                <div className="text-2xl font-black text-slate-800 capitalize">
                                    {new Date(reportMonth).toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})}
                                </div>
                                <div className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-end bg-white px-2 py-1 rounded border border-slate-200 w-fit ml-auto">
                                    <MapPin size={10} className="mr-1"/> {currentData.name}
                                </div>
                            </div>
                        </div>

                        {/* Body Grid Layout */}
                        <div className="flex-1 grid grid-cols-12 gap-6">
                            
                            {/* KPI Column */}
                            <div className="col-span-4 space-y-4">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <h3 className="text-xs font-black text-slate-400 uppercase mb-4 flex items-center tracking-widest"><TrendingUp size={14} className="mr-2"/> Indicateurs Clés</h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Consommation Totale</div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black text-slate-900">--</span>
                                                <span className="text-sm font-bold text-slate-400">kWh</span>
                                            </div>
                                        </div>
                                        <div className="h-px bg-slate-200 w-full"></div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Ratio Performance</div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black text-blue-900">--</span>
                                                <span className="text-xs font-bold text-slate-400">kWh / m²</span>
                                            </div>
                                        </div>
                                        <div className="h-px bg-slate-200 w-full"></div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Évolution vs Réf (N-1)</div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-black text-emerald-600">--%</span>
                                                <div className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Objectif atteint</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-900 p-5 rounded-2xl text-white relative overflow-hidden">
                                    <div className="relative z-10">
                                        <h3 className="text-xs font-black text-blue-300 uppercase mb-2">Coût Énergétique</h3>
                                        <div className="text-3xl font-black mb-1">-- <span className="text-sm">DT</span></div>
                                        <div className="text-[10px] text-blue-200">Hors TVA et Redevances</div>
                                    </div>
                                    <div className="absolute right-0 bottom-0 opacity-10"><Zap size={80}/></div>
                                </div>
                            </div>

                            {/* Main Content Column */}
                            <div className="col-span-8 flex flex-col gap-4">
                                {/* Charts Section */}
                                <div className="grid grid-cols-2 gap-4 h-auto">
                                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Répartition Détaillée (UES)</h4>
                                        <div className="flex-1 space-y-2">
                                            {currentData.elecUsage.map((u, i) => (
                                                <div key={i} className="text-[10px]">
                                                    <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                                                        <span>{u.name}</span>
                                                        <span>{u.value}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-1 rounded-full mb-0.5">
                                                        <div className="bg-blue-900 h-full rounded-full" style={{width: `${u.value}%`}}></div>
                                                    </div>
                                                    {/* Sous usages dans le rapport */}
                                                    <div className="pl-2 flex gap-2 flex-wrap text-[8px] text-slate-500">
                                                        {u.subUsages && u.subUsages.map((s, idx) => (
                                                            <span key={idx}>• {s.name} ({s.value}%)</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Comparatif Température (N vs N-1)</h4>
                                        <div className="flex-1 flex flex-col justify-center items-center text-center p-4 bg-slate-50 rounded-lg">
                                            <ThermometerSun size={32} className="text-amber-500 mb-2"/>
                                            <div className="font-bold text-slate-700 text-xs">Analyse Saisonnière</div>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Comparaison des degrés-jours et impact thermique sur la consommation CVC.
                                                <br/>
                                                <span className="italic">(Voir détail widget dashboard)</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Vision 2030 & Bonnes Pratiques */}
                                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4">
                                    <div className="grid grid-cols-2 gap-6 h-full">
                                        <div>
                                            <h4 className="text-xs font-black text-emerald-800 uppercase mb-3 flex items-center"><Target size={12} className="mr-2 text-emerald-600"/> Vision 2030</h4>
                                            <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm space-y-2">
                                                <div>
                                                    <div className="text-[9px] uppercase font-bold text-slate-400">Objectif Réduction</div>
                                                    <div className="text-lg font-black text-emerald-800">-{currentData.targets?.reduction2030 || 10}% <span className="text-[10px] font-normal text-slate-500">Conso</span></div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] uppercase font-bold text-slate-400">Objectif Renouvelable</div>
                                                    <div className="text-lg font-black text-emerald-800">{currentData.targets?.renewable2030 || 20}% <span className="text-[10px] font-normal text-slate-500">Mix</span></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-blue-900 uppercase mb-3 flex items-center"><Lightbulb size={12} className="mr-2 text-amber-500"/> Bonnes Pratiques</h4>
                                            <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-3 leading-relaxed">
                                                <li>Éteindre les climatiseur et l'éclairage en zone inoccupée (Bureaux vides).</li>
                                                <li>Maintenir la consigne clim à 26°C en été.</li>
                                                <li>Vérifier les fuites du réseau air comprimé chaque semaine.</li>
                                                <li>Favoriser l'éclairage naturel dans les zones vitrées.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer A4 - Validation et Signature */}
                        <div className="mt-auto pt-6 border-t-2 border-slate-100 flex justify-between items-end">
                            <div className="text-[9px] text-slate-400 uppercase tracking-widest space-y-1">
                                <div>ITALCAR S.A. • Siège Social</div>
                                <div>Système de Management de l'Énergie ISO 50001</div>
                            </div>
                            
                            <div className="flex flex-col items-end text-right">
                                <div className="text-[10px] font-bold text-slate-800 uppercase mb-4 leading-tight">
                                    ITALCAR S.A.<br/>
                                    Responsable Système Management Intégrés
                                </div>
                                <div className="text-[10px] text-slate-500 mb-6 italic">
                                    Fait à Tunis, le {new Date().toLocaleDateString('fr-FR')}
                                </div>
                                <div className="h-20 w-48 border border-slate-300 rounded bg-slate-50 flex items-center justify-center">
                                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Signature & Cachet</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 no-print">
            {userRole === 'ADMIN' && (
                <button onClick={() => { initHistory(activeSiteTab); setShowHistoryInput(true); }} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 group relative">
                    <Database size={20} />
                </button>
            )}
            <button onClick={() => setShowReport(true)} className="bg-blue-900 hover:bg-blue-800 text-white p-4 rounded-full shadow-xl transition-transform hover:scale-110 group relative">
                <Printer size={24} />
            </button>
        </div>

        {notif && <div className="fixed bottom-6 left-6 px-6 py-4 bg-emerald-600 text-white rounded-xl shadow-xl z-50 font-bold flex items-center animate-in slide-in-from-bottom-4"><CheckCircle2 className="mr-2"/> {notif}</div>}
    </div>
  );
};

const MainDashboard = ({ user, onNavigate, onLogout }) => {
  const canAccess = (module) => {
      if (user.role === 'ADMIN') return true;
      if (user.role === 'EQUIPE_ENERGIE') return ['steg', 'air', 'sites'].includes(module);
      if (user.role === 'DIRECTION') return module === 'sites';
      return false;
  };

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Bonjour";
      if (hour < 18) return "Bonne après-midi";
      return "Bonsoir";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="z-10 w-full max-w-6xl flex justify-between items-center mb-12 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-6">
                <BrandLogo size="h-12"/>
                <div className="h-10 w-px bg-slate-200"></div>
                <div>
                    <h1 className="text-2xl font-black mb-0 tracking-tight text-blue-900">Système de Management de l'Énergie</h1>
                    <p className="text-slate-400 text-sm">{getGreeting()}, <span className="text-slate-800 font-bold">{user.username}</span></p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <HeaderInfoDisplay darkText={true} />
                <div className="bg-emerald-50 text-emerald-800 text-[10px] px-3 py-1 rounded-full font-bold border border-emerald-100 flex items-center">
                    <TrendingUp size={12} className="mr-2"/> Performance Globale en hausse
                </div>
            </div>
        </div>

        <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
            <button disabled={!canAccess('steg')} onClick={() => onNavigate('steg')} className={`group relative border-2 rounded-3xl p-8 transition-all text-left bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 ${canAccess('steg') ? 'border-slate-100 hover:border-blue-900' : 'opacity-50 cursor-not-allowed border-slate-100'}`}>
                <div className={`mb-6 p-4 rounded-2xl w-fit ${canAccess('steg') ? 'bg-blue-50 text-blue-900 group-hover:bg-blue-900 group-hover:text-white transition-colors' : 'bg-slate-100 text-slate-400'}`}><Zap size={32} /></div>
                <h2 className="text-xl font-black mb-2 text-slate-800 group-hover:text-blue-900">Énergie & Facturation</h2>
                <p className="text-slate-500 text-sm leading-relaxed">Suivi des consommations STEG, Factures MT/BT, Analyse Cos φ et dépassements de puissance.</p>
            </button>

            <button disabled={!canAccess('air')} onClick={() => onNavigate('air')} className={`group relative border-2 rounded-3xl p-8 transition-all text-left bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 ${canAccess('air') ? 'border-slate-100 hover:border-blue-900' : 'opacity-50 cursor-not-allowed border-slate-100'}`}>
                <div className={`mb-6 p-4 rounded-2xl w-fit ${canAccess('air') ? 'bg-blue-50 text-blue-900 group-hover:bg-blue-900 group-hover:text-white transition-colors' : 'bg-slate-100 text-slate-400'}`}><Wind size={32} /></div>
                <h2 className="text-xl font-black mb-2 text-slate-800 group-hover:text-blue-900">Air Comprimé</h2>
                <p className="text-slate-500 text-sm leading-relaxed">Relevés hebdomadaires des compresseurs, suivi des heures de charge et planning de maintenance.</p>
            </button>

            <button disabled={!canAccess('sites')} onClick={() => onNavigate('sites')} className={`group relative border-2 rounded-3xl p-8 transition-all text-left bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 ${canAccess('sites') ? 'border-slate-100 hover:border-blue-900' : 'opacity-50 cursor-not-allowed border-slate-100'}`}>
                <div className={`mb-6 p-4 rounded-2xl w-fit ${canAccess('sites') ? 'bg-blue-50 text-blue-900 group-hover:bg-blue-900 group-hover:text-white transition-colors' : 'bg-slate-100 text-slate-400'}`}><LayoutGrid size={32} /></div>
                <h2 className="text-xl font-black mb-2 text-slate-800 group-hover:text-blue-900">Tableau de Bord Sites</h2>
                <p className="text-slate-500 text-sm leading-relaxed">Vision globale des sites ITALCAR : Surfaces, Mix énergétique et Trajectoire Carbone 2030.</p>
            </button>
        </div>
        
        {user.role === 'ADMIN' && (
            <div className="z-10 mt-8 w-full max-w-6xl flex justify-end">
                 <button onClick={() => onNavigate('admin')} className="text-slate-400 hover:text-blue-900 text-xs font-bold flex items-center transition-colors">
                    <Shield size={14} className="mr-1"/> Administration
                 </button>
            </div>
        )}
        
        <div className="mt-12 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
            © 2025 ITALCAR SA • Energy Management System (BETA)
        </div>
        <div className="absolute top-6 right-6">
             <button onClick={onLogout} className="bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 p-2 rounded-full shadow-sm transition-colors border border-slate-100"><LogOut size={18}/></button>
        </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null); 
  const [currentModule, setCurrentModule] = useState('dashboard');
    
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
