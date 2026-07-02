"use client";

import { PageHeader } from "@/components/PageHeader";
import { UsuariosTable } from "@/components/UsuariosTable";

export default function ProveedoresPage() {
  return (
    <>
      <PageHeader
        title="Proveedores"
        description="Cuentas con rol = proveedor. Inhabilitar pone aceptaPedidos en false."
      />
      <UsuariosTable
        rol="proveedor"
        extraColumns={[
          {
            key: "razonSocial",
            label: "Razón social",
            render: (u) => (u.perfil as any)?.razonSocial ?? "—",
          },
          {
            key: "rubro",
            label: "Rubro",
            render: (u) => (u.perfil as any)?.rubro ?? "—",
          },
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
