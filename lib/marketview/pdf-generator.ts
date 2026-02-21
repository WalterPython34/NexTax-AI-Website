// ===========================================
// Client-Side PDF Report Generator
// ===========================================
import { jsPDF } from "jspdf";
import { AnalysisResult, Competitor, SaturationMetrics } from "@/types/marketview";

// ─── Color helpers ───

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

const COLORS = {
  bg: [10, 15, 26] as [number, number, number],
  bgCard: [16, 22, 38] as [number, number, number],
  bgLight: [24, 32, 52] as [number, number, number],
  border: [40, 50, 70] as [number, number, number],
  textPrimary: [226, 232, 240] as [number, number, number],
  textSecondary: [148, 163, 184] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  accentBlue: [59, 130, 246] as [number, number, number],
  accentIndigo: [99, 102, 241] as [number, number, number],
  accentGreen: [34, 197, 94] as [number, number, number],
  accentYellow: [234, 179, 8] as [number, number, number],
  accentOrange: [249, 115, 22] as [number, number, number],
  accentRed: [239, 68, 68] as [number, number, number],
  accentPurple: [139, 92, 246] as [number, number, number],
  accentAmber: [245, 158, 11] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// ─── Main Export Function ───

export async function generatePDFReport(result: AnalysisResult): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const CW = W - M * 2;
  let y = 0;

  const { metrics, competitors, aiInsight, metadata } = result;

  // ═══════════════════════════════════════════
  // PAGE 1: Cover + Executive Summary
  // ═══════════════════════════════════════════
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...COLORS.accentBlue);
  doc.rect(0, 0, W, 4, "F");

  // Logo area
  y = 50;
  doc.setFillColor(...COLORS.accentBlue);
  doc.roundedRect(M, y, 28, 28, 4, 4, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("M", M + 9, y + 19);

  doc.setTextColor(...COLORS.textPrimary);
  doc.setFontSize(18);
  doc.text("Market Saturation Report", M + 38, y + 12);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("COMPETITIVE DENSITY INTELLIGENCE — NEXTAX.AI", M + 38, y + 24);

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.text(new Date(metadata.analyzedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  }), W - M, y + 12, { align: "right" });

  y += 48;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);

  // Target Info
  y += 24;
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(M, y, CW, 60, 6, 6, "F");
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("TARGET ADDRESS", M + 16, y + 18);
  doc.text("CATEGORY", M + 260, y + 18);
  doc.text("SEARCH RADIUS", M + 420, y + 18);
  doc.setTextColor(...COLORS.textPrimary);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize(metadata.address, 220);
  doc.text(addrLines, M + 16, y + 34);
  doc.text(metadata.category, M + 260, y + 34);
  doc.text(`${metadata.radius} miles`, M + 420, y + 34);

  // SATURATION SCORE
  y += 84;
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(M, y, CW, 120, 6, 6, "F");

  const riskRgb = hexToRgb(metrics.riskColor);
  doc.setTextColor(...riskRgb);
  doc.setFontSize(48);
  doc.setFont("helvetica", "bold");
  doc.text(String(metrics.saturationScore), M + 40, y + 68);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(14);
  doc.text("/ 100", M + 42 + doc.getTextWidth(String(metrics.saturationScore)) + 20, y + 68);

  doc.setFillColor(riskRgb[0], riskRgb[1], riskRgb[2]);
  const badgeText = `${metrics.riskBand} SATURATION`;
  doc.setFontSize(7);
  const badgeW = doc.getTextWidth(badgeText) + 16;
  doc.roundedRect(M + 40, y + 82, badgeW, 18, 3, 3, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(badgeText, M + 48, y + 94);

  // Gauge bar
  const gaugeX = M + 240;
  const gaugeW = CW - 260;
  const gaugeY = y + 30;
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(gaugeX, gaugeY, gaugeW, 12, 4, 4, "F");
  const segments = [
    { pct: 0.3, color: COLORS.accentGreen },
    { pct: 0.25, color: COLORS.accentYellow },
    { pct: 0.25, color: COLORS.accentOrange },
    { pct: 0.2, color: COLORS.accentRed },
  ];
  let segX = gaugeX;
  for (const seg of segments) {
    const segW = gaugeW * seg.pct;
    doc.setFillColor(...seg.color);
    doc.rect(segX, gaugeY, segW, 12, "F");
    segX += segW;
  }
  const indicatorX = gaugeX + (metrics.saturationScore / 100) * gaugeW;
  doc.setFillColor(...COLORS.white);
  doc.circle(indicatorX, gaugeY + 6, 6, "F");
  doc.setFillColor(...riskRgb);
  doc.circle(indicatorX, gaugeY + 6, 4, "F");

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.text("LOW", gaugeX, gaugeY + 26);
  doc.text("MODERATE", gaugeX + gaugeW * 0.3, gaugeY + 26);
  doc.text("HIGH", gaugeX + gaugeW * 0.55, gaugeY + 26);
  doc.text("CRITICAL", gaugeX + gaugeW * 0.8, gaugeY + 26);

  const sideMetrics = [
    { label: "Competitors", value: String(metrics.totalCompetitors) },
    { label: "Direct", value: String(metrics.directCompetitors) },
    { label: "Density/10K", value: String(metrics.densityPer10k) },
    { label: "Pop/Comp", value: metrics.popPerCompetitor.toLocaleString() },
  ];
  let smY = gaugeY + 44;
  for (const sm of sideMetrics) {
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(7);
    doc.text(sm.label, gaugeX, smY);
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(sm.value, gaugeX + 80, smY);
    doc.setFont("helvetica", "normal");
    smY += 16;
  }

  // KEY METRICS GRID
  y += 140;
  const metricCards = [
    { label: "TOTAL COMPETITORS", value: String(metrics.totalCompetitors), sub: `${metrics.directCompetitors} direct`, color: COLORS.accentBlue },
    { label: "DENSITY / 10K POP", value: String(metrics.densityPer10k), sub: "population ratio", color: COLORS.accentAmber },
    { label: "POP / COMPETITOR", value: metrics.popPerCompetitor.toLocaleString(), sub: `~${(metrics.populationEstimate / 1000).toFixed(0)}K total pop`, color: COLORS.textPrimary },
    { label: "AVG RATING", value: String(metrics.avgRating), sub: `${metrics.avgReviews} avg reviews`, color: COLORS.accentGreen },
    { label: "AVG EST. REVENUE", value: `$${(metrics.avgEstRevenue / 1000).toFixed(0)}K`, sub: "per competitor", color: COLORS.accentPurple },
    { label: "TOTAL MARKET REV", value: `$${(metrics.totalEstRevenue / 1000000).toFixed(1)}M`, sub: `${metadata.radius}mi radius`, color: [244, 114, 182] as [number, number, number] },
  ];
  const cardW = (CW - 16) / 3;
  const cardH = 60;
  for (let i = 0; i < metricCards.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = M + col * (cardW + 8);
    const cy = y + row * (cardH + 8);
    const card = metricCards[i];
    doc.setFillColor(...COLORS.bgCard);
    doc.roundedRect(cx, cy, cardW, cardH, 4, 4, "F");
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(card.label, cx + 12, cy + 16);
    doc.setTextColor(...card.color);
    doc.setFontSize(18);
    doc.text(card.value, cx + 12, cy + 38);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(card.sub, cx + 12, cy + 52);
  }

  // HEAT MAP
  y += cardH * 2 + 32;
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(M, y, CW, 170, 6, 6, "F");
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("COMPETITOR DENSITY INDEX — HEAT MAP", M + 16, y + 18);

  const hmX = M + 16;
  const hmY = y + 30;
  const hmW = CW - 32;
  const hmH = 120;
  const gridCols = 20;
  const gridRows = 12;
  const cellW = hmW / gridCols;
  const cellH = hmH / gridRows;
  const heatData = generateHeatMapData(competitors, metadata.radius, gridCols, gridRows);
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const intensity = heatData[row][col];
      const color = getHeatColor(intensity);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(hmX + col * cellW + 0.5, hmY + row * cellH + 0.5, cellW - 1, cellH - 1, 1, 1, "F");
    }
  }
  const centerCol = Math.floor(gridCols / 2);
  const centerRow = Math.floor(gridRows / 2);
  doc.setFillColor(...COLORS.white);
  doc.circle(hmX + centerCol * cellW + cellW / 2, hmY + centerRow * cellH + cellH / 2, 4, "F");
  doc.setFillColor(...COLORS.accentBlue);
  doc.circle(hmX + centerCol * cellW + cellW / 2, hmY + centerRow * cellH + cellH / 2, 2.5, "F");

  const legY = hmY + hmH + 8;
  const legColors = [
    { label: "Low", intensity: 0.1 },
    { label: "Med", intensity: 0.4 },
    { label: "High", intensity: 0.7 },
    { label: "Critical", intensity: 1.0 },
  ];
  let legX = hmX;
  for (const leg of legColors) {
    const c = getHeatColor(leg.intensity);
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(legX, legY, 12, 8, 2, 2, "F");
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(6.5);
    doc.text(leg.label, legX + 16, legY + 7);
    legX += 55;
  }
  doc.setFillColor(...COLORS.accentBlue);
  doc.circle(legX + 8, legY + 4, 3, "F");
  doc.setTextColor(...COLORS.textMuted);
  doc.text("Target Location", legX + 16, legY + 7);

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(6.5);
  doc.text(`Market Saturation Analyzer — ${metadata.category} — ${metadata.radius}mi radius — Generated ${new Date(metadata.analyzedAt).toLocaleDateString()}`, W / 2, H - 24, { align: "center" });
  doc.text("Page 1 of 3", W - M, H - 24, { align: "right" });

  // ═══════════════════════════════════════════
  // PAGE 2: Distribution + AI Assessment
  // ═══════════════════════════════════════════
  doc.addPage();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...COLORS.accentBlue);
  doc.rect(0, 0, W, 4, "F");

  y = 36;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("MARKET SATURATION REPORT", M, y);
  doc.setTextColor(...COLORS.textPrimary);
  doc.setFontSize(14);
  doc.text("Competitive Distribution Analysis", M, y + 18);

  // Classification bars
  y += 40;
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(M, y, CW, 110, 6, 6, "F");
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("COMPETITOR CLASSIFICATION", M + 16, y + 18);

  const barStartX = M + 140;
  const barMaxW = CW - 200;
  const classifications = [
    { label: "Direct Competitor", value: metrics.typeBreakdown.direct, color: COLORS.accentRed },
    { label: "Indirect Competitor", value: metrics.typeBreakdown.indirect, color: COLORS.accentYellow },
    { label: "Franchise Sibling", value: metrics.typeBreakdown.franchise, color: COLORS.accentPurple },
    { label: "Adjacent Service", value: metrics.typeBreakdown.adjacent, color: COLORS.textMuted },
  ];
  const maxClassVal = Math.max(...classifications.map((c) => c.value), 1);
  classifications.forEach((cls, i) => {
    const by = y + 32 + i * 20;
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(cls.label, M + 16, by + 8);
    doc.setFillColor(...COLORS.bgLight);
    doc.roundedRect(barStartX, by, barMaxW, 12, 3, 3, "F");
    const bw = (cls.value / maxClassVal) * barMaxW;
    doc.setFillColor(...cls.color);
    doc.roundedRect(barStartX, by, Math.max(bw, 4), 12, 3, 3, "F");
    doc.setTextColor(...cls.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(String(cls.value), barStartX + barMaxW + 10, by + 10);
  });

  // Tier distribution
  y += 128;
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(M, y, CW, 110, 6, 6, "F");
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("MARKET TIER DISTRIBUTION", M + 16, y + 18);
  const tiers = [
    { label: "Premium", value: metrics.tierBreakdown.premium, color: COLORS.accentAmber },
    { label: "Mid-Market", value: metrics.tierBreakdown.midMarket, color: COLORS.accentBlue },
    { label: "Value", value: metrics.tierBreakdown.value, color: COLORS.accentGreen },
    { label: "Budget", value: metrics.tierBreakdown.budget, color: COLORS.textMuted },
  ];
  const maxTierVal = Math.max(...tiers.map((t) => t.value), 1);
  tiers.forEach((tier, i) => {
    const by = y + 32 + i * 20;
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(tier.label, M + 16, by + 8);
    doc.setFillColor(...COLORS.bgLight);
    doc.roundedRect(barStartX, by, barMaxW, 12, 3, 3, "F");
    const bw = (tier.value / maxTierVal) * barMaxW;
    doc.setFillColor(...tier.color);
    doc.roundedRect(barStartX, by, Math.max(bw, 4), 12, 3, 3, "F");
    doc.setTextColor(...tier.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(String(tier.value), barStartX + barMaxW + 10, by + 10);
  });

  // Rating distribution
  y += 128;
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(M, y, CW, 130, 6, 6, "F");
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("REVIEW-WEIGHTED INTENSITY — RATING DISTRIBUTION", M + 16, y + 18);
  const ratings = [
    { label: "4.5-5.0", value: metrics.ratingDistribution.excellent, color: COLORS.accentGreen },
    { label: "4.0-4.4", value: metrics.ratingDistribution.good, color: [132, 204, 22] as [number, number, number] },
    { label: "3.5-3.9", value: metrics.ratingDistribution.average, color: COLORS.accentYellow },
    { label: "3.0-3.4", value: metrics.ratingDistribution.belowAverage, color: COLORS.accentOrange },
    { label: "< 3.0", value: metrics.ratingDistribution.poor, color: COLORS.accentRed },
  ];
  const maxRatVal = Math.max(...ratings.map((r) => r.value), 1);
  ratings.forEach((rat, i) => {
    const by = y + 32 + i * 20;
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(rat.label, M + 16, by + 8);
    doc.setFillColor(...COLORS.bgLight);
    doc.roundedRect(barStartX, by, barMaxW, 12, 3, 3, "F");
    const bw = (rat.value / maxRatVal) * barMaxW;
    doc.setFillColor(...rat.color);
    doc.roundedRect(barStartX, by, Math.max(bw, 4), 12, 3, 3, "F");
    doc.setTextColor(...rat.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(String(rat.value), barStartX + barMaxW + 10, by + 10);
  });

  // AI Assessment
  y += 150;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const aiHeaderY = y + 18;

  doc.setTextColor(180, 190, 210);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const aiLines = doc.splitTextToSize(aiInsight, CW - 32);
  const aiTextH = aiLines.length * 14;
  const aiCardH = aiTextH + 40;

  doc.setFillColor(20, 25, 42);
  doc.roundedRect(M, y, CW, aiCardH, 6, 6, "F");
  doc.setDrawColor(70, 60, 120);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, CW, aiCardH, 6, 6, "S");

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("AI STRATEGIC ASSESSMENT", M + 16, aiHeaderY);
  doc.setTextColor(180, 190, 210);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(aiLines, M + 16, aiHeaderY + 18);

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(6.5);
  doc.text(`Market Saturation Analyzer — ${metadata.category} — ${metadata.radius}mi radius`, W / 2, H - 24, { align: "center" });
  doc.text("Page 2 of 3", W - M, H - 24, { align: "right" });

  // ═══════════════════════════════════════════
  // PAGE 3: Top Competitors Table
  // ═══════════════════════════════════════════
  doc.addPage();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...COLORS.accentBlue);
  doc.rect(0, 0, W, 4, "F");

  y = 36;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("MARKET SATURATION REPORT", M, y);
  doc.setTextColor(...COLORS.textPrimary);
  doc.setFontSize(14);
  doc.text("Top Competitors by Proximity", M, y + 18);

  y += 36;
  doc.setFillColor(...COLORS.bgLight);
  doc.rect(M, y, CW, 18, "F");
  const cols = [
    { label: "BUSINESS", x: M + 8, w: 160 },
    { label: "DIST", x: M + 168, w: 40 },
    { label: "RATING", x: M + 208, w: 50 },
    { label: "REVIEWS", x: M + 258, w: 50 },
    { label: "TYPE", x: M + 308, w: 100 },
    { label: "TIER", x: M + 408, w: 65 },
    { label: "EST.REV", x: M + 473, w: 60 },
  ];
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  cols.forEach((col) => doc.text(col.label, col.x, y + 12));

  const tableComps = competitors.slice(0, 25);
  const rowH = 18;
  tableComps.forEach((comp, i) => {
    const ry = y + 18 + i * rowH;
    if (ry > H - 50) return;
    if (i % 2 === 0) {
      doc.setFillColor(...COLORS.bgCard);
      doc.rect(M, ry, CW, rowH, "F");
    }
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textPrimary);
    const name = comp.name.length > 24 ? comp.name.slice(0, 22) + "..." : comp.name;
    doc.text(name, cols[0].x, ry + 12);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(`${comp.distance}mi`, cols[1].x, ry + 12);
    const rColor = comp.rating >= 4.5 ? COLORS.accentGreen : comp.rating >= 4.0 ? COLORS.accentYellow : comp.rating >= 3.5 ? COLORS.accentOrange : COLORS.accentRed;
    doc.setTextColor(...rColor);
    doc.text(String(comp.rating), cols[2].x, ry + 12);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(String(comp.reviewCount), cols[3].x, ry + 12);
    const typeColor = comp.classification === "Direct Competitor" ? COLORS.accentRed : comp.classification === "Indirect Competitor" ? COLORS.accentYellow : comp.classification === "Franchise Sibling" ? COLORS.accentPurple : COLORS.textMuted;
    doc.setTextColor(...typeColor);
    doc.setFontSize(6.5);
    doc.text(comp.classification || "—", cols[4].x, ry + 12);
    const tierColor = comp.tier === "Premium" ? COLORS.accentAmber : comp.tier === "Mid-Market" ? COLORS.accentBlue : comp.tier === "Value" ? COLORS.accentGreen : COLORS.textMuted;
    doc.setTextColor(...tierColor);
    doc.text(comp.tier || "—", cols[5].x, ry + 12);
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFontSize(7.5);
    doc.text(comp.estimatedRevenue ? `$${(comp.estimatedRevenue.mid / 1000).toFixed(0)}K` : "—", cols[6].x, ry + 12);
  });

  const summaryY = y + 18 + tableComps.length * rowH + 16;
  if (summaryY < H - 100) {
    doc.setFillColor(...COLORS.bgCard);
    doc.roundedRect(M, summaryY, CW, 50, 6, 6, "F");
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY", M + 16, summaryY + 16);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${metrics.totalCompetitors} total competitors identified within ${metadata.radius} miles — ` +
      `${metrics.directCompetitors} direct, ${metrics.indirectCompetitors} indirect, ` +
      `${metrics.franchiseSiblings} franchise, ${metrics.adjacentServices} adjacent. ` +
      `Market saturation rated ${metrics.riskBand} (${metrics.saturationScore}/100).`,
      M + 16, summaryY + 32, { maxWidth: CW - 32 }
    );
  }

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.text("Revenue estimates and benchmarks are AI-derived directional indicators for strategic planning purposes only.", W / 2, H - 36, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`Market Saturation Analyzer — ${metadata.category} — ${metadata.radius}mi radius`, W / 2, H - 24, { align: "center" });
  doc.text("Page 2 of 3", W - M, H - 24, { align: "right" });

  const filename = `Market-Saturation-Report_${metadata.category.replace(/[^a-zA-Z]/g, "-")}_${metadata.radius}mi_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// ═══ Heat Map Data Generator ═══
function generateHeatMapData(competitors: Competitor[], radiusMiles: number, cols: number, rows: number): number[][] {
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  const cx = cols / 2;
  const cy = rows / 2;
  for (const comp of competitors) {
    const angle = Math.random() * Math.PI * 2;
    const normalizedDist = comp.distance / radiusMiles;
    const gx = Math.floor(cx + Math.cos(angle) * normalizedDist * (cols / 2));
    const gy = Math.floor(cy + Math.sin(angle) * normalizedDist * (rows / 2));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = Math.sqrt((c - gx) ** 2 + (r - gy) ** 2);
        if (dist < 4) grid[r][c] += Math.max(0, 1 - dist / 4) * (comp.reviewCount / 100);
      }
    }
  }
  const maxVal = Math.max(...grid.flat(), 0.01);
  return grid.map((row) => row.map((v) => Math.min(v / maxVal, 1)));
}

function getHeatColor(intensity: number): [number, number, number] {
  if (intensity < 0.15) return [14, 20, 35];
  if (intensity < 0.3) return [20, 60, 40];
  if (intensity < 0.45) return [30, 100, 50];
  if (intensity < 0.6) return [120, 160, 20];
  if (intensity < 0.75) return [200, 150, 10];
  if (intensity < 0.9) return [230, 100, 20];
  return [220, 50, 40];
}
