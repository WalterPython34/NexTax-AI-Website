'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Lightbulb, ArrowRight, Loader2, Shield, Sparkles } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface IdeaValidatorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  gptUrl: string; // Your ChatGPT app URL
}

// ============================================
// MAIN POPUP COMPONENT
// ============================================

export const IdeaValidatorPopup: React.FC<IdeaValidatorPopupProps> = ({ 
  isOpen, 
  onClose, 
  gptUrl 
}) => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validate form
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValid(firstName.trim().length > 0 && emailRegex.test(email));
  }, [firstName, email]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Send to your API endpoint
      const response = await fetch('/api/leads/idea-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          email,
          source: 'idea_validator_popup',
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();
      console.log('✅ Lead captured:', result);

      // Detect if mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile: Direct navigation (same tab) - most reliable for mobile
        window.location.href = gptUrl;
      } else {
        // On desktop: Open in new tab
        window.open(gptUrl, '_blank');
        // Close popup and reset form on desktop only
        onClose();
        setFirstName('');
        setEmail('');
      }
      
    } catch (error) {
      console.error('❌ Submission error:', error);
      
      // Still redirect even if API fails - don't lose the user!
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        window.location.href = gptUrl;
      } else {
        window.open(gptUrl, '_blank');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = useCallback(() => {
    onClose();
    setFirstName('');
    setEmail('');
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      <style>{styles}</style>
      <div className="idea-popup-overlay" onClick={handleClose}>
        <div className="idea-popup-modal" onClick={(e) => e.stopPropagation()}>
          <button className="idea-popup-close" onClick={handleClose}>
            <X size={20} />
          </button>

          <div className="idea-popup-content">
            {/* Header */}
            <div className="idea-popup-header">
              <div className="idea-popup-icon">
                <Lightbulb size={28} />
              </div>
              <h2 className="idea-popup-title">Validate Your Business Idea</h2>
              <p className="idea-popup-subtitle">
                Get instant AI-powered feedback on your e-commerce concept before you invest time and money.
              </p>
            </div>

            {/* Benefits */}
            <div className="idea-popup-benefits">
              <div className="benefit-item">
                <Sparkles size={16} />
                <span>Market viability analysis</span>
              </div>
              <div className="benefit-item">
                <Sparkles size={16} />
                <span>Competition insights</span>
              </div>
              <div className="benefit-item">
                <Sparkles size={16} />
                <span>Revenue potential estimate</span>
              </div>
            </div>

            {/* Form */}
            <form className="idea-popup-form" onSubmit={handleSubmit}>
              <div className="form-fields">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="idea-input"
                  disabled={isSubmitting}
                  autoFocus
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="idea-input"
                  disabled={isSubmitting}
                />
              </div>

              <button 
                type="submit" 
                className={`idea-submit-btn ${isValid ? 'valid' : ''}`}
                disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 size={20} className="spin" />
                ) : (
                  <>
                    <span>Launch Idea Validator GPT</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p className="idea-disclaimer">
                <Shield size={12} />
                <span>Free to use. No credit card required.</span>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================
// STYLES
// ============================================

const styles = `
/* Overlay */
.idea-popup-overlay {
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Modal */
.idea-popup-modal {
  position: relative;
  width: 100%;
  max-width: 440px;
  background: #111827;
  border: 1px solid #2d3a52;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: scaleIn 0.25s ease-out;
  overflow: hidden;
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

/* Close Button */
.idea-popup-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #1a2234;
  border: 1px solid #2d3a52;
  border-radius: 50%;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.idea-popup-close:hover {
  background: #232d42;
  color: #ffffff;
  border-color: #3d4a62;
}

/* Content */
.idea-popup-content {
  padding: 40px 32px;
}

/* Header */
.idea-popup-header {
  text-align: center;
  margin-bottom: 24px;
}

.idea-popup-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.2));
  border: 2px solid rgba(245, 158, 11, 0.4);
  border-radius: 16px;
  color: #f59e0b;
  margin-bottom: 20px;
}

.idea-popup-title {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 8px;
  line-height: 1.3;
}

.idea-popup-subtitle {
  font-size: 15px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

/* Benefits */
.idea-popup-benefits {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: #1a2234;
  border: 1px solid #2d3a52;
  border-radius: 12px;
  margin-bottom: 24px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #e2e8f0;
}

.benefit-item svg {
  color: #14b8a6;
  flex-shrink: 0;
}

/* Form */
.idea-popup-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.idea-input {
  width: 100%;
  padding: 14px 16px;
  background: #1a2234;
  border: 2px solid #2d3a52;
  border-radius: 10px;
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
}

.idea-input:focus {
  border-color: #f59e0b;
  background: #232d42;
}

.idea-input::placeholder {
  color: #64748b;
}

.idea-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Submit Button */
.idea-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 24px;
  background: #2d3a52;
  border: none;
  border-radius: 10px;
  color: #64748b;
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: not-allowed;
  transition: all 0.2s ease;
  margin-top: 4px;
}

.idea-submit-btn.valid {
  background: #f59e0b;
  color: #0a0f1a;
  cursor: pointer;
}

.idea-submit-btn.valid:hover {
  background: #00bbff;
  transform: translateY(-1px);
}

.idea-submit-btn:disabled {
  cursor: not-allowed;
}

.idea-submit-btn .spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Disclaimer */
.idea-disclaimer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  margin: 8px 0 0;
}

.idea-disclaimer svg {
  color: #14b8a6;
}

/* Mobile */
@media (max-width: 480px) {
  .idea-popup-content {
    padding: 32px 20px;
  }
  
  .idea-popup-title {
    font-size: 20px;
  }
}
`;

export default IdeaValidatorPopup;
