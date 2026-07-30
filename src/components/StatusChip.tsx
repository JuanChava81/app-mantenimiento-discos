import { EquipmentStatus } from "@/lib/types";
import { CheckIcon, AlertIcon, DotIcon } from "./icons";

const CONFIG: Record<EquipmentStatus, { label: string; className: string; Icon: typeof CheckIcon }> = {
  ok: { label: "OK", className: "chip-ok", Icon: CheckIcon },
  falla: { label: "No OK", className: "chip-falla", Icon: AlertIcon },
  pendiente: { label: "Pendiente", className: "chip-pendiente", Icon: DotIcon },
};

export function StatusChip({ status }: { status: EquipmentStatus }) {
  const { label, className, Icon } = CONFIG[status];
  return (
    <span className={`chip ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
