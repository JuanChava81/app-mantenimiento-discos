import RecorridoApp from "@/recorrido/RecorridoApp";
import { fetchLocations } from "@/lib/locations";

export const dynamic = "force-dynamic";

export const metadata = { title: "Recorrido del mes · Mantenimiento" };

export default async function Recorrido() {
  const { locations } = await fetchLocations();
  return <RecorridoApp locations={locations} />;
}
