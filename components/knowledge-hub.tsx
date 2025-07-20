"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Book,
  BookOpen,
  Lightbulb,
  Users,
  Map,
  Building,
  Building2,
  Globe,
  FileText,
  BadgeIcon as IdCard,
  Handshake,
  DollarSign,
  ChevronRight,
  Clock,
  ExternalLink,
  Bot,
  Brain,
  Zap,
  Crown,
  Download,
  Sparkles,
  Lock,
  Star,
  ChevronDown,
  Eye,
  AlertTriangle,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import PromptPlayground from "./PromptPlaygroundSimple"
import { useLocation } from "wouter"
import AutomationTemplates from "./AutomationTemplates"
import ProAutomationTemplates from "./ProAutomationTemplates"
import PremiumAutomationTemplates from "./PremiumAutomationTemplates"

// Disclaimer configuration for Knowledge Hub resources
const DISCLAIMERS = {
  "Business Model Canvas":
    "This content is for educational purposes only and does not constitute business or financial advice.",
  "Market Research Essentials":
    "Information provided is for general guidance only and may not apply to your specific business situation.",
  "Business Idea Validation":
    "Information provided is for general guidance only and may not apply to your specific business situation.",
  "Finding Co-founders":
    "Information provided is for general guidance only and may not apply to your specific business situation.",
  "Entity Formation Guide":
    "This resource does not constitute legal advice. Please consult an attorney before taking legal action.",
  "Licenses & Permits":
    "Disclaimer: This guide provides general licensing information and is not a substitute for legal or professional advice.",
  "Contracts & Agreements":
    "Use of these templates is at your own risk. Always consult a legal professional for binding agreements.",
  "Payroll Basics & Compliance":
    "Tax-related guidance may vary by state or business structure. Please consult a tax advisor.",
}

const featuredResources = [
  {
    id: 1,
    title: "LLC vs S-Corp: Complete Guide",
    description: "Understand the key differences and choose the right entity structure for your business.",
    category: "Essential",
    categoryColor: "bg-emerald-500",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=200",
  },
  {
    id: 2,
    title: "Tax Setup for New Businesses",
    description: "Step-by-step guide to EIN application, tax elections, and compliance requirements.",
    category: "Financial",
    categoryColor: "bg-emerald-500",
    readTime: "12 min read",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=200",
  },
  {
    id: 3,
    title: "Market Research Essentials",
    description: "Learn how to validate your business idea and understand your target market.",
    category: "Strategy",
    categoryColor: "bg-purple-500",
    readTime: "15 min read",
    image: "https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=200",
  },
]

const knowledgeCategories = [
  {
    title: "Getting Started",
    items: [
      {
        icon: Lightbulb,
        name: "Business Idea Validation",
        color: "text-amber-500",
        gatingLabel: "🔓 Free Reading",
        tiers: {
          free: {
            available: true,
            title: "Basic Idea Validation",
            description: "Essential validation steps, MVP basics, customer discovery",
            format: "In-app reader",
          },
          pro: {
            available: true,
            title: "Advanced Validation Tools",
            description: "MVP testing, scoring frameworks, segment analysis",
            format: "In-app reader + templates",
          },
          premium: {
            available: true,
            title: "Investor-Grade Validation",
            description: "Validation summary, AI SWOT analysis, positioning brief",
            format: "Interactive tools + automation",
          },
        },
      },
      {
        icon: Search,
        name: "Market Research Essentials",
        color: "text-emerald-500",
        gatingLabel: "🔓 Free Reading",
        tiers: {
          free: {
            available: true,
            title: "Basic Market Research",
            description: "Essential market validation steps",
            format: "In-app reader",
          },
          pro: {
            available: true,
            title: "Advanced Market Research",
            description: "GTM planning, competitive analysis",
            format: "In-app reader + templates",
          },
          premium: {
            available: true,
            title: "Complete Market Research",
            description: "Full market mapping, AI intelligence",
            format: "Interactive tools + automation",
          },
        },
      },
      {
        icon: Users,
        name: "Finding Co-founders",
        color: "text-blue-500",
        gatingLabel: "🔓 Free Reading",
        tiers: {
          free: {
            available: true,
            title: "Basic Co-founder Guide",
            description: "Essential steps to find the right co-founder",
            format: "In-app reader",
          },
          pro: {
            available: true,
            title: "Advanced Co-founder Tools",
            description: "Pitch templates, roles matrix, decision frameworks",
            format: "In-app reader + templates",
          },
          premium: {
            available: true,
            title: "Complete Co-founder System",
            description: "Legal bootcamp, AI risk assessment, automated outreach",
            format: "Interactive tools + automation",
          },
        },
      },
      {
        icon: Map,
        name: "Business Model Canvas",
        color: "text-green-500",
        gatingLabel: "🔓 Free Reading",
        tiers: {
          free: {
            available: true,
            title: "Basic BMC Framework",
            description: "9 key building blocks for business planning",
            format: "In-app reader",
          },
          pro: {
            available: true,
            title: "Advanced BMC Tools",
            description: "Industry examples, pitfalls, AI critique prompts",
            format: "In-app reader + templates",
          },
          premium: {
            available: true,
            title: "Complete BMC System",
            description: "Investor integration, Lean Canvas mapping, AI SWOT analysis",
            format: "Interactive tools + automation",
          },
        },
      },
    ],
  },
  {
    title: "Legal & Compliance",
    items: [
      {
        icon: Building,
        name: "Entity Formation Guide",
        color: "text-emerald-500",
        gatingLabel: "🔓 Free Reading",
        tiers: {
          free: {
            available: true,
            title: "Basic Entity Formation",
            description: "LLC vs Corporation basics, registration steps, EIN guide",
            format: "In-app reader",
          },
          pro: {
            available: true,
            title: "Advanced Entity Structures",
            description: "Multi-member structures, foreign qualification, bylaws templates",
            format: "In-app reader + templates",
          },
          premium: {
            available: true,
            title: "Investor-Ready Formation",
            description: "Delaware C-Corp setup, 83(b) elections, legal stack automation",
            format: "Interactive tools + automation",
          },
        },
      },
      {
        icon: IdCard,
        name: "Licenses & Permits",
        color: "text-orange-500",
        gatingLabel: "🔓 Free Reading",
        tiers: {
          free: {
            available: true,
            title: "Basic License Guide",
            description: "License types, finding requirements, AI prompts",
            format: "In-app reader",
          },
          pro: {
            available: true,
            title: "Advanced Permit Tools",
            description: "Sales tax permits, industry tools, renewal planning",
            format: "In-app reader + templates",
          },
          premium: {
            available: true,
            title: "Complete Permit System",
            description: "Automation stack, multistate compliance, permit dashboards",
            format: "Interactive tools + automation",
          },
        },
      },
      {
        icon: Handshake,
        name: "Contracts & Agreements",
        color: "text-purple-500",
        gatingLabel: "🔓 Free Reading",
        tiers: {
          free: {
            available: true,
            title: "Basic Contract Guide",
            description: "Essential contracts, NDAs, service agreements, AI prompts",
            format: "In-app reader",
          },
          pro: {
            available: true,
            title: "Advanced Contract Tools",
            description: "Founder agreements, contractor clauses, MSA templates",
            format: "In-app reader + templates",
          },
          premium: {
            available: true,
            title: "Complete Contract System",
            description: "AI-powered legal review, dynamic builders, automation templates",
            format: "Interactive tools + automation",
          },
        },
      },
      {
        icon: DollarSign,
        name: "Payroll Basics & Compliance",
        color: "text-green-500",
        gatingLabel: "🔓 Free Reading",
        tiers: {
          free: {
            available: true,
            title: "Basic Payroll Guide",
            description: "W-2 vs 1099, pay frequency, startup checklist",
            format: "In-app reader",
          },
          pro: {
            available: true,
            title: "Advanced Payroll Tools",
            description: "Provider comparison, tax calendars, state registration",
            format: "In-app reader + templates",
          },
          premium: {
            available: true,
            title: "Complete Payroll System",
            description: "Multistate compliance, global contractors, HR/payroll stack",
            format: "Interactive tools + automation",
          },
        },
      },
    ],
  },
  {
    title: "AI Resources",
    items: [
      {
        icon: Brain,
        name: "Prompt Playground",
        color: "text-indigo-500",
        gatingLabel: "🔓 Free Preview",
        tiers: {
          free: { available: true, limit: "10 basic prompts", format: "View & copy prompts" },
          pro: { available: true, limit: "100 prompts", format: "Interactive playground + favorites" },
          premium: { available: true, limit: "250+ prompts", format: "AI playground + custom prompts" },
        },
      },
      {
        icon: Bot,
        name: "AI Provider Directory",
        color: "text-cyan-500",
        gatingLabel: "🔓 Free Download",
        tiers: {
          free: { available: true, limit: "Basic listings", format: "PDF download" },
          pro: { available: true, limit: "Detailed comparisons", format: "Interactive comparison tool" },
          premium: { available: true, limit: "Custom recommendations", format: "AI-powered provider matching" },
        },
      },
      {
        icon: Zap,
        name: "Automation Templates",
        color: "text-violet-500",
        gatingLabel: "🔓 Free Templates",
        tiers: {
          free: {
            available: true,
            title: "Foundational Templates",
            description:
              "New hire checklist, basic CRM tracker, meeting agendas, simple invoice generator, social media calendar",
            format: "5 essential templates + download",
            limit: "5 templates",
          },
          pro: {
            available: true,
            title: "Professional Business Tools",
            description:
              "Chart of accounts generator, expense tracker setup, social media calendar, startup checklist builder, equity calculator, email series, pitch deck writer, policy generator",
            format: "8 professional templates + customization",
            limit: "8 templates",
          },
          premium: {
            available: true,
            title: "Executive AI-Enhanced Systems",
            description:
              "Investor one-pager generator, grant application writer, due diligence doc pack, KPI dashboard, CRM scripts, AI marketing plan, launch roadmapper",
            format: "7 executive templates + AI generation",
            limit: "7 templates + AI",
          },
        },
      },
      {
        icon: BookOpen,
        name: "Prompt Engineering Library",
        color: "text-purple-500",
        gatingLabel: "🔓 Free Preview",
        tiers: {
          free: { available: true, limit: "10 essential prompts", format: "View & copy prompts" },
          pro: { available: true, limit: "100 categorized prompts", format: "Interactive playground + favorites" },
          premium: { available: true, limit: "250+ expert prompts", format: "AI playground + custom prompts" },
        },
      },
    ],
  },
  {
    title: "External Resources",
    items: [
      {
        icon: Building2,
        name: "IRS Business Structures",
        color: "text-blue-600",
        url: "https://www.irs.gov/businesses/small-businesses-self-employed/business-structures",
        external: true,
      },
      {
        icon: Globe,
        name: "SBA.gov Resources",
        color: "text-green-600",
        url: "https://www.sba.gov/",
        external: true,
      },
    ],
  },
]

