import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Shield, Crown, Sparkles, FileText, Zap } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  plan: "pro" | "ein";
  feature?: string;
}

export default function UpgradeModal({ open, onClose, plan, feature }: UpgradeModalProps) {
  const isEIN = plan === "ein";
  const price = isEIN ? "$49 (with Pro)" : "$29/month";
  const fullPrice = isEIN ? "$149" : "$29/month";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center space-x-2">
            {isEIN ? (
              <>
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Access EIN Filing Assistant</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <span>Upgrade to Pro</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {isEIN ? (
            <>
              {/* EIN-Specific Modal */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">NexTax Website Price:</span>
                  <Badge variant="secondary" className="text-red-600 font-semibold">
                    {fullPrice}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your Pro Member Price:</span>
                  <Badge className="bg-green-600 text-white font-semibold">
                    {price}
                  </Badge>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-400">
                This guided EIN application service normally costs <strong>{fullPrice}</strong> on our website. 
                As a Pro member, you can access it for <strong>{price}</strong>.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  What's Included:
                </h4>
                <ul className="space-y-2 ml-6">
                  <li className="flex gap-2 items-center text-sm">
                    <CheckCircle className="text-green-600 w-4 h-4 flex-shrink-0" />
                    Smart Typeform wizard with expert logic
                  </li>
                  <li className="flex gap-2 items-center text-sm">
                    <CheckCircle className="text-green-600 w-4 h-4 flex-shrink-0" />
                    1:1 review from NexTax team (optional)
                  </li>
                  <li className="flex gap-2 items-center text-sm">
                    <CheckCircle className="text-green-600 w-4 h-4 flex-shrink-0" />
                    Direct IRS submission support
                  </li>
                </ul>
              </div>

              {/* Anti-Arbitrage Protection */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                      Access Requirements:
                    </h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li className="flex items-center">
                        <Clock className="h-3 w-3 mr-2" />
                        Available 5 days after Pro subscription activation
                      </li>
                      <li className="flex items-center">
                        <Crown className="h-3 w-3 mr-2" />
                        Requires active Pro subscription for minimum 2 months
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                This helps us prevent subscription abuse while ensuring you get expert support 
                throughout your business formation journey.
              </p>
            </>
          ) : (
            <>
              {/* Standard Pro Upgrade Modal */}
              <div className="text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {feature ? `${feature} lets you create custom documents using your business profile.` : 
                   "Pro unlocks smart AI drafting, document customization, and full access to your startup roadmap."}
                </p>
                
                {feature && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                      Smart Personalization Preview:
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                      "Want to use your business profile details to pre-fill this document?"
                    </p>
                    <div className="flex space-x-2 mt-3 justify-center">
                      <Badge variant="outline" className="text-xs">Yes, pre-fill</Badge>
                      <Badge variant="outline" className="text-xs">No, start fresh</Badge>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-blue-600" />
                  Pro Plan - $29/month
                </h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center">
                    <Sparkles className="h-3 w-3 mr-2 text-blue-500 flex-shrink-0" />
                    Unlimited AI chat + smart document generator
                  </li>
                  <li className="flex items-center">
                    <FileText className="h-3 w-3 mr-2 text-blue-500 flex-shrink-0" />
                    Roadmap task syncing + compliance tracker
                  </li>
                  <li className="flex items-center">
                    <Crown className="h-3 w-3 mr-2 text-blue-500 flex-shrink-0" />
                    Access to discounted EIN filing ($49 vs $149)
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-3 w-3 mr-2 text-blue-500 flex-shrink-0" />
                    Save/edit all generated documents
                  </li>
                </ul>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Plus: Save documents directly to your Business Launch Roadmap
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button 
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            onClick={() => {
              onClose();
              // In real app, would redirect to pricing/subscription page
            }}
          >
            {isEIN ? (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Subscribe & Access EIN Tool
              </>
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}