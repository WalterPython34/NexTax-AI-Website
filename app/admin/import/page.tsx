"use client";
import dynamic from "next/dynamic";

const DealImportTool = dynamic(
  () => import("@/components/deal-import-tool"),
  { ssr: false }
);

export default function AdminImportPage() {
  return <DealImportTool />;
}
