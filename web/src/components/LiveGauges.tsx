import type { Reading, Thresholds } from '../types';
import type { Point } from '../hooks/useReadings';
import MetricCard from './MetricCard';

interface Props {
  latest: Reading | null;
  th: Thresholds;
  history: Point[];
}

export default function LiveGauges({ latest, th, history }: Props) {
  return (
    <div className="grid gap-gutter grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard icon="thermostat" label="Temperature"
                  value={latest?.temp} unit="°C" digits={2}
                  thresh={th.temp} history={history} field="temp" />
      <MetricCard icon="science" label="pH Level"
                  value={latest?.pH} digits={2}
                  thresh={th.ph} history={history} field="pH" />
      <MetricCard icon="water_drop" label="Turbidity"
                  value={latest?.turb} unit="NTU" digits={1}
                  thresh={th.turb} upperOnly
                  history={history} field="turb" />
    </div>
  );
}
