import SbaChecker from "@/components/SbaChecker";

export const metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return <SbaChecker theme="light" />;
}
