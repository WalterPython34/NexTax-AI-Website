import DealIntelligencePage from "@/components/deal-intelligence-page";

export default async function DealPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DealIntelligencePage slug={slug} />;
}