const quickLinks = [
  {
    name: "IRS Business Structures",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/business-structures",
    external: true,
  },
  { name: "SBA.gov Resources", url: "https://www.sba.gov/", external: true },
]

const stateFilingRequirements = [
  {
    state: "Alabama",
    llc: "Form 65 (partnership return) if multi-member; no state income tax return for single-member unless elected as corporation.",
    sCorp: "Form 20S for state income tax (5% rate). Owners report income on personal returns.",
    cCorp: "Form 20 for corporate income tax (6.5% rate). Annual Business Privilege Tax (Form PPT) required.",
    franchiseTax: "Business Privilege Tax due April 15 or 2.5 months after fiscal year-end.",
    annualReport: "Required with Business Privilege Tax filing, due same date.",
    links: [
      { name: "Alabama Department of Revenue – Business Taxes", url: "https://www.revenue.alabama.gov/business/" },
      { name: "Business Privilege Tax Forms", url: "https://www.revenue.alabama.gov/business/business-privilege-tax/" },
      {
        name: "Secretary of State – Annual Reports",
        url: "https://www.sos.alabama.gov/business-services/annual-reports",
      },
    ],
  },
  {
    state: "Alaska",
    llc: "No state income tax. File federal returns only (Form 1065 for partnerships, Schedule C for single-member).",
    sCorp: "No state income tax; file federal Form 1120S. Owners report income on personal returns.",
    cCorp: "Corporate income tax (2-9.4% based on income). File Form 6000.",
    franchiseTax: "None.",
    annualReport: "Due biennially by July 1 in odd-numbered years; $100 fee.",
    links: [
      { name: "Alaska Department of Revenue – Tax Division", url: "https://www.tax.alaska.gov/" },
      { name: "Corporations Business License", url: "https://www.commerce.alaska.gov/web/cbpl/" },
      {
        name: "Secretary of State – Biennial Reports",
        url: "https://www.commerce.alaska.gov/web/cbpl/BusinessLicenseSearch.aspx",
      },
    ],
  },
  {
    state: "Arizona",
    llc: "Form 165 (partnership return) if multi-member; no state return for single-member unless electing corporate taxation.",
    sCorp: "Form 120S (5% rate on pass-through income). Owners report on personal returns.",
    cCorp: "Form 120 for corporate income tax (4.9% flat rate).",
    franchiseTax: "None.",
    annualReport: "Due annually by anniversary of formation; $45 fee for LLCs, $100 for corporations.",
    links: [
      { name: "Arizona Department of Revenue – Business Taxes", url: "https://azdor.gov/business" },
      { name: "Corporation Commission – Annual Reports", url: "https://ecorp.azcc.gov/" },
    ],
  },
  {
    state: "Arkansas",
    llc: "Form AR1050 (partnership return); no state return for single-member unless electing corporate taxation.",
    sCorp: "Form AR1100S (6.5% max rate on pass-through income).",
    cCorp: "Form AR1100CT for corporate income tax (1-6.5% graduated rate).",
    franchiseTax: "Annual franchise tax due May 1; based on capital stock.",
    annualReport: "Due with franchise tax by May 1; $150 fee for corporations.",
    links: [
      { name: "Arkansas Department of Finance – Tax Division", url: "https://www.dfa.arkansas.gov/income-tax/" },
      { name: "Franchise Tax Information", url: "https://www.dfa.arkansas.gov/franchise-tax/" },
      { name: "Secretary of State – Annual Reports", url: "https://www.sos.arkansas.gov/business-services" },
    ],
  },
  {
    state: "California",
    llc: "Form 568; pay $800 minimum franchise tax (waived first year through 2023) plus additional tax if gross receipts exceed $250,000.",
    sCorp: "Form 100S; 1.5% tax on net income plus $800 minimum franchise tax.",
    cCorp: "Form 100; 8.84% tax on net income plus $800 minimum franchise tax.",
    franchiseTax: "$800 minimum due annually by April 15; additional tax for LLCs based on gross receipts.",
    annualReport: "LLCs file Form SI-200 biennially ($20 fee); corporations file annually ($25 fee).",
    links: [
      { name: "California Franchise Tax Board", url: "https://www.ftb.ca.gov/" },
      { name: "Franchise Tax Information", url: "https://www.ftb.ca.gov/businesses/" },
      { name: "Secretary of State – Business Filings", url: "https://businesssearch.sos.ca.gov/" },
    ],
  },
  {
    state: "Colorado",
    llc: "Form DR 0106 (partnership return); no state return for single-member unless electing corporate taxation.",
    sCorp: "Form DR 0112 (4.55% flat rate on pass-through income).",
    cCorp: "Form DR 0112 for corporate income tax (4.55% flat rate).",
    franchiseTax: "None.",
    annualReport: "Due annually by anniversary of formation; $10 fee.",
    links: [
      { name: "Colorado Department of Revenue – Taxation", url: "https://www.colorado.gov/pacific/tax" },
      { name: "Secretary of State – Business Filings", url: "https://www.sos.state.co.us/biz" },
    ],
  },
  {
    state: "Delaware",
    llc: "No state income tax for pass-through LLCs; file Form 1100 if electing corporate taxation. Annual tax of $300 due June 1.",
    sCorp: "Form 1100S; no state income tax on pass-through income.",
    cCorp: "Form 1100 for corporate income tax (8.7% rate).",
    franchiseTax: "Due annually by March 1; $175-$250,000 based on shares or capital.",
    annualReport: "Due with franchise tax by March 1; $50 fee for corporations.",
    links: [
      { name: "Delaware Division of Revenue", url: "https://revenue.delaware.gov/" },
      { name: "Franchise Tax Information", url: "https://revenue.delaware.gov/services/current_year_fra_tax.shtml" },
      { name: "Division of Corporations", url: "https://corp.delaware.gov/" },
    ],
  },
  {
    state: "Florida",
    llc: "No state income tax for pass-through LLCs; file Form F-1065 if multi-member.",
    sCorp: "No state income tax; file federal Form 1120S.",
    cCorp: "Form F-1120 for corporate income tax (5.5% rate).",
    franchiseTax: "None.",
    annualReport: "Due May 1; $138.75 fee for LLCs, $150 for corporations.",
    links: [
      { name: "Florida Department of Revenue", url: "https://floridarevenue.com/" },
      { name: "Sunbiz – Annual Reports", url: "https://dos.myflorida.com/sunbiz/" },
    ],
  },
  {
    state: "Georgia",
    llc: "Form 600S (partnership return); no state return for single-member unless electing corporate taxation.",
    sCorp: "Form 600S (6% rate on pass-through income).",
    cCorp: "Form 600 for corporate income tax (5.75% rate).",
    franchiseTax: "Net worth tax due annually by April 15; $10-$5,000 based on net worth.",
    annualReport: "Due April 1; $50 fee.",
    links: [
      { name: "Georgia Department of Revenue", url: "https://dor.georgia.gov/" },
      { name: "Net Worth Tax", url: "https://dor.georgia.gov/net-worth-tax" },
      { name: "Secretary of State – Annual Reports", url: "https://sos.ga.gov/corporations" },
    ],
  },
  {
    state: "Illinois",
    llc: "Form IL-1065; 1.5% replacement tax applies.",
    sCorp: "Form IL-1120-ST (1.5% replacement tax).",
    cCorp: "Form IL-1120 for corporate income tax (7% rate) plus 2.5% replacement tax.",
    franchiseTax: "Included in annual report fee; due March 1.",
    annualReport: "Due annually by anniversary; $75 fee for LLCs, $150 for corporations.",
    links: [
      { name: "Illinois Department of Revenue", url: "https://www2.illinois.gov/rev" },
      {
        name: "Secretary of State – Business Services",
        url: "https://www.cyberdriveillinois.com/departments/business_services/",
      },
    ],
  },
  {
    state: "New York",
    llc: "Form IT-204-LL; publication requirement in two newspapers for new LLCs.",
    sCorp: "Form CT-3-S (6.5% rate on pass-through income).",
    cCorp: "Form CT-3 for corporate income tax (6.5% rate).",
    franchiseTax: "Fixed dollar minimum tax and tax on income.",
    annualReport: "Biennial statement due by anniversary; $9 fee.",
    links: [
      { name: "New York State Department of Taxation and Finance", url: "https://www.tax.ny.gov/" },
      { name: "Secretary of State – Corporations", url: "https://www.dos.ny.gov/corps/" },
    ],
  },
  {
    state: "Texas",
    llc: "No state income tax; file federal returns only.",
    sCorp: "No state income tax; file federal Form 1120S.",
    cCorp: "Franchise tax based on margin (0.375-0.75% rate).",
    franchiseTax: "Due May 15; based on margin calculation.",
    annualReport: "No annual report required for most entities.",
    links: [
      { name: "Texas Comptroller – Business Taxes", url: "https://comptroller.texas.gov/taxes/" },
      { name: "Secretary of State – Business Filings", url: "https://www.sos.state.tx.us/corp/" },
    ],
  },
]

