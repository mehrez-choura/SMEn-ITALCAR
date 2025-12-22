import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Activity, 
  Save, 
  History, 
  TrendingUp, 
  AlertTriangle, 
  Factory, 
  CheckCircle2,
  BarChart3,
  Settings,
  Lock,
  Unlock,
  Calendar,
  DollarSign,
  TrendingDown,
  HelpCircle,
  FileText,
  Calculator,
  AlertCircle,
  Eye,
  Hash,
  BookOpen,
  Sun,
  Battery,
  MousePointerClick,
  Info,
  Wind,
  Gauge,
  Thermometer,
  Timer,
  Wrench,
  LayoutGrid,
  ArrowLeft,
  Clock,
  Edit2,
  ClipboardList,
  CheckSquare,
  PieChart,
  MapPin,
  Maximize2,
  Minimize2,
  Building2,
  Leaf
} from 'lucide-react';

// ==================================================================================
// MODULE 1 : GESTION ÉNERGIE STEG (Code Restauré & Complet)
// ==================================================================================

const StegModule = ({ onBack }) => {
  // --- État de l'application ---
  const [currentSite, setCurrentSite] = useState(1);
  const [logs, setLogs] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  
  // --- Constantes Sites ---
  const SITES = [
    { id: 1, name: "MT 1 - Mégrine", code: "MEG-001", type: "MT" },
    { id: 2, name: "MT 2 - El Khadhra", code: "ELK-002", type: "MT" },
    { id: 3, name: "MT 3 - Naassen", code: "NAS-003", type: "MT" },
    { id: 4, name: "BT 1 - Showroom Lac", code: "SHR-001", type: "BT" }
  ];

  // Configuration Globale (Prix & Taxes)
  const [globalConfig, setGlobalConfig] = useState({
    // MT Params
    unitPriceKwh: 0.291,    // MT
    powerUnitPrice: 5.000,  // MT
    // BT Params
    unitPriceKwhBT: 0.391,  // BT
    fixedFeesBT: 115.500,   // Redevance Fixe BT
    servicesBT: 0.000,      // Services BT
    fteGazBT: 0.000,        // FTE Gaz BT
    
    // Taxes Communes
    vatRate: 19,            
    rtt: 3.500,             
    municipalTaxRate: 0.010, // MT Surtaxe
    
    // Taxes Variables BT
    taxCLRate: 0.005,       // Contribution CL (BT)
    taxFTERate: 0.005       // FTE Electricité (BT)
  });

  // Configuration Spécifique par Site
  const [siteConfigs, setSiteConfigs] = useState({
    1: { subscribedPower: 250, emptyLosses: 1300 }, // Mégrine
    2: { subscribedPower: 70, emptyLosses: 670 },   // El Khadhra
    3: { subscribedPower: 30, emptyLosses: 160 },    // Naassen
    4: { subscribedPower: 0, emptyLosses: 0 }        // Showroom
  });

  const [isConfigUnlocked, setIsConfigUnlocked] = useState(false);

  // Date actuelle
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Données de formulaire
  const [formData, setFormData] = useState({
    1: { lastIndex: 14500, newIndex: '', cosPhi: '', reactiveCons: '', maxPower: '', date: getCurrentMonth(), manualLastIndex: false, lateFees: '', relanceFees: '', adjustment: '' },
    2: { lastIndex: 28900, newIndex: '', cosPhi: '', reactiveCons: '', maxPower: '', date: getCurrentMonth(), manualLastIndex: false, lateFees: '', relanceFees: '', adjustment: '' },
    3: { lastIndex: 56200, newIndex: '', cosPhi: '', reactiveCons: '', maxPower: '', date: getCurrentMonth(), manualLastIndex: false, lateFees: '', relanceFees: '', adjustment: '' },
    4: { lastIndex: 1000, newIndex: '', lastIndexPv: 500, newIndexPv: '', previousBalance: 0, date: getCurrentMonth(), manualLastIndex: false, lateFees: '', relanceFees: '', adjustment: '' }
  });

  const [notification, setNotification] = useState(null);

  // --- Helpers Logic ---

  const formatInputDisplay = (val) => {
    if (val === '' || val === undefined || val === null) return '';
    const cleanVal = val.toString().replace(/[^0-9.-]/g, ''); 
    return cleanVal.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const parseInputValue = (val) => {
    return val.replace(/\s/g, ''); 
  };

  // Mise à jour automatique historique
  useEffect(() => {
    const siteLogs = logs.filter(l => l.siteId === currentSite).sort((a, b) => b.id - a.id);
    
    if (siteLogs.length > 0) {
      const lastLog = siteLogs[0];
      const currentSiteType = SITES.find(s => s.id === currentSite).type;
      
      setFormData(prev => ({
        ...prev,
        [currentSite]: {
          ...prev[currentSite],
          lastIndex: lastLog.newIndex, 
          // Si BT, on met aussi à jour l'index PV et le solde précédent
          ...(currentSiteType === 'BT' ? {
            lastIndexPv: lastLog.newIndexPv,
            previousBalance: lastLog.newCarryOver // Le solde N devient N-1
          } : {}),
          manualLastIndex: false
        }
      }));
    }
  }, [currentSite, logs]);

  const handleInputChange = (field, value) => {
    const cleanValue = ['lastIndex', 'newIndex', 'lastIndexPv', 'newIndexPv', 'previousBalance'].includes(field) 
      ? parseInputValue(value) 
      : value;

    setFormData(prev => {
      const isManualOverride = field === 'lastIndex';
      return {
        ...prev,
        [currentSite]: {
          ...prev[currentSite],
          [field]: cleanValue,
          manualLastIndex: isManualOverride ? true : prev[currentSite].manualLastIndex
        }
      };
    });
  };

  const handleGlobalConfigChange = (field, value) => {
    setGlobalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSiteConfigChange = (field, value) => {
    setSiteConfigs(prev => ({
      ...prev,
      [currentSite]: { ...prev[currentSite], [field]: value }
    }));
  };

  // --- MOTEUR DE CALCUL UNIFIÉ ---
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

    // === LOGIQUE BT (SHOWROOM LAC) ===
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

      if (totalBalance > 0) {
        billedKwh = totalBalance;
        newCarryOver = 0;
      } else {
        billedKwh = 0;
        newCarryOver = totalBalance;
      }

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

      return {
        type: 'BT',
        consumptionGrid,
        productionPv,
        currentMonthBalance,
        prevBalance,
        totalBalance,
        billedKwh,
        newCarryOver,
        consoAmountHT,
        fixedAmountHT,
        totalTTC,
        contributionCL,
        fteElec,
        fteGaz,
        netToPay,
        subscribedPowerRef: 0 
      };
    } 
    
    // === LOGIQUE MT (Moyenne Tension - Standard) ===
    else {
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
      if (cosPhi >= 0.91 && cosPhi <= 1) {
        const steps = Math.round((cosPhi - 0.90) * 100); 
        adjustmentRate = -(steps * 0.005);
        adjustmentType = 'bonus';
      } else if (cosPhi >= 0.80 && cosPhi <= 0.90) {
        adjustmentRate = 0;
        adjustmentType = 'neutral';
      } else {
        adjustmentType = 'penalty';
        let penalty = 0;
        if (cosPhi < 0.80) penalty += Math.round((0.80 - Math.max(cosPhi, 0.75)) * 100) * 0.005;
        if (cosPhi < 0.75) penalty += Math.round((0.75 - Math.max(cosPhi, 0.70)) * 100) * 0.01;
        if (cosPhi < 0.70) penalty += Math.round((0.70 - Math.max(cosPhi, 0.60)) * 100) * 0.015;
        if (cosPhi < 0.60) penalty += Math.round((0.60 - cosPhi) * 100) * 0.02;
        adjustmentRate = penalty;
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

      return {
        type: 'MT',
        energyRecorded,
        loadLosses,
        billedKwh,
        baseEnergyAmountHT,
        adjustmentRate,
        adjustmentType,
        cosPhiAdjustmentAmount,
        total1_TTC,
        total1_HT, // Ajouté pour affichage détaillé
        powerPremium,
        total2_HT, // Ajouté pour affichage détaillé
        total2_TTC,
        municipalTax,
        netToPay,
        isPowerOverrun,
        subscribedPowerRef: subPower
      };
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const site = SITES.find(s => s.id === currentSite);
    const metrics = calculateMetrics();
    const currentData = formData[currentSite];

    if (site.type === 'BT') {
        if (!currentData.newIndex || !currentData.newIndexPv) {
            setNotification({ msg: "Veuillez entrer les index (Réseau et PV)", type: 'error' });
            setTimeout(() => setNotification(null), 3000);
            return;
        }
    } else {
        if (!currentData.newIndex || !currentData.cosPhi) {
            setNotification({ msg: "Veuillez entrer l'index et le Cos Phi", type: 'error' });
            setTimeout(() => setNotification(null), 3000);
            return;
        }
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

    setLogs([newLog, ...logs]);
    
    setFormData(prev => ({
      ...prev,
      [currentSite]: {
        ...prev[currentSite],
        lastIndex: currentData.newIndex, 
        newIndex: '',
        lastIndexPv: site.type === 'BT' ? currentData.newIndexPv : undefined,
        newIndexPv: site.type === 'BT' ? '' : undefined,
        previousBalance: site.type === 'BT' ? metrics.newCarryOver : undefined,
        cosPhi: '', reactiveCons: '', maxPower: '',
        lateFees: '', relanceFees: '', adjustment: '',
        manualLastIndex: false
      }
    }));
    
    setNotification({ msg: "Relevé validé avec succès !", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatMoney = (amount) => amount.toLocaleString('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 3 });
  const formatNumber = (num) => num.toLocaleString('fr-TN', { maximumFractionDigits: 2 });

  const liveMetrics = calculateMetrics();
  const siteLogs = logs.filter(l => l.siteId === currentSite).sort((a, b) => b.id - a.id);
  const lastLog = siteLogs.length > 0 ? siteLogs[0] : null;
  const isFormDirty = formData[currentSite].newIndex !== '' || (SITES.find(s=>s.id===currentSite).type === 'MT' && formData[currentSite].cosPhi !== '') || (SITES.find(s=>s.id===currentSite).type === 'BT' && formData[currentSite].newIndexPv !== '');
  const displayMetrics = isFormDirty ? liveMetrics : (lastLog || liveMetrics);
  
  const currentSiteObj = SITES.find(s => s.id === currentSite);
  const isBT = currentSiteObj.type === 'BT';

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
      {/* Header Module STEG */}
      <header className={`text-white shadow-lg sticky top-0 z-30 transition-colors duration-500
        ${isBT ? 'bg-gradient-to-r from-red-800 to-orange-900' : 'bg-gradient-to-r from-blue-900 to-slate-900'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-2 md:mb-0">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-2 transition-colors">
               <ArrowLeft size={20} />
            </button>
            <div className={`p-2 rounded-lg text-slate-900 shadow-lg ${isBT ? 'bg-white' : 'bg-yellow-500'}`}>
              <Zap size={24} strokeWidth={2.5} className={isBT ? 'text-red-600' : 'text-blue-900'} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Module Facturation Énergie</h1>
              <div className="flex items-center space-x-2 text-xs opacity-80">
                <span className={`px-1.5 py-0.5 rounded border ${isBT ? 'bg-red-700 border-red-600' : 'bg-blue-800 border-blue-700'}`}>
                  {isBT ? 'BASSE TENSION' : 'MOYENNE TENSION'}
                </span>
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

      {/* Guide Utilisation */}
      {showUserGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowUserGuide(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 flex items-center"><BookOpen className="mr-2 text-blue-600" /> Guide d'Utilisation Complet</h2>
                <button onClick={() => setShowUserGuide(false)} className="text-slate-400 hover:text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded">Fermer</button>
            </div>
            
            <div className="overflow-y-auto pr-4 space-y-8">
                
                {/* 1. SECTION RELEVE PHYSIQUE */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                      <span className="bg-slate-800 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-2">1</span>
                      Procédure de Relevé Physique
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* COLONNE MT */}
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-800 mb-2 flex items-center uppercase text-sm"><Zap size={14} className="mr-2" /> Compteurs MT (SL 7000)</h4>
                            <p className="text-[10px] uppercase font-bold text-blue-400 mb-3">Mégrine • El Khadhra • Naassen</p>
                            
                            <div className="space-y-3 text-xs text-slate-700">
                                <div className="flex items-start">
                                    <MousePointerClick size={16} className="mr-2 text-blue-500 mt-0.5" />
                                    <p>Appuyer brièvement sur le bouton <strong>Disp.</strong> (Haut) pour allumer l'écran.</p>
                                </div>
                                <div className="flex items-start">
                                    <MousePointerClick size={16} className="mr-2 text-blue-500 mt-0.5" />
                                    <p>Appuyer une 2ème fois : l'écran affiche <strong>ST-DATA</strong>.</p>
                                </div>
                                <div className="flex items-start">
                                    <MousePointerClick size={16} className="mr-2 text-blue-500 mt-0.5" />
                                    <p><strong>Maintenir appuyé</strong> jusqu'à ce que le premier index apparaisse.</p>
                                </div>
                                <div className="flex items-start">
                                    <Eye size={16} className="mr-2 text-blue-500 mt-0.5" />
                                    <p>Appuyer par impulsions pour défiler jusqu'aux codes :</p>
                                </div>
                            </div>

                            <div className="mt-4 bg-white p-3 rounded border border-blue-100 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">1.8.0</span>
                                    <span>Énergie Active (Conso)</span>
                                    <span className="text-[10px] text-red-500 font-bold uppercase">Important</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">1.6.0</span>
                                    <span>Puissance Max</span>
                                    <span className="text-[10px] text-red-500 font-bold uppercase">Important</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">3.8.0</span>
                                    <span>Énergie Réactive</span>
                                    <span className="text-[10px] text-slate-400">Optionnel</span>
                                </div>
                            </div>
                        </div>

                        {/* COLONNE BT */}
                        <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                            <h4 className="font-bold text-orange-800 mb-2 flex items-center uppercase text-sm"><Sun size={14} className="mr-2" /> Compteur BT (Showroom)</h4>
                            <p className="text-[10px] uppercase font-bold text-orange-400 mb-3">Showroom Lac (Photovoltaïque)</p>
                            
                            <div className="space-y-3 text-xs text-slate-700">
                                <p>Ce compteur dispose d'un défilement automatique. Si l'écran est éteint, appuyez sur n'importe quel bouton pour le réveiller.</p>
                                <p>Recherchez les codes OBIS suivants :</p>
                            </div>

                            <div className="mt-4 bg-white p-3 rounded border border-orange-100 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">1.8.0</span>
                                    <span>Conso Réseau (STEG)</span>
                                    <span className="text-[10px] text-red-500 font-bold uppercase">Important</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">2.8.0</span>
                                    <span>Injection (Solaire)</span>
                                    <span className="text-[10px] text-red-500 font-bold uppercase">Important</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100"></div>

                {/* 2. SECTION LOGIQUE SITE */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                      <span className="bg-slate-800 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-2">2</span>
                      Logique de Calcul de l'Application
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* MT LOGIC */}
                        <div>
                            <h4 className="font-bold text-blue-700 text-sm mb-2 uppercase border-b border-blue-100 pb-1">Site Moyenne Tension (MT)</h4>
                            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                                <li><strong>1. Énergie Facturée :</strong> C'est la différence entre le nouvel et l'ancien index, majorée par les pertes transfos (Pertes Fer fixes + Pertes Cuivre variables 2%).</li>
                                <li><strong>2. Ajustement Cos φ :</strong> Le montant de l'énergie est bonifié (réduit) ou pénalisé (augmenté) selon la valeur du Cosinus Phi saisie.</li>
                                <li><strong>3. Total :</strong> On ajoute ensuite la Prime de Puissance Fixe (kVA souscrit * Prix) et toutes les taxes (TVA, RTT, Municipale).</li>
                            </ul>
                        </div>

                        {/* BT LOGIC */}
                        <div>
                            <h4 className="font-bold text-orange-700 text-sm mb-2 uppercase border-b border-orange-100 pb-1">Site Basse Tension (Net Metering)</h4>
                            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                                <li><strong>1. Bilan Énergétique :</strong> L'application calcule le <span className="font-bold">Solde</span> = (Conso Réseau - Production PV) + Solde du mois précédent.</li>
                                <li><strong>2. Cas Surplus (Solde Négatif) :</strong> Vous ne payez pas d'énergie. Le surplus est stocké sous forme de crédit (kWh) pour le mois suivant. Vous payez uniquement les frais fixes.</li>
                                <li><strong>3. Cas Déficit (Solde Positif) :</strong> Vous payez les kWh manquants au tarif BT en vigueur. Le solde repart à 0 pour le mois suivant.</li>
                            </ul>
                        </div>

                    </div>
                </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Aide Cos Phi (Expert) */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center"><FileText className="mr-2" /> Comprendre le Cos φ (Facteur de Puissance)</h2>
            
            <div className="space-y-6 text-sm text-slate-700">
              
              <p className="leading-relaxed bg-blue-50 p-3 rounded border border-blue-100">
                 Le Cos φ mesure l'efficacité de votre installation électrique. La STEG impose une "zone neutre" entre <strong>0.80</strong> et <strong>0.90</strong>. En dehors de cette zone, le prix du kWh change.
              </p>

              {/* TABLEAU DES REGLES */}
              <div>
                  <h3 className="font-bold text-slate-800 mb-2">Tableau des Bonifications & Pénalités</h3>
                  <table className="w-full text-xs border-collapse">
                      <thead>
                          <tr className="bg-slate-100 text-slate-600 uppercase font-bold">
                              <th className="border p-2 text-left">Plage Cos φ</th>
                              <th className="border p-2 text-left">Type</th>
                              <th className="border p-2 text-left">Formule Appliquée</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr className="bg-emerald-50">
                              <td className="border p-2 font-mono font-bold text-emerald-700">0.91 → 1.00</td>
                              <td className="border p-2 font-bold text-emerald-700">BONIFICATION</td>
                              <td className="border p-2 text-emerald-800">
                                  Réduction de <strong>0.5%</strong> pour chaque centième au-dessus de 0.90.<br/>
                                  <span className="opacity-75 italic">Ex: 0.94 = -2% sur la facture énergie.</span>
                              </td>
                          </tr>
                          <tr className="bg-slate-50">
                              <td className="border p-2 font-mono font-bold text-slate-600">0.80 → 0.90</td>
                              <td className="border p-2 font-bold text-slate-600">NEUTRE</td>
                              <td className="border p-2 text-slate-500">Aucun changement de prix. C'est la zone cible idéale.</td>
                          </tr>
                          <tr className="bg-red-50">
                              <td className="border p-2 font-mono font-bold text-red-700">&lt; 0.80</td>
                              <td className="border p-2 font-bold text-red-700">PÉNALITÉ</td>
                              <td className="border p-2 text-red-800">
                                  Majoration <strong>cumulative</strong> par tranche :<br/>
                                  • 0.80 à 0.75 : <strong>+0.5%</strong> par centième<br/>
                                  • 0.75 à 0.70 : <strong>+1.0%</strong> par centième<br/>
                                  • 0.70 à 0.60 : <strong>+1.5%</strong> par centième<br/>
                                  • &lt; 0.60 : <strong>+2.0%</strong> par centième
                              </td>
                          </tr>
                      </tbody>
                  </table>
              </div>

              {/* EXEMPLE CALCUL */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-2 flex items-center"><Calculator size={16} className="mr-2 text-slate-500" /> Exemple de Calcul Pénalité</h3>
                  <p className="mb-2 text-xs">Imaginons un Cos φ catastrophique de <strong>0.70</strong>.</p>
                  <ul className="list-disc ml-5 space-y-1 text-xs font-mono text-slate-600">
                      <li>Tranche 1 (0.80 → 0.75) : 5 centièmes x 0.5% = <strong>+2.5%</strong></li>
                      <li>Tranche 2 (0.75 → 0.70) : 5 centièmes x 1.0% = <strong>+5.0%</strong></li>
                      <li className="font-bold text-red-600 pt-1">TOTAL PÉNALITÉ = +7.5% sur le montant HT consommation</li>
                  </ul>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Colonne Gauche : Formulaire (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sélecteur de Site */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SITES.map((site) => (
              <button
                key={site.id}
                onClick={() => setCurrentSite(site.id)}
                className={`p-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center text-center h-16
                  ${currentSite === site.id 
                    ? (site.type === 'BT' ? 'bg-red-700 text-white border-red-800 shadow-md ring-2 ring-red-200' : 'bg-blue-700 text-white border-blue-800 shadow-md ring-2 ring-blue-200') 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <span>{site.name}</span>
                <span className="text-[9px] opacity-70 mt-1">{site.code}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 relative overflow-hidden">
            {isBT && <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Sun size={150} className="text-orange-500" /></div>}
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
               <h2 className="text-lg font-bold text-slate-800 flex items-center">
                 <Calendar className={`mr-2 ${isBT ? 'text-red-600' : 'text-blue-600'}`} size={20} />
                 Saisie {isBT ? 'Basse Tension' : 'Moyenne Tension'}
               </h2>
               <input 
                 type="month"
                 value={formData[currentSite].date}
                 onChange={(e) => handleInputChange('date', e.target.value)}
                 className="bg-slate-100 border-none rounded px-3 py-1 font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500"
               />
            </div>

            {/* --- FORMULAIRE BT --- */}
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
                <div className="md:col-span-2">
                   <label className="text-xs font-bold text-slate-500 block mb-1">Solde Mois Précédent (N-1)</label>
                   <div className="flex items-center">
                     <div className="bg-slate-200 p-2 rounded-l border border-r-0 border-slate-300"><Battery size={16} /></div>
                     <input type="text" inputMode="numeric" value={formatInputDisplay(formData[currentSite].previousBalance || '')} onChange={(e) => handleInputChange('previousBalance', e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-r font-mono" placeholder="Ex: -200 (Crédit)" />
                   </div>
                </div>
              </div>
            ) : (
              // --- FORMULAIRE MT ---
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
                       <div><label className="text-xs font-bold text-slate-500">Réactif (Optionnel)</label><input type="number" value={formData[currentSite].reactiveCons || ''} onChange={(e) => handleInputChange('reactiveCons', e.target.value)} className="w-full text-sm p-2 border rounded" /></div>
                    </div>
                 </div>
              </div>
            )}

            {/* Ajustements Communs */}
            <div className="border-t border-slate-100 pt-4">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Frais & Ajustements</h3>
               <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-[10px] uppercase text-slate-500">Retard (DT)</label><input type="number" value={formData[currentSite].lateFees || ''} onChange={(e) => handleInputChange('lateFees', e.target.value)} className="w-full text-sm p-2 border rounded" /></div>
                  <div><label className="text-[10px] uppercase text-slate-500">Relance (DT)</label><input type="number" value={formData[currentSite].relanceFees || ''} onChange={(e) => handleInputChange('relanceFees', e.target.value)} className="w-full text-sm p-2 border rounded" /></div>
                  <div><label className="text-[10px] uppercase text-slate-500">Avance/Arriéré</label><input type="number" value={formData[currentSite].adjustment || ''} onChange={(e) => handleInputChange('adjustment', e.target.value)} className="w-full text-sm p-2 border rounded" /></div>
               </div>
            </div>

            <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center
               ${isBT ? 'bg-red-700 hover:bg-red-800 shadow-red-700/20' : 'bg-blue-700 hover:bg-blue-800 shadow-blue-700/20'}`}>
               <Save size={20} className="mr-2" /> Valider Relevé
            </button>
          </form>
          
          {/* Config Zone (RESTAURO DE LA CONFIGURATION MT COMPLETE) */}
          <div className="bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
             <button onClick={() => setIsConfigUnlocked(!isConfigUnlocked)} className="w-full px-6 py-3 flex justify-between items-center text-xs font-bold text-slate-500 uppercase hover:bg-slate-200">
               <span><Settings size={14} className="inline mr-2" /> Configuration {isBT ? 'BT' : 'MT'}</span>
               {isConfigUnlocked ? <Unlock size={14} className="text-red-500" /> : <Lock size={14} />}
             </button>
             
             {isConfigUnlocked && (
               <div className="p-4 bg-white border-t border-slate-200 animate-in slide-in-from-top-2">
                  {isBT ? (
                     <div className="grid grid-cols-2 gap-4 text-xs">
                        <div><label className="block text-slate-500 font-bold mb-1">Prix kWh BT</label><input type="number" step="0.001" value={globalConfig.unitPriceKwhBT} onChange={(e) => handleGlobalConfigChange('unitPriceKwhBT', e.target.value)} className="border p-2 w-full rounded" /></div>
                        <div><label className="block text-slate-500 font-bold mb-1">Redevance Fixe</label><input type="number" value={globalConfig.fixedFeesBT} onChange={(e) => handleGlobalConfigChange('fixedFeesBT', e.target.value)} className="border p-2 w-full rounded" /></div>
                        <div><label className="block text-slate-500 font-bold mb-1">Taxe CL (Taux)</label><input type="number" step="0.001" value={globalConfig.taxCLRate} onChange={(e) => handleGlobalConfigChange('taxCLRate', e.target.value)} className="border p-2 w-full rounded" /></div>
                        <div><label className="block text-slate-500 font-bold mb-1">FTE Elec (Taux)</label><input type="number" step="0.001" value={globalConfig.taxFTERate} onChange={(e) => handleGlobalConfigChange('taxFTERate', e.target.value)} className="border p-2 w-full rounded" /></div>
                        <div><label className="block text-slate-500 font-bold mb-1">Services</label><input type="number" value={globalConfig.servicesBT} onChange={(e) => handleGlobalConfigChange('servicesBT', e.target.value)} className="border p-2 w-full rounded" /></div>
                        <div><label className="block text-slate-500 font-bold mb-1">FTE Gaz</label><input type="number" value={globalConfig.fteGazBT} onChange={(e) => handleGlobalConfigChange('fteGazBT', e.target.value)} className="border p-2 w-full rounded" /></div>
                     </div>
                  ) : (
                     // Configuration MT Étendue (Restaurée)
                     <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded border">
                            <h4 className="font-bold text-blue-700 text-xs mb-2 uppercase">Paramètres Spécifiques Site</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-slate-500 text-xs font-bold mb-1">Puissance Souscrite (kVA)</label><input type="number" value={siteConfigs[currentSite].subscribedPower} onChange={(e) => handleSiteConfigChange('subscribedPower', e.target.value)} className="border p-2 w-full rounded text-sm" /></div>
                                <div><label className="block text-slate-500 text-xs font-bold mb-1">Pertes à Vide (kWh)</label><input type="number" value={siteConfigs[currentSite].emptyLosses} onChange={(e) => handleSiteConfigChange('emptyLosses', e.target.value)} className="border p-2 w-full rounded text-sm" /></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border">
                            <h4 className="font-bold text-blue-700 text-xs mb-2 uppercase">Tarification Globale MT</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-slate-500 text-xs font-bold mb-1">Prix Énergie (DT/kWh)</label><input type="number" step="0.001" value={globalConfig.unitPriceKwh} onChange={(e) => handleGlobalConfigChange('unitPriceKwh', e.target.value)} className="border p-2 w-full rounded text-sm" /></div>
                                <div><label className="block text-slate-500 text-xs font-bold mb-1">Prix Puissance (DT/kVA)</label><input type="number" step="0.001" value={globalConfig.powerUnitPrice} onChange={(e) => handleGlobalConfigChange('powerUnitPrice', e.target.value)} className="border p-2 w-full rounded text-sm" /></div>
                                <div><label className="block text-slate-500 text-xs font-bold mb-1">TVA (%)</label><input type="number" value={globalConfig.vatRate} onChange={(e) => handleGlobalConfigChange('vatRate', e.target.value)} className="border p-2 w-full rounded text-sm" /></div>
                                <div><label className="block text-slate-500 text-xs font-bold mb-1">RTT (DT)</label><input type="number" value={globalConfig.rtt} onChange={(e) => handleGlobalConfigChange('rtt', e.target.value)} className="border p-2 w-full rounded text-sm" /></div>
                            </div>
                        </div>
                     </div>
                  )}
               </div>
             )}
          </div>
        </div>

        {/* Colonne Droite : Ticket (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
           {/* ... (Affichage Ticket et Historique avec Restaurations ci-dessous) ... */}
           <div className={`bg-white p-6 rounded-xl shadow-lg border transition-all duration-300 relative overflow-hidden
             ${isBT ? 'border-red-200 ring-2 ring-red-50' : 'border-blue-200 ring-2 ring-blue-50'}`}>
             
             {/* Filigrane */}
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                {isBT ? <Sun size={100} /> : <Zap size={100} />}
             </div>

             {/* Entête Ticket */}
             <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4 mb-4">
               <div>
                 <h3 className={`text-sm font-bold uppercase ${isBT ? 'text-red-700' : 'text-blue-600'}`}>
                   {displayMetrics ? (isBT ? "FACTURE BT / PV" : "FACTURE MT") : "-"}
                 </h3>
                 <p className="text-xs text-slate-400">{currentSiteObj.name}</p>
               </div>
               <div className="text-right">
                 <p className="text-xs text-slate-400">{formData[currentSite].date}</p>
               </div>
             </div>

             {/* Corps Ticket (Détail Complet Restauré) */}
             <div className="space-y-3 text-sm">
                
                {isBT ? (
                   // --- TICKET BT ---
                   <>
                     <div className="pb-3 border-b border-slate-50 border-dashed space-y-2">
                        <div className="flex justify-between text-slate-600"><span>Conso Réseau</span><span className="font-mono">{formatNumber(displayMetrics.consumptionGrid)} kWh</span></div>
                        <div className="flex justify-between text-orange-600"><span>Prod Photovoltaïque</span><span className="font-mono">-{formatNumber(displayMetrics.productionPv)} kWh</span></div>
                        <div className="flex justify-between text-slate-500 text-xs bg-slate-50 p-1 rounded"><span>Solde N-1</span><span className="font-mono">{formatNumber(displayMetrics.prevBalance)} kWh</span></div>
                        <div className={`flex justify-between font-bold p-2 rounded ${displayMetrics.totalBalance > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}><span>Solde Final</span><span>{formatNumber(displayMetrics.totalBalance)} kWh</span></div>
                        {displayMetrics.totalBalance <= 0 ? (
                            <div className="text-xs text-center text-emerald-600 italic">Crédit reporté : {formatNumber(displayMetrics.newCarryOver)} kWh</div>
                        ) : (
                            <div className="flex justify-between text-slate-800 font-bold border-t pt-2"><span>Facturé ({formatNumber(displayMetrics.billedKwh)} kWh)</span><span>{formatMoney(displayMetrics.consoAmountHT)}</span></div>
                        )}
                     </div>
                     <div className="pb-3 border-b border-slate-50 border-dashed text-xs text-slate-600 space-y-1">
                        <div className="flex justify-between"><span>Redevances Fixes</span><span>{formatMoney(displayMetrics.fixedAmountHT)}</span></div>
                        <div className="flex justify-between font-bold text-slate-800 pt-1"><span>Total HT</span><span>{formatMoney(displayMetrics.consoAmountHT + displayMetrics.fixedAmountHT)}</span></div>
                     </div>
                     <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between"><span>TVA (19%)</span><span>{formatMoney(displayMetrics.totalTTC - (displayMetrics.consoAmountHT + displayMetrics.fixedAmountHT))}</span></div>
                        <div className="flex justify-between"><span>Contrib. CL</span><span>{formatMoney(displayMetrics.contributionCL)}</span></div>
                        <div className="flex justify-between"><span>FTE Elec</span><span>{formatMoney(displayMetrics.fteElec)}</span></div>
                        <div className="flex justify-between"><span>RTT</span><span>{formatMoney(globalConfig.rtt)}</span></div>
                     </div>
                   </>
                ) : (
                   // --- TICKET MT (Restauré avec Total 1/2 etc) ---
                   <>
                     <div className="pb-3 border-b border-slate-50 border-dashed">
                       <div className="flex justify-between text-slate-600"><span>Énergie Enregistrée</span><span className="font-mono">{formatNumber(displayMetrics.energyRecorded)} kWh</span></div>
                       <div className="flex justify-between text-slate-500 text-xs pl-2"><span>+ Pertes (Vide+Charge)</span><span className="font-mono">{formatNumber(displayMetrics.billedKwh - displayMetrics.energyRecorded)}</span></div>
                       <div className="flex justify-between font-bold text-slate-700 mt-1 bg-slate-50 px-2 py-1 rounded"><span>Facturé ({formatNumber(displayMetrics.billedKwh)} kWh)</span><span>{formatMoney(displayMetrics.baseEnergyAmountHT)}</span></div>
                     </div>
                     <div className="pb-3 border-b border-slate-50 border-dashed">
                        <div className="flex justify-between text-xs text-slate-500"><span>Ajustement Cos φ</span><span>{displayMetrics.adjustmentType}</span></div>
                        <div className={`flex justify-between font-bold ${displayMetrics.cosPhiAdjustmentAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}><span>{displayMetrics.adjustmentRate > 0 ? '+' : ''}{(displayMetrics.adjustmentRate*100).toFixed(1)}%</span><span>{formatMoney(displayMetrics.cosPhiAdjustmentAmount)}</span></div>
                     </div>
                     <div className="flex justify-between font-bold text-slate-800 bg-blue-50 p-2 rounded"><span>Total 1 (Énergie + Bonif/Pénalité)</span><span>{formatMoney(displayMetrics.total1_HT)}</span></div>
                     <div className="flex justify-between text-xs text-slate-500 pt-1"><span>Dont TVA (19%)</span><span>{formatMoney(displayMetrics.total1_TTC - displayMetrics.total1_HT)}</span></div>
                     <div className="text-xs text-slate-500 pt-2 space-y-1 border-t mt-2">
                        <div className="flex justify-between"><span>Prime Puissance Fixe</span><span>{formatMoney(displayMetrics.powerPremium)}</span></div>
                        <div className="flex justify-between font-bold text-slate-700"><span>Total 2 HT</span><span>{formatMoney(displayMetrics.total2_HT)}</span></div>
                        <div className="flex justify-between"><span>TVA sur Fixe</span><span>{formatMoney(displayMetrics.total2_TTC - displayMetrics.total2_HT)}</span></div>
                        <div className="flex justify-between"><span>RTT</span><span>{formatMoney(globalConfig.rtt)}</span></div>
                        <div className="flex justify-between"><span>Surtaxe Municipale</span><span>{formatMoney(displayMetrics.municipalTax)}</span></div>
                     </div>
                   </>
                )}

                {/* Communs (Retard, etc) - Détail séparé demandé */}
                {(parseFloat(formData[currentSite].lateFees) > 0 || parseFloat(formData[currentSite].relanceFees) > 0 || parseFloat(formData[currentSite].adjustment) !== 0) && (
                   <div className="pt-2 text-xs text-orange-600 border-t border-slate-100 mt-2 space-y-1">
                      {parseFloat(formData[currentSite].lateFees) > 0 && <div className="flex justify-between"><span>Frais de Retard</span><span>{formatMoney(parseFloat(formData[currentSite].lateFees))}</span></div>}
                      {parseFloat(formData[currentSite].relanceFees) > 0 && <div className="flex justify-between"><span>Frais de Relance</span><span>{formatMoney(parseFloat(formData[currentSite].relanceFees))}</span></div>}
                      {parseFloat(formData[currentSite].adjustment) !== 0 && <div className="flex justify-between"><span>Avance / Arriéré</span><span>{formatMoney(parseFloat(formData[currentSite].adjustment))}</span></div>}
                   </div>
                )}
             </div>

             {/* Net à Payer */}
             <div className="mt-6 border-t-2 border-slate-800 pt-4">
               <div className="flex justify-between items-end">
                 <span className="text-lg font-black text-slate-900 uppercase">Net à Payer</span>
                 <span className={`text-3xl font-black font-mono tracking-tight ${isBT ? 'text-red-700' : 'text-blue-700'}`}>
                   {formatMoney(displayMetrics.netToPay)}
                 </span>
               </div>
             </div>
           </div>
           
           {/* Historique Avancé (Restauré avec cartes détaillées) */}
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
             <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center justify-between">
               <span className="flex items-center"><History size={12} className="mr-1" /> Historique {currentSiteObj.name}</span>
               <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">{siteLogs.length} relevés</span>
             </h3>
             <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {siteLogs.length === 0 ? <div className="h-full flex items-center justify-center text-slate-300 text-xs">Aucun historique</div> : 
                  siteLogs.map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors group relative">
                      <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-700 text-xs flex items-center"><Calendar size={10} className="mr-1 text-slate-400" /> {log.recordDate}</span>
                        <span className={`font-mono font-bold text-sm ${log.siteType === 'BT' ? 'text-red-700' : 'text-blue-700'}`}>{formatMoney(log.netToPay)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 mt-1">
                         <div className="flex justify-between"><span className="text-slate-400">Ancien</span><span className="font-mono">{formatInputDisplay(log.lastIndex)}</span></div>
                         <div className="flex justify-between"><span className="text-slate-400">Nouveau</span><span className="font-mono">{formatInputDisplay(log.newIndex)}</span></div>
                      </div>

                      {log.siteType === 'BT' ? (
                         <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] space-y-1">
                            <div className="flex justify-between text-orange-600"><span>Prod PV</span><span className="font-mono">{formatNumber(log.productionPv)}</span></div>
                            <div className="flex justify-between"><span>Solde Final</span><span className="font-mono font-bold">{formatNumber(log.totalBalance)}</span></div>
                         </div>
                      ) : (
                         <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 border-t border-slate-200 pt-2 mt-2">
                            <div className="flex flex-col"><span className="uppercase text-[9px] text-slate-400">P. Sousc.</span><span className="font-mono font-semibold">{log.subscribedPowerRef} kVA</span></div>
                            <div className="flex flex-col text-center"><span className="uppercase text-[9px] text-slate-400">Cos φ</span><span className={`font-mono font-semibold ${log.cosPhi < 0.8 ? 'text-red-500' : 'text-emerald-600'}`}>{log.cosPhi}</span></div>
                            <div className="flex flex-col text-right"><span className="uppercase text-[9px] text-slate-400">P. Max</span><span className="font-mono font-semibold">{log.maxPower} kVA</span></div>
                         </div>
                      )}
                  </div>
                ))}
             </div>
           </div>

        </div>

      </main>
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-medium flex items-center animate-bounce-short z-50
          ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'}`}>
          {notification.type === 'error' ? <AlertTriangle className="mr-2" /> : <CheckCircle2 className="mr-2" />}
          {notification.msg}
        </div>
      )}
    </div>
  );
};

// ==================================================================================
// MODULE 2 : GESTION AIR COMPRIMÉ (Mis à jour V4 Maintenance)
// ==================================================================================

const AirModule = ({ onBack }) => {
  const [activeCompressor, setActiveCompressor] = useState(1);
  const [logs, setLogs] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showMaintPopup, setShowMaintPopup] = useState(null); // null ou type de maintenance
  const [editingPrev, setEditingPrev] = useState(null); // Permet d'éditer l'index précédent
  const [config, setConfig] = useState({
      elecPrice: 0.291, // Prix Moyen HT
      offLoadFactor: 0.3 // 30% puissance à vide
  });
  
  // Compresseurs configurés (Mégrine)
  const COMPRESSORS = [
    { id: 1, name: "Compresseur 1", serial: "CAI 827281", model: "Ceccato CSB 30", power: 22 },
    { id: 2, name: "Compresseur 2", serial: "CAI 808264", model: "Ceccato CSB 30", power: 22 }
  ];

  // Données de formulaire (Hebdomadaire) & Compteurs Maintenance (enregistrés en dur)
  // On stocke le dernier index auquel la maintenance a été faite pour chaque type
  const [formData, setFormData] = useState({
    1: { 
        weekDate: '', description: '', 
        lastRun: 19960, newRun: '', 
        lastLoad: 10500, newLoad: '', 
        lastMaintOilFilter: 18000, 
        lastMaintAirFilter: 18000, 
        lastMaintSeparator: 16000,
        lastMaintOil: 18000,
        lastMaintGeneral: 19500 
    },
    2: { 
        weekDate: '', description: '',
        lastRun: 18500, newRun: '', 
        lastLoad: 9200, newLoad: '', 
        lastMaintOilFilter: 16000, 
        lastMaintAirFilter: 16000, 
        lastMaintSeparator: 14000,
        lastMaintOil: 16000,
        lastMaintGeneral: 18000 
    }
  });

  // Intervalles Maintenance (Heures)
  const MAINT_INTERVALS = {
      oilFilter: 2000,
      airFilter: 2000,
      separator: 4000,
      oil: 2000,
      general: 500 // Inspection mensuelle
  };

  const MAINT_LABELS = {
      oilFilter: "Filtre à Huile",
      airFilter: "Filtre à Air",
      separator: "Séparateur Huile",
      oil: "Huile",
      general: "Inspection Générale"
  };

  const [notif, setNotif] = useState(null);

  // Initialisation Date Semaine
  useEffect(() => {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(monday.getDate() - monday.getDay() + 1); // Lundi courant
      const dateStr = monday.toISOString().split('T')[0];
      
      setFormData(prev => ({
          ...prev,
          1: { ...prev[1], weekDate: dateStr },
          2: { ...prev[2], weekDate: dateStr }
      }));
  }, []);

  const handleInput = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [activeCompressor]: { ...prev[activeCompressor], [field]: value }
    }));
  };

  const calculateKPIs = () => {
    const data = formData[activeCompressor];
    const comp = COMPRESSORS.find(c => c.id === activeCompressor);
    
    const runDelta = Math.max(0, (parseFloat(data.newRun)||0) - (parseFloat(data.lastRun)||0));
    const loadDelta = Math.max(0, (parseFloat(data.newLoad)||0) - (parseFloat(data.lastLoad)||0));
    
    // Taux de charge (%)
    const loadRate = runDelta > 0 ? (loadDelta / runDelta) * 100 : 0;
    
    // Taux Utilisation (Base 5j * 9.5h = 47.5h)
    const theoryHours = 47.5;
    const utilRate = (runDelta / theoryHours) * 100;

    // Coût Énergie
    const offLoadHours = Math.max(0, runDelta - loadDelta);
    const energyKwh = (loadDelta * comp.power) + (offLoadHours * comp.power * config.offLoadFactor);
    const costHT = energyKwh * config.elecPrice;

    // Maintenance Calculs (Heures Restantes)
    const currentTotal = parseFloat(data.newRun) || parseFloat(data.lastRun) || 0;
    
    const maintStatus = {};
    Object.keys(MAINT_INTERVALS).forEach(key => {
        // Dernier index fait + intervalle = Prochain index dû
        const lastDone = data[`lastMaint${key.charAt(0).toUpperCase() + key.slice(1)}`] || 0;
        const nextDue = lastDone + MAINT_INTERVALS[key];
        const remaining = nextDue - currentTotal;
        maintStatus[key] = { remaining, nextDue };
    });

    return { runDelta, loadDelta, loadRate, utilRate, energyKwh, costHT, maintStatus };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const kpis = calculateKPIs();
    const data = formData[activeCompressor];
    
    if(!data.newRun || !data.newLoad) {
        setNotif("Veuillez remplir les nouveaux index.");
        return;
    }

    const newLog = {
      id: Date.now(),
      type: 'WEEKLY_REPORT',
      weekDate: data.weekDate,
      compName: COMPRESSORS.find(c => c.id === activeCompressor).name,
      description: data.description,
      ...data,
      ...kpis
    };

    setLogs([newLog, ...logs]);
    setNotif("Relevé Hebdomadaire enregistré !");
    
    // Mise à jour des index pour la semaine prochaine
    setFormData(prev => ({
        ...prev,
        [activeCompressor]: { 
            ...prev[activeCompressor], 
            lastRun: data.newRun, // Le nouveau devient l'ancien
            newRun: '',
            lastLoad: data.newLoad,
            newLoad: '',
            description: '' // Reset description
        }
    }));
    
    setTimeout(() => setNotif(null), 3000);
  };

  // Enregistrement d'une maintenance faite
  const handleMaintenanceDone = (type, details) => {
      const currentRun = parseFloat(formData[activeCompressor].newRun) || parseFloat(formData[activeCompressor].lastRun);
      
      // Mettre à jour le compteur de dernière maintenance
      setFormData(prev => ({
          ...prev,
          [activeCompressor]: {
              ...prev[activeCompressor],
              [`lastMaint${type.charAt(0).toUpperCase() + type.slice(1)}`]: currentRun
          }
      }));

      // Ajouter au log
      const newLog = {
          id: Date.now(),
          type: 'MAINTENANCE',
          date: new Date().toLocaleDateString(),
          compName: COMPRESSORS.find(c => c.id === activeCompressor).name,
          maintType: MAINT_LABELS[type],
          indexDone: currentRun,
          details: details
      };
      setLogs([newLog, ...logs]);
      setNotif("Maintenance enregistrée avec succès !");
      setShowMaintPopup(null);
      setTimeout(() => setNotif(null), 3000);
  };

  const currentData = formData[activeCompressor];
  const kpis = calculateKPIs();
  const currentComp = COMPRESSORS.find(c => c.id === activeCompressor);

  // Maintenance Color Helper
  const getStatusColor = (remaining) => {
      if (remaining <= 0) return 'text-red-600 font-bold';
      if (remaining < 200) return 'text-orange-600 font-bold';
      return 'text-emerald-600';
  };

  // Icône Maintenance
  const getStatusIcon = (remaining) => {
      if (remaining <= 0) return <AlertCircle size={16} className="text-red-600" />;
      if (remaining < 200) return <AlertTriangle size={16} className="text-orange-600" />;
      return <CheckCircle2 size={16} className="text-emerald-500" />;
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
        <header className="bg-gradient-to-r from-sky-700 to-blue-800 text-white shadow-lg sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-4 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 rounded-lg"><Wind size={24} /></div>
                        <div>
                            <h1 className="text-xl font-bold">Gestion Air Comprimé</h1>
                            <p className="text-xs text-sky-100">Suivi Hebdomadaire & Maintenance</p>
                        </div>
                    </div>
                </div>
                <button onClick={() => setShowGuide(true)} className="flex items-center bg-white/10 px-3 py-2 rounded text-xs font-bold border border-white/20 hover:bg-white/20"><BookOpen size={14} className="mr-2" /> Procédure ES 3000</button>
            </div>
        </header>

        {/* Modal Guide Relevé ES 3000 (Existant) */}
        {showGuide && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowGuide(false)}>
                {/* Contenu du guide identique... */}
                <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl relative" onClick={e=>e.stopPropagation()}>
                    <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg"><Eye className="mr-2 text-sky-600" /> Relevé Heures - Contrôleur ES 3000</h3>
                    <div className="space-y-6 text-sm text-slate-600">
                        {/* ... */}
                        <p>Contenu du guide ES 3000...</p>
                    </div>
                </div>
            </div>
        )}

        {/* Modal Maintenance Action */}
        {showMaintPopup && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowMaintPopup(null)}>
                <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative" onClick={e=>e.stopPropagation()}>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
                        <CheckSquare className="mr-2 text-emerald-600" /> 
                        Valider Maintenance : {MAINT_LABELS[showMaintPopup]}
                    </h3>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        handleMaintenanceDone(showMaintPopup, {
                            date: formData.get('date'),
                            tech: formData.get('tech'),
                            notes: formData.get('notes')
                        });
                    }}>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Date Intervention</label>
                                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border rounded p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Intervenant (Interne/Externe)</label>
                                <input name="tech" type="text" required placeholder="Ex: Technicien X / Atlas Copco" className="w-full border rounded p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Notes / Pièces changées</label>
                                <textarea name="notes" className="w-full border rounded p-2 text-sm" rows="3" placeholder="Détails..."></textarea>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowMaintPopup(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded text-sm">Annuler</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-bold">Confirmer</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Colonne Gauche : Sélection & Saisie (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
                {/* Sélecteur Compresseur */}
                <div className="grid grid-cols-2 gap-4">
                    {COMPRESSORS.map(comp => (
                        <button 
                            key={comp.id}
                            onClick={() => setActiveCompressor(comp.id)}
                            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group
                                ${activeCompressor === comp.id 
                                ? 'bg-white border-sky-500 ring-2 ring-sky-200 shadow-md' 
                                : 'bg-white border-slate-200 hover:border-sky-300'}`}
                        >
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <div>
                                    <span className="font-bold text-slate-700 block">{comp.name}</span>
                                    <span className="text-xs text-slate-400">{comp.serial}</span>
                                </div>
                                {activeCompressor === comp.id && <CheckCircle2 size={20} className="text-sky-600" />}
                            </div>
                            <div className="flex gap-2 mt-2 relative z-10">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border">{comp.model}</span>
                                <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-1 rounded border border-sky-200">{comp.power} kW</span>
                            </div>
                            {activeCompressor === comp.id && <div className="absolute bottom-0 right-0 p-2 opacity-10"><Wind size={60} className="text-sky-600" /></div>}
                        </button>
                    ))}
                </div>

                {/* Formulaire Saisie */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center"><Timer className="mr-2 text-sky-600" /> Saisie Hebdomadaire</h2>
                        <div className="flex items-center bg-slate-100 rounded px-2 py-1">
                            <Calendar size={14} className="text-slate-400 mr-2" />
                            <input type="date" value={currentData.weekDate} onChange={(e) => handleInput('weekDate', e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Heures Marche */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><Clock size={12} className="mr-1" /> Marche Total (H)</h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-slate-500">Index Précédent</label>
                                        <Edit2 size={12} className="text-slate-400 cursor-pointer hover:text-sky-600" onClick={() => setEditingPrev('run')} />
                                    </div>
                                    <input 
                                        type="number" 
                                        value={currentData.lastRun} 
                                        onChange={(e) => handleInput('lastRun', e.target.value)} 
                                        readOnly={editingPrev !== 'run'}
                                        className={`w-full border rounded p-2 text-sm font-mono 
                                            ${editingPrev === 'run' ? 'bg-white border-sky-300' : 'bg-red-50 text-red-800 border-red-100'}`} 
                                    />
                                    {editingPrev !== 'run' && <p className="text-[9px] text-red-400 mt-1 flex items-center"><Lock size={8} className="mr-1"/> Ne pas changer sauf erreur</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-sky-700 mb-1">Nouvel Index *</label>
                                    <input type="number" value={currentData.newRun} onChange={(e) => handleInput('newRun', e.target.value)} className="w-full border-2 border-sky-200 focus:border-sky-500 rounded p-2 text-lg font-mono outline-none" placeholder="ex: 20101" />
                                </div>
                                {kpis.runDelta > 0 && <div className="text-right text-xs font-bold text-sky-600">Fonctionnement: {kpis.runDelta}h</div>}
                            </div>
                        </div>

                        {/* Heures Charge */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><Zap size={12} className="mr-1" /> En Charge (H)</h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-slate-500">Index Précédent</label>
                                        <Edit2 size={12} className="text-slate-400 cursor-pointer hover:text-sky-600" onClick={() => setEditingPrev('load')} />
                                    </div>
                                    <input 
                                        type="number" 
                                        value={currentData.lastLoad} 
                                        onChange={(e) => handleInput('lastLoad', e.target.value)} 
                                        readOnly={editingPrev !== 'load'}
                                        className={`w-full border rounded p-2 text-sm font-mono 
                                            ${editingPrev === 'load' ? 'bg-white border-sky-300' : 'bg-red-50 text-red-800 border-red-100'}`} 
                                    />
                                    {editingPrev !== 'load' && <p className="text-[9px] text-red-400 mt-1 flex items-center"><Lock size={8} className="mr-1"/> Ne pas changer sauf erreur</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-emerald-700 mb-1">Nouvel Index *</label>
                                    <input type="number" value={currentData.newLoad} onChange={(e) => handleInput('newLoad', e.target.value)} className="w-full border-2 border-emerald-200 focus:border-emerald-500 rounded p-2 text-lg font-mono outline-none" placeholder="ex: 10600" />
                                </div>
                                {kpis.loadDelta > 0 && <div className="text-right text-xs font-bold text-emerald-600">Charge: {kpis.loadDelta}h</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Colonne Droite : KPIs & Maintenance (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Carte Analyse & Validation */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase flex items-center"><TrendingUp size={16} className="mr-2 text-sky-500" /> Analyse Semaine</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Taux Charge */}
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Taux de Charge</div>
                            <div className="font-bold text-slate-800 text-lg">{kpis.loadRate.toFixed(1)}%</div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${kpis.loadRate}%` }}></div>
                            </div>
                        </div>

                        {/* Taux Utilisation */}
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Taux Utilisation (47.5h)</div>
                            <div className={`font-bold text-lg ${kpis.utilRate > 100 ? 'text-red-500' : 'text-slate-800'}`}>{kpis.utilRate.toFixed(1)}%</div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                                <div className={`h-1.5 rounded-full ${kpis.utilRate > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, kpis.utilRate)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Coût Estime */}
                    <div className="bg-slate-50 p-3 rounded border border-slate-100 mb-4 flex justify-between items-end">
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Coût Élec. Est.</div>
                            <div className="text-[9px] text-slate-400">HTVA</div>
                        </div>
                        <div className="font-bold text-slate-800 text-xl">{kpis.costHT.toFixed(0)} <span className="text-xs font-normal">DT</span></div>
                    </div>

                    {/* Note / Justification */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Note / Justification (Augmentation, Fuite...)</label>
                        <textarea 
                            className="w-full border border-slate-300 rounded p-2 text-sm focus:border-sky-500 outline-none" 
                            rows="2" 
                            placeholder="Ex: Fuite détectée lundi, production exceptionnelle..."
                            value={currentData.description || ''}
                            onChange={(e) => handleInput('description', e.target.value)}
                        ></textarea>
                    </div>

                    <button onClick={handleSubmit} className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center">
                        <Save size={18} className="mr-2" /> Valider Semaine
                    </button>
                </div>

                {/* Carte Maintenance Détaillée Améliorée */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase flex items-center"><Wrench size={16} className="mr-2 text-amber-500" /> Maintenance Prédictive</h3>
                    
                    <div className="space-y-4">
                        {Object.keys(MAINT_INTERVALS).map(key => (
                            <div key={key} className="flex flex-col p-3 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-bold text-slate-800">{MAINT_LABELS[key]}</div>
                                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Chaque {MAINT_INTERVALS[key]}h</div>
                                </div>
                                
                                <div className="mb-2">
                                    <div className={`text-xs font-bold mb-1 ${getStatusColor(kpis.maintStatus[key].remaining)}`}>
                                        État : {kpis.maintStatus[key].remaining <= 0 
                                            ? `${Math.abs(kpis.maintStatus[key].remaining)}h de dépassement !` 
                                            : `${kpis.maintStatus[key].remaining}h restant sur l'intervention`}
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${kpis.maintStatus[key].remaining < 0 ? 'bg-red-600' : (kpis.maintStatus[key].remaining < 200 ? 'bg-red-500' : (kpis.maintStatus[key].remaining < 500 ? 'bg-orange-400' : 'bg-emerald-400'))}`} 
                                            style={{ width: `${Math.max(0, Math.min(100, (kpis.maintStatus[key].remaining / MAINT_INTERVALS[key]) * 100))}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setShowMaintPopup(key)}
                                    className="w-full mt-1 bg-slate-800 hover:bg-slate-700 text-white text-xs py-2 rounded flex items-center justify-center transition-colors"
                                >
                                    <CheckSquare size={12} className="mr-2" /> Faire la maintenance
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Historique Rapide */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 h-[300px] flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Historique</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {logs.filter(l => l.compName === currentComp.name).length === 0 ? <div className="h-full flex items-center justify-center text-slate-300 text-xs">Aucune donnée</div> : 
                        logs.filter(l => l.compName === currentComp.name).sort((a,b)=>b.id-a.id).map(log => (
                            <div key={log.id} className={`p-2 border rounded text-xs ${log.type === 'MAINTENANCE' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                {log.type === 'MAINTENANCE' ? (
                                    <>
                                        <div className="flex justify-between font-bold text-emerald-800 mb-1">
                                            <span><Wrench size={10} className="inline mr-1"/> Maintenance</span>
                                            <span>{log.date}</span>
                                        </div>
                                        <div className="text-emerald-700">{log.maintType} fait à {log.indexDone}h</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between font-bold text-slate-700 mb-1">
                                            <span>Semaine {log.weekDate}</span>
                                            <span className="text-sky-700">{log.costHT.toFixed(0)} DT</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500 mb-1">
                                            <span>Conso: {log.energyKwh.toFixed(0)} kWh</span>
                                            <span>Run: {log.runDelta}h</span>
                                        </div>
                                        {log.description && (
                                            <div className="text-[10px] text-slate-400 italic border-t border-slate-200 pt-1 mt-1">
                                                "{log.description}"
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>

        {notif && (
            <div className="fixed bottom-6 right-6 px-6 py-4 bg-sky-600 text-white rounded-xl shadow-xl animate-bounce-short z-50">
                {notif}
            </div>
        )}
    </div>
  );
};

// ==================================================================================
// MODULE 3 : TABLEAU DE BORD SITES
// ==================================================================================

const SitesDashboard = ({ onBack }) => {
  const [activeSiteTab, setActiveSiteTab] = useState('MEGRINE');

  // Données Sites
  const SITES_DATA = {
    MEGRINE: {
      name: "Mégrine",
      area: 32500,
      covered: 30000,
      open: 2500,
      details: "Showroom 1000m² • Atelier FIAT 10000m² • Atelier IVECO 9000m² • ITALCAR Gros 10000m²",
      energyMix: [
        { name: "Électricité", value: 97, color: "#3b82f6" },
        { name: "Gaz", value: 3, color: "#f97316" }
      ],
      elecUsage: [
        { name: "Éclairage", value: 27, kpi: "kWh/m²", significant: true },
        { name: "CVC (Clim/Chauff)", value: 40, kpi: "kWh/m²", significant: true },
        { name: "Air Comprimé", value: 17, kpi: "kWh/Nm³", significant: true },
        { name: "Informatique", value: 8, kpi: "kWh/Poste", significant: false },
        { name: "Services", value: 5, kpi: "-", significant: false },
        { name: "Gaz (Four)", value: 3, kpi: "kWh/Véhicule", significant: true }
      ]
    },
    ELKHADHRA: {
      name: "El Khadhra",
      area: 9500,
      covered: 7000,
      open: 2500,
      details: "Réception 1000m² • Atelier FIAT 3000m² • ITALCAR Gros 3000m²",
      energyMix: [{ name: "Électricité", value: 100, color: "#3b82f6" }],
      elecUsage: [
        { name: "CVC (Clim/Chauff)", value: 61, kpi: "kWh/m²", significant: true },
        { name: "Éclairage", value: 23, kpi: "kWh/m²", significant: true },
        { name: "Air Comprimé", value: 6, kpi: "kWh/Nm³", significant: true },
        { name: "Informatique", value: 5, kpi: "kWh/Poste", significant: false },
        { name: "Services", value: 5, kpi: "-", significant: false }
      ]
    },
    NAASSEN: {
      name: "Naassen",
      area: 32500,
      covered: 1820,
      open: 30680,
      details: "Admin 920m² • Atelier 900m² • Parc Neuf 30680m²",
      energyMix: [{ name: "Électricité", value: 100, color: "#3b82f6" }],
      elecUsage: [
        { name: "Éclairage (Int+Ext)", value: 78, kpi: "kWh/m²", significant: true },
        { name: "CVC", value: 14, kpi: "kWh/m²", significant: false },
        { name: "Air Comprimé", value: 5, kpi: "kWh/Nm³", significant: false },
        { name: "Services", value: 2, kpi: "-", significant: false },
        { name: "Informatique", value: 1, kpi: "-", significant: false }
      ]
    },
    LAC: {
      name: "Lac",
      area: 2050,
      covered: 850,
      open: 1200,
      details: "Showroom 850m² • Espace Ouvert 1200m²",
      energyMix: [{ name: "Électricité", value: 100, color: "#3b82f6" }],
      elecUsage: [
        { name: "Éclairage", value: 58, kpi: "kWh/m²", significant: true },
        { name: "CVC", value: 36, kpi: "kWh/m²", significant: true },
        { name: "Informatique", value: 3, kpi: "-", significant: false },
        { name: "Services", value: 3, kpi: "-", significant: false }
      ]
    }
  };

  const currentData = SITES_DATA[activeSiteTab];

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
       <header className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-lg sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full mr-4 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 rounded-lg"><LayoutGrid size={24} /></div>
                        <div>
                            <h1 className="text-xl font-bold">Tableau de Bord Sites</h1>
                            <p className="text-xs text-emerald-100">Indicateurs & Performance Énergétique</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                    <Thermometer size={16} className="mr-2 text-yellow-300" />
                    <div className="text-xs">
                        <span className="block opacity-70">Temp. Moyenne 2024</span>
                        <span className="font-bold">19.5 °C</span>
                    </div>
                </div>
            </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
            
            {/* Navigation Sites */}
            <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
                {Object.keys(SITES_DATA).map(key => (
                    <button
                        key={key}
                        onClick={() => setActiveSiteTab(key)}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                            ${activeSiteTab === key 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                            : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                        {SITES_DATA[key].name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. CARTE D'IDENTITÉ SITE */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center"><Building2 size={16} className="mr-2" /> Fiche Technique</h3>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                                <span className="text-slate-600 text-sm">Superficie Totale</span>
                                <span className="text-2xl font-black text-slate-800">{currentData.area.toLocaleString()} <span className="text-sm font-normal text-slate-400">m²</span></span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <div className="flex items-center text-xs text-slate-500 mb-1"><Maximize2 size={12} className="mr-1"/> Couvert</div>
                                    <div className="font-bold text-slate-700">{currentData.covered.toLocaleString()} m²</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <div className="flex items-center text-xs text-slate-500 mb-1"><Minimize2 size={12} className="mr-1"/> Ouvert</div>
                                    <div className="font-bold text-slate-700">{currentData.open.toLocaleString()} m²</div>
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100 leading-relaxed">
                                <span className="font-bold text-blue-700 block mb-1">Détails Zones :</span>
                                {currentData.details}
                            </div>
                        </div>
                    </div>

                    {/* Mix Énergétique */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Mix Énergétique</h3>
                        <div className="flex h-4 rounded-full overflow-hidden mb-4">
                            {currentData.energyMix.map((source, idx) => (
                                <div key={idx} style={{ width: `${source.value}%`, backgroundColor: source.color }} title={source.name}></div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-600">
                            {currentData.energyMix.map((source, idx) => (
                                <div key={idx} className="flex items-center">
                                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: source.color }}></div>
                                    {source.name} : {source.value}%
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. RÉPARTITION USAGES */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 flex items-center"><PieChart size={16} className="mr-2" /> Répartition des Consommations</h3>
                        
                        <div className="space-y-3">
                            {currentData.elecUsage.map((usage, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center w-1/3">
                                        {usage.significant && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2" title="Usage Significatif"></div>}
                                        <span className={`text-sm ${usage.significant ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{usage.name}</span>
                                    </div>
                                    
                                    <div className="flex-1 px-4">
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${usage.significant ? 'bg-emerald-500' : 'bg-slate-400'}`} 
                                                style={{ width: `${usage.value}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="w-32 flex justify-end items-center text-right">
                                        <span className="font-bold text-slate-700 mr-3">{usage.value}%</span>
                                        <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200 min-w-[70px] text-center">
                                            {usage.kpi}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-6 flex items-center justify-end text-xs text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span> Usage Énergétique Significatif (UES)
                        </div>
                    </div>

                    {/* Comparaison & Historique (Simulé) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Performance vs N-1</h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-3xl font-black text-slate-800">12 450 <span className="text-sm font-normal text-slate-400">kWh</span></div>
                                    <div className="text-xs text-emerald-600 font-bold flex items-center mt-1"><TrendingDown size={14} className="mr-1"/> -4.2% vs Réf.</div>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                    <Leaf size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Ratio Global Annuel</h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-3xl font-black text-slate-800">45.2 <span className="text-sm font-normal text-slate-400">TEP</span></div>
                                    <div className="text-xs text-slate-500 mt-1">Total Équivalent Pétrole</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-blue-600">142</div>
                                    <div className="text-[10px] text-slate-400 uppercase">kWh/m²/an</div>
                                </div>
                            </div>
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
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
        </div>

        <div className="z-10 text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">Système de Gestion Industriel</h1>
            <p className="text-slate-400 text-lg">Choisissez un module pour commencer</p>
        </div>

        <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
            
            {/* Carte Module Énergie */}
            <button onClick={() => onNavigate('steg')} className="group relative bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 rounded-3xl p-6 transition-all text-left">
                <div className="absolute top-4 right-4 bg-blue-500/20 p-2 rounded-xl text-blue-400"><Zap size={24} /></div>
                <h2 className="text-xl font-bold mb-2">Énergie & Facturation</h2>
                <p className="text-slate-400 text-xs mb-4 pr-8">Relevés STEG (MT/BT), Calcul Cos φ, Factures.</p>
                <div className="flex items-center text-blue-400 font-bold text-xs">Accéder <ArrowLeft className="ml-1 rotate-180" size={12} /></div>
            </button>

            {/* Carte Module Air Comprimé */}
            <button onClick={() => onNavigate('air')} className="group relative bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-sky-500 rounded-3xl p-6 transition-all text-left">
                <div className="absolute top-4 right-4 bg-sky-500/20 p-2 rounded-xl text-sky-400"><Wind size={24} /></div>
                <h2 className="text-xl font-bold mb-2">Air Comprimé</h2>
                <p className="text-slate-400 text-xs mb-4 pr-8">Suivi Compresseurs, Maintenance Prédictive.</p>
                <div className="flex items-center text-sky-400 font-bold text-xs">Accéder <ArrowLeft className="ml-1 rotate-180" size={12} /></div>
            </button>

            {/* Carte Module Sites Dashboard */}
            <button onClick={() => onNavigate('sites')} className="group relative bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-emerald-500 rounded-3xl p-6 transition-all text-left">
                <div className="absolute top-4 right-4 bg-emerald-500/20 p-2 rounded-xl text-emerald-400"><LayoutGrid size={24} /></div>
                <h2 className="text-xl font-bold mb-2">Tableau de Bord Sites</h2>
                <p className="text-slate-400 text-xs mb-4 pr-8">Superficies, Usages, KPIs et Performance Globale.</p>
                <div className="flex items-center text-emerald-400 font-bold text-xs">Accéder <ArrowLeft className="ml-1 rotate-180" size={12} /></div>
            </button>

        </div>

        <div className="mt-12 text-slate-600 text-xs">
            v4.0.0 • Système Centralisé Mégrine
        </div>
    </div>
  );
};

const App = () => {
  const [currentModule, setCurrentModule] = useState('dashboard'); 

  const navigateTo = (moduleName) => {
    setCurrentModule(moduleName);
  };

  return (
    <>
      {currentModule === 'dashboard' && <MainDashboard onNavigate={navigateTo} />}
      {currentModule === 'steg' && <StegModule onBack={() => navigateTo('dashboard')} />}
      {currentModule === 'air' && <AirModule onBack={() => navigateTo('dashboard')} />}
      {currentModule === 'sites' && <SitesDashboard onBack={() => navigateTo('dashboard')} />}
    </>
  );
};

export default App;
