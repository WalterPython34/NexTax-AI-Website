"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DealImportTool from "@/components/deal-import-tool";

export default function AdminImportPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/buyer-dashboard");
      else setAuthed(true);
    });
  }, [router]);

  if (!authed) return null;
  return <DealImportTool />;
}
