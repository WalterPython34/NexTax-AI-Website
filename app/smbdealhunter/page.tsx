// app/smbdealhunter/page.tsx
// Partner route: SMB Deal Hunter member version of the SBA Deal Check.
// Same engine as /sba-checker with the partner config: email gate bypassed
// (whitelisted server-side), partner_ref stamped for signup attribution,
// co-brand strip in the hero.

import SbaChecker, { SBA_PARTNERS } from "@/components/SbaChecker";

export default function SmbDealHunterCheckerPage() {
  return <SbaChecker partner={SBA_PARTNERS.smbdealhunter} />;
}