const businessLicenseLookup = [
  {
    state: "Alabama",
    link: "https://arc-sos.state.al.us/cgi/corpname.mbr/input",
    description:
      "The Alabama Secretary of State offers a business entity search to verify registered businesses (corporations, LLCs, etc.). For specific licenses, contact local county probate offices, as Alabama's business licenses are often issued at the county level.",
  },
  {
    state: "Alaska",
    link: "https://www.commerce.alaska.gov/web/cbpl/BusinessLicenseSearch.aspx",
    description:
      "The Alaska Department of Commerce, Community, and Economic Development provides a search tool for business licenses and professional licenses. You can search by license number, business name, or owner.",
  },
  {
    state: "Arizona",
    link: "https://ecorp.azcc.gov/EntitySearch/Index",
    description:
      "Use the Arizona Corporation Commission's eCorp system to search for registered businesses. For specific licenses (e.g., contractor, professional), check with the Arizona Registrar of Contractors or relevant licensing boards.",
  },
  {
    state: "Arkansas",
    link: "https://www.sos.arkansas.gov/corps/search_all.php",
    description:
      "The Arkansas Secretary of State provides a business entity search for corporations and LLCs. Business licenses are typically issued by local governments, so contact city or county offices for specific license verification.",
  },
  {
    state: "California",
    link: "https://bizfileonline.sos.ca.gov/search/business",
    description:
      "The California Secretary of State's BizFile Online allows searches for registered businesses. For business licenses, check with local city or county offices, as California does not have a statewide general business license lookup. Professional licenses can be verified via the Department of Consumer Affairs.",
  },
  {
    state: "Colorado",
    link: "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do",
    description:
      "The Colorado Secretary of State offers a business entity search. Business licenses are managed locally, so contact city or county clerks for license verification. Professional licenses can be checked via the Department of Regulatory Agencies.",
  },
  {
    state: "Connecticut",
    link: "https://service.ct.gov/business/s/onestop",
    description:
      "The Connecticut Secretary of State provides a business records search for registered entities. For specific licenses, check with local municipalities or the Department of Consumer Protection for professional licenses.",
  },
  {
    state: "Delaware",
    link: "https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx",
    description:
      "The Delaware Division of Corporations offers a business entity search. For business licenses, contact the Division of Revenue or local governments, as licenses vary by locality.",
  },
  {
    state: "Florida",
    link: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
    description:
      "The Florida Division of Corporations (Sunbiz) provides a search tool for businesses. Local business tax receipts (licenses) are issued by counties or cities, so contact local tax collectors for verification. Professional licenses can be checked via the Department of Business and Professional Regulation.",
  },
  {
    state: "Georgia",
    link: "https://ecorp.sos.ga.gov/BusinessSearch",
    description:
      "The Georgia Secretary of State offers a business entity search. Business licenses are typically issued by local governments, so check with county or city offices. Professional licenses are managed by the Georgia Professional Licensing Boards.",
  },
  {
    state: "Hawaii",
    link: "https://hbe.ehawaii.gov/documents/search.html",
    description:
      "The Hawaii Department of Commerce and Consumer Affairs provides a business entity search. For general business licenses (GET licenses), use the same portal. Professional licenses can also be verified here.",
  },
  {
    state: "Idaho",
    link: "https://sosbiz.idaho.gov/search/business",
    description:
      "The Idaho Secretary of State offers a business search tool. Business licenses are often issued locally, so contact city or county offices. Professional licenses can be checked via the Division of Occupational and Professional Licenses.",
  },
  {
    state: "Illinois",
    link: "https://www.ilsos.gov/corporatellc/",
    description:
      "The Illinois Secretary of State provides a business entity search. Business licenses are managed by local governments, so contact city or county offices. Professional licenses are verified through the Illinois Department of Financial and Professional Regulation.",
  },
  {
    state: "Indiana",
    link: "https://bsd.sos.in.gov/PublicBusinessSearch",
    description:
      "The Indiana Secretary of State offers a business search tool. Local licenses are required in some counties/cities, so verify with local authorities. Professional licenses can be checked via the Professional Licensing Agency.",
  },
  {
    state: "Iowa",
    link: "https://sos.iowa.gov/search/business/search.aspx",
    description:
      "The Iowa Secretary of State provides a business entity search. Business licenses are often local, so contact city or county offices. Professional licenses are managed by the Iowa Professional Licensing Bureau.",
  },
  {
    state: "Kansas",
    link: "https://www.kansas.gov/bess/flow/main?execution=e1s1",
    description:
      "The Kansas Secretary of State offers a business search tool. Business licenses may be required locally, so check with city or county offices. Professional licenses are verified via the Kansas Board of Healing Arts or other boards.",
  },
  {
    state: "Kentucky",
    link: "https://web.sos.ky.gov/bussearchnew/",
    description:
      "The Kentucky Secretary of State provides a business search tool. Local occupational licenses are required in many counties/cities, so verify locally. Professional licenses are managed by the Kentucky Board of Licensure.",
  },
  {
    state: "Louisiana",
    link: "https://coraweb.sos.la.gov/commercialsearch/commercialsearch.aspx",
    description:
      "The Louisiana Secretary of State offers a business filings search. Local licenses are required, so contact parish or city offices. Professional licenses can be verified via the Louisiana State Board of Contractors.",
  },
  {
    state: "Maine",
    link: "https://icrs.informe.org/nei-sos-icrs/ICRS?MainPage=x",
    description:
      "The Maine Secretary of State provides a business entity search. Local licenses are required in many municipalities, so check with city/town offices. Professional licenses are managed by the Office of Professional and Occupational Regulation.",
  },
  {
    state: "Maryland",
    link: "https://egov.maryland.gov/BusinessExpress/EntitySearch",
    description:
      "The Maryland Department of Assessments and Taxation offers a business entity search. Local licenses are required, so contact county or city offices. Professional licenses are verified via the Maryland Department of Labor.",
  },
  {
    state: "Massachusetts",
    link: "https://corp.sec.state.ma.us/CorpWeb/CorpSearch/CorpSearch.aspx",
    description:
      "The Massachusetts Secretary of the Commonwealth provides a business search tool. Local business licenses are issued by cities/towns, so verify locally. Professional licenses are managed by the Division of Professional Licensure.",
  },
  {
    state: "Michigan",
    link: "https://cofs.lara.state.mi.us/SearchApi/Search/Search",
    description:
      "The Michigan Department of Licensing and Regulatory Affairs (LARA) offers a business entity search. Local licenses may be required, so check with city/county offices. Professional licenses are also verified via LARA.",
  },
  {
    state: "Minnesota",
    link: "https://mblsportal.sos.state.mn.us/Business/SearchIndex",
    description:
      "The Minnesota Secretary of State provides a business search tool. Local licenses are required in some cities, so verify locally. Professional licenses are managed by the Minnesota Department of Commerce.",
  },
  {
    state: "Mississippi",
    link: "https://corp.sos.ms.gov/corphome/index.aspx",
    description:
      "The Mississippi Secretary of State offers a business search tool. Local licenses are required, so contact city/county offices. Professional licenses are verified via the Mississippi State Board of Contractors.",
  },
  {
    state: "Missouri",
    link: "https://www.sos.mo.gov/BusinessEntity/soskb/Corp.asp?238",
    description:
      "The Missouri Secretary of State provides a business entity search. Local licenses are required, so check with city/county offices. Professional licenses are managed by the Missouri Division of Professional Registration.",
  },
  {
    state: "Montana",
    link: "https://app.mt.gov/bes/",
    description:
      "The Montana Secretary of State offers a business search tool. Local licenses may be required, so verify with city/county offices. Professional licenses are managed by the Montana Department of Labor and Industry.",
  },
  {
    state: "Nebraska",
    link: "https://www.nebraska.gov/sos/corp/corpsearch.cgi",
    description:
      "The Nebraska Secretary of State provides a business search tool. Local licenses are required in some cities, so check locally. Professional licenses are verified via the Nebraska Department of Health and Human Services.",
  },
  {
    state: "Nevada",
    link: "https://esos.nv.gov/EntitySearch/OnlineEntitySearch",
    description:
      "The Nevada Secretary of State offers a business entity search. A state business license is required and can be verified via the Nevada Department of Taxation. Professional licenses are managed by relevant boards.",
  },
  {
    state: "New Hampshire",
    link: "https://quickstart.sos.nh.gov/online/BusinessInquire",
    description:
      "The New Hampshire Secretary of State provides a business search tool. Local licenses may be required, so contact city/town offices. Professional licenses are verified via the Office of Professional Licensure and Certification.",
  },
  {
    state: "New Jersey",
    link: "https://www.njportal.com/DOR/BusinessNameSearch",
    description:
      "The New Jersey Division of Revenue and Enterprise Services offers a business name search. Local licenses are required, so check with municipalities. Professional licenses are managed by the Division of Consumer Affairs.",
  },
  {
    state: "New Mexico",
    link: "https://portal.sos.state.nm.us/BFS/online/CorporationBusinessSearch",
    description:
      "The New Mexico Secretary of State offers a business search tool. Local licenses may be required, so verify with city/county offices. Professional licenses are managed by the Regulation and Licensing Department.",
  },
  {
    state: "New York",
    link: "https://appext20.dos.ny.gov/corp_public/CORPSEARCH.ENTITY_SEARCH_ENTRY",
    description:
      "The New York Department of State offers a corporation and business entity search. Local licenses are required (e.g., NYC business licenses), so check with city/county offices. Professional licenses are verified via the Office of the Professions.",
  },
  {
    state: "North Carolina",
    link: "https://www.sosnc.gov/online_services/search/by_title/_Business_Registration",
    description:
      "The North Carolina Secretary of State provides a business search tool. Local licenses may be required, so contact city/county offices. Professional licenses are managed by the North Carolina Licensing Boards.",
  },
  {
    state: "North Dakota",
    link: "https://firststop.sos.nd.gov/search/business",
    description:
      "The North Dakota Secretary of State offers a business search tool. Local licenses may be required, so verify with city/county offices. Professional licenses are managed by the North Dakota Department of Labor.",
  },
  {
    state: "Ohio",
    link: "https://www5.sos.state.oh.us/ords/f?p=100:7:0::NO:7::",
    description:
      "The Ohio Secretary of State provides a business search tool. Local licenses are required in some cities, so check locally. Professional licenses are verified via the Ohio eLicense Center.",
  },
  {
    state: "Oklahoma",
    link: "https://www.sos.ok.gov/corp/corpinfoform.aspx",
    description:
      "The Oklahoma Secretary of State offers a business entity search. Local licenses may be required, so contact city/county offices. Professional licenses are managed by the Oklahoma Department of Commerce.",
  },
  {
    state: "Oregon",
    link: "https://sos.oregon.gov/business/Pages/find-business-information.aspx",
    description:
      "The Oregon Secretary of State provides a business registry search. Local licenses are required in some cities, so verify locally. Professional licenses are managed by the Oregon Business Licensing Boards.",
  },
  {
    state: "Pennsylvania",
    link: "https://www.corporations.pa.gov/search/corpsearch",
    description:
      "The Pennsylvania Department of State offers a business entity search. Local licenses are required, so check with city/county offices. Professional licenses are verified via the Bureau of Professional and Occupational Affairs.",
  },
  {
    state: "Rhode Island",
    link: "https://business.sos.ri.gov/CorpWeb/CorpSearch/CorpSearch.aspx",
    description:
      "The Rhode Island Secretary of State provides a business search tool. Local licenses may be required, so contact city/town offices. Professional licenses are managed by the Department of Business Regulation.",
  },
  {
    state: "South Carolina",
    link: "https://businessfilings.sc.gov/BusinessFiling/EntitySearch",
    description:
      "The South Carolina Secretary of State offers a business search tool. Local licenses are required, so verify with city/county offices. Professional licenses are managed by the Department of Labor, Licensing and Regulation.",
  },
  {
    state: "South Dakota",
    link: "https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx",
    description:
      "The South Dakota Secretary of State offers a business search tool. Local licenses may be required, so check with city/county offices. Professional licenses are managed by the Department of Labor and Regulation.",
  },
  {
    state: "Tennessee",
    link: "https://tnbear.tn.gov/Ecommerce/FilingSearch.aspx",
    description:
      "The Tennessee Secretary of State offers a business entity search. Local licenses are required in many counties/cities, so verify locally. Professional licenses are managed by the Department of Commerce and Insurance.",
  },
  {
    state: "Texas",
    link: "https://mycpa.cpa.state.tx.us/coa/",
    description:
      "The Texas Secretary of State provides a business entity search. Local licenses are required in some cities, so check with city/county offices. Professional licenses are verified via the Texas Department of Licensing and Regulation.",
  },
  {
    state: "Utah",
    link: "https://secure.utah.gov/bes/index.html",
    description:
      "The Utah Division of Corporations and Commercial Code offers a business search tool. Local licenses may be required, so contact city/county offices. Professional licenses are managed by the Division of Occupational and Professional Licensing.",
  },
  {
    state: "Vermont",
    link: "https://bizfilings.vermont.gov/online/BusinessInquire",
    description:
      "The Vermont Secretary of State provides a business search tool. Local licenses may be required, so verify with city/town offices. Professional licenses are managed by the Office of Professional Regulation.",
  },
  {
    state: "Virginia",
    link: "https://sccefile.scc.virginia.gov/Find/Entity",
    description:
      "The Virginia State Corporation Commission offers a business entity search. Local licenses are required, so check with city/county offices. Professional licenses are verified via the Department of Professional and Occupational Regulation.",
  },
  {
    state: "Washington",
    link: "https://secure.dol.wa.gov/dolverification/",
    description:
      "The Washington State Department of Licensing provides a license lookup tool for professional and business licenses. You can also search business licenses issued through the Department of Revenue's Business Licensing Service or use the Secretary of State's Advanced Business Search for corporations and LLCs.",
  },
  {
    state: "West Virginia",
    link: "https://apps.sos.wv.gov/business/corporations/",
    description:
      "The West Virginia Secretary of State offers a business search tool. Local licenses may be required, so contact city/county offices. Professional licenses are managed by the West Virginia Division of Labor.",
  },
  {
    state: "Wisconsin",
    link: "https://www.wdfi.org/apps/CorpSearch/Search.aspx",
    description:
      "The Wisconsin Department of Financial Institutions provides a business search tool. Local licenses are required in some cities, so verify locally. Professional licenses are managed by the Department of Safety and Professional Services.",
  },
  {
    state: "Wyoming",
    link: "https://wyobiz.wy.gov/Business/FilingSearch.aspx",
    description:
      "The Wyoming Secretary of State offers a business search tool. Local licenses may be required, so check with city/county offices. Professional licenses are managed by the Wyoming Professional Licensing Boards.",
  },
  {
    state: "Washington, D.C.",
    link: "https://corponline.dcra.dc.gov/Account/Login",
    description:
      "The Department of Licensing and Consumer Protection (DLCP) offers the Scout platform to verify Basic Business Licenses (BBL) by license number, address, name, or category. You can also check landlord licenses or contractor ratings. For corporate registrations, use the CorpOnline tool with a free Access DC account.",
  },
]

