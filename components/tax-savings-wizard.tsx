'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calculator, 
  DollarSign, 
  Building2, 
  ShoppingBag, 
  ChevronRight, 
  X, 
  AlertTriangle,
  Check,
  Shield,
  Calendar,
  Sparkles,
  ArrowRight,
  Loader2,
  Store,
  HelpCircle,
  FileText
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type RevenueRange = '<20k' | '20k-60k' | '60k-150k' | '150k+' | null;
type BusinessStructure = 'sole-prop' | 'llc' | 'unknown' | null;
type Platform = 'shopify' | 'tiktok' | 'etsy' | 'whatnot' | 'other' | null;

interface WizardData {
  revenue: RevenueRange;
  structure: BusinessStructure;
  platform: Platform;
  email: string;
}

interface SavingsResult {
  min: number;
  max: number;
  nexusRisk: boolean;
  platformSpecificMessage: string;
  currentSETax: number;
  projectedSETax: number;
  profitEstimate: number;
  reasonableSalary: number;
}

// ============================================
// CALCULATION LOGIC
// ============================================

/**
 * S-Corp Tax Savings Calculator
 * 
 * The Problem: Sole Props/Single-Member LLCs pay 15.3% SE tax on 92.35% of net profit
 * Effective SE Tax Rate: 15.3% × 92.35% = 14.13%
 * 
 * The S-Corp Solution: Owner pays SE tax only on "Reasonable Salary"
 * The rest is taken as distributions (0% SE tax)
 * 
 * Formula:
 * Current SE Tax = Net Profit × 0.153 × 0.9235
 * S-Corp SE Tax = Reasonable Salary × 0.153
 * Savings = Current SE Tax - S-Corp SE Tax
 */

interface RevenueConfig {
  avgRevenue: number;
  profitMarginLow: number;
  profitMarginHigh: number;
  salaryPercentLow: number;  // Lower reasonable salary = more savings
  salaryPercentHigh: number; // Higher reasonable salary = less savings
}

const calculateSavings = (data: WizardData): SavingsResult => {
  const SE_TAX_RATE = 0.153;
  const SE_TAX_BASE = 0.9235; // Only 92.35% of profit is subject to SE tax
  
  // Revenue configurations with realistic profit margins and salary allocations
  const revenueConfigs: Record<string, RevenueConfig> = {
    '<20k': { 
      avgRevenue: 15000, 
      profitMarginLow: 0.40, 
      profitMarginHigh: 0.60,
      salaryPercentLow: 0.70,  // Higher salary % needed at low revenue
      salaryPercentHigh: 0.85
    },
    '20k-60k': { 
      avgRevenue: 40000, 
      profitMarginLow: 0.45, 
      profitMarginHigh: 0.65,
      salaryPercentLow: 0.50,
      salaryPercentHigh: 0.70
    },
    '60k-150k': { 
      avgRevenue: 100000, 
      profitMarginLow: 0.50, 
      profitMarginHigh: 0.70,
      salaryPercentLow: 0.35,
      salaryPercentHigh: 0.55
    },
    '150k+': { 
      avgRevenue: 200000, 
      profitMarginLow: 0.55, 
      profitMarginHigh: 0.75,
      salaryPercentLow: 0.25,
      salaryPercentHigh: 0.45
    },
  };

  const config = data.revenue ? revenueConfigs[data.revenue] : null;
  
  if (!config) {
    return {
      min: 0,
      max: 0,
      nexusRisk: false,
      platformSpecificMessage: '',
      currentSETax: 0,
      projectedSETax: 0,
      profitEstimate: 0,
      reasonableSalary: 0,
    };
  }

  // Calculate profit range
  const profitLow = config.avgRevenue * config.profitMarginLow;
  const profitHigh = config.avgRevenue * config.profitMarginHigh;
  
  // Current SE Tax (as Sole Prop/LLC)
  const currentSETaxLow = profitLow * SE_TAX_RATE * SE_TAX_BASE;
  const currentSETaxHigh = profitHigh * SE_TAX_RATE * SE_TAX_BASE;
  
  // S-Corp SE Tax (only on reasonable salary)
  const salaryLow = profitLow * config.salaryPercentHigh; // Higher salary = lower savings (min)
  const salaryHigh = profitHigh * config.salaryPercentLow; // Lower salary = higher savings (max)
  
  const sCorpSETaxMin = salaryLow * SE_TAX_RATE;
  const sCorpSETaxMax = salaryHigh * SE_TAX_RATE;
  
  // Calculate savings range
  let savingsMin = currentSETaxLow - sCorpSETaxMin;
  let savingsMax = currentSETaxHigh - sCorpSETaxMax;
  
  // Ensure minimum savings are positive and reasonable
  savingsMin = Math.max(0, savingsMin);
  savingsMax = Math.max(savingsMin, savingsMax);
  
  // Adjust based on structure - Sole Props have maximum exposure
  let multiplier = 1;
  if (data.structure === 'sole-prop') multiplier = 1.05;
  if (data.structure === 'llc') multiplier = 1.0;
  if (data.structure === 'unknown') multiplier = 0.95; // Conservative estimate

  // Platform-specific messaging with 1099-K details
  const platformMessages: Record<string, string> = {
    shopify: 'Shopify reports ALL seller transactions to the IRS via 1099-K. Without proper reconciliation, your gross sales (including refunds, fees, and shipping) could be taxed as net income.',
    tiktok: 'TikTok Shop triggers 1099-K reporting at just $600. The IRS sees every transaction—and without proper bookkeeping, you may be overpaying by thousands.',
    etsy: 'Etsy issues 1099-Ks that often show inflated income (gross vs. net). StartSmart AI reconciles your actual profit so you only pay tax on what you actually earned.',
    whatnot: 'WhatNot issues 1099-Ks for all sellers exceeding $600. Live selling creates complex transaction records that require automated reconciliation.',
    other: 'Most platforms now report seller income at $600+ to the IRS via 1099-K. Without proper reconciliation, your reported gross can be mistaken for net profit.',
  };

  // Calculate display values for the results breakdown
  const avgProfit = (profitLow + profitHigh) / 2;
  const avgCurrentSETax = (currentSETaxLow + currentSETaxHigh) / 2;
  const avgSCorpSETax = (sCorpSETaxMin + sCorpSETaxMax) / 2;
  const avgSalary = avgProfit * ((config.salaryPercentLow + config.salaryPercentHigh) / 2);

  return {
    min: Math.round(savingsMin * multiplier),
    max: Math.round(savingsMax * multiplier),
    nexusRisk: data.revenue === '60k-150k' || data.revenue === '150k+',
    platformSpecificMessage: data.platform ? platformMessages[data.platform] : platformMessages.other,
    // Additional data for detailed breakdown
    currentSETax: Math.round(avgCurrentSETax),
    projectedSETax: Math.round(avgSCorpSETax),
    profitEstimate: Math.round(avgProfit),
    reasonableSalary: Math.round(avgSalary),
  };
};

