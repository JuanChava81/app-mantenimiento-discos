import { Chain, Location } from "./types";

// 52 sucursales reales (28 Disco + 24 Devoto), extraídas de
// design_handoff_app_mantenimiento/Calendario de visitas.xlsx.
// Los meses de Julio están verificados contra la hoja "Mes" del calendario;
// el resto sale de la grilla "Plan con formato" y puede tener que ajustarse
// (ver design_handoff_app_mantenimiento/README.md, sección "Dato a confirmar").
const RAW_LOCATIONS: [string, string, string, number[]][] = [
  ["D 01", "Scoseria", "Scosería 2628", [1, 7]],
  ["D 02", "Agraciada", "Av. Agraciada 2986", [1, 4]],
  ["D 03", "Arenal Grande", "Arenal Grande 1376", [1, 2]],
  ["D 04", "Legrand", "Av. Legrand 5085", [1, 3]],
  ["D 05", "Parada 5", "Pedragosa Sierra y Av. Italia, Punta del Este", [1, 6]],
  ["D 06", "Fernandez Crespo", "Av. Daniel Fernandez Crespo 1727", [1, 4]],
  ["D 07", "Soca", "Av. Dr. Francisco Soca 1318", [1, 4]],
  ["D 08", "Roosevelt", "Av. Roosevelt y Zelmar Michellini s/n, Maldonado", [1, 5]],
  ["D 09", "Pta Carretas", "Ellauri 350, local 002. Shopping Punta Carretas", [1, 6]],
  ["D 10", "Camino Maldonado", "Brig. Gral. Lavalleja 7722, Maldonado", [1, 4]],
  ["D 11", "8 de Octubre y Garibaldi", "8 de Octubre 2681", [1, 5]],
  ["D 12", "Curva De Maroñas", "8 de Octubre 4786", [1, 2]],
  ["D 13", "Chucarro", "Chucarro 1320", [1, 6]],
  ["D 14", "De La Punta", "Calle 17, entre Gorlero y 24, Punta del Este", [1, 6]],
  ["D 15", "Marcelino Sosa", "Marcelino Sosa 2706", [1, 5]],
  ["D 16", "Ayacucho", "Ayacucho 3370", [1, 6]],
  ["D 17", "Calle Maldonado", "Maldonado 1024", [1, 7]],
  ["D 18", "Solymar", "Av. Giannattasio Km. 23.500, Solymar", [1, 3]],
  ["D 19", "Atlantida", "Calle Gral. Artigas s/n, entre 22 y 24, Atlántida", [1, 2]],
  ["D 20", "20 De Setiembre", "20 de setiembre 1521", [1, 4]],
  ["D 21", "Ejido", "Ejido 1530", [1, 2]],
  ["D 22", "Barrios Amorin", "Barrios Amorín 859", [1, 2]],
  ["D 23", "Medanos", "Av. Giannattasio km 27.500 y Av. Central, Médanos", [1, 3]],
  ["D 24", "Obligado", "Obligado 968", [1, 4]],
  ["D 25", "Solano Lopez", "Francisco Solano López 1680", [1, 5]],
  ["D 26", "Canelones", "Florencio Sanchez 729, Canelones", [1, 6]],
  ["D 27", "Avda Italia", "Magariños Cervantes 2052", [1, 5]],
  ["D 28", "La Cabaña", "Naciones Unidas y Rambla, El Pinar", [1, 3]],
  ["DV 01", "Malvin", "H. Irigoyen 1444", [1, 6]],
  ["DV 02", "Punta Gorda", "Gral. Paz 1404", [1, 7]],
  ["DV 03", "Brisas", "Rivera 4502", [1, 2]],
  ["DV 04", "Carrasco", "Bolivia 1413", [1, 3]],
  ["DV 05", "Shangrila", "Av. Calcagno s/n, Shangrilá", [1, 4]],
  ["DV 06", "Santa Mónica", "Av. Italia 6958 esq. Sta. Mónica", [1, 7]],
  ["DV 07", "Colón", "Av. Garzón 1945", [1, 7]],
  ["DV 08", "San Martín I", "San Martín 3709", [1, 7]],
  ["DV 09", "Punta del Este", "Av. Roosevelt y Parada 10, Punta del Este", [1, 5]],
  ["DV 10", "Portones", "Av. Italia 5779", [1, 2]],
  ["DV 11", "Sayago", "Cno. Ariel 4626", [1, 4]],
  ["DV 12", "Pando", "Ruta 8 km 30.800, Pando", [1, 5]],
  ["DV 13", "Piriapolis Rambla", "Rbla. de los Argentinos y Vázquez, Piriápolis", [1, 2]],
  ["DV 14", "Hiperpiria", "Av. Piria y Bs. As., Piriápolis", [1, 5]],
  ["DV 15", "Agraciada", "Agraciada y Fco. Gómez", [1, 3]],
  ["DV 16", "San Martín II", "Av. Gral. San Martín 3083", [1, 6]],
  ["DV 18", "Las Piedras I", "Juan A. Lavalleja 671", [1, 3]],
  ["DV 19", "Prado - Suárez", "Joaquín Suarez 3458", [1, 8]],
  ["DV 20", "Arenal Grande", "Arenal Grande 2006", [1, 7]],
  ["DV 21", "8 de Octubre", "8 de Octubre 3621", [1, 7]],
  ["DV 22", "26 de Marzo", "26 de Marzo esq. Lorenzo Pérez", [1, 3]],
  ["DV 23", "Coronel Mora", "Coronel Mora y Agr. Francisco Ros", [1, 4]],
  ["DV 24", "San Quintín", "Av. San Quintín 4376", [1, 2]],
  ["DV 25", "Las Piedras II", "Av. Dr. Pouey 622", [1, 3]],
];

// Julio verificado contra la hoja "Mes" del calendario (8 locales). El resto
// de la grilla no está confirmado, así que corregimos julio explícitamente:
// solo estos 8 locales visitan en julio, sin importar lo que diga la grilla.
const JULIO_SUC_SET = new Set(["D 03", "D 12", "D 21", "D 22", "DV 03", "DV 10", "DV 19", "DV 24"]);

export const REAL_LOCATIONS: Location[] = RAW_LOCATIONS.map(([suc, name, address, rawMonths]) => {
  const chain: Chain = suc.startsWith("DV") ? "Devoto" : "Disco";
  const withoutJulio = rawMonths.filter((m) => m !== 7);
  const months = JULIO_SUC_SET.has(suc) ? [...withoutJulio, 7].sort((a, b) => a - b) : withoutJulio;
  return {
    id: suc.toLowerCase().replace(/\s+/g, "-"),
    suc,
    chain,
    name,
    address,
    months,
  };
});

// Julio verificado contra la hoja "Mes" del calendario (8 locales).
export const JULIO_SUC = ["D 03", "D 12", "D 21", "D 22", "DV 03", "DV 10", "DV 19", "DV 24"];

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];