// AI Resource Modal Component
function AIResourceModal({
  resource,
  isOpen,
  onClose,
  onOpenPromptPlayground,
}: { resource: any; isOpen: boolean; onClose: () => void; onOpenPromptPlayground?: () => void }) {
  const [activeTab, setActiveTab] = useState("free")
  const [isReading, setIsGenerating] = useState(false)
  const [content, setContent] = useState("")
  const { isAdminUser } = useAuth()

  // Admin users can test all tiers, regular users get free tier
  const currentUserTier = isAdminUser ? "premium" : "free"

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "free":
        return <Download className="h-4 w-4" />
      case "pro":
        return <Star className="h-4 w-4" />
      case "premium":
        return <Crown className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTierPrice = (tier: string) => {
    switch (tier) {
      case "free":
        return "Free"
      case "pro":
        return "$29/mo"
      case "premium":
        return "$79/mo"
      default:
        return ""
    }
  }

  const canAccess = (tier: string) => {
    const tierLevels = { free: 0, pro: 1, premium: 2 }
    const userLevel = tierLevels[currentUserTier as keyof typeof tierLevels] || 0
    const requiredLevel = tierLevels[tier as keyof typeof tierLevels] || 0
    return userLevel >= requiredLevel
  }

  const handleReadContent = async (tier: string) => {
    try {
      setIsGenerating(true)
      let endpoint = ""

      if (resource.name === "Market Research Essentials") {
        endpoint =
          tier === "free"
            ? "/api/download/market-research-essentials-free"
            : tier === "pro"
              ? "/api/download/market-research-essentials-pro"
              : "/api/download/market-research-essentials-premium"
      } else if (resource.name === "Finding Co-founders") {
        endpoint =
          tier === "free"
            ? "/api/download/finding-cofounders-free"
            : tier === "pro"
              ? "/api/download/finding-cofounders-pro"
              : "/api/download/finding-cofounders-premium"
      } else if (resource.name === "Business Model Canvas") {
        endpoint =
          tier === "free"
            ? "/api/download/business-model-canvas-free"
            : tier === "pro"
              ? "/api/download/business-model-canvas-pro"
              : "/api/download/business-model-canvas-premium"
      } else if (resource.name === "Business Idea Validation") {
        endpoint =
          tier === "free"
            ? "/api/download/business-idea-validation-free"
            : tier === "pro"
              ? "/api/download/business-idea-validation-pro"
              : "/api/download/business-idea-validation-premium"
      } else if (resource.name === "Entity Formation Guide") {
        endpoint =
          tier === "free"
            ? "/api/download/entity-formation-guide-free"
            : tier === "pro"
              ? "/api/download/entity-formation-guide-pro"
              : "/api/download/entity-formation-guide-premium"
      } else if (resource.name === "Licenses & Permits") {
        endpoint =
          tier === "free"
            ? "/api/download/licenses-permits-guide-free"
            : tier === "pro"
              ? "/api/download/licenses-permits-guide-pro"
              : "/api/download/licenses-permits-guide-premium"
      } else if (resource.name === "Contracts & Agreements") {
        endpoint =
          tier === "free"
            ? "/api/download/contracts-agreements-guide-free"
            : tier === "pro"
              ? "/api/download/contracts-agreements-guide-pro"
              : "/api/download/contracts-agreements-guide-premium"
      } else if (resource.name === "Payroll Basics & Compliance") {
        endpoint =
          tier === "free"
            ? "/api/download/payroll-basics-compliance-free"
            : tier === "pro"
              ? "/api/download/payroll-basics-compliance-pro"
              : "/api/download/payroll-basics-compliance-premium"
      } else if (resource.name === "Prompt Playground" || resource.name === "Prompt Engineering Library") {
        endpoint =
          tier === "free"
            ? "/api/download/prompt-playground-free"
            : tier === "pro"
              ? "/api/download/prompt-playground-pro"
              : "/api/download/prompt-playground-premium"

        // Fetch and set content for Prompt Playground/Library
        const response = await fetch(endpoint)
        const fetchedContent = await response.text()
        setContent(fetchedContent)
        setIsGenerating(false)
        return
      } else if (resource.name === "Automation Templates") {
        // For Automation Templates, show interactive component instead of text content
        setContent("interactive-templates") // Special flag for interactive component
        setIsGenerating(false)
        return
      } else if (resource.name === "AI Provider Directory") {
        // For Excel files, trigger download instead of reading content
        const downloadEndpoint =
          tier === "free"
            ? "/api/download/ai-provider-directory-free"
            : tier === "pro"
              ? "/api/download/ai-provider-directory-pro"
              : "/api/download/ai-provider-directory-premium"

        const link = document.createElement("a")
        link.href = downloadEndpoint
        link.download = `AI_Tools_${tier.charAt(0).toUpperCase() + tier.slice(1)}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setIsGenerating(false)
        return
      }

      if (endpoint) {
        const response = await fetch(endpoint)
        const content = await response.text()
        setContent(content)
      }
      setIsGenerating(false)
    } catch (error) {
      console.error("Failed to fetch content:", error)
      setIsGenerating(false)
    }
  }

  const handleDownloadContent = async (tier: string) => {
    try {
      let endpoint = ""
      let filename = ""

      if (resource.name === "Prompt Playground") {
        endpoint =
          tier === "free"
            ? "/api/download/prompt-playground-free"
            : tier === "pro"
              ? "/api/download/prompt-playground-pro"
              : "/api/download/prompt-playground-premium"
        filename = `Prompt_Engineering_Library_${tier.charAt(0).toUpperCase() + tier.slice(1)}.txt`
      }

      if (endpoint) {
        // Create a temporary link to trigger download
        const link = document.createElement("a")
        link.href = endpoint
        link.download = filename
        document.body.appendChild(link)
        link.click()
        URL.revokeObjectURL(url)
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error("Failed to download content:", error)
    }
  }

  const handlePreviewContent = async (tier: string) => {
    try {
      setIsGenerating(true)
      let endpoint = ""

      if (resource.name === "Prompt Playground") {
        endpoint =
          tier === "free"
            ? "/api/download/prompt-playground-free"
            : tier === "pro"
              ? "/api/download/prompt-playground-pro"
              : "/api/download/prompt-playground-premium"
      }

      if (endpoint) {
        const response = await fetch(endpoint)
        const content = await response.text()
        setContent(content)
      }
      setIsGenerating(false)
    } catch (error) {
      console.error("Failed to fetch preview content:", error)
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <resource.icon className={`h-6 w-6 ${resource.color}`} />
            {resource.name}
          </DialogTitle>
          <DialogDescription>
            Choose your access level to unlock different features and capabilities.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="free" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Free</span>
            </TabsTrigger>
            <TabsTrigger value="pro" className="flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Pro</span>
            </TabsTrigger>
            <TabsTrigger value="premium" className="flex items-center space-x-2">
              <Crown className="h-4 w-4" />
              <span>Premium</span>
            </TabsTrigger>
          </TabsList>
          
          {["free", "pro", "premium"].map((tier) => (
            <TabsContent key={tier} value={tier} className="mt-6">
              <Card className={!canAccess(tier) ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      {getTierIcon(tier)}
                      <span className="capitalize">{tier} Tier</span>
                      <Badge variant={tier === "premium" ? "default" : tier === "pro" ? "secondary" : "outline"}>
                        {getTierPrice(tier)}
                      </Badge>
                    </CardTitle>
                    {!canAccess(tier) && <Lock className="h-5 w-5 text-slate-400" />}
                  </div>
                  <CardDescription>
                    {resource.tiers?.[tier]?.limit || 'Premium content'} • {resource.tiers?.[tier]?.format || 'Advanced features'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {canAccess(tier) ? (
                    <div className="space-y-4">
                      {tier === "free" && (
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            {(resource.name === "Market Research Essentials" || resource.name === "Finding Co-founders" || resource.name === "Business Model Canvas" || resource.name === "Business Idea Validation" || resource.name === "Entity Formation Guide" || resource.name === "Licenses & Permits" || resource.name === "Contracts & Agreements" || resource.name === "Payroll Basics & Compliance" || resource.name === "Prompt Playground" || resource.name === "Prompt Engineering Library" || resource.name === "Automation Templates")
                              ? resource.tiers?.[tier]?.description || "Get started with essential guidance."
                              : "Get started with our curated collection of essential prompts and resources."
                            }
                          </p>
                          {(resource.name === "Market Research Essentials" || resource.name === "Finding Co-founders" || resource.name === "Business Model Canvas" || resource.name === "Business Idea Validation" || resource.name === "Entity Formation Guide" || resource.name === "Licenses & Permits" || resource.name === "Contracts & Agreements" || resource.name === "Payroll Basics & Compliance" || resource.name === "Prompt Playground" || resource.name === "Prompt Engineering Library" || resource.name === "Automation Templates") ? (
                            <div className="space-y-2">
                              <Button 
                                className="w-full nexTax-gradient text-white"
                                onClick={() => handleReadContent(tier)}
                                disabled={isGenerating}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {isGenerating ? "Loading..." : "Read Now"}
                              </Button>
                            </div>
                          ) : resource.name === "AI Provider Directory" ? (
                            <div className="space-y-2">
                              <Button 
                                className="w-full nexTax-gradient text-white"
                                onClick={() => handleReadContent(tier)}
                                disabled={isGenerating}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {isGenerating ? "Downloading..." : "Download Excel"}
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Button 
                                className="w-full nexTax-gradient text-white"
                                onClick={() => handleReadContent(tier)}
                                disabled={isGenerating}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {isGenerating ? "Loading..." : "Read Now"}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      {tier === "pro" && (
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            {(resource.name === "Market Research Essentials" || resource.name === "Finding Co-founders" || resource.name === "Business Model Canvas" || resource.name === "Business Idea Validation" || resource.name === "Entity Formation Guide" || resource.name === "Licenses & Permits" || resource.name === "Contracts & Agreements" || resource.name === "Payroll Basics & Compliance" || resource.name === "Prompt Playground" || resource.name === "Prompt Engineering Library" || resource.name === "Automation Templates")
                              ? resource.tiers?.[tier]?.description || "Access enhanced tools and templates."
                              : "Access interactive content with customizable templates and advanced features."
                            }
                          </p>
                          {(resource.name === "Market Research Essentials" || resource.name === "Finding Co-founders" || resource.name === "Business Model Canvas" || resource.name === "Business Idea Validation" || resource.name === "Entity Formation Guide" || resource.name === "Licenses & Permits" || resource.name === "Contracts & Agreements" || resource.name === "Payroll Basics & Compliance" || resource.name === "Prompt Playground" || resource.name === "Prompt Engineering Library" || resource.name === "Automation Templates") ? (
                            <div className="space-y-2">
                              <Button 
                                className="w-full nexTax-gradient text-white"
                                onClick={() => handleReadContent(tier)}
                                disabled={isGenerating}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {isGenerating ? "Loading..." : "Read Now"}
                              </Button>
                            </div>
                          ) : resource.name === "AI Provider Directory" ? (
                            <div className="space-y-2">
                              <Button 
                                className="w-full nexTax-gradient text-white"
                                onClick={() => handleReadContent(tier)}
                                disabled={isGenerating}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {isGenerating ? "Downloading..." : "Download Excel"}
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Button className="w-full nexTax-gradient text-white">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Access Interactive Content
                              </Button>
                              <Button className="w-full bg-transparent" variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Download All Resources
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      {tier === "premium" && (
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            {(resource.name === "Market Research Essentials" || resource.name === "Finding Co-founders" || resource.name === "Business Model Canvas" || resource.name === "Business Idea Validation" || resource.name === "Entity Formation Guide" || resource.name === "Licenses & Permits" || resource.name === "Contracts & Agreements" || resource.name === "Payroll Basics & Compliance")
                              ? resource.tiers?.[tier]?.description || "Access premium framework with AI-powered insights."
                              : "Unlock AI-powered customization with unlimited access and personal storage."
                            }
                          </p>
                          
                          {resource.name === "Prompt Playground" && (
                            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                                🎮 Premium Prompt Playground
                              </h4>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                                "I want a marketing prompt for a bakery in Detroit" → Get instant AI-tailored examples
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-amber-600 dark:text-amber-400">
                                <Sparkles className="h-3 w-3" />
                                <span>Test prompts live</span>
                                <Star className="h-3 w-3" />
                                <span>Save favorites</span>
                                <Brain className="h-3 w-3" />
                                <span>AI suggestions</span>
                              </div>
                            </div>
                          )}
                          
                          {(resource.name === "Market Research Essentials" || resource.name === "Finding Co-founders" || resource.name === "Business Model Canvas" || resource.name === "Business Idea Validation" || resource.name === "Entity Formation Guide" || resource.name === "Licenses & Permits" || resource.name === "Contracts & Agreements" || resource.name === "Payroll Basics & Compliance" || resource.name === "Prompt Playground" || resource.name === "Prompt Engineering Library" || resource.name === "Automation Templates") ? (
                            <div className="space-y-2">
                              <Button 
                                className="w-full nexTax-gradient text-white"
                                onClick={() => handleReadContent(tier)}
                                disabled={isGenerating}
                              >
                                <Crown className="h-4 w-4 mr-2" />
                                {isGenerating ? "Loading..." : "Read Now"}
                              </Button>
                            </div>
                          ) : resource.name === "AI Provider Directory" ? (
                            <div className="space-y-2">
                              <Button 
                                className="w-full nexTax-gradient text-white"
                                onClick={() => handleReadContent(tier)}
                                disabled={isGenerating}
                              >
                                <Crown className="h-4 w-4 mr-2" />
                                {isGenerating ? "Downloading..." : "Download Excel"}
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Button className="w-full nexTax-gradient text-white">
                                <Brain className="h-4 w-4 mr-2" />
                                AI-Powered Customization
                              </Button>
                              {resource.name === "Prompt Playground" && (
                                <Button 
                                  className="w-full bg-transparent" 
                                  variant="outline"
                                  onClick={() => onOpenPromptPlayground?.()}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Launch Prompt Playground
                                </Button>
                              )}
                              <Button className="w-full bg-transparent" variant="outline">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Custom Content
                              </Button>
                              <Button className="w-full bg-transparent" variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Download All + Custom
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Lock className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                        Upgrade to {tier === "premium" ? "Premium" : "Pro"}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Unlock {resource.tiers?.[tier]?.limit?.toLowerCase() || 'premium content'} and {resource.tiers?.[tier]?.format?.toLowerCase() || 'advanced features'}.
                      </p>
                      
                      {/* Mini Preview for Locked Content */}
                      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          Preview of {tier} content:
                        </div>
                        {resource.name === "Prompt Playground" && tier === "pro" && (
                          <div className="text-xs text-slate-500 dark:text-slate-500 mb-3">
                            "100 professional prompts across 8 categories" • Business Formation & Legal • Tax & Compliance • Branding & Naming • Market Research & Planning • Marketing & Sales • Funding & Financials • Productivity & Automation • Growth Strategy
                          </div>
                        )}
                        {resource.name === "Prompt Playground" && tier === "premium" && (
                          <div className="text-xs text-slate-500 dark:text-slate-500 mb-3">
                            "250 advanced prompts (100 Pro + 150 Premium)" • Advanced legal & compliance • Strategic planning frameworks • Investor-ready templates • International business guidance • AI-powered customization
                          </div>
                        )}
                        {resource.name === "Automation Templates" && tier === "pro" && (
                          <div className="text-xs text-slate-500 dark:text-slate-500 mb-3">
                            "8 professional templates" • Chart of accounts generator • Expense tracker setup • Social media calendar • Startup checklist builder • Equity calculator • Email series • Pitch deck writer • Policy generator
                          </div>
                        )}
                        {resource.name === "Automation Templates" && tier === "premium" && (
                          <div className="text-xs text-slate-500 dark:text-slate-500 mb-3">
                            "7 executive AI-enhanced systems" • Investor one-pager generator • Grant application writer • Due diligence doc pack • KPI dashboard • CRM scripts • AI marketing plan • Launch roadmapper
                          </div>
                        )}
                        
                        {/* Preview Button */}
                        {resource.name === "Prompt Playground" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs bg-transparent"
                            onClick={() => handlePreviewContent(tier)}
                            disabled={isGenerating}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {isGenerating ? "Loading..." : `Preview ${tier.charAt(0).toUpperCase() + tier.slice(1)} Content`}
                          </Button>
                        )}
                      </div>
                      
                      <Button className="nexTax-gradient text-white">
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to {getTierPrice(tier)}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
        
        {/* Content Reader View */}
        {content && (
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{resource.name} - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Guide</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setContent("")}
              >
                ← Back to Options
              </Button>
            </div>
            
            {resource && resource.name === "Automation Templates" ? (
              <div className="max-h-[80vh] overflow-y-auto">
                {activeTab === "premium" ? (
                  <PremiumAutomationTemplates onClose={() => setContent("")} />
                ) : activeTab === "pro" ? (
                  <ProAutomationTemplates />
                ) : (
                  <AutomationTemplates />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                      {content}
                    </pre>
                  </div>
                </div>
                
                {resource.name === "Prompt Playground" && activeTab === "free" && (
                  <div className="flex justify-center">
                    <Button 
                      className="nexTax-gradient text-white"
                      onClick={() => window.open("/api/download/prompt-playground-free", "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download These 10 Prompts
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        
        {/* Disclaimer Section */}
        {DISCLAIMERS[resource.name as keyof typeof DISCLAIMERS] && (\
          <div className=\"mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">\
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200 italic leading-relaxed">
                <strong>Important:</strong> {DISCLAIMERS[resource.name as keyof typeof DISCLAIMERS]}
              </p>
            </div>
          </div>
        )}
        
      </DialogContent>
  </Dialog>
  )
}

export function KnowledgeHub() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [, setLocation] = useLocation()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedAIResource, setSelectedAIResource] = useState<any>(null)
  const [showMarketResearchModal, setShowMarketResearchModal] = useState(false)
  const [showMarketResearchReader, setShowMarketResearchReader] = useState(false)
  const [marketResearchContent, setMarketResearchContent] = useState("")
  const [showLLCGuideReader, setShowLLCGuideReader] = useState(false)
  const [llcGuideContent, setLLCGuideContent] = useState("")
  const [showTaxSetupReader, setShowTaxSetupReader] = useState(false)
  const [taxSetupContent, setTaxSetupContent] = useState("")
  const [expandedStates, setExpandedStates] = useState<string[]>([])
  const [showBusinessLicenseLookup, setShowBusinessLicenseLookup] = useState(false)
  const [showStateFilingRequirements, setShowStateFilingRequirements] = useState(false)
  const [showAIAssistantModal, setShowAIAssistantModal] = useState(false)
  const [aiQuestion, setAIQuestion] = useState("")
  const [aiResponse, setAIResponse] = useState("")
  const [isAILoading, setIsAILoading] = useState(false)
  const [showPromptPlayground, setShowPromptPlayground] = useState(false)

  // Updated with AI Resources section in 2x2 grid layout with tiered access

  const handleAIAssistantQuestion = async () => {
    if (!aiQuestion.trim()) return

    setIsAILoading(true)
    try {
      const response = await fetch("/api/chat/quick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: aiQuestion }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const data = await response.json()
      setAIResponse(data.response)
    } catch (error) {
      console.error("Error getting AI response:", error)
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAILoading(false)
    }
  }

  const fetchLLCGuideContent = async () => {
    try {
      const response = await fetch("/api/download/llc-vs-corporation-guide")
      const content = await response.text()
      setLLCGuideContent(content)
      setShowLLCGuideReader(true)
    } catch (error) {
      console.error("Failed to fetch LLC vs Corporation guide:", error)
      toast({
        title: "Error",
        description: "Failed to load LLC vs Corporation guide",
        variant: "destructive",
      })
    }
  }

  const downloadLLCGuide = () => {
    fetch("/api/download/llc-vs-corporation-guide")
      .then((response) => response.text())
      .then((content) => {
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "LLC_vs_Corporation_Complete_Guide.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download:", error)
        toast({
          title: "Error",
          description: "Failed to download LLC vs Corporation guide",
          variant: "destructive",
        })
      })
  }

  const fetchTaxSetupContent = async () => {
    try {
      const response = await fetch("/api/download/tax-setup-for-new-businesses")
      const content = await response.text()
      setTaxSetupContent(content)
      setShowTaxSetupReader(true)
    } catch (error) {
      console.error("Failed to fetch Tax Setup guide:", error)
      toast({
        title: "Error",
        description: "Failed to load Tax Setup guide",
        variant: "destructive",
      })
    }
  }

  const downloadTaxSetupGuide = () => {
    fetch("/api/download/tax-setup-for-new-businesses")
      .then((response) => response.text())
      .then((content) => {
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "Tax_Setup_for_New_Businesses_Guide.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download:", error)
        toast({
          title: "Error",
          description: "Failed to download Tax Setup guide",
          variant: "destructive",
        })
      })
  }

  const handleResourceClick = (resource: any) => {
    if (resource.title === "Market Research Essentials") {
      handleMarketResearchDownload()
    } else if (resource.title === "LLC vs S-Corp: Complete Guide") {
      fetchLLCGuideContent()
    } else if (resource.title === "Tax Setup for New Businesses") {
      fetchTaxSetupContent()
    } else {
      console.log("Opening resource:", resource.title)
    }
  }

  const toggleStateExpansion = (stateName: string) => {
    setExpandedStates((prev) => (prev.includes(stateName) ? prev.filter((s) => s !== stateName) : [...prev, stateName]))
  }

  const handleCategoryItemClick = (item: any) => {
    // Special case for Prompt Playground - open interactive component directly
    if (item.name === "Prompt Playground") {
      setShowPromptPlayground(true)
    } else if (item.url && item.external) {
      // Handle external links
      window.open(item.url, "_blank", "noopener noreferrer")
    } else if (item.action === "business-license-lookup") {
      setShowBusinessLicenseLookup(true)
    } else if (item.action === "state-filing-requirements") {
      setShowStateFilingRequirements(true)
    } else if (item.tiers) {
      setSelectedAIResource(item)
    } else if (item.name === "LLC vs Corporation Entity Selection") {
      fetchLLCGuideContent()
    } else if (item.name === "Tax Setup for New Businesses") {
      fetchTaxSetupContent()
    } else if (item.name === "Business License Lookup") {
      setShowBusinessLicenseLookup(true)
    } else {
      toast({
        title: "Coming Soon",
        description: `${item.name} will be available in the next update.`,
      })
    }
  }

  const handleMarketResearchDownload = () => {
    // Fetch and display content for reading
    fetch("/api/download/market-research-essentials")
      .then((response) => response.text())
      .then((content) => {
        setMarketResearchContent(content)
        setShowMarketResearchReader(true)
      })
      .catch((error) => {
        console.error("Failed to load content:", error)
        setShowMarketResearchModal(true) // Fallback to old modal
      })
  }

  const downloadMarketResearchPDF = () => {
    // Get the full PDF content from the server
    fetch("/api/download/market-research-essentials")
      .then((response) => response.text())
      .then((content) => {
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "Market_Research_Essentials.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Download failed:", error)
        // Fallback to inline content if API fails
        downloadFallbackContent()
      })

    setShowMarketResearchModal(false)
  }

  const downloadFallbackContent = () => {
    const fallbackContent = `MARKET RESEARCH ESSENTIALS
How to Validate Your Business Idea and Understand Your Target Market

Launching a new business can be exciting – but without proper market research, it can also be risky. In fact, about 20% of new businesses fail within the first two years. One key reason is a lack of understanding of the market or competition. Market research helps you find your customers, and competitive analysis helps you make your business unique – combining them gives you a competitive advantage. This guide will show you how to validate your business idea and understand your target market and competition using AI-powered tools (mostly free), so you can reduce risk and build on solid information.

Why Market Research Matters: Market research blends consumer behavior and economic trends to confirm and improve your business idea. It's crucial to understand your potential customers from the outset, so you can ensure there is real demand and refine your concept to fit the market. Good research helps you answer questions like: Is there a desire for my product? How big is the market? Who are my customers and what do they need? Who are my competitors and what are they offering? By answering these, you reduce the risk of launching a product no one wants or entering an overcrowded market.

[Note: This is a preview. The complete 50+ page guide with detailed examples, AI prompts, and tools is available through your StartSmart account.]

© StartSmart by NexTax.AI`

    const blob = new Blob([fallbackContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "Market_Research_Essentials_Preview.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Knowledge Hub</h2>
          <p className="text-slate-600 dark:text-slate-300">Comprehensive guides and resources for startup success</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <Input
              type="text"
              placeholder="Search guides, articles, and resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Featured Resources */}
        <div className="mb-8 bg-gradient-to-r from-emerald-50/50 via-green-50/30 to-emerald-50/50 dark:from-emerald-900/20 dark:via-green-900/10 dark:to-emerald-900/20 rounded-2xl p-6 border border-emerald-100/50 dark:border-emerald-800/30">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Featured Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredResources.map((resource, index) => {
              const getResourceIcon = () => {
                switch (index) {
                  case 0:
                    return Building // LLC vs S-Corp
                  case 1:
                    return DollarSign // Tax Setup
                  case 2:
                    return Lightbulb // Market Research
                  default:
                    return Book
                }
              }
              const IconComponent = getResourceIcon()

              return (
                <Card
                  key={resource.id}
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-[1.02] bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm"
                  onClick={() => handleResourceClick(resource)}
                >
                  <div className="aspect-video w-full bg-gradient-to-br from-emerald-100 via-slate-50 to-emerald-50 dark:from-emerald-900/30 dark:via-slate-800 dark:to-emerald-800/30 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent opacity-50"></div>
                    <div className="relative bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-full p-4 group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-2">
                      <Badge className={`${resource.categoryColor} text-white text-xs font-medium`}>
                        {resource.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                      {resource.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {resource.description}
                    </CardDescription>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                        <Clock size={12} className="mr-1" />
                        {resource.readTime}
                      </div>
                      <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 p-0">
                        {resource.title === "Market Research Essentials" ? (
                          <>
                            <Book size={12} className="mr-1" />
                            Read Guide
                          </>
                        ) : (
                          "Read Guide"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Knowledge Categories in 2x2 Grid Layout */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Browse by Category</h3>

          {/* Top Row: Getting Started & Legal & Compliance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {knowledgeCategories.slice(0, 2).map((category) => (
              <Card key={category.title} className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.items.map((item) => (
                      <Button
                        key={item.name}
                        variant="ghost"
                        className="w-full justify-between h-auto p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                        onClick={() => handleCategoryItemClick(item)}
                      >
                        <div className="flex items-center space-x-3">
                          <item.icon className={`${item.color}`} size={20} />
                          <div className="flex flex-col items-start">
                            <span className="text-slate-900 dark:text-white">{item.name}</span>
                            {(item as any).gatingLabel && (
                              <Badge
                                variant={(item as any).gatingLabel.includes("🔓") ? "secondary" : "default"}
                                className="text-xs mt-1"
                              >
                                {(item as any).gatingLabel}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="text-slate-400" size={16} />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom Row: AI Resources & External Resources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* AI Resources */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">AI Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {knowledgeCategories[2].items.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className="w-full justify-between h-auto p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                      onClick={() => handleCategoryItemClick(item)}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className={`${item.color}`} size={20} />
                        <div className="flex flex-col items-start">
                          <span className="text-slate-900 dark:text-white">{item.name}</span>
                          {(item as any).gatingLabel && (
                            <Badge
                              variant={(item as any).gatingLabel.includes("🔓") ? "secondary" : "default"}
                              className="text-xs mt-1"
                            >
                              {(item as any).gatingLabel}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="text-slate-400" size={16} />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* External Resources */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">External Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {knowledgeCategories[3].items.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className="w-full justify-between h-auto p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                      onClick={() => handleCategoryItemClick(item)}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className={`${item.color}`} size={20} />
                        <div className="flex flex-col items-start">
                          <span className="text-slate-900 dark:text-white">{item.name}</span>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-400" size={16} />
                    </Button>
                  ))}
                </div>

                {/* Business License Lookup */}
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => setShowBusinessLicenseLookup(!showBusinessLicenseLookup)}
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="h-5 w-5 text-orange-500" />
                      <div>
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Business License Lookup</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Find official business license verification for all 50 states + DC
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${
                        showBusinessLicenseLookup ? "rotate-180" : ""
                      }`}
                    />
                  </Button>

                  {showBusinessLicenseLookup && (
                    <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                      {businessLicenseLookup.map((state) => (
                        <Collapsible key={state.state}>
                          <CollapsibleTrigger
                            className="w-full flex items-center justify-between p-2 text-left text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => toggleStateExpansion(state.state)}
                          >
                            <span className="text-slate-900 dark:text-white font-medium">{state.state}</span>
                            <ChevronDown
                              className={`h-4 w-4 text-slate-400 transition-transform ${
                                expandedStates.includes(state.state) ? "rotate-180" : ""
                              }`}
                            />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-2 pb-2">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded p-3 mt-1">
                              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">{state.description}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-between text-xs bg-transparent"
                                asChild
                              >
                                <a href={state.link} target="_blank" rel="noopener noreferrer">
                                  Visit {state.state} License Search
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </div>

                {/* State Filing Requirements */}
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => setShowStateFilingRequirements(!showStateFilingRequirements)}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-purple-500" />
                      <div>
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                          State Filing Requirements
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Tax filing requirements by entity type for LLCs, S-Corps, and C-Corps
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${
                        showStateFilingRequirements ? "rotate-180" : ""
                      }`}
                    />
                  </Button>

                  {showStateFilingRequirements && (
                    <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                      {stateFilingRequirements.map((state) => (
                        <Collapsible key={state.state}>
                          <CollapsibleTrigger
                            className="w-full flex items-center justify-between p-2 text-left text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => toggleStateExpansion(state.state)}
                          >
                            <span className="text-slate-900 dark:text-white font-medium">{state.state}</span>
                            <ChevronDown
                              className={`h-4 w-4 text-slate-400 transition-transform ${
                                expandedStates.includes(state.state) ? "rotate-180" : ""
                              }`}
                            />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-2 pb-2">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded p-3 mt-1">
                              <div className="space-y-3 text-xs">
                                <div>
                                  <span className="font-medium text-emerald-600">LLC:</span>
                                  <p className="text-slate-600 dark:text-slate-300 mt-1">{state.llc}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-blue-600">S-Corp:</span>
                                  <p className="text-slate-600 dark:text-slate-300 mt-1">{state.sCorp}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-purple-600">C-Corp:</span>
                                  <p className="text-slate-600 dark:text-slate-300 mt-1">{state.cCorp}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-orange-600">Franchise Tax:</span>
                                  <p className="text-slate-600 dark:text-slate-300 mt-1">{state.franchiseTax}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-red-600">Annual Report:</span>
                                  <p className="text-slate-600 dark:text-slate-300 mt-1">{state.annualReport}</p>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-3">
                                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">Official Links:</p>
                                  <div className="space-y-1">
                                    {state.links.map((link, index) => (
                                      <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-between text-xs bg-transparent"
                                        asChild
                                      >
                                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                                          {link.name}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </div>

                {/* Help Section */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Need Personal Help?</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Get personalized guidance from our AI assistant or connect with experts.
                  </p>
                  <div className="space-y-2">
                    <Button
                      className="w-full nexTax-gradient text-white"
                      size="sm"
                      onClick={() => setShowAIAssistantModal(true)}
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      Ask AI Assistant
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      size="sm"
                      onClick={() => window.open("https://www.nextax.ai/contact", "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Schedule Consultation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Resource Modal */}
      {selectedAIResource && (
        <AIResourceModal
          resource={selectedAIResource}
          isOpen={!!selectedAIResource}
          onClose={() => setSelectedAIResource(null)}
          onOpenPromptPlayground={() => setShowPromptPlayground(true)}
        />
      )}

      {/* AI Assistant Modal */}
      <Dialog open={showAIAssistantModal} onOpenChange={setShowAIAssistantModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bot className="h-6 w-6 text-blue-600" />
              <span>AI Assistant</span>
            </DialogTitle>
            <DialogDescription>
              Ask your business formation and startup questions. Our AI assistant is here to help!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                What would you like to know?
              </label>
              <textarea
                value={aiQuestion}
                onChange={(e) => setAIQuestion(e.target.value)}
                placeholder="e.g., What's the difference between LLC and S-Corp? How do I validate my business idea? What licenses do I need?"
                className="w-full min-h-[100px] p-3 border border-slate-300 dark:border-slate-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                disabled={isAILoading}
              />
            </div>

            <Button
              onClick={handleAIAssistantQuestion}
              disabled={!aiQuestion.trim() || isAILoading}
              className="w-full nexTax-gradient text-white"
            >
              {isAILoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Getting Answer...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Get AI Answer
                </>
              )}
            </Button>

            {aiResponse && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
                  AI Response
                </h4>
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{aiResponse}</div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    💡 <strong>Tip:</strong> For personalized guidance and detailed planning, consider scheduling a
                    consultation with our experts.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Market Research Download Modal */}
      <Dialog open={showMarketResearchModal} onOpenChange={setShowMarketResearchModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Search className="h-6 w-6 text-emerald-500" />
              <span>Market Research Essentials</span>
            </DialogTitle>
            <DialogDescription>
              Comprehensive guide to AI-powered market validation and competitive analysis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                What's Included (50+ Pages):
              </h4>
              <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                <li>• AI-powered market validation techniques</li>
                <li>• Step-by-step ChatGPT prompts for research</li>
                <li>• Google Trends analysis methodology</li>
                <li>• Competitor intelligence gathering</li>
                <li>• Customer feedback collection strategies</li>
                <li>• Free tools and resources directory</li>
                <li>• Real-world case studies and examples</li>
              </ul>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">Perfect for:</h4>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <div>📊 Entrepreneurs validating business ideas</div>
                <div>🎯 Founders researching target markets</div>
                <div>🔍 Startups analyzing competition</div>
                <div>🚀 Anyone wanting to reduce business risk</div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={downloadMarketResearchPDF} className="flex-1 nexTax-gradient text-white">
                <Download className="h-4 w-4 mr-2" />
                Download Free Guide
              </Button>
              <Button variant="outline" onClick={() => setShowMarketResearchModal(false)} className="flex-1">
                Maybe Later
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
              By downloading, you agree to receive occasional startup tips from StartSmart
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Market Research Reader - Full Content View */}
      <Dialog open={showMarketResearchReader} onOpenChange={setShowMarketResearchReader}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="h-6 w-6 text-emerald-500" />
                <span>Market Research Essentials</span>
              </div>
              <Button variant="outline" size="sm" onClick={downloadMarketResearchPDF} className="ml-4 bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DialogTitle>
            <DialogDescription>Complete guide to AI-powered market validation (12 pages)</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="prose prose-slate dark:prose-invert max-w-none p-6">
              <div style={{ whiteSpace: "pre-line", lineHeight: "1.6" }}>{marketResearchContent}</div>
            </div>
          </div>

          <div className="flex-shrink-0 border-t pt-4 pb-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">© StartSmart by NexTax.AI</p>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={downloadMarketResearchPDF} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="default" onClick={() => setShowMarketResearchReader(false)} size="sm">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LLC vs Corporation Guide Reader */}
      <Dialog open={showLLCGuideReader} onOpenChange={setShowLLCGuideReader}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>LLC vs Corporation: Complete Guide</span>
              </div>
              <Button variant="outline" size="sm" onClick={downloadLLCGuide} className="ml-4 bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DialogTitle>
            <DialogDescription>Comprehensive guide to choosing the right business entity structure</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="prose prose-slate dark:prose-invert max-w-none p-6">
              <div style={{ whiteSpace: "pre-line", lineHeight: "1.6", fontFamily: "system-ui, sans-serif" }}>
                {llcGuideContent}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 border-t pt-4 pb-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">
                Essential guide for choosing between LLC and S Corporation structures.
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={downloadLLCGuide} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Guide
                </Button>
                <Button variant="default" onClick={() => setShowLLCGuideReader(false)} size="sm">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tax Setup for New Businesses Reader */}
      <Dialog open={showTaxSetupReader} onOpenChange={setShowTaxSetupReader}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Tax Setup for New Businesses</span>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTaxSetupGuide} className="ml-4 bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DialogTitle>
            <DialogDescription>
              Step-by-step guide to EIN application, tax elections, and compliance requirements
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="prose prose-slate dark:prose-invert max-w-none p-6">
              <div style={{ whiteSpace: "pre-line", lineHeight: "1.6", fontFamily: "system-ui, sans-serif" }}>
                {taxSetupContent}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 border-t pt-4 pb-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">
                Complete guide to business tax setup, EIN application, and compliance requirements.
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={downloadTaxSetupGuide} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Guide
                </Button>
                <Button variant="default" onClick={() => setShowTaxSetupReader(false)} size="sm">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prompt Playground Interactive Modal */}
      <PromptPlayground
        isOpen={showPromptPlayground}
        onClose={() => setShowPromptPlayground(false)}
        userTier={user?.id === "40936537" ? "premium" : "free"} // Admin override for testing
      />
    </div>
  )
}
