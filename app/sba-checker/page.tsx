// app/sba-checker/page.tsx
// Thin wrapper: the original Reddit-facing checker. Behavior is unchanged:
// email gate on, UTM/referrer lead capture intact. All logic lives in the
// shared component so /smbdealhunter never forks from this page.

import SbaChecker from "@/components/SbaChecker";

export default function SbaCheckerPage() {
  return <SbaChecker />;
}
