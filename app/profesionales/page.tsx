"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { UsuariosTable } from "@/components/UsuariosTable";
import { GratificarModal } from "@/components/GratificarModal";
import { NormalizarModal } from "@/components/NormalizarModal";
import type { Usuario } from "@/lib/types";

export default function ProfesionalesPage() {
  const [gratificando, setGratificando] = useState<Usuario | null>(null);
  const [normalizando, setNormalizando] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  return (
    <>
      <PageHeader
        title="Profesionales"
        description="Cuentas habilitadas como profesionales (por rol o por el flag esProfesional). Inhabilitar oculta el perfil de las búsquedas de clientes. Las tarifas de servicio se gestionan en la sección Tarifas de servicio."
        actions={
          <button
            onClick={() => setNormalizando(true)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            title="Busca cuentas profesionales sin el flag esProfesional y las repara"
          >
            Normalizar cuentas
          </button>
        }
      />
      <UsuariosTable
        rol="profesional"
        reloadToken={reloadToken}
        extraColumns={[
          {
            key: "especialidad",
            label: "Especialidad",
            render: (u) => (u.perfil as any)?.especialidad ?? "—",
          },
          {
            key: "ciudad",
            label: "Ciudad",
            render: (u) => (u.perfil as any)?.ciudad ?? "—",
          },
          {
            key: "modalidad",
            label: "Modalidad",
            render: (u) => (u.perfil as any)?.modalidad ?? "—",
          },
        ]}
        extraActions={[
          { label: "Gratificar", onClick: (u) => setGratificando(u) },
        ]}
      />

      {gratificando && (
        <GratificarModal
          usuario={gratificando}
          onClose={() => setGratificando(null)}
        />
      )}

      {normalizando && (
        <NormalizarModal
          onClose={(huboCambios) => {
            setNormalizando(false);
            if (huboCambios) setReloadToken((n) => n + 1);
          }}
        />
      )}
    </>
  );
}
