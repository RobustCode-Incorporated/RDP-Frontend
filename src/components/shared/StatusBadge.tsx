import { getDeliveryStatusClasses, getDeliveryStatusLabel } from '../../lib/deliveryStatus';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      data-status={status}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getDeliveryStatusClasses(status)}`}
    >
      {getDeliveryStatusLabel(status)}
    </span>
  );
}

export function ReadyBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-medium text-fuchsia-700">
      Prête au retrait
    </span>
  );
}
