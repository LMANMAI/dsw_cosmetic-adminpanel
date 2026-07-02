import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { Pedido } from "../types";

export async function listPedidos(): Promise<Pedido[]> {
  const snap = await getDocs(collection(db, "pedidos"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pedido, "id">) }));
}
