import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Import de la connexion
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'; // Outils Cloud
import { 
  Zap, Activity, Save, History, TrendingUp, AlertTriangle, Factory, CheckCircle2,
  BarChart3, Settings, Lock, Unlock, Calendar, DollarSign, TrendingDown, HelpCircle,
  FileText, Calculator, AlertCircle, Eye, Hash, BookOpen, Sun, Battery, MousePointerClick,
  Info, Wind, Gauge, Thermometer, Timer, Wrench, LayoutGrid, ArrowLeft, Clock, Edit2,
  ClipboardList, CheckSquare, PieChart, MapPin, Maximize2, Minimize2, Building2, Leaf
} from 'lucide-react';

// ==================================================================================
// MODULE 1 : GESTION ÉNERGIE STEG (Connecté Cloud)
// ==================================================================================

const StegModule = ({ onBack }) => {
  const [currentSite, setCurrentSite] = useState(1);
  const [logs, setLogs] = useState([]); // Historique vide au départ
  const [showHelp, setShowHelp] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // --- MAGIE FIREBASE : Lecture en temps réel ---
  useEffect(() => {
    // On écoute la collection "steg_logs"
    const q = query(collection(db, "steg_logs"), orderBy("id", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Dès qu'une donnée change sur le serveur, on met à jour l'écran
      const logsData = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      setLogs(logsData);
    });
    return () => unsubscribe();
  }, []);

  // --- Données Sites ---
  const SITES = [
    { id: 1, name: "MT 1 - Mégrine", code: "MEG-001", type: "MT" },
    { id: 2, name: "MT 2 - El Khadhra", code: "ELK-002", type: "MT" },
    { id: 3, name: "MT 3 - Naassen", code: "NAS-003", type: "MT" },
    { id: 4, name: "BT 1 - Showroom Lac", code: "SHR-001", type: "BT" }
  ];

  const [globalConfig, setGlobalConfig] = useState({
    unitPriceKwh: 0.291, powerUnitPrice: 5.000,
    unitPriceKwhBT: 0.391, fixedFeesBT: 115.500, servicesBT: 0.000, fteGazBT: 0.000,
    vatRate: 19, rtt: 3.500, municipalTaxRate: 0.010, taxCLRate: 0.005, taxFTERate: 0.005
  });

  const [siteConfigs, setSiteConfigs] = useState({
    1: { subscribedPower: 250, emptyLosses: 1300 },
    2: { subscribedPower: 70, emptyLosses: 670 },
    3: { subscribedPower: 30, emptyLosses: 160 },
    4: { subscribedPower: 0, emptyLosses: 0 }
  });

  const [isConfigUnlocked, setIsConfigUnlocked] = useState(false);

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    1: { lastIndex: 14500, newIndex: '', cosPhi: '', reactiveCons: '', maxPower: '', date: getCurrentMonth(), manualLastIndex: false, lateFees: '', relanceFees: '', adjustment: '' },
    2: { lastIndex: 28900, newIndex: '', cosPhi: '', reactiveCons: '', maxPower: '', date: getCurrentMonth(), manualLastIndex: false, lateFees: '', relanceFees: '', adjustment: '' },
    3: { lastIndex: 56200, newIndex: '', cosPhi: '', reactiveCons: '', maxPower: '', date: getCurrentMonth(), manualLastIndex: false, lateFees: '', relanceFees: '', adjustment: '' },
    4: { lastIndex: 1000, newIndex: '', lastIndexPv: 500, newIndexPv: '', previousBalance: 0, date: getCurrentMonth(), manualLastIndex: false, lateFees: '', relanceFees: '', adjustment: '' }
  });

  const formatInputDisplay = (val) => {
    if (val === '' || val === undefined || val === null) return '';
    const cleanVal = val.toString().replace(/[^0-9.-]/g, ''); 
    return cleanVal.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const parseInputValue = (val) => val.replace(/\s/g, ''); 

  // Mise à jour auto des champs depuis l'historique Cloud
  useEffect(() => {
    const siteLogs = logs.filter(l => l.siteId === currentSite);
    if (siteLogs.length > 0) {
      const lastLog = siteLogs[0];
      const currentSiteType = SITES.find(s => s.id === currentSite).type;
      
      setFormData(prev => ({
        ...prev,
        [currentSite]: {
          ...prev[currentSite],
          lastIndex: lastLog.newIndex, 
          ...(currentSiteType === 'BT' ? {
            lastIndexPv: lastLog.newIndexPv,
            previousBalance: lastLog.newCarryOver
          } : {}),
          manualLastIndex: false
        }
      }));
    }
  }, [currentSite, logs]);

  const handleInputChange = (field, value) => {
    const cleanValue = ['lastIndex', 'newIndex', 'lastIndexPv', 'newIndexPv', 'previousBalance'].includes(field) 
      ? parseInputValue(value) : value;
    setFormData(prev => ({
      ...prev,
      [currentSite]: { ...prev[currentSite], [field]: cleanValue }
    }));
  };

  const handleGlobalConfigChange = (field, value) => setGlobalConfig(prev => ({ ...prev, [field]: value }));
  const handleSiteConfigChange = (field, value) => {
    setSiteConfigs(prev => ({
      ...prev,
      [currentSite]: { ...prev[currentSite], [field]: value }
    }));
  };

  const calculateMetrics = () => {
    const site = SITES.find(s => s.id === currentSite);
    const data = formData[currentSite];
    const sConf = siteConfigs[currentSite];
    const gConf = globalConfig;

    const newIdx = parseFloat(data.newIndex) || 0;
    const oldIdx = parseFloat(data.lastIndex) || 0;
    const lateFees = parseFloat(data.lateFees) || 0;
    const relanceFees = parseFloat(data.relanceFees) || 0;
    const adjustment = parseFloat(data.adjustment) || 0;
    const rtt = parseFloat(gConf.rtt) || 0;
    const vat = (parseFloat(gConf.vatRate) || 0) / 100;

    if (site.type === 'BT') {
      const newIdxPv = parseFloat(data.newIndexPv) || 0;
      const oldIdxPv = parseFloat(data.lastIndexPv) || 0;
      const prevBalance = parseFloat(data.previousBalance) || 0; 
      const consumptionGrid = Math.max(0, newIdx - oldIdx);
      const productionPv = Math.max(0, newIdxPv - oldIdxPv);
      const currentMonthBalance = consumptionGrid - productionPv;
      const totalBalance = currentMonthBalance + prevBalance;
      let billedKwh = 0;
      let newCarryOver = 0;
      if (totalBalance > 0) { billedKwh = totalBalance; } else { newCarryOver = totalBalance; }

      const unitPriceBT = parseFloat(gConf.unitPriceKwhBT) || 0;
      const fixedFees = parseFloat(gConf.fixedFeesBT) || 0;
      const services = parseFloat(gConf.servicesBT) || 0;
      const consoAmountHT = billedKwh * unitPriceBT;
      const fixedAmountHT = fixedFees + services;
      const totalHT = consoAmountHT + fixedAmountHT;
      const totalTTC = totalHT * (1 + vat);
      const contributionCL = billedKwh * (parseFloat(gConf.taxCLRate)||0);
      const fteElec = billedKwh * (parseFloat(gConf.taxFTERate)||0);
      const fteGaz = parseFloat(gConf.fteGazBT) || 0;
      const totalFinalTTC = totalTTC + contributionCL + rtt + fteElec + fteGaz;
      const netToPay = totalFinalTTC + adjustment + lateFees + relanceFees;

      return { type: 'BT', consumptionGrid, productionPv, currentMonthBalance, prevBalance, totalBalance, billedKwh, newCarryOver, consoAmountHT, fixedAmountHT, totalTTC, contributionCL, fteElec, fteGaz, netToPay, subscribedPowerRef: 0 };
    } else {
      const cosPhi = parseFloat(data.cosPhi) || 1;
      const maxPower = parseFloat(data.maxPower) || 0;
      const unitPrice = parseFloat(gConf.unitPriceKwh) || 0;
      const subPower = parseFloat(sConf.subscribedPower) || 0;
      const powerPrice = parseFloat(gConf.powerUnitPrice) || 0;
      const muniTaxRate = parseFloat(gConf.municipalTaxRate) || 0;
      const emptyLosses = parseFloat(sConf.emptyLosses) || 0;

      const energyRecorded = Math.max(0, newIdx - oldIdx);
      const loadLosses = energyRecorded * 0.02;
      const billedKwh = energyRecorded + emptyLosses + loadLosses;
      const baseEnergyAmountHT = billedKwh * unitPrice;

      let adjustmentRate = 0;
      let adjustmentType = 'none';
      if (cosPhi >= 0.91) {
        adjustmentRate = -(Math.round((cosPhi - 0.90) * 100) * 0.005);
        adjustmentType = 'bonus';
      } else if (cosPhi < 0.80) {
        adjustmentType = 'penalty';
        if (cosPhi < 0.80) adjustmentRate += Math.round((0.80 - Math.max(cosPhi, 0.75)) * 100) * 0.005;
        if (cosPhi < 0.75) adjustmentRate += Math.round((0.75 - Math.max(cosPhi, 0.70)) * 100) * 0.01;
        if (cosPhi < 0.70) adjustmentRate += Math.round((0.70 - Math.max(cosPhi, 0.60)) * 100) * 0.015;
        if (cosPhi < 0.60) adjustmentRate += Math.round((0.60 - cosPhi) * 100) * 0.02;
      }

      const cosPhiAdjustmentAmount = baseEnergyAmountHT * adjustmentRate;
      const total1_HT = baseEnergyAmountHT + cosPhiAdjustmentAmount;
      const total1_TTC = total1_HT * (1 + vat);
      const powerPremium = subPower * powerPrice;
      const total2_HT = powerPremium + lateFees + relanceFees;
      const total2_TTC = total2_HT * (1 + vat);
      const municipalTax = billedKwh * muniTaxRate;
      const netToPay = total1_TTC + total2_TTC + rtt + municipalTax + adjustment;
      const isPowerOverrun = maxPower > subPower;

      return { type: 'MT', energyRecorded, loadLosses, billedKwh, baseEnergyAmountHT, adjustmentRate, adjustmentType, cosPhiAdjustmentAmount, total1_TTC, total1_HT, powerPremium, total2_HT, total2_TTC, municipalTax, netToPay, isPowerOverrun, subscribedPowerRef: subPower };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const site = SITES.find(s => s.id === currentSite);
    const metrics = calculateMetrics();
    const currentData = formData[currentSite];

    if (site.type === 'BT' && (!currentData.newIndex || !currentData.newIndexPv)) {
        setNotification({ msg: "Veuillez entrer les index (Réseau et PV)", type: 'error' });
        setTimeout(() => setNotification(null), 3000); return;
    } else if (site.type === 'MT' && (!currentData.newIndex || !currentData.cosPhi)) {
        setNotification({ msg: "Veuillez entrer l'index et le Cos Phi", type: 'error' });
        setTimeout(() => setNotification(null), 3000); return;
    }

    const newLog = {
      id: Date.now(),
      recordDate: currentData.date,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      siteId: currentSite,
      siteName: site.name,
      siteType: site.type,
      ...currentData,
      ...metrics
    };

    try {
      // ENVOI VERS FIREBASE CLOUD
      await addDoc(collection(db, "steg_logs"), newLog);
      setNotification({ msg: "Données sécurisées sur le Cloud !", type: 'success' });
      
      setFormData(prev => ({
        ...prev,
        [currentSite]: {
          ...prev[currentSite],
          lastIndex: currentData.newIndex, 
          newIndex: '',
          lastIndexPv: site.type === 'BT' ? currentData.newIndexPv : undefined,
          newIndexPv: site.type === 'BT' ? '' : undefined,
          previousBalance: site.type === 'BT' ? metrics.newCarryOver : undefined,
          cosPhi: '', reactiveCons: '', maxPower: '', lateFees: '', relanceFees: '', adjustment: '',
          manualLastIndex: false
        }
      }));
    } catch (error) {
      console.error(error);
      setNotification({ msg: "Erreur Connexion Internet", type: 'error' });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const formatMoney = (amount) => amount.toLocaleString('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 3 });
  const formatNumber = (num) => num.toLocaleString('fr-TN', { maximumFractionDigits: 2 });

  const liveMetrics = calculateMetrics();
  const siteLogs = logs.filter(l => l.siteId === currentSite);
  const lastLog = siteLogs.length > 0 ? siteLogs[0] : null;
  const isFormDirty = formData[currentSite].newIndex !== '';
  const displayMetrics = isFormDirty ? liveMetrics : (lastLog || liveMetrics);
  const currentSiteObj = SITES.find(s => s.id === currentSite);
  const isBT = currentSiteObj.type === 'BT';

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
      <header className={`text-white shadow-lg sticky top-0 z-30 transition-colors duration-500 ${isBT ? 'bg-gradient-to-r from-red-800 to-orange-900' : 'bg-gradient-to-r from-blue-900 to-slate-900'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-2 md:mb-0">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-2 transition-colors"><ArrowLeft size={20} /></button>
            <div className={`p-2 rounded-lg text-slate-900 shadow-lg ${isBT ? 'bg-white' : 'bg-yellow-500'}`}>
              <Zap size={24} strokeWidth={2.5} className={isBT ? 'text-red-600' : 'text-blue-900'} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Facturation Énergie</h1>
              <div className="flex items-center space-x-2 text-xs opacity-80">
                <span className={`px-1.5 py-0.5 rounded border ${isBT ? 'bg-red-700 border-red-600' : 'bg-blue-800 border-blue-700'}`}>{isBT ? 'BASSE TENSION' : 'MOYENNE TENSION'}</span>
                <span>{currentSiteObj.name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowUserGuide(true)} className="flex items-center bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold border border-white/20"><BookOpen size={16} className="mr-2" /> Guide</button>
             {!isBT && <button onClick={() => setShowHelp(true)} className="flex items-center bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold border border-white/20"><HelpCircle size={16} className="mr-2" /> Info Cos φ</button>}
          </div>
        </div>
      </header>
      {showUserGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowUserGuide(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 flex items-center"><BookOpen className="mr-2 text-blue-600" /> Guide d'Utilisation</h2>
                <button onClick={() => setShowUserGuide(false)} className="text-slate-400 hover:text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded">Fermer</button>
            </div>
            <div className="overflow-y-auto pr-4 text-sm text-slate-600">
               <p>Utilisez les boutons "Moyenne Tension" ou "Basse Tension" pour sélectionner votre compteur.</p>
               <p className="mt-2">Les données saisies sont automatiquement sauvegardées dans la base de données sécurisée SMEn-ITALCAR.</p>
            </div>
          </div>
        </div>
      )}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h2 className="text-xl font-bold text-blue-900 mb-4">Comprendre le Cos φ</h2>
            <p className="text-sm text-slate-600">Le Cosinus Phi idéal est entre 0.80 et 0.90. Au dessus de 0.90 vous avez un bonus, en dessous de 0.80 une pénalité.</p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SITES.map((site) => (
              <button key={site.id} onClick={() => setCurrentSite(site.id)} className={`p-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center text-center h-16 ${currentSite === site.id ? (site.type === 'BT' ? 'bg-red-700 text-white border-red-800 shadow-md ring-2 ring-red-200' : 'bg-blue-700 text-white border-blue-800 shadow-md ring-2 ring-blue-200') : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                <span>{site.name}</span>
                <span className="text-[9px] opacity-70 mt-1">{site.code}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 relative overflow-hidden">
            {isBT && <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Sun size={150} className="text-orange-500" /></div>}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
               <h2 className="text-lg font-bold text-slate-800 flex items-center"><Calendar className={`mr-2 ${isBT ? 'text-red-600' : 'text-blue-600'}`} size={20} /> Saisie {isBT ? 'Basse Tension' : 'Moyenne Tension'}</h2>
               <input type="month" value={formData[currentSite].date} onChange={(e) => handleInputChange('date', e.target.value)} className="bg-slate-100 border-none rounded px-3 py-1 font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500" />
            </div>

            {isBT ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><Zap size={12} className="mr-1" /> Réseau STEG</h3>
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                      <div><label className="text-xs font-bold text-slate-500">Ancien Index</label><input type="text" inputMode="numeric" value={formatInputDisplay(formData[currentSite].lastIndex || '')} onChange={(e) => handleInputChange('lastIndex', e.target.value)} className="w-full text-sm p-2 border rounded font-mono bg-slate-200" /></div>
                      <div><label className="text-xs font-bold text-red-700">Nouvel Index *</label><input type="text" inputMode="numeric" required value={formatInputDisplay(formData[currentSite].newIndex || '')} onChange={(e) => handleInputChange('newIndex', e.target.value)} className="w-full text-lg p-2 border-2 border-red-200 rounded focus:border-red-600 outline-none font-mono" /></div>
                      <div className="text-right text-xs font-bold text-red-600">Conso: {formatNumber(liveMetrics.consumptionGrid)} kWh</div>
                   </div>
                </div>
                <div className="space-y-4">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><Sun size={12} className="mr-1" /> Photovoltaïque</h3>
                   <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 space-y-3">
                      <div><label className="text-xs font-bold text-slate-500">Ancien Index</label><input type="text" inputMode="numeric" value={formatInputDisplay(formData[currentSite].lastIndexPv || '')} onChange={(e) => handleInputChange('lastIndexPv', e.target.value)} className="w-full text-sm p-2 border rounded font-mono bg-orange-100/50" /></div>
                      <div><label className="text-xs font-bold text-orange-700">Nouvel Index *</label><input type="text" inputMode="numeric" required value={formatInputDisplay(formData[currentSite].newIndexPv || '')} onChange={(e) => handleInputChange('newIndexPv', e.target.value)} className="w-full text-lg p-2 border-2 border-orange-200 rounded focus:border-orange-500 outline-none font-mono" /></div>
                      <div className="text-right text-xs font-bold text-orange-600">Prod: {formatNumber(liveMetrics.productionPv)} kWh</div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compteur Actif</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                       <div><label className="text-xs font-bold text-slate-500">Ancien Index</label><input type="text" value={formatInputDisplay(formData[currentSite].lastIndex || '')} onChange={(e) => handleInputChange('lastIndex', e.target.value)} className="w-full text-sm p-2 border rounded font-mono bg-slate-200" /></div>
                       <div><label className="text-xs font-bold text-blue-700">Nouvel Index *</label><input type="text" required value={formatInputDisplay(formData[currentSite].newIndex || '')} onChange={(e) => handleInputChange('newIndex', e.target.value)} className="w-full text-lg p-2 border-2 border-blue-200 rounded focus:border-blue-600 outline-none font-mono" /></div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paramètres</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                       <div><label className="text-xs font-bold text-slate-500">Cos φ *</label><input type="number" step="0.01" max="1" required value={formData[currentSite].cosPhi || ''} onChange={(e) => handleInputChange('cosPhi', e.target.value)} className="w-full text-sm p-2 border rounded" /></div>
                       <div><label className="text-xs font-bold text-slate-500">Puissance Max *</label><input type="number" required value={formData[currentSite].maxPower || ''} onChange={(e) => handleInputChange('maxPower', e.target.value)} className="w-full text-sm p-2 border rounded" /></div>
                    </div>
                 </div>
              </div>
            )}
            
            <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center ${isBT ? 'bg-red-700 hover:bg-red-800 shadow-red-700/20' : 'bg-blue-700 hover:bg-blue-800 shadow-blue-700/20'}`}>
               <Save size={20} className="mr-2" /> Valider & Sauvegarder (Cloud)
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-4">
           <div className={`bg-white p-6 rounded-xl shadow-lg border transition-all duration-300 relative overflow-hidden ${isBT ? 'border-red-200 ring-2 ring-red-50' : 'border-blue-200 ring-2 ring-blue-50'}`}>
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">{isBT ? <Sun size={100} /> : <Zap size={100} />}</div>
             <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4 mb-4">
               <div>
                 <h3 className={`text-sm font-bold uppercase ${isBT ? 'text-red-700' : 'text-blue-600'}`}>{displayMetrics ? (isBT ? "FACTURE BT / PV" : "FACTURE MT") : "-"}</h3>
                 <p className="text-xs text-slate-400">{currentSiteObj.name}</p>
               </div>
               <div className="text-right"><p className="text-xs text-slate-400">{formData[currentSite].date}</p></div>
             </div>
             
             {/* DÉTAIL TICKET FACTURE */}
             <div className="space-y-3 text-sm">
                {isBT ? (
                    <>
                      <div className="pb-3 border-b border-slate-50 border-dashed space-y-2">
                         <div className="flex justify-between text-slate-600"><span>Conso Réseau</span><span className="font-mono">{formatNumber(displayMetrics.consumptionGrid)} kWh</span></div>
                         <div className="flex justify-between text-orange-600"><span>Prod PV</span><span className="font-mono">-{formatNumber(displayMetrics.productionPv)} kWh</span></div>
                         <div className={`flex justify-between font-bold p-2 rounded ${displayMetrics.totalBalance > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}><span>Solde Final</span><span>{formatNumber(displayMetrics.totalBalance)} kWh</span></div>
                      </div>
                      <div className="pb-3 border-b border-slate-50 border-dashed text-xs text-slate-600 space-y-1">
                         <div className="flex justify-between font-bold text-slate-800 pt-1"><span>Total HT</span><span>{formatMoney(displayMetrics.consoAmountHT + displayMetrics.fixedAmountHT)}</span></div>
                      </div>
                    </>
                ) : (
                    <>
                      <div className="pb-3 border-b border-slate-50 border-dashed">
                        <div className="flex justify-between text-slate-600"><span>Conso</span><span className="font-mono">{formatNumber(displayMetrics.energyRecorded)} kWh</span></div>
                        <div className="flex justify-between font-bold text-slate-700 mt-1 bg-slate-50 px-2 py-1 rounded"><span>Facturé</span><span>{formatMoney(displayMetrics.baseEnergyAmountHT)}</span></div>
                      </div>
                      <div className="pb-3 border-b border-slate-50 border-dashed">
                         <div className={`flex justify-between font-bold ${displayMetrics.cosPhiAdjustmentAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}><span>Ajustement Cos φ</span><span>{formatMoney(displayMetrics.cosPhiAdjustmentAmount)}</span></div>
                      </div>
                    </>
                )}
             </div>

             <div className="mt-6 border-t-2 border-slate-800 pt-4">
               <div className="flex justify-between items-end">
                 <span className="text-lg font-black text-slate-900 uppercase">Net à Payer</span>
                 <span className={`text-3xl font-black font-mono tracking-tight ${isBT ? 'text-red-700' : 'text-blue-700'}`}>{formatMoney(displayMetrics.netToPay)}</span>
               </div>
             </div>
           </div>
           
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
             <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center justify-between">
               <span className="flex items-center"><History size={12} className="mr-1" /> Historique Cloud</span>
               <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] flex items-center">● En ligne</span>
             </h3>
             <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {siteLogs.length === 0 ? <div className="h-full flex items-center justify-center text-slate-300 text-xs">Aucune donnée sur le serveur</div> : 
                  siteLogs.map(log => (
                  <div key={log.docId || log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors relative group">
                     <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                       <span className="font-bold text-slate-700 text-xs flex items-center"><Calendar size={10} className="mr-1 text-slate-400" /> {log.recordDate}</span>
                       <span className={`font-mono font-bold text-sm ${log.siteType === 'BT' ? 'text-red-700' : 'text-blue-700'}`}>{formatMoney(log.netToPay)}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 mt-1">
                        <div className="flex justify-between"><span className="text-slate-400">Index</span><span className="font-mono">{formatInputDisplay(log.newIndex)}</span></div>
                     </div>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </main>
      
      {notification && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-medium flex items-center animate-bounce-short z-50 ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'}`}>
          {notification.type === 'error' ? <AlertTriangle className="mr-2" /> : <CheckCircle2 className="mr-2" />}
          {notification.msg}
        </div>
      )}
    </div>
  );
};

// ==================================================================================
// MODULE 2 : GESTION AIR COMPRIMÉ (Connecté Cloud)
// ==================================================================================

const AirModule = ({ onBack }) => {
  const [activeCompressor, setActiveCompressor] = useState(1);
  const [logs, setLogs] = useState([]);
  const [notif, setNotif] = useState(null);
  
  // Lecture temps réel
  useEffect(() => {
    const q = query(collection(db, "air_logs"), orderBy("id", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      setLogs(logsData);
    });
    return () => unsubscribe();
  }, []);

  const [config, setConfig] = useState({ elecPrice: 0.291, offLoadFactor: 0.3 });
  
  const COMPRESSORS = [
    { id: 1, name: "Compresseur 1", serial: "CAI 827281", model: "Ceccato CSB 30", power: 22 },
    { id: 2, name: "Compresseur 2", serial: "CAI 808264", model: "Ceccato CSB 30", power: 22 }
  ];

  const [formData, setFormData] = useState({
    1: { weekDate: '', description: '', lastRun: 19960, newRun: '', lastLoad: 10500, newLoad: '', lastMaintOilFilter: 18000, lastMaintAirFilter: 18000, lastMaintSeparator: 16000, lastMaintOil: 18000, lastMaintGeneral: 19500 },
    2: { weekDate: '', description: '', lastRun: 18500, newRun: '', lastLoad: 9200, newLoad: '', lastMaintOilFilter: 16000, lastMaintAirFilter: 16000, lastMaintSeparator: 14000, lastMaintOil: 16000, lastMaintGeneral: 18000 }
  });

  const MAINT_INTERVALS = { oilFilter: 2000, airFilter: 2000, separator: 4000, oil: 2000, general: 500 };

  useEffect(() => {
     const today = new Date().toISOString().split('T')[0];
     setFormData(prev => ({
         ...prev, 1: { ...prev[1], weekDate: today }, 2: { ...prev[2], weekDate: today }
     }));
  }, []);

  const handleInput = (field, value) => {
    setFormData(prev => ({ ...prev, [activeCompressor]: { ...prev[activeCompressor], [field]: value } }));
  };

  const calculateKPIs = () => {
    const data = formData[activeCompressor];
    const comp = COMPRESSORS.find(c => c.id === activeCompressor);
    const runDelta = Math.max(0, (parseFloat(data.newRun)||0) - (parseFloat(data.lastRun)||0));
    const loadDelta = Math.max(0, (parseFloat(data.newLoad)||0) - (parseFloat(data.lastLoad)||0));
    const loadRate = runDelta > 0 ? (loadDelta / runDelta) * 100 : 0;
    const offLoadHours = Math.max(0, runDelta - loadDelta);
    const energyKwh = (loadDelta * comp.power) + (offLoadHours * comp.power * config.offLoadFactor);
    const costHT = energyKwh * config.elecPrice;
    
    // Maintenance
    const currentTotal = parseFloat(data.newRun) || parseFloat(data.lastRun) || 0;
    const maintStatus = {};
    Object.keys(MAINT_INTERVALS).forEach(key => {
        const lastDone = data[`lastMaint${key.charAt(0).toUpperCase() + key.slice(1)}`] || 0;
        const nextDue = lastDone + MAINT_INTERVALS[key];
        maintStatus[key] = { remaining: nextDue - currentTotal };
    });

    return { runDelta, loadDelta, loadRate, energyKwh, costHT, maintStatus };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const kpis = calculateKPIs();
    const data = formData[activeCompressor];
    
    if(!data.newRun || !data.newLoad) { setNotif("Veuillez remplir les index"); return; }

    const newLog = {
      id: Date.now(),
      type: 'WEEKLY_REPORT',
      compName: COMPRESSORS.find(c => c.id === activeCompressor).name,
      ...data,
      ...kpis
    };

    try {
        // Envoi Cloud
        await addDoc(collection(db, "air_logs"), newLog);
        setNotif("Rapport enregistré en ligne !");
        
        // Mise à jour locale pour la semaine prochaine
        setFormData(prev => ({
            ...prev,
            [activeCompressor]: { 
                ...prev[activeCompressor], 
                lastRun: data.newRun, newRun: '', lastLoad: data.newLoad, newLoad: '', description: '' 
            }
        }));
    } catch (e) {
        setNotif("Erreur connexion Firebase");
    }
    setTimeout(() => setNotif(null), 3000);
  };

  const kpis = calculateKPIs();
  const currentComp = COMPRESSORS.find(c => c.id === activeCompressor);

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
       <header className="bg-gradient-to-r from-sky-700 to-blue-800 text-white shadow-lg sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-4"><ArrowLeft size={20} /></button>
                    <h1 className="text-xl font-bold">Gestion Air Comprimé</h1>
                </div>
            </div>
       </header>

       <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  {COMPRESSORS.map(comp => (
                      <button key={comp.id} onClick={() => setActiveCompressor(comp.id)} className={`p-4 rounded-xl border text-left ${activeCompressor === comp.id ? 'bg-white border-sky-500 ring-2 ring-sky-200' : 'bg-white border-slate-200'}`}>
                          <span className="font-bold text-slate-700 block">{comp.name}</span>
                          <span className="text-xs text-slate-400">{comp.serial}</span>
                      </button>
                  ))}
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase">Marche (H)</h3>
                        <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                            <div><label className="text-xs font-bold text-slate-500">Précédent</label><input type="number" value={formData[activeCompressor].lastRun} readOnly className="w-full border rounded p-2 text-sm bg-slate-200" /></div>
                            <div><label className="text-xs font-bold text-sky-700">Nouveau *</label><input type="number" value={formData[activeCompressor].newRun} onChange={(e) => handleInput('newRun', e.target.value)} className="w-full border-2 border-sky-200 p-2 text-lg rounded" /></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase">Charge (H)</h3>
                        <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                            <div><label className="text-xs font-bold text-slate-500">Précédent</label><input type="number" value={formData[activeCompressor].lastLoad} readOnly className="w-full border rounded p-2 text-sm bg-slate-200" /></div>
                            <div><label className="text-xs font-bold text-emerald-700">Nouveau *</label><input type="number" value={formData[activeCompressor].newLoad} onChange={(e) => handleInput('newLoad', e.target.value)} className="w-full border-2 border-emerald-200 p-2 text-lg rounded" /></div>
                        </div>
                    </div>
                 </div>
                 <button onClick={handleSubmit} className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl font-bold shadow-lg mt-6 flex items-center justify-center"><Save size={18} className="mr-2" /> Valider & Envoyer</button>
              </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase">Analyse Semaine</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded"><div className="text-xs text-slate-500">Taux Charge</div><div className="font-bold text-lg">{kpis.loadRate.toFixed(1)}%</div></div>
                      <div className="bg-slate-50 p-3 rounded"><div className="text-xs text-slate-500">Coût Est.</div><div className="font-bold text-lg">{kpis.costHT.toFixed(0)} DT</div></div>
                  </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 h-[300px] flex flex-col">
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Historique</h3>
                  <div className="flex-1 overflow-y-auto space-y-2">
                      {logs.filter(l => l.compName === currentComp.name).map(log => (
                          <div key={log.docId} className="p-2 border rounded text-xs bg-slate-50">
                              <div className="flex justify-between font-bold text-slate-700"><span>Semaine {log.weekDate}</span><span>{log.costHT?.toFixed(0)} DT</span></div>
                              <div className="text-slate-500">Conso: {log.energyKwh?.toFixed(0)} kWh</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
       </main>
       {notif && <div className="fixed bottom-6 right-6 px-6 py-4 bg-sky-600 text-white rounded-xl shadow-xl z-50">{notif}</div>}
    </div>
  );
};

const SitesDashboard = ({ onBack }) => {
  const [activeSiteTab, setActiveSiteTab] = useState('MEGRINE');
  const SITES_DATA = {
    MEGRINE: { name: "Mégrine", area: 32500, covered: 30000, open: 2500, details: "Showroom 1000m² • Atelier FIAT 10000m² • Atelier IVECO 9000m² • ITALCAR Gros 10000m²", energyMix: [{ name: "Électricité", value: 97, color: "#3b82f6" }, { name: "Gaz", value: 3, color: "#f97316" }], elecUsage: [{ name: "Éclairage", value: 27, kpi: "kWh/m²", significant: true }, { name: "CVC (Clim/Chauff)", value: 40, kpi: "kWh/m²", significant: true }, { name: "Air Comprimé", value: 17, kpi: "kWh/Nm³", significant: true }, { name: "Informatique", value: 8, kpi: "kWh/Poste", significant: false }, { name: "Services", value: 5, kpi: "-", significant: false }, { name: "Gaz (Four)", value: 3, kpi: "kWh/Véhicule", significant: true }] },
    ELKHADHRA: { name: "El Khadhra", area: 9500, covered: 7000, open: 2500, details: "Réception 1000m² • Atelier FIAT 3000m² • ITALCAR Gros 3000m²", energyMix: [{ name: "Électricité", value: 100, color: "#3b82f6" }], elecUsage: [{ name: "CVC (Clim/Chauff)", value: 61, kpi: "kWh/m²", significant: true }, { name: "Éclairage", value: 23, kpi: "kWh/m²", significant: true }, { name: "Air Comprimé", value: 6, kpi: "kWh/Nm³", significant: true }, { name: "Informatique", value: 5, kpi: "kWh/Poste", significant: false }, { name: "Services", value: 5, kpi: "-", significant: false }] },
    NAASSEN: { name: "Naassen", area: 32500, covered: 1820, open: 30680, details: "Admin 920m² • Atelier 900m² • Parc Neuf 30680m²", energyMix: [{ name: "Électricité", value: 100, color: "#3b82f6" }], elecUsage: [{ name: "Éclairage (Int+Ext)", value: 78, kpi: "kWh/m²", significant: true }, { name: "CVC", value: 14, kpi: "kWh/m²", significant: false }, { name: "Air Comprimé", value: 5, kpi: "kWh/Nm³", significant: false }, { name: "Services", value: 2, kpi: "-", significant: false }, { name: "Informatique", value: 1, kpi: "-", significant: false }] },
    LAC: { name: "Lac", area: 2050, covered: 850, open: 1200, details: "Showroom 850m² • Espace Ouvert 1200m²", energyMix: [{ name: "Électricité", value: 100, color: "#3b82f6" }], elecUsage: [{ name: "Éclairage", value: 58, kpi: "kWh/m²", significant: true }, { name: "CVC", value: 36, kpi: "kWh/m²", significant: true }, { name: "Informatique", value: 3, kpi: "-", significant: false }, { name: "Services", value: 3, kpi: "-", significant: false }] }
  };
  const currentData = SITES_DATA[activeSiteTab];
  return (
    <div className="bg-slate-50 min-h-screen pb-10">
       <header className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-lg sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-4"><ArrowLeft size={20} /></button>
                    <h1 className="text-xl font-bold">Tableau de Bord Sites</h1>
                </div>
            </div>
       </header>
       <main className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
                {Object.keys(SITES_DATA).map(key => (
                    <button key={key} onClick={() => setActiveSiteTab(key)} className={`px-6 py-3 rounded-xl font-bold text-sm ${activeSiteTab === key ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>{SITES_DATA[key].name}</button>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center"><Building2 size={16} className="mr-2" /> Fiche Technique</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                                <span className="text-slate-600 text-sm">Superficie Totale</span>
                                <span className="text-2xl font-black text-slate-800">{currentData.area.toLocaleString()} <span className="text-sm font-normal text-slate-400">m²</span></span>
                            </div>
                            <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">{currentData.details}</div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 flex items-center"><PieChart size={16} className="mr-2" /> Répartition des Consommations</h3>
                        <div className="space-y-3">
                            {currentData.elecUsage.map((usage, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center w-1/3">
                                        {usage.significant && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></div>}
                                        <span className={`text-sm ${usage.significant ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{usage.name}</span>
                                    </div>
                                    <div className="flex-1 px-4">
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div className={`h-full rounded-full ${usage.significant ? 'bg-emerald-500' : 'bg-slate-400'}`} style={{ width: `${usage.value}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="w-32 flex justify-end items-center text-right">
                                        <span className="font-bold text-slate-700 mr-3">{usage.value}%</span>
                                        <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200 min-w-[70px] text-center">{usage.kpi}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
       </main>
    </div>
  );
};

const MainDashboard = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
        </div>
        <div className="z-10 text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">Système de Gestion Industriel</h1>
            <p className="text-slate-400 text-lg">ITALCAR - Version Cloud (Sécurisée)</p>
        </div>
        <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
            <button onClick={() => onNavigate('steg')} className="group relative bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 rounded-3xl p-6 transition-all text-left">
                <div className="absolute top-4 right-4 bg-blue-500/20 p-2 rounded-xl text-blue-400"><Zap size={24} /></div>
                <h2 className="text-xl font-bold mb-2">Énergie & Facturation</h2>
                <p className="text-slate-400 text-xs mb-4 pr-8">Relevés STEG (MT/BT), Calcul Cos φ.</p>
                <div className="flex items-center text-blue-400 font-bold text-xs">Accéder <ArrowLeft className="ml-1 rotate-180" size={12} /></div>
            </button>
            <button onClick={() => onNavigate('air')} className="group relative bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-sky-500 rounded-3xl p-6 transition-all text-left">
                <div className="absolute top-4 right-4 bg-sky-500/20 p-2 rounded-xl text-sky-400"><Wind size={24} /></div>
                <h2 className="text-xl font-bold mb-2">Air Comprimé</h2>
                <p className="text-slate-400 text-xs mb-4 pr-8">Suivi Compresseurs, Maintenance.</p>
                <div className="flex items-center text-sky-400 font-bold text-xs">Accéder <ArrowLeft className="ml-1 rotate-180" size={12} /></div>
            </button>
            <button onClick={() => onNavigate('sites')} className="group relative bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-emerald-500 rounded-3xl p-6 transition-all text-left">
                <div className="absolute top-4 right-4 bg-emerald-500/20 p-2 rounded-xl text-emerald-400"><LayoutGrid size={24} /></div>
                <h2 className="text-xl font-bold mb-2">Tableau de Bord Sites</h2>
                <p className="text-slate-400 text-xs mb-4 pr-8">Superficies, Usages, KPIs.</p>
                <div className="flex items-center text-emerald-400 font-bold text-xs">Accéder <ArrowLeft className="ml-1 rotate-180" size={12} /></div>
            </button>
        </div>
        <div className="mt-12 text-slate-600 text-xs">v5.0.0 Cloud • SMEn-ITALCAR</div>
    </div>
  );
};

const App = () => {
  const [currentModule, setCurrentModule] = useState('dashboard');
  return (
    <>
      {currentModule === 'dashboard' && <MainDashboard onNavigate={setCurrentModule} />}
      {currentModule === 'steg' && <StegModule onBack={() => setCurrentModule('dashboard')} />}
      {currentModule === 'air' && <AirModule onBack={() => setCurrentModule('dashboard')} />}
      {currentModule === 'sites' && <SitesDashboard onBack={() => setCurrentModule('dashboard')} />}
    </>
  );
};

export default App;
