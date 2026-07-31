"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** La configuración de comisiones se movió a /comisiones. */
export default function ConfiguracionPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/comisiones");
  }, [router]);
  return null;
}
