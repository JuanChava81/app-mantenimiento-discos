import MantenimientoApp from "@/components/MantenimientoApp";
import { fetchLocations } from "@/lib/locations";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { locations, source } = await fetchLocations();
  return <MantenimientoApp locations={locations} dataSource={source} />;
}
