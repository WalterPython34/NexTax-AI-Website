import React, { useState, useEffect } from 'react';
import { Search, Copy, Play, Download, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  tier: 'free' | 'pro' | 'premium';
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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'free' | 'pro' | 'premium'>('free');
  const [showTierSelection, setShowTierSelection] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowTierSelection(true);
      setSearchTerm('');
      setSelectedCategory('all');
      setPrompts([]);
    }
  }, [isOpen]);

  // Fetch prompts from server based on selected tier
  useEffect(() => {
    if (isOpen && !showTierSelection) {
      fetchPrompts();
    }
  }, [isOpen, selectedTier, showTierSelection]);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const endpoint = `/api/download/prompt-playground-${selectedTier}`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const content = await response.text();
        const parsedPrompts = parsePromptsFromContent(content);
        setPrompts(parsedPrompts);
      } else {
        // Fallback to sample prompts if server fails
        setPrompts(getSamplePrompts());
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      setPrompts(getSamplePrompts());
    } finally {
      setIsLoading(false);
    }
  };

  const parsePromptsFromContent = (content: string): Prompt[] => {
    const lines = content.split('\n');
    const parsedPrompts: Prompt[] = [];
    let currentCategory = 'General';
    let promptCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for numbered prompts (format: "1. Prompt title?")
      const promptMatch = line.match(/^(\d+)\.\s+(.+?)$/);
      if (promptMatch) {
        const [, number, promptTitle] = promptMatch;
        
        // Look for the category line that follows (format: "   Category: Business Formation & Legal")
        let category = 'General';
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const categoryMatch = nextLine.match(/^Category:\s+(.+)$/);
          if (categoryMatch) {
            category = categoryMatch[1];
          }
        }
        
        parsedPrompts.push({
          id: `prompt-${promptCounter++}`,
          title: promptTitle.trim(),
          content: promptTitle.trim(), // Using title as content for now
          category: category,
          tags: [category.toLowerCase().replace(/\s+/g, '-')],
          tier: selectedTier
        });
      }
    }

    // If parsing succeeds, return parsed prompts, otherwise return sample prompts
    return parsedPrompts.length > 0 ? parsedPrompts : getSamplePrompts();
  };

  const getSamplePrompts = (): Prompt[] => {
    const samplePrompts: Prompt[] = [
      {
        id: 'f1',
        title: 'Business Idea Validator',
        content: 'Analyze this business idea: [BUSINESS_IDEA]. Provide honest feedback on market viability, potential challenges, and suggested improvements.',
        category: 'Business Formation',
        tags: ['validation', 'market research'],
        tier: 'free'
      },
      {
        id: 'f2',
        title: 'LLC vs Corporation Decision',
        content: 'Help me decide between forming an LLC or Corporation for my [BUSINESS_TYPE] business in [STATE]. Consider tax implications, liability protection, and operational complexity.',
        category: 'Legal',
        tags: ['entity formation', 'legal structure'],
        tier: 'free'
      },
      {
        id: 'f3',
        title: 'Target Market Analysis',
        content: 'Analyze the target market for [PRODUCT/SERVICE]. Include demographics, market size, buying behavior, and preferred marketing channels.',
        category: 'Market Research',
        tags: ['market analysis', 'demographics'],
        tier: 'free'
      },
      {
        id: 'f4',
        title: 'Basic Marketing Strategy',
        content: 'Create a marketing strategy for [BUSINESS_TYPE] targeting [TARGET_AUDIENCE]. Include key messaging, channels, and budget allocation suggestions.',
        category: 'Marketing',
        tags: ['marketing', 'strategy'],
        tier: 'free'
      },
      {
        id: 'f5',
        title: 'Business Name Generator',
        content: 'Generate 10 creative business names for my [BUSINESS_DESCRIPTION] company. Ensure names are memorable, brandable, and likely available for domain registration.',
        category: 'Branding',
        tags: ['naming', 'branding'],
        tier: 'free'
      },
      {
        id: 'p1',
        title: 'Advanced Competitive Analysis',
        content: 'Conduct a comprehensive competitive analysis for [BUSINESS_TYPE] in [MARKET]. Include direct/indirect competitors, SWOT analysis, pricing strategies, and market positioning opportunities.',
        category: 'Market Research',
        tags: ['competition', 'analysis', 'strategy'],
        tier: 'pro'
      },
      {
        id: 'p2',
        title: 'Investor Pitch Deck Optimizer',
        content: 'Review and optimize my pitch deck for [BUSINESS_TYPE] seeking [FUNDING_AMOUNT] in [FUNDING_STAGE]. Provide slide-by-slide feedback and improvement suggestions.',
        category: 'Funding',
        tags: ['investors', 'pitch deck', 'funding'],
        tier: 'pro'
      },
      {
        id: 'p3',
        title: 'Customer Journey Mapping',
        content: 'Map the complete customer journey for [PRODUCT/SERVICE] from awareness to advocacy. Include touchpoints, emotions, pain points, and optimization opportunities.',
        category: 'Marketing',
        tags: ['customer journey', 'experience'],
        tier: 'pro'
      },
      {
        id: 'pr1',
        title: 'AI-Powered Legal Document Analyzer',
        content: 'Analyze this legal document: [DOCUMENT_TEXT]. Identify key terms, potential risks, missing clauses, and suggest improvements. Flag any unusual or concerning provisions.',
        category: 'Legal',
        tags: ['legal analysis', 'document review', 'AI-powered'],
        tier: 'premium'
      },
      {
        id: 'pr2',
        title: 'Dynamic Market Entry Strategy',
        content: 'Develop a market entry strategy for [PRODUCT/SERVICE] in [TARGET_MARKET] considering [MARKET_CONDITIONS]. Include timing, pricing, distribution, and risk mitigation.',
        category: 'Strategy',
        tags: ['market entry', 'strategy', 'dynamic planning'],
        tier: 'premium'
      }
    ];

    // Return prompts based on selected tier
    switch (selectedTier) {
      case 'free':
        return samplePrompts.filter(p => p.tier === 'free');
      case 'pro': 
        return samplePrompts.filter(p => p.tier === 'free' || p.tier === 'pro');
      case 'premium':
        return samplePrompts;
      default:
        return samplePrompts.filter(p => p.tier === 'free');
    }
  };

  const availablePrompts = prompts.length > 0 ? prompts : getSamplePrompts();
  
  const filteredPrompts = availablePrompts.filter((prompt: Prompt) => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'Business Formation', 'Legal', 'Marketing', 'Finance', 'Branding', 'Market Research', 'Funding', 'Strategy'];

  const handleUsePrompt = (prompt: Prompt) => {
    navigator.clipboard.writeText(prompt.content);
    toast({
      title: "Prompt copied to clipboard!",
      description: "Navigate to the AI Chat to paste and use this prompt.",
    });
  };

  const handleCopyPrompt = (prompt: Prompt) => {
    navigator.clipboard.writeText(prompt.content);
    toast({
      title: "Copied!",
      description: "Prompt has been copied to your clipboard.",
    });
  };

  if (!isOpen) return null;

  const getTierInfo = (tier: 'free' | 'pro' | 'premium') => {
    switch (tier) {
      case 'free':
        return { count: '10 essential prompts', features: 'View & copy prompts' };
      case 'pro':
        return { count: '100 categorized prompts', features: 'Interactive playground + favorites' };
      case 'premium':
        return { count: '250+ expert prompts', features: 'AI playground + custom prompts' };
    }
  };

  const handleTierSelect = (tier: 'free' | 'pro' | 'premium') => {
    setSelectedTier(tier);
    setShowTierSelection(false);
  };

  const currentTierInfo = getTierInfo(selectedTier);

  if (showTierSelection) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-purple-500" />
              Prompt Playground
            </DialogTitle>
            <DialogDescription>
              Choose your access level to unlock different features and capabilities.
            </DialogDescription>
          </DialogHeader>

          {/* Tier Selection */}
          <div className="grid grid-cols-3 gap-4 py-6">
            {/* Free Tier */}
            <div className="text-center">
              <div className="border rounded-lg p-4 hover:border-emerald-300 cursor-pointer" onClick={() => handleTierSelect('free')}>
                <Badge variant="secondary" className="mb-2">Free</Badge>
                <h3 className="font-semibold mb-2">Free Tier</h3>
                <p className="text-sm text-gray-600 mb-3">10 essential prompts • View & copy prompts</p>
                <p className="text-xs text-gray-500 mb-4">Get started with our curated collection of essential prompts and resources.</p>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                  <Download className="h-4 w-4 mr-2" />
                  Read Now
                </Button>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="text-center">
              <div className="border rounded-lg p-4 hover:border-emerald-300 cursor-pointer" onClick={() => handleTierSelect('pro')}>
                <Badge variant="secondary" className="mb-2">Pro</Badge>
                <h3 className="font-semibold mb-2">Pro Tier</h3>
                <p className="text-sm text-gray-600 mb-3">100 categorized prompts • Interactive playground + favorites</p>
                <p className="text-xs text-gray-500 mb-4">Advanced tools with professional features and enhanced functionality.</p>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                  <Download className="h-4 w-4 mr-2" />
                  Read Now
                </Button>
              </div>
            </div>

            {/* Premium Tier */}
            <div className="text-center">
              <div className="border rounded-lg p-4 hover:border-emerald-300 cursor-pointer" onClick={() => handleTierSelect('premium')}>
                <Badge variant="secondary" className="mb-2">Premium</Badge>
                <h3 className="font-semibold mb-2">Premium Tier</h3>
                <p className="text-sm text-gray-600 mb-3">250+ expert prompts • AI playground + custom prompts</p>
                <p className="text-xs text-gray-500 mb-4">Complete access with AI-powered features and unlimited capabilities.</p>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                  <Download className="h-4 w-4 mr-2" />
                  Read Now
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-purple-500" />
                Prompt Playground
                <Badge variant="secondary">{selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}</Badge>
              </DialogTitle>
              <DialogDescription>
                Interactive prompt library with {currentTierInfo.count} • {currentTierInfo.features}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTierSelection(true)}>
                <Star className="h-4 w-4 mr-2" />
                Change Tier
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const endpoint = `/api/download/prompt-playground-${selectedTier}`;
                  
                  // Create a temporary link element to trigger download
                  const link = document.createElement('a');
                  link.href = endpoint;
                  link.download = `prompt-library-${selectedTier}.txt`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
          >
            <option value="all">All Categories</option>
            {categories.slice(1).map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Prompts List */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading prompts...</div>
          ) : filteredPrompts.length > 0 ? (
            filteredPrompts.map((prompt: Prompt) => (
              <div key={prompt.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{prompt.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {prompt.category}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {prompt.tier === 'free' ? 'Free' : prompt.tier === 'pro' ? 'Pro' : 'Premium'}
                      </Badge>
                      {prompt.tags.map((tag: string) => (
                        <span key={tag} className="text-xs text-gray-500">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm leading-relaxed">
                  {prompt.content}
                </p>
                
                <div className="flex gap-2">
                  <Button size="sm" className="bg-teal-500 hover:bg-teal-600" onClick={() => handleUsePrompt(prompt)}>
                    <Play className="h-3 w-3 mr-1" />
                    Use Prompt
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleCopyPrompt(prompt)}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No prompts found matching your search.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-4 text-sm text-gray-500 text-center">
          Current tier: <strong>{userTier.charAt(0).toUpperCase() + userTier.slice(1)}</strong> • 
          {userTier === 'free' && <span> Upgrade to Pro for more prompts and search features</span>}
          {userTier === 'pro' && <span> Upgrade to Premium for advanced AI features</span>}
          {userTier === 'premium' && <span> You have access to all features!</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromptPlayground;