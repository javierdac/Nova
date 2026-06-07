import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const axis = { stroke: 'hsl(var(--muted-foreground))', fontSize: 11 };
const grid = 'hsl(var(--border))';
const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64 pt-2">
        {/* minHeight guards against recharts' ResponsiveContainer collapsing to 0
            on first mount (ResizeObserver race), which renders a blank chart. */}
        <ResponsiveContainer width="100%" height="100%" minHeight={220}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const fmtDate = (d: string) => d.slice(5); // MM-DD

export function TrendLine({ data, dataKey, color = 'hsl(var(--primary))' }: { data: { date: string }[]; dataKey: string; color?: string }) {
  return (
    <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
      <XAxis dataKey="date" tickFormatter={fmtDate} {...axis} />
      <YAxis {...axis} />
      <Tooltip contentStyle={tooltipStyle} />
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
    </LineChart>
  );
}

export function TrendBar({ data, dataKey, color = 'hsl(var(--primary))' }: { data: { date: string }[]; dataKey: string; color?: string }) {
  return (
    <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
      <XAxis dataKey="date" tickFormatter={fmtDate} {...axis} />
      <YAxis {...axis} />
      <Tooltip contentStyle={tooltipStyle} />
      <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
    </BarChart>
  );
}

export function CapacityArea({ data }: { data: { date: string; available: number; committed: number }[] }) {
  return (
    <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
      <defs>
        <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
      <XAxis dataKey="date" tickFormatter={fmtDate} {...axis} />
      <YAxis {...axis} />
      <Tooltip contentStyle={tooltipStyle} />
      <Area type="monotone" dataKey="available" stroke="hsl(var(--primary))" fill="url(#cap)" strokeWidth={2} />
      <Area type="monotone" dataKey="committed" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
    </AreaChart>
  );
}
