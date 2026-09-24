import { Chain, Location } from "./types";

// 52 sucursales reales (28 Disco + 24 Devoto), extraídas de
// design_handoff_app_mantenimiento/Calendario de visitas.xlsx.
// Meses confirmados directo con el usuario, mes por mes, contra el Excel
// real (Marzo a Julio y Octubre a Febrero). Faltan Agosto y Setiembre: los
// locales que hoy tienen un solo mes van a sumar el segundo ahí.
const RAW_LOCATIONS: [string, string, string, number[]][] = [
  ["D 01", "Scoseria", "Scosería 2628", [6, 12]],
  ["D 02", "Agraciada", "Av. Agraciada 2986", [3]],
  ["D 03", "Arenal Grande", "Arenal Grande 1376", [1, 7]],
  ["D 04", "Legrand", "Av. Legrand 5085", [2]],
  ["D 05", "Parada 5", "Pedragosa Sierra y Av. Italia, Punta del Este", [5, 12]],
  ["D 06", "Fernandez Crespo", "Av. Daniel Fernandez Crespo 1727", [3]],
  ["D 07", "Soca", "Av. Dr. Francisco Soca 1318", [3]],
  ["D 08", "Roosevelt", "Av. Roosevelt y Zelmar Michellini s/n, Maldonado", [4, 11]],
  ["D 09", "Pta Carretas", "Ellauri 350, local 002. Shopping Punta Carretas", [5, 10]],
  ["D 10", "Camino Maldonado", "Brig. Gral. Lavalleja 7722, Maldonado", [3]],
  ["D 11", "8 de Octubre y Garibaldi", "8 de Octubre 2681", [4, 10]],
  ["D 12", "Curva De Maroñas", "8 de Octubre 4786", [1, 7]],
  ["D 13", "Chucarro", "Chucarro 1320", [5, 11]],
  ["D 14", "De La Punta", "Calle 17, entre Gorlero y 24, Punta del Este", [5, 12]],
  ["D 15", "Marcelino Sosa", "Marcelino Sosa 2706", [4, 10]],
  ["D 16", "Ayacucho", "Ayacucho 3370", [5, 11]],
  ["D 17", "Calle Maldonado", "Maldonado 1024", [6, 12]],
  ["D 18", "Solymar", "Av. Giannattasio Km. 23.500, Solymar", [2]],
  ["D 19", "Atlantida", "Calle Gral. Artigas s/n, entre 22 y 24, Atlántida", [1]],
  ["D 20", "20 De Setiembre", "20 de setiembre 1521", [3]],
  ["D 21", "Ejido", "Ejido 1530", [1, 7]],
  ["D 22", "Barrios Amorin", "Barrios Amorín 859", [1, 7]],
  ["D 23", "Medanos", "Av. Giannattasio km 27.500 y Av. Central, Médanos", [2]],
  ["D 24", "Obligado", "Obligado 968", [3]],
  ["D 25", "Solano Lopez", "Francisco Solano López 1680", [4, 10]],
  ["D 26", "Canelones", "Florencio Sanchez 729, Canelones", [5, 11]],
  ["D 27", "Avda Italia", "Magariños Cervantes 2052", [4, 10]],
  ["D 28", "La Cabaña", "Naciones Unidas y Rambla, El Pinar", [2]],
  ["DV 01", "Malvin", "H. Irigoyen 1444", [5, 11]],
  ["DV 02", "Punta Gorda", "Gral. Paz 1404", [6, 12]],
  ["DV 03", "Brisas", "Rivera 4502", [1, 7]],
  ["DV 04", "Carrasco", "Bolivia 1413", [2]],
  ["DV 05", "Shangrila", "Av. Calcagno s/n, Shangrilá", [3]],
  ["DV 06", "Santa Mónica", "Av. Italia 6958 esq. Sta. Mónica", [6, 12]],
  ["DV 07", "Colón", "Av. Garzón 1945", [6, 11]],
  ["DV 08", "San Martín I", "San Martín 3709", [6, 12]],
  ["DV 09", "Punta del Este", "Av. Roosevelt y Parada 10, Punta del Este", [4, 11]],
  ["DV 10", "Portones", "Av. Italia 5779", [1, 7]],
  ["DV 11", "Sayago", "Cno. Ariel 4626", [3, 10]],
  ["DV 12", "Pando", "Ruta 8 km 30.800, Pando", [4, 10]],
  ["DV 13", "Piriapolis Rambla", "Rbla. de los Argentinos y Vázquez, Piriápolis", [1, 12]],
  ["DV 14", "Hiperpiria", "Av. Piria y Bs. As., Piriápolis", [4, 11]],
  ["DV 15", "Agraciada", "Agraciada y Fco. Gómez", [2]],
  ["DV 16", "San Martín II", "Av. Gral. San Martín 3083", [5, 10]],
  ["DV 18", "Las Piedras I", "Juan A. Lavalleja 671", [2]],
  ["DV 19", "Prado - Suárez", "Joaquín Suarez 3458", [7, 10]],
  ["DV 20", "Arenal Grande", "Arenal Grande 2006", [6, 11]],
  ["DV 21", "8 de Octubre", "8 de Octubre 3621", [6, 12]],
  ["DV 22", "26 de Marzo", "26 de Marzo esq. Lorenzo Pérez", [2]],
  ["DV 23", "Coronel Mora", "Coronel Mora y Agr. Francisco Ros", [3]],
  ["DV 24", "San Quintín", "Av. San Quintín 4376", [1, 7]],
  ["DV 25", "Las Piedras II", "Av. Dr. Pouey 622", [2]],
];

export const REAL_LOCATIONS: Location[] = RAW_LOCATIONS.map(([suc, name, address, months]) => {
  const chain: Chain = suc.startsWith("DV") ? "Devoto" : "Disco";
  return {
    id: suc.toLowerCase().replace(/\s+/g, "-"),
    suc,
    chain,
    name,
    address,
    months,
  };
});

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];
