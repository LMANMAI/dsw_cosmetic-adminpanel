"use client";

import { PageHeader } from "@/components/PageHeader";
import { UsuariosTable } from "@/components/UsuariosTable";

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
        ]}
      />
    </>
  );
}
