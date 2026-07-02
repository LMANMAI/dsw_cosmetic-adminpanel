import { PageHeader } from "@/components/PageHeader";
import { MapaCalor } from "@/components/MapaCalor";

export default function MapaPage() {
  return (
    <>
      <PageHeader
        title="Mapa de calor"
        description="Actividad por zona: profesionales activos, turnos y pedidos."
      />
      <MapaCalor />
    </>
  );
}
