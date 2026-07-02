"use client";

import { PageHeader } from "@/components/PageHeader";
import { UsuariosTable } from "@/components/UsuariosTable";
import { exencionVigente } from "@/lib/services/usuarios";

export default function ProfesionalesPage() {
  return (
    <>
      <PageHeader
        title="Profesionales"
        description="Cuentas con rol = profesional. Inhabilitar oculta el perfil de las búsquedas de clientes."
      />
      <UsuariosTable
        rol="profesional"
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
          {
            key: "comision",
            label: "Comisión",
            render: (u) => {
              const hasta = exencionVigente(u);
              return hasta ? (
                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                  Exento hasta {hasta}
                </span>
              ) : (
                "Normal"
              );
            },
          },
        ]}
      />
    </>
  );
}
