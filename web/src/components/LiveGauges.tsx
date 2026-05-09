import type { Reading, Thresholds } from '../types';
import Gauge from './Gauge';

export default function LiveGauges({ latest, th }: { latest: Reading | null; th: Thresholds }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Gauge label="Temperature" value={latest?.temp} unit="°C" digits={2}
             thresh={th.temp} range={[15, 40]} />
      <Gauge label="pH"          value={latest?.pH}   unit=""    digits={2}
             thresh={th.ph}   range={[0, 14]} />
      <Gauge label="Turbidity"   value={latest?.turb} unit="NTU" digits={1}
             thresh={th.turb} range={[0, 200]} upperOnly />
    </div>
  );
}
