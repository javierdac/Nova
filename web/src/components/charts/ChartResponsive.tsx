import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Drop-in replacement for recharts' ResponsiveContainer.
 *
 * recharts' own container relies on an internal ResizeObserver that, under React
 * 18 StrictMode (dev), can end up measuring 0×0 and never recovers — leaving the
 * chart blank until a window resize. This measures the width ourselves (with
 * clean observer teardown) and injects explicit `width`/`height` into the chart,
 * exactly like ResponsiveContainer does, but deterministically.
 */
export function ChartResponsive({
  height = 224,
  children,
}: {
  height?: number;
  children: ReactElement<{ width?: number; height?: number }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure(); // synchronous first measurement on mount
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Inject explicit dimensions into the chart wrapper, which forwards them to the
  // underlying recharts chart (LineChart/BarChart/…). Render only once measured.
  return (
    <div ref={ref} style={{ width: '100%', height }}>
      {width > 0 ? cloneElement(children, { width, height }) : null}
    </div>
  );
}
