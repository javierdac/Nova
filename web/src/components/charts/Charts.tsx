import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartResponsive } from '@/components/charts/ChartResponsive';

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
      <CardContent className="pt-2">
        <ChartResponsive height={224}>{children as React.ReactElement}</ChartResponsive>
      </CardContent>
    </Card>
  );
}

const fmtDate = (d: string) => d.slice(5); // MM-DD

type Dims = { width?: number; height?: number };

export function TrendLine({ data, dataKey, color = 'hsl(var(--primary))', width, height }: { data: { date: string }[]; dataKey: string; color?: string } & Dims) {
  return (
    <LineChart width={width} height={height} data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
      <XAxis dataKey="date" tickFormatter={fmtDate} {...axis} />
      <YAxis {...axis} />
      <Tooltip contentStyle={tooltipStyle} />
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
    </LineChart>
  );
}

export function TrendBar({ data, dataKey, color = 'hsl(var(--primary))', width, height }: { data: { date: string }[]; dataKey: string; color?: string } & Dims) {
  return (
    <BarChart width={width} height={height} data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
      <XAxis dataKey="date" tickFormatter={fmtDate} {...axis} />
      <YAxis {...axis} />
      <Tooltip contentStyle={tooltipStyle} />
      <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
    </BarChart>
  );
}

export function CapacityArea({ data, width, height }: { data: { date: string; available: number; committed: number }[] } & Dims) {
  return (
    <AreaChart width={width} height={height} data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