// ============================================
// HOOK CARD COMPONENT (Trigger)
// ============================================

const HookCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <div className="tax-wizard-hook-card">
      <div className="hook-card-inner">
        <div className="hook-badge">
          <AlertTriangle size={14} />
          <span>IRS 1099-K Alert</span>
        </div>
        
        <h3 className="hook-title">
          Is your store <span className="text-gradient">leaking money</span> to the IRS?
        </h3>
        
        <p className="hook-description">
          Most e-commerce sellers overpay by $2,000–$8,000/year in self-employment taxes. 
          See your potential savings in 30 seconds.
        </p>
        
        <button className="hook-cta" onClick={onClick}>
          <Calculator size={18} />
          <span>Check My 2026 Tax Leakage</span>
          <ChevronRight size={18} className="cta-arrow" />
        </button>
        
        <div className="hook-stats">
          <div className="stat">
            <Check size={14} />
            <span>847 sellers checked this month</span>
          </div>
        </div>
      </div>
      
      <div className="hook-card-glow" />
    </div>
  );
};

// ============================================
// STICKY BUTTON COMPONENT (Alternative Trigger)
// ============================================

const StickyButton: React.FC<{ onClick: () => void; visible: boolean }> = ({ onClick, visible }) => {
  if (!visible) return null;
  
  return (
    <button className="tax-wizard-sticky-btn" onClick={onClick}>
      <div className="sticky-pulse" />
      <Calculator size={20} />
      <span>Check Tax Leakage</span>
    </button>
  );
};

// ============================================
// PROGRESS BAR COMPONENT
// ============================================

const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className="wizard-progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="progress-text">Step {currentStep} of {totalSteps}</span>
    </div>
  );
};

// ============================================
// STEP 1: REVENUE SELECTION
// ============================================

