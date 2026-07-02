"use client";

import { PageHeader } from "@/components/PageHeader";
import { UsuariosTable } from "@/components/UsuariosTable";

export default function ClientesPage() {
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cuentas con rol = cliente. Inhabilitar agrega bloqueado=true (respetar en el app)."
      />
      <UsuariosTable
        rol="cliente"
        extraColumns={[
          {
            key: "ciudad",
            label: "Ciudad",
            render: (u) => (u.perfil as any)?.ciudad ?? "—",
          },
        ]}
      />
    </>
  );
}
