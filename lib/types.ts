/**
 * Copia de los tipos del app (src/types/models.ts).
 * Mantener sincronizado a mano cuando cambie el modelo de datos en beautyapp.
 */

export type UserRole = "cliente" | "profesional" | "proveedor" | "admin";

export interface PerfilCliente {
  ciudad?: string;
  fechaNacimiento?: string;
  /** Tarifa de uso de la app personalizada (0-100). Si falta, se usa la global. */
  tarifaClientePorcentaje?: number;
  /** Hasta esta fecha (YYYY-MM-DD) el cliente no paga tarifa de uso. */
  tarifaClienteExentaHasta?: string;
}

export interface PerfilProfesionalSignup {
  especialidad: string;
  ciudad: string;
  direccion: string;
  aniosExperiencia: number;
  matricula?: string;
  instagram?: string;
  modalidad: "salon" | "domicilio" | "ambos";
  fotoSalonUrl?: string;
  latitud?: number;
  longitud?: number;
  nombreNegocio?: string;
  descripcion?: string;
  sitioWeb?: string;
  telefonoContacto?: string;
  perfilVisible?: boolean;
  autoConfirmarTurnos?: boolean;
  anticipoPorcentaje?: 0 | 20 | 50 | 100;
  /** Premio de competencia: fecha (YYYY-MM-DD) hasta la cual no paga comisión. */
  comisionExentaHasta?: string;
  /** Comisión personalizada (0-100). Si falta, se usa la global de config/plataforma. */
  comisionPorcentaje?: number;
  /** Datos de facturación: destino para recibir premios/transferencias. */
  facturacion?: { tipo: "alias" | "cbu"; valor: string };
}

/** Premio/transferencia manual registrada desde el panel. */
export interface Gratificacion {
  id: string;
  profesionalId: string;
  profesionalNombre: string;
  monto: number;
  motivo: string;
  estado: "pendiente" | "transferida";
  creadoEn: string; // ISO
  transferidaEn?: string | null; // ISO
}

export interface PerfilProveedor {
  razonSocial: string;
  cuit: string;
  rubro: string;
  ciudad: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  aceptaPedidos?: boolean;
  envioPropio?: boolean;
  retiroLocal?: boolean;
  notifPush?: boolean;
  emailPedidos?: boolean;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  /** VISTA activa de la cuenta. Un profesional mirando la app como cliente
   *  tiene rol 'cliente' pero esProfesional true. */
  rol: UserRole;
  /** Cuenta habilitada como profesional. Nunca vuelve a false. */
  esProfesional?: boolean;
  avatarUrl?: string;
  perfil?: PerfilCliente | PerfilProfesionalSignup | PerfilProveedor;
  mpConectado?: boolean;
}

export type ModalidadTrabajo = "salon" | "domicilio" | "ambos";

export interface PerfilProfesional {
  id: string;
  usuarioId: string;
  nombre: string;
  descripcion: string;
  zona: string;
  direccion: string;
  ciudad: string;
  latitud: number;
  longitud: number;
  telefono: string;
  instagram: string;
  modalidad: ModalidadTrabajo;
  fotoSalon?: string;
  rating: number;
  reviews: number;
  activa: boolean;
  suspendida?: boolean;
  categorias: string[];
  fotoUrl?: string;
  autoConfirmarTurnos?: boolean;
  anticipoPorcentaje?: 0 | 20 | 50 | 100;
}

export type EstadoTurno =
  | "pendiente_pago"
  | "pendiente"
  | "confirmado"
  | "completado"
  | "cancelado"
  | "no_asistio";

export type MetodoPago = "efectivo" | "transferencia" | "mercado_pago" | "mixto";

export interface Turno {
  id: string;
  clienteId: string;
  clienteNombre: string;
  profesionalId: string;
  servicioId: string;
  servicioNombre: string;
  fecha: string;
  hora: string;
  duracionMin: number;
  estado: EstadoTurno;
  monto: number;
  montoSena?: number;
  senaPagada?: boolean;
  metodoPago?: MetodoPago;
  comisionPlataforma?: number;
  /** Snapshot del % de comisión aplicado al completar (0-100). */
  comisionPorcentaje?: number;
  /** true si no se cobró comisión por una exención vigente (premio). */
  comisionExento?: boolean;
  /** Regla que determinó la comisión: 'global' | 'personalizada' | 'exencion'. */
  comisionOrigen?: "global" | "personalizada" | "exencion";
}

export type EstadoPedido =
  | "pendiente_pago"
  | "pendiente"
  | "confirmado"
  | "enviado"
  | "entregado"
  | "cancelado";

export interface ItemPedido {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Pedido {
  id: string;
  compradorId: string;
  compradorNombre?: string;
  compradorRol?: UserRole;
  proveedorId: string;
  proveedorNombre?: string;
  fecha: string;
  estado: EstadoPedido;
  items: ItemPedido[];
  total: number;
}

export interface Valoracion {
  id: string;
  profesionalId: string;
  clienteId: string;
  clienteNombre: string;
  turnoId: string;
  puntuacion: 1 | 2 | 3 | 4 | 5;
  comentario?: string;
  fecha: string;
}

export type EstadoCompetencia = "activa" | "finalizada";

export interface GanadorCompetencia {
  profesionalId: string;
  nombre: string;
  completados: number;
}

export interface Competencia {
  id: string;
  nombre: string;
  /** Cantidad de servicios completados necesarios para ganar (ej: 10 o 15). */
  metaServicios: number;
  /** Descripción libre del premio (ej: "$50.000" o "1 mes sin comisión"). */
  gratificacion: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  estado: EstadoCompetencia;
  ganadores?: GanadorCompetencia[];
  creadoEn: string;
}

/* ─── Catálogo global (colecciones `categorias` y `catalogo_servicios`) ─── */

/**
 * Slug de categoría. En la app móvil existe un union con las 13 categorías
 * base; acá es string porque el panel puede crear categorías nuevas.
 */
export type CategoriaSlug = string;

export interface Categoria {
  slug: CategoriaSlug;
  nombre: string;
  emoji: string;
}

export type GeneroServicio = "femenino" | "masculino" | "unisex";

export interface ServicioCatalogo {
  id: string;
  nombre: string;
  categoria: CategoriaSlug;
  /** Duración sugerida; cada profesional puede ajustarla en su perfil. */
  duracionEstimadaMin: number;
  genero?: GeneroServicio;
}

export type EstadoComision = "pendiente" | "pagada" | "vencida";

export interface ComisionMensual {
  id: string;
  profesionalId: string;
  mes: number;
  anio: number;
  montoTotal: number;
  estado: EstadoComision;
  fechaPago?: string;
  creadoEn: string;
}