const RevenueStep: React.FC<{
  selected: RevenueRange;
  onSelect: (value: RevenueRange) => void;
}> = ({ selected, onSelect }) => {
  const options: { value: RevenueRange; label: string; sublabel: string }[] = [
    { value: '<20k', label: 'Under $20K', sublabel: 'Just getting started' },
    { value: '20k-60k', label: '$20K – $60K', sublabel: 'Growing steadily' },
    { value: '60k-150k', label: '$60K – $150K', sublabel: 'Scaling up' },
    { value: '150k+', label: '$150K+', sublabel: 'High volume seller' },
  ];

  return (
    <div className="wizard-step">
      <div className="step-header">
        <div className="step-icon">
          <DollarSign size={24} />
        </div>
        <h2 className="step-title">What's your projected 2026 gross revenue?</h2>
        <p className="step-subtitle">This helps us calculate your Self-Employment tax exposure</p>
      </div>
      
      <div className="options-grid revenue-options">
        {options.map((option) => (
          <button
            key={option.value}
            className={`option-card ${selected === option.value ? 'selected' : ''}`}
            onClick={() => onSelect(option.value)}
          >
            <div className="option-content">
              <span className="option-label">{option.label}</span>
              <span className="option-sublabel">{option.sublabel}</span>
            </div>
            <div className="option-check">
              <Check size={16} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================
// STEP 2: BUSINESS STRUCTURE
// ============================================

const StructureStep: React.FC<{
  selected: BusinessStructure;
  onSelect: (value: BusinessStructure) => void;
}> = ({ selected, onSelect }) => {
  const options: { value: BusinessStructure; label: string; icon: React.ReactNode; description: string }[] = [
    { 
      value: 'sole-prop', 
      label: 'Not Registered', 
      icon: <FileText size={28} />,
      description: 'Operating as a Sole Proprietor'
    },
    { 
      value: 'llc', 
      label: 'LLC (Single Member)', 
      icon: <Building2 size={28} />,
      description: 'Registered but taxed as Sole Prop'
    },
    { 
      value: 'unknown', 
      label: "I'm Not Sure", 
      icon: <HelpCircle size={28} />,
      description: "We'll help you figure it out"
    },
  ];

  return (
    <div className="wizard-step">
      <div className="step-header">
        <div className="step-icon">
          <Building2 size={24} />
        </div>
        <h2 className="step-title">How is your business currently registered?</h2>
        <p className="step-subtitle">Your entity type determines your Self-Employment tax rate</p>
      </div>
      
      <div className="options-grid structure-options">
        {options.map((option) => (
          <button
            key={option.value}
            className={`option-card structure-card ${selected === option.value ? 'selected' : ''}`}
            onClick={() => onSelect(option.value)}
          >
            <div className="structure-icon">{option.icon}</div>
            <div className="option-content">
              <span className="option-label">{option.label}</span>
              <span className="option-sublabel">{option.description}</span>
            </div>
            <div className="option-check">
              <Check size={16} />
            </div>
          </button>
        ))}
      </div>
      
      <div className="step-info-box">
        <AlertTriangle size={16} />
        <span>Sole Props and Single-Member LLCs pay 15.3% SE tax on every dollar of profit</span>
      </div>
    </div>
  );
};

// ============================================
// STEP 3: PLATFORM SELECTION
// ============================================

const PlatformStep: React.FC<{
  selected: Platform;
  onSelect: (value: Platform) => void;
}> = ({ selected, onSelect }) => {
  const platforms: { value: Platform; name: string; color: string }[] = [
    { value: 'shopify', name: 'Shopify', color: '#96BF48' },
    { value: 'tiktok', name: 'TikTok Shop', color: '#FF0050' },
    { value: 'etsy', name: 'Etsy', color: '#F1641E' },
    { value: 'whatnot', name: 'WhatNot', color: '#FF6B35' },
    { value: 'other', name: 'Other', color: '#6B7280' },
  ];

  return (
    <div className="wizard-step">
      <div className="step-header">
        <div className="step-icon">
          <ShoppingBag size={24} />
        </div>
        <h2 className="step-title">Where do you generate most of your sales?</h2>
        <p className="step-subtitle">Different platforms have different 1099-K reporting thresholds</p>
      </div>
      
      <div className="options-grid platform-options">
        {platforms.map((platform) => (
          <button
            key={platform.value}
            className={`option-card platform-card ${selected === platform.value ? 'selected' : ''}`}
            onClick={() => onSelect(platform.value)}
            style={{ '--platform-color': platform.color } as React.CSSProperties}
          >
            <div className="platform-logo">
              <Store size={24} />
            </div>
            <span className="platform-name">{platform.name}</span>
            <div className="option-check">
              <Check size={16} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================
// LOADING STATE
// ============================================

const LoadingState: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Analyzing your revenue data...');

  useEffect(() => {
    const messages = [
      'Analyzing your revenue data...',
      'Calculating SE tax exposure...',
      'Checking multi-state nexus risk...',
      'Preparing your savings report...'
    ];
    
    let currentMessage = 0;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 2;
        if (newProgress >= 25 * (currentMessage + 1) && currentMessage < messages.length - 1) {
          currentMessage++;
          setMessage(messages[currentMessage]);
        }
        return Math.min(newProgress, 100);
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="wizard-loading">
      <div className="loading-animation">
        <Sparkles className="loading-sparkle s1" size={20} />
        <Sparkles className="loading-sparkle s2" size={16} />
        <Sparkles className="loading-sparkle s3" size={14} />
        <div className="loading-icon-wrapper">
          <Calculator size={40} className="loading-icon" />
        </div>
      </div>
      
      <h3 className="loading-title">StartSmart AI is analyzing your data...</h3>
      <p className="loading-message">{message}</p>
      
      <div className="loading-progress">
        <div className="loading-track">
          <div className="loading-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="loading-percent">{progress}%</span>
      </div>
    </div>
  );
};

// ============================================
// EMAIL CAPTURE GATE
// ============================================

const EmailGate: React.FC<{
  savings: SavingsResult;
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}> = ({ savings, email, onEmailChange, onSubmit, isSubmitting }) => {
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValid(emailRegex.test(email));
  }, [email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isSubmitting) {
      onSubmit();
    }
  };

  return (
    <div className="wizard-email-gate">
      <div className="gate-header">
        <div className="gate-success-icon">
          <Check size={32} />
        </div>
        <h2 className="gate-title">Calculations Complete</h2>
      </div>
      
      <div className="savings-preview">
        <span className="savings-label">Estimated Annual Tax Savings</span>
        <div className="savings-amount">
          <span className="savings-range">
            ${savings.min.toLocaleString()} – ${savings.max.toLocaleString()}
          </span>
        </div>
        <p className="savings-description">
          Based on your revenue and current structure, you may be overpaying in Self-Employment taxes.
        </p>
      </div>
      
      <form className="email-form" onSubmit={handleSubmit}>
        <label className="email-label">
          Where should we send your full Audit-Shield Roadmap?
        </label>
        <div className="email-input-wrapper">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="email-input"
            disabled={isSubmitting}
          />
          <button 
            type="submit" 
            className={`email-submit ${isValid ? 'valid' : ''}`}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <>
                <span>See My Savings</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
        <p className="email-disclaimer">
          <Shield size={12} />
          <span>No spam. Just your personalized tax savings roadmap.</span>
        </p>
      </form>
    </div>
  );
};

// ============================================
// COMPARISON CHART COMPONENT
// ============================================

const ComparisonChart: React.FC<{ savings: SavingsResult }> = ({ savings }) => {
  const rows = [
    {
      feature: 'SE Tax Rate',
      soleProp: '15.3% on Total Profit',
      sCorp: '15.3% on Salary Only',
      highlight: true
    },
    {
      feature: 'Current SE Tax',
      soleProp: `~$${savings.currentSETax.toLocaleString()}/year`,
      sCorp: `~$${savings.projectedSETax.toLocaleString()}/year`,
      highlight: false
    },
    {
      feature: 'IRS 1099-K View',
      soleProp: 'High audit risk (mixed funds)',
      sCorp: 'Clean, reconciled data',
      highlight: false
    },
    {
      feature: 'Audit Shield',
      soleProp: 'Basic',
      sCorp: 'StartSmart AI Reconciled',
      highlight: false
    },
    {
      feature: 'Annual Savings',
      soleProp: '$0',
      sCorp: `$${savings.min.toLocaleString()} - $${savings.max.toLocaleString()}+`,
      highlight: true
    },
  ];

  return (
    <div className="comparison-chart">
      <h4 className="chart-title">Why S-Corp Saves You Money</h4>
      <div className="chart-table">
        <div className="chart-header">
          <div className="chart-cell feature-cell">Feature</div>
          <div className="chart-cell bad-cell">Sole Prop / LLC</div>
          <div className="chart-cell good-cell">NexTax S-Corp</div>
        </div>
        {rows.map((row, index) => (
          <div key={index} className={`chart-row ${row.highlight ? 'highlight-row' : ''}`}>
            <div className="chart-cell feature-cell">{row.feature}</div>
            <div className="chart-cell bad-cell">
              <X size={14} className="cell-icon bad" />
              <span>{row.soleProp}</span>
            </div>
            <div className="chart-cell good-cell">
              <Check size={14} className="cell-icon good" />
              <span>{row.sCorp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// RESULTS DISPLAY
// ============================================

const ResultsDisplay: React.FC<{
  data: WizardData;
  savings: SavingsResult;
  onClose: () => void;
}> = ({ data, savings, onClose }) => {
  const getStructureLabel = () => {
    switch (data.structure) {
      case 'sole-prop': return 'Sole Proprietorship';
      case 'llc': return 'Single-Member LLC';
      default: return 'your current structure';
    }
  };

  const getPlatformName = () => {
    const names: Record<string, string> = {
      shopify: 'Shopify',
      tiktok: 'TikTok Shop',
      etsy: 'Etsy',
      whatnot: 'WhatNot',
      other: 'your platform'
    };
    return data.platform ? names[data.platform] : 'your platform';
  };

  return (
    <div className="wizard-results">
      <div className="results-header">
        <div className="results-badge">
          <Sparkles size={16} />
          <span>Your Tax Savings Report</span>
        </div>
        <button className="results-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      
      <div className="results-hero">
        <span className="results-label">Your Estimated Annual Savings</span>
        <div className="results-amount">
          <span className="currency">$</span>
          <span className="amount">{savings.min.toLocaleString()}</span>
          <span className="separator">–</span>
          <span className="currency">$</span>
          <span className="amount">{savings.max.toLocaleString()}</span>
        </div>
        <p className="results-hero-subtitle">
          Based on your {getPlatformName()} revenue and {getStructureLabel()} status
        </p>
      </div>

      {/* Comparison Chart */}
      <ComparisonChart savings={savings} />
      
      <div className="results-breakdown">
        <h3 className="breakdown-title">Your 3-Step Audit-Shield Plan</h3>
        
        <div className="breakdown-item">
          <div className="breakdown-number">1</div>
          <div className="breakdown-content">
            <h4>Stop the Leak</h4>
            <p>
              We file your LLC and S-Corp election to trigger immediate savings. 
              Instead of paying 15.3% SE tax on ~${savings.profitEstimate.toLocaleString()} in profit, 
              you'll only pay it on your ${savings.reasonableSalary.toLocaleString()} reasonable salary.
            </p>
          </div>
        </div>
        
        <div className="breakdown-item">
          <div className="breakdown-number">2</div>
          <div className="breakdown-content">
            <h4>Automate 1099-K Reconciliation</h4>
            <p>{savings.platformSpecificMessage}</p>
          </div>
        </div>
        
        {savings.nexusRisk && (
          <div className="breakdown-item nexus-alert">
            <div className="breakdown-number warning">3</div>
            <div className="breakdown-content">
              <h4>Multi-State Nexus Protection</h4>
              <p>
                At your revenue level, you likely have sales tax obligations in multiple states 
                (FL, TX, CA, and more). We monitor your sales volume in each state to ensure 
                compliance and help you avoid $1,000+ in potential penalties.
              </p>
            </div>
          </div>
        )}
        
        {!savings.nexusRisk && (
          <div className="breakdown-item">
            <div className="breakdown-number">3</div>
            <div className="breakdown-content">
              <h4>Nexus Monitoring</h4>
              <p>
                As you scale, we'll monitor your sales volume in states like FL, TX, and CA 
                to ensure you stay compliant and avoid unexpected state tax obligations.
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="results-cta-section">
        <button className="results-primary-cta">
          <Sparkles size={18} />
          <span>Claim My Savings – Launch StartSmart</span>
        </button>
        
        <button className="results-secondary-cta">
          <Calendar size={16} />
          <span>Book My 12-Minute Tech Check with Steve</span>
        </button>
      </div>
      
      <div className="results-footer">
        <p>
          <Check size={14} />
          <span>Full Audit-Shield Roadmap sent to {data.email}</span>
        </p>
      </div>
    </div>
  );
};

// ============================================
// MAIN WIZARD OVERLAY
// ============================================

const WizardOverlay: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [data, setData] = useState<WizardData>({
    revenue: null,
    structure: null,
    platform: null,
    email: '',
  });

  const savings = calculateSavings(data);

  const handleRevenueSelect = (value: RevenueRange) => {
    setData({ ...data, revenue: value });
    setTimeout(() => setStep(2), 300);
  };

  const handleStructureSelect = (value: BusinessStructure) => {
    setData({ ...data, structure: value });
    setTimeout(() => setStep(3), 300);
  };

  const handlePlatformSelect = (value: Platform) => {
    setData({ ...data, platform: value });
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(4);
    }, 2000);
  };

  const handleEmailSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowResults(true);
    }, 1500);
  };

  const handleClose = useCallback(() => {
    onClose();
    // Reset state after animation
    setTimeout(() => {
      setStep(1);
      setIsLoading(false);
      setIsSubmitting(false);
      setShowResults(false);
      setData({ revenue: null, structure: null, platform: null, email: '' });
    }, 300);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="wizard-overlay" onClick={handleClose}>
      <div className="wizard-modal" onClick={(e) => e.stopPropagation()}>
        {!showResults && !isLoading && (
          <button className="wizard-close" onClick={handleClose}>
            <X size={20} />
          </button>
        )}
        
        {!showResults && !isLoading && step < 4 && (
          <ProgressBar currentStep={step} totalSteps={3} />
        )}
        
        <div className="wizard-content">
          {isLoading ? (
            <LoadingState />
          ) : showResults ? (
            <ResultsDisplay data={data} savings={savings} onClose={handleClose} />
          ) : (
            <>
              {step === 1 && (
                <RevenueStep 
                  selected={data.revenue} 
                  onSelect={handleRevenueSelect} 
                />
              )}
              {step === 2 && (
                <StructureStep 
                  selected={data.structure} 
                  onSelect={handleStructureSelect} 
                />
              )}
              {step === 3 && (
                <PlatformStep 
                  selected={data.platform} 
                  onSelect={handlePlatformSelect} 
                />
              )}
              {step === 4 && (
                <EmailGate
                  savings={savings}
                  email={data.email}
                  onEmailChange={(email) => setData({ ...data, email })}
                  onSubmit={handleEmailSubmit}
                  isSubmitting={isSubmitting}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN EXPORT COMPONENT
// ============================================

export const TaxSavingsWizard: React.FC<{
  variant?: 'card' | 'sticky' | 'both';
}> = ({ variant = 'both' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  // Show sticky button after scrolling
  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <style>{styles}</style>
      
      {(variant === 'card' || variant === 'both') && (
        <HookCard onClick={() => setIsOpen(true)} />
      )}
      
      {(variant === 'sticky' || variant === 'both') && (
        <StickyButton 
          onClick={() => setIsOpen(true)} 
          visible={showSticky && !isOpen} 
        />
      )}
      
      <WizardOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

// ============================================
// STYLES (Matching NexTax.AI Theme)
// ============================================

const styles = `
/* ============================================
   CSS VARIABLES - NexTax.AI Theme
   ============================================ */
.tax-wizard-hook-card,
.tax-wizard-sticky-btn,
.wizard-overlay {
  --wizard-bg-primary: #0a0f1a;
  --wizard-bg-secondary: #111827;
  --wizard-bg-card: #1a2234;
  --wizard-bg-card-hover: #232d42;
  --wizard-border: #2d3a52;
  --wizard-border-hover: #3d4a62;
  --wizard-text-primary: #ffffff;
  --wizard-text-secondary: #94a3b8;
  --wizard-text-muted: #64748b;
  --wizard-accent: #14b8a6;
  --wizard-accent-hover: #0d9488;
  --wizard-accent-glow: rgba(20, 184, 166, 0.3);
  --wizard-success: #22c55e;
  --wizard-warning: #f59e0b;
  --wizard-error: #ef4444;
  --wizard-gradient: linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%);
  --wizard-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --wizard-radius-sm: 8px;
  --wizard-radius-md: 12px;
  --wizard-radius-lg: 16px;
  --wizard-radius-xl: 24px;
  --wizard-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  --wizard-transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ============================================
   HOOK CARD (Trigger Component)
   ============================================ */
.tax-wizard-hook-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  font-family: var(--wizard-font-family);
}

.hook-card-inner {
  position: relative;
  z-index: 1;
  background: var(--wizard-bg-card);
  border: 1px solid var(--wizard-border);
  border-radius: var(--wizard-radius-xl);
  padding: 32px;
  transition: all var(--wizard-transition);
}

.hook-card-inner:hover {
  border-color: var(--wizard-accent);
  transform: translateY(-2px);
}

.hook-card-glow {
  position: absolute;
  inset: 0;
  background: var(--wizard-accent-glow);
  filter: blur(40px);
  opacity: 0;
  transition: opacity var(--wizard-transition);
  border-radius: var(--wizard-radius-xl);
  z-index: 0;
}

.hook-card-inner:hover + .hook-card-glow {
  opacity: 0.5;
}

.hook-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 100px;
  color: var(--wizard-warning);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
}

.hook-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--wizard-text-primary);
  margin: 0 0 12px;
  line-height: 1.3;
}

.text-gradient {
  background: var(--wizard-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hook-description {
  font-size: 15px;
  color: var(--wizard-text-secondary);
  line-height: 1.6;
  margin: 0 0 24px;
}

.hook-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 24px;
  background: var(--wizard-accent);
  border: none;
  border-radius: var(--wizard-radius-md);
  color: var(--wizard-bg-primary);
  font-family: var(--wizard-font-family);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--wizard-transition);
}

.hook-cta:hover {
  background: var(--wizard-accent-hover);
  transform: translateY(-1px);
}

.hook-cta .cta-arrow {
  transition: transform var(--wizard-transition);
}

.hook-cta:hover .cta-arrow {
  transform: translateX(4px);
}

.hook-stats {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.hook-stats .stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--wizard-text-muted);
}

.hook-stats .stat svg {
  color: var(--wizard-success);
}

/* ============================================
   STICKY BUTTON
   ============================================ */
.tax-wizard-sticky-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: var(--wizard-accent);
  border: none;
  border-radius: var(--wizard-radius-lg);
  color: var(--wizard-bg-primary);
  font-family: var(--wizard-font-family);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 40px rgba(20, 184, 166, 0.4);
  transition: all var(--wizard-transition);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tax-wizard-sticky-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 50px rgba(20, 184, 166, 0.5);
}

.sticky-pulse {
  position: absolute;
  inset: 0;
  background: var(--wizard-accent);
  border-radius: var(--wizard-radius-lg);
  animation: pulse 2s infinite;
  z-index: -1;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.1);
  }
}

/* ============================================
   WIZARD OVERLAY
   ============================================ */
.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.wizard-modal {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--wizard-bg-secondary);
  border: 1px solid var(--wizard-border);
  border-radius: var(--wizard-radius-xl);
  box-shadow: var(--wizard-shadow);
  animation: scaleIn 0.25s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.wizard-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--wizard-bg-card);
  border: 1px solid var(--wizard-border);
  border-radius: 50%;
  color: var(--wizard-text-secondary);
  cursor: pointer;
  transition: all var(--wizard-transition);
}

.wizard-close:hover {
  background: var(--wizard-bg-card-hover);
  color: var(--wizard-text-primary);
  border-color: var(--wizard-border-hover);
}

.wizard-content {
  padding: 40px 32px;
}

/* ============================================
   PROGRESS BAR
   ============================================ */
.wizard-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  border-bottom: 1px solid var(--wizard-border);
}

.progress-track {
  flex: 1;
  height: 4px;
  background: var(--wizard-bg-card);
  border-radius: 100px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--wizard-gradient);
  border-radius: 100px;
  transition: width 0.3s ease-out;
}

.progress-text {
  font-size: 13px;
  color: var(--wizard-text-muted);
  white-space: nowrap;
}

/* ============================================
   WIZARD STEPS - COMMON
   ============================================ */
.wizard-step {
  animation: stepIn 0.3s ease-out;
}

@keyframes stepIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.step-header {
  text-align: center;
  margin-bottom: 32px;
}

.step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(14, 165, 233, 0.2));
  border: 1px solid rgba(20, 184, 166, 0.3);
  border-radius: var(--wizard-radius-lg);
  color: var(--wizard-accent);
  margin-bottom: 20px;
}

.step-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--wizard-text-primary);
  margin: 0 0 8px;
  line-height: 1.3;
}

.step-subtitle {
  font-size: 14px;
  color: var(--wizard-text-secondary);
  margin: 0;
}

/* ============================================
   OPTIONS GRID
   ============================================ */
.options-grid {
  display: grid;
  gap: 12px;
}

.revenue-options {
  grid-template-columns: repeat(2, 1fr);
}

.structure-options {
  grid-template-columns: 1fr;
}

.platform-options {
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 480px) {
  .revenue-options,
  .platform-options {
    grid-template-columns: 1fr;
  }
}

.option-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px;
  background: var(--wizard-bg-card);
  border: 2px solid var(--wizard-border);
  border-radius: var(--wizard-radius-md);
  cursor: pointer;
  transition: all var(--wizard-transition);
  text-align: left;
}

.option-card:hover {
  background: var(--wizard-bg-card-hover);
  border-color: var(--wizard-border-hover);
}

.option-card.selected {
  background: rgba(20, 184, 166, 0.1);
  border-color: var(--wizard-accent);
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--wizard-text-primary);
}

.option-sublabel {
  font-size: 13px;
  color: var(--wizard-text-secondary);
}

.option-check {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--wizard-bg-secondary);
  border: 2px solid var(--wizard-border);
  border-radius: 50%;
  color: transparent;
  transition: all var(--wizard-transition);
}

.option-card.selected .option-check {
  background: var(--wizard-accent);
  border-color: var(--wizard-accent);
  color: var(--wizard-bg-primary);
}

/* Structure Cards */
.structure-card {
  flex-direction: row;
  align-items: center;
  gap: 16px;
}

.structure-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--wizard-bg-secondary);
  border-radius: var(--wizard-radius-sm);
  color: var(--wizard-accent);
  flex-shrink: 0;
}

.structure-card.selected .structure-icon {
  background: rgba(20, 184, 166, 0.2);
}

/* Platform Cards */
.platform-card {
  align-items: center;
  text-align: center;
  padding: 24px 16px;
}

.platform-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--wizard-bg-secondary);
  border-radius: var(--wizard-radius-sm);
  margin-bottom: 12px;
  color: var(--platform-color, var(--wizard-text-secondary));
  transition: all var(--wizard-transition);
}

.platform-card:hover .platform-logo,
.platform-card.selected .platform-logo {
  background: rgba(20, 184, 166, 0.15);
  color: var(--wizard-accent);
}

.platform-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--wizard-text-primary);
}

.platform-card .option-check {
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
}

/* Info Box */
.step-info-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 20px;
  padding: 14px 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--wizard-radius-sm);
  font-size: 13px;
  color: var(--wizard-warning);
  line-height: 1.5;
}

.step-info-box svg {
  flex-shrink: 0;
  margin-top: 2px;
}

/* ============================================
   LOADING STATE
   ============================================ */
.wizard-loading {
  text-align: center;
  padding: 40px 0;
}

.loading-animation {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.loading-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(14, 165, 233, 0.2));
  border: 2px solid var(--wizard-accent);
  border-radius: 50%;
  animation: iconPulse 1.5s infinite;
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.loading-icon {
  color: var(--wizard-accent);
  animation: iconSpin 3s linear infinite;
}

@keyframes iconSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-sparkle {
  position: absolute;
  color: var(--wizard-accent);
  animation: sparkle 1.5s infinite;
}

.loading-sparkle.s1 { top: -10px; right: -5px; animation-delay: 0s; }
.loading-sparkle.s2 { bottom: -5px; left: -10px; animation-delay: 0.3s; }
.loading-sparkle.s3 { top: 10px; left: -15px; animation-delay: 0.6s; }

@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1); }
}

.loading-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--wizard-text-primary);
  margin: 0 0 8px;
}

.loading-message {
  font-size: 14px;
  color: var(--wizard-text-secondary);
  margin: 0 0 24px;
  min-height: 20px;
}

.loading-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 300px;
  margin: 0 auto;
}

.loading-track {
  flex: 1;
  height: 6px;
  background: var(--wizard-bg-card);
  border-radius: 100px;
  overflow: hidden;
}

.loading-fill {
  height: 100%;
  background: var(--wizard-gradient);
  border-radius: 100px;
  transition: width 0.1s linear;
}

.loading-percent {
  font-size: 13px;
  font-weight: 600;
  color: var(--wizard-accent);
  min-width: 40px;
}

/* ============================================
   EMAIL GATE
   ============================================ */
.wizard-email-gate {
  animation: stepIn 0.3s ease-out;
}

.gate-header {
  text-align: center;
  margin-bottom: 24px;
}

.gate-success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(34, 197, 94, 0.15);
  border: 2px solid var(--wizard-success);
  border-radius: 50%;
  color: var(--wizard-success);
  margin-bottom: 16px;
  animation: checkBounce 0.5s ease-out;
}

@keyframes checkBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.gate-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--wizard-text-primary);
  margin: 0;
}

.savings-preview {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(14, 165, 233, 0.1));
  border: 1px solid rgba(20, 184, 166, 0.3);
  border-radius: var(--wizard-radius-lg);
  margin-bottom: 28px;
}

.savings-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--wizard-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.savings-amount {
  margin-bottom: 12px;
}

.savings-range {
  font-size: 36px;
  font-weight: 800;
  background: var(--wizard-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.savings-description {
  font-size: 14px;
  color: var(--wizard-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.email-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.email-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--wizard-text-primary);
  text-align: center;
}

.email-input-wrapper {
  display: flex;
  gap: 8px;
}

.email-input {
  flex: 1;
  padding: 14px 16px;
  background: var(--wizard-bg-card);
  border: 2px solid var(--wizard-border);
  border-radius: var(--wizard-radius-md);
  color: var(--wizard-text-primary);
  font-family: var(--wizard-font-family);
  font-size: 15px;
  outline: none;
  transition: all var(--wizard-transition);
}

.email-input:focus {
  border-color: var(--wizard-accent);
  background: var(--wizard-bg-card-hover);
}

.email-input::placeholder {
  color: var(--wizard-text-muted);
}

.email-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: var(--wizard-bg-card);
  border: 2px solid var(--wizard-border);
  border-radius: var(--wizard-radius-md);
  color: var(--wizard-text-muted);
  font-family: var(--wizard-font-family);
  font-size: 15px;
  font-weight: 600;
  cursor: not-allowed;
  transition: all var(--wizard-transition);
  white-space: nowrap;
}

.email-submit.valid {
  background: var(--wizard-accent);
  border-color: var(--wizard-accent);
  color: var(--wizard-bg-primary);
  cursor: pointer;
}

.email-submit.valid:hover {
  background: var(--wizard-accent-hover);
  border-color: var(--wizard-accent-hover);
}

.email-submit .spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.email-disclaimer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: var(--wizard-text-muted);
  margin: 4px 0 0;
}

.email-disclaimer svg {
  color: var(--wizard-accent);
}

/* ============================================
   RESULTS DISPLAY
   ============================================ */
.wizard-results {
  animation: stepIn 0.3s ease-out;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.results-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(14, 165, 233, 0.15));
  border: 1px solid rgba(20, 184, 166, 0.3);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: var(--wizard-accent);
}

.results-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--wizard-bg-card);
  border: 1px solid var(--wizard-border);
  border-radius: 50%;
  color: var(--wizard-text-secondary);
  cursor: pointer;
  transition: all var(--wizard-transition);
}

.results-close:hover {
  background: var(--wizard-bg-card-hover);
  color: var(--wizard-text-primary);
}

.results-hero {
  text-align: center;
  padding: 32px;
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(14, 165, 233, 0.1));
  border: 1px solid rgba(20, 184, 166, 0.3);
  border-radius: var(--wizard-radius-lg);
  margin-bottom: 28px;
}

.results-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--wizard-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.results-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.results-amount .currency {
  font-size: 28px;
  font-weight: 700;
  color: var(--wizard-accent);
}

.results-amount .amount {
  font-size: 48px;
  font-weight: 800;
  background: var(--wizard-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.results-amount .separator {
  font-size: 32px;
  font-weight: 300;
  color: var(--wizard-text-secondary);
  margin: 0 8px;
}

.results-hero-subtitle {
  font-size: 14px;
  color: var(--wizard-text-secondary);
  margin: 12px 0 0;
}

/* ============================================
   COMPARISON CHART
   ============================================ */
.comparison-chart {
  margin-bottom: 28px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--wizard-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
}

.chart-table {
  border: 1px solid var(--wizard-border);
  border-radius: var(--wizard-radius-md);
  overflow: hidden;
}

.chart-header {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  background: var(--wizard-bg-card);
  border-bottom: 1px solid var(--wizard-border);
}

.chart-header .chart-cell {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--wizard-text-muted);
  padding: 12px 14px;
}

.chart-header .bad-cell {
  color: var(--wizard-error);
  background: rgba(239, 68, 68, 0.05);
}

.chart-header .good-cell {
  color: var(--wizard-success);
  background: rgba(34, 197, 94, 0.05);
}

.chart-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  border-bottom: 1px solid var(--wizard-border);
}

.chart-row:last-child {
  border-bottom: none;
}

.chart-row.highlight-row {
  background: rgba(20, 184, 166, 0.05);
}

.chart-row.highlight-row .good-cell {
  background: rgba(34, 197, 94, 0.1);
}

.chart-cell {
  padding: 12px 14px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-cell.feature-cell {
  font-weight: 600;
  color: var(--wizard-text-primary);
  background: var(--wizard-bg-card);
}

.chart-cell.bad-cell {
  color: var(--wizard-text-secondary);
  background: rgba(239, 68, 68, 0.03);
}

.chart-cell.good-cell {
  color: var(--wizard-text-primary);
  background: rgba(34, 197, 94, 0.03);
}

.cell-icon {
  flex-shrink: 0;
}

.cell-icon.bad {
  color: var(--wizard-error);
  opacity: 0.7;
}

.cell-icon.good {
  color: var(--wizard-success);
}

@media (max-width: 560px) {
  .chart-header,
  .chart-row {
    grid-template-columns: 1fr;
  }
  
  .chart-header .chart-cell,
  .chart-row .chart-cell {
    padding: 10px 14px;
  }
  
  .chart-cell.feature-cell {
    border-bottom: 1px solid var(--wizard-border);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .chart-cell.bad-cell::before {
    content: 'Sole Prop: ';
    font-weight: 600;
    color: var(--wizard-error);
  }
  
  .chart-cell.good-cell::before {
    content: 'S-Corp: ';
    font-weight: 600;
    color: var(--wizard-success);
  }
}

/* ============================================
   RESULTS BREAKDOWN (Numbered Steps)
   ============================================ */
.results-breakdown {
  margin-bottom: 28px;
}

.breakdown-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--wizard-text-primary);
  margin: 0 0 16px;
}

.breakdown-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--wizard-bg-card);
  border: 1px solid var(--wizard-border);
  border-radius: var(--wizard-radius-md);
  margin-bottom: 12px;
}

.breakdown-item.nexus-alert {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
}

.breakdown-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  background: var(--wizard-accent);
  border-radius: 50%;
  color: var(--wizard-bg-primary);
  font-size: 14px;
  font-weight: 700;
}

.breakdown-number.warning {
  background: var(--wizard-warning);
}

.breakdown-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(20, 184, 166, 0.15);
  border-radius: var(--wizard-radius-sm);
  color: var(--wizard-accent);
  flex-shrink: 0;
}

.nexus-alert .breakdown-icon {
  background: rgba(245, 158, 11, 0.15);
  color: var(--wizard-warning);
}

.breakdown-content h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--wizard-text-primary);
  margin: 0 0 6px;
}

.breakdown-content p {
  font-size: 13px;
  color: var(--wizard-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.results-cta-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.results-primary-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 18px 24px;
  background: var(--wizard-accent);
  border: none;
  border-radius: var(--wizard-radius-md);
  color: var(--wizard-bg-primary);
  font-family: var(--wizard-font-family);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--wizard-transition);
}

.results-primary-cta:hover {
  background: var(--wizard-accent-hover);
  transform: translateY(-1px);
}

.results-secondary-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  background: transparent;
  border: 2px solid var(--wizard-border);
  border-radius: var(--wizard-radius-md);
  color: var(--wizard-text-secondary);
  font-family: var(--wizard-font-family);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--wizard-transition);
}

.results-secondary-cta:hover {
  border-color: var(--wizard-accent);
  color: var(--wizard-accent);
}

.results-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid var(--wizard-border);
}

.results-footer p {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--wizard-text-secondary);
  margin: 0;
}

.results-footer svg {
  color: var(--wizard-success);
}

/* ============================================
   RESPONSIVE ADJUSTMENTS
   ============================================ */
@media (max-width: 560px) {
  .wizard-modal {
    max-height: 100vh;
    border-radius: var(--wizard-radius-lg);
  }
  
  .wizard-content {
    padding: 32px 20px;
  }
  
  .step-title {
    font-size: 20px;
  }
  
  .savings-range,
  .results-amount .amount {
    font-size: 32px;
  }
  
  .email-input-wrapper {
    flex-direction: column;
  }
  
  .email-submit {
    width: 100%;
  }
}
`;

export default TaxSavingsWizard;
