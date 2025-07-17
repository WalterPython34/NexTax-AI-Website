import React, { useState, useEffect } from 'react';
import { Search, Star, Copy, Play, Heart, Filter, Download, Plus, Save, Edit3, FolderPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  tier: 'free' | 'pro' | 'premium';
  isFavorited?: boolean;
  useCount?: number;
  isCustom?: boolean;
}

interface PromptPlaygroundProps {
  isOpen: boolean;
  onClose: () => void;
  userTier: 'free' | 'pro' | 'premium';
}

const PromptPlayground: React.FC<PromptPlaygroundProps> = ({
  isOpen,
  onClose,
  userTier
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [customPrompts, setCustomPrompts] = useState<Prompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [promptStats, setPromptStats] = useState<Record<string, number>>({});

  // Sample prompts data - in real implementation, this would come from the backend
  const allPrompts: Prompt[] = [
    // Free Tier (10 prompts)
    {
      id: 'f1',
      title: 'Business Idea Validator',
      content: 'Analyze this business idea: [BUSINESS_IDEA]. Provide honest feedback on market viability, potential challenges, and suggested improvements.',
      category: 'Business Formation',
      tags: ['validation', 'market research', 'feedback'],
      tier: 'free'
    },
    {
      id: 'f2',
      title: 'LLC vs Corporation Decision',
      content: 'Help me decide between forming an LLC or Corporation for my [BUSINESS_TYPE] business in [STATE]. Consider tax implications, liability protection, and operational complexity.',
      category: 'Legal',
      tags: ['entity formation', 'legal structure', 'taxes'],
      tier: 'free'
    },
    {
      id: 'f3',
      title: 'Basic Marketing Plan',
      content: 'Create a simple marketing plan for my [PRODUCT/SERVICE] targeting [TARGET_AUDIENCE]. Include 3 key marketing channels and budget considerations.',
      category: 'Marketing',
      tags: ['marketing', 'strategy', 'planning'],
      tier: 'free'
    },
    {
      id: 'f4',
      title: 'Startup Costs Calculator',
      content: 'Help me calculate startup costs for a [BUSINESS_TYPE] business. Break down one-time vs ongoing expenses and identify potential cost-saving opportunities.',
      category: 'Finance',
      tags: ['costs', 'budgeting', 'financial planning'],
      tier: 'free'
    },
    {
      id: 'f5',
      title: 'Business Name Generator',
      content: 'Generate 10 creative business names for my [BUSINESS_DESCRIPTION] company. Ensure names are memorable, brandable, and likely available for domain registration.',
      category: 'Branding',
      tags: ['naming', 'branding', 'creativity'],
      tier: 'free'
    },
    {
      id: 'f6',
      title: 'Tax Registration Checklist',
      content: 'Create a tax registration checklist for my new [ENTITY_TYPE] business in [STATE]. Include federal, state, and local requirements with deadlines.',
      category: 'Tax & Compliance',
      tags: ['taxes', 'registration', 'compliance'],
      tier: 'free'
    },
    {
      id: 'f7',
      title: 'Simple Business Plan Outline',
      content: 'Create a basic business plan outline for my [BUSINESS_TYPE] startup. Focus on the essential sections investors and lenders want to see.',
      category: 'Business Planning',
      tags: ['business plan', 'structure', 'investors'],
      tier: 'free'
    },
    {
      id: 'f8',
      title: 'Customer Research Questions',
      content: 'Generate 15 customer research questions for my [PRODUCT/SERVICE] targeting [TARGET_MARKET]. Focus on pain points, buying behavior, and solution preferences.',
      category: 'Market Research',
      tags: ['customer research', 'surveys', 'insights'],
      tier: 'free'
    },
    {
      id: 'f9',
      title: 'Daily Productivity Optimizer',
      content: 'Design a daily routine for a busy entrepreneur running a [BUSINESS_TYPE] business. Include time blocks for strategic work, operations, and personal development.',
      category: 'Productivity',
      tags: ['time management', 'routine', 'efficiency'],
      tier: 'free'
    },
    {
      id: 'f10',
      title: 'Elevator Pitch Creator',
      content: 'Write a compelling 60-second elevator pitch for my [BUSINESS_DESCRIPTION] that targets [IDEAL_CUSTOMER]. Make it memorable and action-oriented.',
      category: 'Sales & Pitching',
      tags: ['pitch', 'networking', 'sales'],
      tier: 'free'
    },

    // Pro Tier (additional 90 prompts - showing a sample)
    {
      id: 'p1',
      title: 'Advanced Competitive Analysis',
      content: 'Conduct a comprehensive competitive analysis for [BUSINESS_TYPE] in [MARKET]. Include direct/indirect competitors, SWOT analysis, pricing strategies, and market positioning opportunities.',
      category: 'Market Research',
      tags: ['competition', 'analysis', 'strategy', 'positioning'],
      tier: 'pro'
    },
    {
      id: 'p2',
      title: 'Investor Pitch Deck Optimizer',
      content: 'Review and optimize my pitch deck for [BUSINESS_TYPE] seeking [FUNDING_AMOUNT] in [FUNDING_STAGE]. Provide slide-by-slide feedback and improvement suggestions.',
      category: 'Funding',
      tags: ['investors', 'pitch deck', 'funding', 'optimization'],
      tier: 'pro'
    },
    {
      id: 'p3',
      title: 'Multi-State Tax Compliance',
      content: 'Create a compliance strategy for my [BUSINESS_TYPE] operating in [STATE_LIST]. Include nexus considerations, tax obligations, and registration requirements.',
      category: 'Tax & Compliance',
      tags: ['multi-state', 'nexus', 'compliance', 'strategy'],
      tier: 'pro'
    },
    {
      id: 'p4',
      title: 'Customer Journey Mapping',
      content: 'Map the complete customer journey for [PRODUCT/SERVICE] from awareness to advocacy. Include touchpoints, emotions, pain points, and optimization opportunities.',
      category: 'Marketing',
      tags: ['customer journey', 'experience', 'optimization', 'touchpoints'],
      tier: 'pro'
    },
    {
      id: 'p5',
      title: 'Financial Modeling & Projections',
      content: 'Build a 3-year financial model for [BUSINESS_TYPE] with [REVENUE_MODEL]. Include revenue projections, expense forecasting, cash flow analysis, and scenario planning.',
      category: 'Finance',
      tags: ['financial modeling', 'projections', 'cash flow', 'scenarios'],
      tier: 'pro'
    },

    // Premium Tier (additional 150 prompts - showing a sample)
    {
      id: 'pr1',
      title: 'AI-Powered Legal Document Analyzer',
      content: 'Analyze this legal document: [DOCUMENT_TEXT]. Identify key terms, potential risks, missing clauses, and suggest improvements. Flag any unusual or concerning provisions.',
      category: 'Legal',
      tags: ['legal analysis', 'document review', 'risk assessment', 'AI-powered'],
      tier: 'premium'
    },
    {
      id: 'pr2',
      title: 'Dynamic Market Entry Strategy',
      content: 'Develop a market entry strategy for [PRODUCT/SERVICE] in [TARGET_MARKET] considering [MARKET_CONDITIONS]. Include timing, pricing, distribution, and risk mitigation.',
      category: 'Strategy',
      tags: ['market entry', 'strategy', 'dynamic planning', 'risk management'],
      tier: 'premium'
    },
    {
      id: 'pr3',
      title: 'Automated Compliance Monitoring',
      content: 'Design an automated compliance monitoring system for [BUSINESS_TYPE] in [INDUSTRY]. Include key regulations, monitoring triggers, and escalation procedures.',
      category: 'Compliance',
      tags: ['automation', 'compliance', 'monitoring', 'regulations'],
      tier: 'premium'
    }
  ];

  const categories = [
    'all',
    'Business Formation',
    'Legal',
    'Marketing',
    'Finance',
    'Branding',
    'Tax & Compliance',
    'Business Planning',
    'Market Research',
    'Productivity',
    'Sales & Pitching',
    'Funding',
    'Strategy',
    'Compliance'
  ];

  // Filter prompts based on user tier and access
  const getAccessiblePrompts = () => {
    const tierLimits = {
      free: allPrompts.filter(p => p.tier === 'free'),
      pro: allPrompts.filter(p => p.tier === 'free' || p.tier === 'pro'),
      premium: allPrompts
    };
    return [...tierLimits[userTier], ...customPrompts];
  };

  const filteredPrompts = getAccessiblePrompts().filter(prompt => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUsePrompt = (prompt: Prompt) => {
    // Copy to clipboard
    navigator.clipboard.writeText(prompt.content);
    
    // Update usage stats
    setPromptStats(prev => ({
      ...prev,
      [prompt.id]: (prev[prompt.id] || 0) + 1
    }));

    // Redirect to chat with prefilled prompt
    const encodedPrompt = encodeURIComponent(prompt.content);
    window.location.href = `/chat?prefill=${encodedPrompt}`;
    
    toast({
      title: "Prompt Ready!",
      description: "Opening AI chat with your selected prompt...",
    });
  };

  const handleCopyPrompt = (prompt: Prompt) => {
    navigator.clipboard.writeText(prompt.content);
    toast({
      title: "Copied!",
      description: "Prompt copied to clipboard",
    });
  };

  const handleToggleFavorite = (promptId: string) => {
    setFavorites(prev => 
      prev.includes(promptId) 
        ? prev.filter(id => id !== promptId)
        : [...prev, promptId]
    );
  };

  const handleSaveCustomPrompt = (prompt: Omit<Prompt, 'id'>) => {
    const newPrompt: Prompt = {
      ...prompt,
      id: `custom_${Date.now()}`,
      isCustom: true,
      tier: userTier
    };
    setCustomPrompts(prev => [...prev, newPrompt]);
    toast({
      title: "Custom Prompt Saved!",
      description: "Your prompt has been added to your library",
    });
  };

  const getTierBadge = (tier: string) => {
    const badges = {
      free: <Badge className="bg-green-100 text-green-700">Free</Badge>,
      pro: <Badge className="bg-blue-100 text-blue-700">Pro</Badge>,
      premium: <Badge className="bg-purple-100 text-purple-700">Premium</Badge>
    };
    return badges[tier as keyof typeof badges];
  };

  const canAccessPremiumFeatures = userTier === 'premium';
  const canAccessProFeatures = userTier === 'pro' || userTier === 'premium';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <Play className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Prompt Playground
            {getTierBadge(userTier)}
          </DialogTitle>
          <DialogDescription>
            Interactive prompt library with {userTier === 'free' ? '10' : userTier === 'pro' ? '100' : '250+'} 
            prompts • {canAccessProFeatures ? 'Favorites & Search' : 'View & Copy'} 
            {canAccessPremiumFeatures ? ' • AI Playground & Custom Prompts' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[calc(90vh-120px)]">
          {/* Search and Filter Bar */}
          <div className="flex gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={!canAccessProFeatures}
              />
            </div>
            
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white dark:bg-slate-900"
              disabled={!canAccessProFeatures}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            {canAccessPremiumFeatures && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Prompt
              </Button>
            )}

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                const endpoint = userTier === 'free' 
                  ? '/api/download/prompt-playground-free'
                  : userTier === 'pro'
                  ? '/api/download/prompt-playground-pro'
                  : '/api/download/prompt-playground-premium';
                
                // Create a temporary link element to trigger download
                const link = document.createElement('a');
                link.href = endpoint;
                link.download = `prompt-library-${userTier}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>

          {/* Prompts Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-4 p-4">
              {filteredPrompts.map(prompt => (
                <div
                  key={prompt.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-slate-800"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{prompt.title}</h3>
                        {getTierBadge(prompt.tier)}
                        {prompt.isCustom && (
                          <Badge variant="outline" className="text-xs">Custom</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {prompt.category}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {prompt.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {canAccessProFeatures && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(prompt.id)}
                        className={favorites.includes(prompt.id) ? 'text-red-500' : 'text-slate-400'}
                      >
                        <Heart className={`h-4 w-4 ${favorites.includes(prompt.id) ? 'fill-current' : ''}`} />
                      </Button>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700 rounded p-3 mb-3">
                    <p className="text-sm font-mono">{prompt.content}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUsePrompt(prompt)}
                        className="flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Use Prompt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyPrompt(prompt)}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                      {canAccessPremiumFeatures && prompt.isCustom && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPrompt(prompt)}
                          className="flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                    </div>
                    
                    {canAccessPremiumFeatures && promptStats[prompt.id] && (
                      <span className="text-xs text-slate-500">
                        Used {promptStats[prompt.id]} times
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tier Upgrade Message */}
          {userTier === 'free' && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-t">
              <p className="text-sm text-center">
                <strong>Upgrade to Pro</strong> for 100 prompts, search & favorites • 
                <strong> Premium</strong> for 250+ prompts, AI playground & custom prompts
              </p>
            </div>
          )}
        </div>

        {/* Create Custom Prompt Dialog */}
        <CreatePromptDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSave={handleSaveCustomPrompt}
        />

        {/* Edit Custom Prompt Dialog */}
        {editingPrompt && (
          <EditPromptDialog
            prompt={editingPrompt}
            onClose={() => setEditingPrompt(null)}
            onSave={(updatedPrompt) => {
              setCustomPrompts(prev => 
                prev.map(p => p.id === editingPrompt.id ? { ...updatedPrompt, id: editingPrompt.id } : p)
              );
              setEditingPrompt(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Create Custom Prompt Dialog Component
const CreatePromptDialog = ({ isOpen, onClose, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: Omit<Prompt, 'id'>) => void;
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Business Formation');
  const [tags, setTags] = useState('');

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;
    
    onSave({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      tier: 'premium',
      isCustom: true
    });
    
    // Reset form
    setTitle('');
    setContent('');
    setCategory('Business Formation');
    setTags('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Custom Prompt</DialogTitle>
          <DialogDescription>
            Design your own AI prompt template with variables and save it to your library.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Custom Market Analysis"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="Business Formation">Business Formation</option>
              <option value="Legal">Legal</option>
              <option value="Marketing">Marketing</option>
              <option value="Finance">Finance</option>
              <option value="Strategy">Strategy</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Tags (comma-separated)</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., analysis, market, custom"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Prompt Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your prompt here. Use [VARIABLES] for dynamic content..."
              rows={6}
            />
            <p className="text-xs text-slate-500 mt-1">
              Tip: Use [BRACKETS] for variables like [BUSINESS_TYPE], [INDUSTRY], etc.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
            <Save className="h-4 w-4 mr-2" />
            Save Prompt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Edit Custom Prompt Dialog Component
const EditPromptDialog = ({ prompt, onClose, onSave }: {
  prompt: Prompt;
  onClose: () => void;
  onSave: (prompt: Omit<Prompt, 'id'>) => void;
}) => {
  const [title, setTitle] = useState(prompt.title);
  const [content, setContent] = useState(prompt.content);
  const [category, setCategory] = useState(prompt.category);
  const [tags, setTags] = useState(prompt.tags.join(', '));

  const handleSave = () => {
    onSave({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      tier: prompt.tier,
      isCustom: true
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Custom Prompt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Prompt title"
          />
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="Business Formation">Business Formation</option>
            <option value="Legal">Legal</option>
            <option value="Marketing">Marketing</option>
            <option value="Finance">Finance</option>
            <option value="Strategy">Strategy</option>
          </select>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma-separated)"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromptPlayground;