import { type NextRequest, NextResponse } from "next/server"

const templates = {
  "business-plan": {
    title: "Business Plan Template",
    content: `# Business Plan Template

## Executive Summary
[Provide a brief overview of your business concept, target market, and financial projections]

## Company Description
[Describe your company, its mission, and what makes it unique]

## Market Analysis
[Research and analyze your target market, competitors, and industry trends]

## Organization & Management
[Outline your business structure and management team]

## Service or Product Line
[Describe what you're selling or what service you're providing]

## Marketing & Sales
[Explain how you'll attract and retain customers]

## Funding Request
[If seeking funding, specify how much you need and how you'll use it]

## Financial Projections
[Provide financial forecasts for the next 3-5 years]

## Appendix
[Include supporting documents and additional information]`,
  },
  "operating-agreement": {
    title: "LLC Operating Agreement Template",
    content: `# LLC OPERATING AGREEMENT

## ARTICLE I - ORGANIZATION
1.1 Formation: This Limited Liability Company was formed under the laws of [STATE].
1.2 Name: The name of the LLC is [COMPANY NAME], LLC.
1.3 Principal Place of Business: [ADDRESS]

## ARTICLE II - MEMBERS
2.1 Initial Members: [LIST MEMBERS AND OWNERSHIP PERCENTAGES]
2.2 Capital Contributions: [DETAIL INITIAL CONTRIBUTIONS]

## ARTICLE III - MANAGEMENT
3.1 Management Structure: [MEMBER-MANAGED OR MANAGER-MANAGED]
3.2 Authority: [OUTLINE MANAGEMENT AUTHORITY AND LIMITATIONS]

## ARTICLE IV - DISTRIBUTIONS
4.1 Profit and Loss Allocation: [SPECIFY HOW PROFITS/LOSSES ARE ALLOCATED]
4.2 Distributions: [OUTLINE DISTRIBUTION PROCEDURES]

## ARTICLE V - TRANSFER OF INTERESTS
5.1 Restrictions: [SPECIFY TRANSFER RESTRICTIONS]
5.2 Right of First Refusal: [DETAIL RFOF PROCEDURES IF APPLICABLE]

## ARTICLE VI - DISSOLUTION
6.1 Events of Dissolution: [LIST DISSOLUTION TRIGGERS]
6.2 Winding Up: [OUTLINE DISSOLUTION PROCEDURES]

[Additional clauses as needed for specific business requirements]`,
  },
  bylaws: {
    title: "Corporate Bylaws Template",
    content: `# CORPORATE BYLAWS

## ARTICLE I - OFFICES
Section 1.1 Principal Office: The principal office shall be located at [ADDRESS].

## ARTICLE II - SHAREHOLDERS
Section 2.1 Annual Meeting: Annual meetings shall be held on [DATE/TIME].
Section 2.2 Special Meetings: [PROCEDURES FOR SPECIAL MEETINGS]
Section 2.3 Notice: [NOTICE REQUIREMENTS]
Section 2.4 Quorum: [QUORUM REQUIREMENTS]

## ARTICLE III - BOARD OF DIRECTORS
Section 3.1 General Powers: The business shall be managed by the Board of Directors.
Section 3.2 Number and Qualifications: [NUMBER OF DIRECTORS AND QUALIFICATIONS]
Section 3.3 Election and Term: [ELECTION PROCEDURES AND TERMS]
Section 3.4 Meetings: [MEETING PROCEDURES]

## ARTICLE IV - OFFICERS
Section 4.1 Officers: The officers shall include President, Secretary, and Treasurer.
Section 4.2 Election: [OFFICER ELECTION PROCEDURES]
Section 4.3 Duties: [OUTLINE OFFICER DUTIES]

## ARTICLE V - STOCK
Section 5.1 Certificates: [STOCK CERTIFICATE PROCEDURES]
Section 5.2 Transfer: [STOCK TRANSFER PROCEDURES]

## ARTICLE VI - AMENDMENTS
Section 6.1 Amendment Procedures: [HOW BYLAWS CAN BE AMENDED]`,
  },
  "partnership-agreement": {
    title: "Partnership Agreement Template",
    content: `# PARTNERSHIP AGREEMENT

## 1. FORMATION
This Partnership Agreement is entered into between [PARTNER NAMES] for the purpose of [BUSINESS PURPOSE].

## 2. NAME AND PRINCIPAL PLACE OF BUSINESS
2.1 Name: The partnership shall be known as [PARTNERSHIP NAME].
2.2 Principal Place: [ADDRESS]

## 3. TERM
The partnership shall commence on [DATE] and continue until [TERM/CONDITIONS].

## 4. CAPITAL CONTRIBUTIONS
[DETAIL EACH PARTNER'S INITIAL CONTRIBUTIONS]

## 5. PROFIT AND LOSS SHARING
Profits and losses shall be shared as follows: [PERCENTAGES]

## 6. MANAGEMENT AND DUTIES
6.1 Management: [OUTLINE MANAGEMENT STRUCTURE]
6.2 Duties: [SPECIFY PARTNER DUTIES AND RESPONSIBILITIES]

## 7. BOOKS AND RECORDS
The partnership shall maintain complete books and records at [LOCATION].

## 8. BANKING
All partnership funds shall be deposited in [BANK ACCOUNT DETAILS].

## 9. WITHDRAWAL OF PARTNERS
[PROCEDURES FOR PARTNER WITHDRAWAL]

## 10. DISSOLUTION
[DISSOLUTION PROCEDURES AND CONDITIONS]

## 11. DISPUTE RESOLUTION
[MEDIATION/ARBITRATION PROCEDURES]`,
  },
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params
    const template = templates[type as keyof typeof templates]

    if (!template) {
      return NextResponse.json({ message: "Template not found" }, { status: 404 })
    }

    const filename = `${template.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`

    return new NextResponse(template.content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error downloading template:", error)
    return NextResponse.json({ message: "Failed to download template" }, { status: 500 })
  }
}
