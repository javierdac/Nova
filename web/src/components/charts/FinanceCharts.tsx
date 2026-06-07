import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const axis = { stroke: 'hsl(var(--muted-foreground))', fontSize: 11 };
const grid = 'hsl(var(--border))';
const tip = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };
export const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899'];
const usd = (v: number) => `$${(v / 1000).toFixed(0)}k`;

export function FinChartCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pt-2">
        {/* Fixed pixel height (width stays responsive) — avoids recharts rendering
            a blank chart when a % height resolves to 0 on first mount. */}
        <ResponsiveContainer width="100%" height={224}>{children as React.ReactElement}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CostLine({ data, keys }: { data: Record<string, unknown>[]; keys: { key: string; color: string }[] }) {
  return (
    <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
      <XAxis dataKey="period" {...axis} />
      <YAxis tickFormatter={usd} {...axis} />
      <Tooltip contentStyle={tip} formatter={(v: number) => `$${v.toLocaleString()}`} />
      {keys.map((k) => <Line key={k.key} type="monotone" dataKey={k.key} stroke={k.color} strokeWidth={2} dot={false} />)}
    </LineChart>
  );
}

export function CostBar({ data, dataKey, nameKey, color = PALETTE[0] }: { data: Record<string, unknown>[]; dataKey: string; nameKey: string; color?: string }) {
  return (
    <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
      <XAxis dataKey={nameKey} {...axis} />
      <YAxis tickFormatter={usd} {...axis} />
      <Tooltip contentStyle={tip} formatter={(v: number) => `$${v.toLocaleString()}`} />
      <Bar dataKey={dataKey} radius={[3, 3, 0, 0]}>
        {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length] ?? color} />)}
      </Bar>
    </BarChart>
  );
}

export function CostDonut({ data, dataKey, nameKey }: { data: Record<string, unknown>[]; dataKey: string; nameKey: string }) {
  return (
    <PieChart>
      <Pie data={data} dataKey={dataKey} nameKey={nameKey} innerRadius={55} outerRadius={85} paddingAngle={2}>
        {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
      </Pie>
      <Tooltip contentStyle={tip} formatter={(v: number) => `$${v.toLocaleString()}`} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
    </PieChart>
  );
}
