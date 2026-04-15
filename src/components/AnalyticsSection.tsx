import React from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { Bar, LinePath, Pie } from '@visx/shape';
import { scaleLinear, scaleBand, scalePoint } from '@visx/scale';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { LinearGradient } from '@visx/gradient';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { curveMonotoneX } from 'd3-shape';
import { History, Users, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

const COLORS = ['#166534', '#10B981', '#6366F1', '#F59E0B', '#EA580C', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6'];

const stripPrefix = (name: string) =>
    name.replace(/^HEKAN_Registration_Batch_?/i, '').trim() || name;

const TT: React.CSSProperties = {
    ...defaultStyles,
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
    padding: '10px 14px',
    fontSize: 12,
    color: '#0F172A',
    minWidth: 160,
    pointerEvents: 'none',
};

// ── Batch Performance ────────────────────────────────────────────────────────
function BatchBarChart({ data }: { data: any[] }) {
    const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip<any>();
    const margin = { top: 20, right: 64, bottom: 48, left: 52 };

    return (
        <ParentSize debounceTime={10}>
            {({ width }) => {
                if (!width) return null;
                const h = 300;
                const xMax = width - margin.left - margin.right;
                const yMax = h - margin.top - margin.bottom;

                const xScale = scaleBand<string>({
                    domain: data.map((d, i) => d.key ?? `${i}`),
                    range: [0, xMax],
                    padding: data.length === 1 ? 0.6 : 0.35,
                });

                const regMax = Math.max(...data.map(d => d.registrants), 1);
                const amtMax = Math.max(...data.map(d => d.amount), 1);

                const yLeft = scaleLinear({ domain: [0, regMax * 1.25], range: [yMax, 0], nice: true });
                const yRight = scaleLinear({ domain: [0, amtMax * 1.25], range: [yMax, 0], nice: true });

                const bw = Math.max(4, (xScale.bandwidth() / 2) - 3);

                return (
                    <div style={{ position: 'relative' }}>
                        <svg width={width} height={h}>
                            <LinearGradient id="bpReg" from="#166534" to="#166534" fromOpacity={1} toOpacity={0.4} vertical />
                            <LinearGradient id="bpAmt" from="#10B981" to="#10B981" fromOpacity={1} toOpacity={0.35} vertical />
                            <Group left={margin.left} top={margin.top}>
                                <GridRows scale={yLeft} width={xMax} stroke="#F1F5F9" strokeDasharray="4 2" numTicks={5} />
                                <AxisLeft scale={yLeft} numTicks={5} tickStroke="transparent" stroke="transparent"
                                    tickLabelProps={() => ({ fill: '#94A3B8', fontSize: 10, textAnchor: 'end', dy: '0.33em' })} />
                                <AxisRight left={xMax} scale={yRight} numTicks={5} tickStroke="transparent" stroke="transparent"
                                    tickFormat={v => `₦${(Number(v) / 1000).toFixed(0)}k`}
                                    tickLabelProps={() => ({ fill: '#94A3B8', fontSize: 10, textAnchor: 'start', dx: 4, dy: '0.33em' })} />
                                <AxisBottom top={yMax} scale={xScale} tickStroke="transparent" stroke="#F1F5F9"
                                    tickFormat={(key) => {
                                        const d = data.find((d, i) => (d.key ?? `${i}`) === key);
                                        return d ? d.name : key;
                                    }}
                                    tickLabelProps={() => ({ fill: '#94A3B8', fontSize: 10, textAnchor: 'middle', fontWeight: 600 })} />

                                {data.map((d, i) => {
                                    const x0 = xScale(d.key ?? `${i}`) ?? 0;
                                    const regH = yMax - (yLeft(d.registrants) ?? 0);
                                    const amtH = yMax - (yRight(d.amount) ?? 0);
                                    const onHover = (e: React.MouseEvent) => {
                                        const pt = localPoint(e) || { x: 0, y: 0 };
                                        showTooltip({ tooltipData: d, tooltipLeft: pt.x + margin.left, tooltipTop: pt.y + margin.top });
                                    };
                                    return (
                                        <Group key={i}>
                                            <Bar x={x0} y={yMax - regH} width={bw} height={regH}
                                                fill="url(#bpReg)" rx={4} style={{ cursor: 'pointer' }}
                                                onMouseMove={onHover} onMouseLeave={hideTooltip} />
                                            <Bar x={x0 + bw + 4} y={yMax - amtH} width={bw} height={amtH}
                                                fill="url(#bpAmt)" rx={4} style={{ cursor: 'pointer' }}
                                                onMouseMove={onHover} onMouseLeave={hideTooltip} />
                                        </Group>
                                    );
                                })}
                            </Group>
                        </svg>
                        {tooltipOpen && tooltipData && (
                            <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={TT}>
                                <p style={{ fontWeight: 900, marginBottom: 4, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripPrefix(tooltipData.fullName || tooltipData.name)}</p>
                                <p style={{ color: '#94A3B8', fontSize: 10, marginBottom: 8 }}>{tooltipData.date}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#166534', display: 'inline-block' }} />
                                    <span style={{ color: '#475569' }}>Registrants:</span>
                                    <span style={{ fontWeight: 700, marginLeft: 'auto' }}>{tooltipData.registrants} ppl</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                                    <span style={{ color: '#475569' }}>Revenue:</span>
                                    <span style={{ fontWeight: 700, color: '#10B981', marginLeft: 'auto' }}>₦{Number(tooltipData.amount).toLocaleString()}</span>
                                </div>
                            </TooltipWithBounds>
                        )}
                    </div>
                );
            }}
        </ParentSize>
    );
}

// ── Revenue Line ─────────────────────────────────────────────────────────────
function RevenueLineChart({ data }: { data: any[] }) {
    const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip<any>();
    const margin = { top: 20, right: 20, bottom: 48, left: 64 };

    return (
        <ParentSize debounceTime={10}>
            {({ width }) => {
                if (!width) return null;
                const h = 240;
                const xMax = width - margin.left - margin.right;
                const yMax = h - margin.top - margin.bottom;

                // Use scalePoint so each batch gets an evenly-spaced x position
                const xScale = scalePoint<string>({
                    domain: data.map((d, i) => d.key ?? `${i}`),
                    range: [0, xMax],
                    padding: 0.5,
                });

                const amtMax = Math.max(...data.map(d => d.amount), 1);
                const yScale = scaleLinear({ domain: [0, amtMax * 1.25], range: [yMax, 0], nice: true });

                const getX = (d: any, i: number) => xScale(d.key ?? `${i}`) ?? 0;
                const getY = (d: any) => yScale(d.amount) ?? 0;

                // Build area path manually using index-aware getX
                const areaPath = data.length >= 2
                    ? `M ${getX(data[0], 0)},${getY(data[0])} ` +
                    data.slice(1).map((d, i) => `L ${getX(d, i + 1)},${getY(d)}`).join(' ') +
                    ` L ${getX(data[data.length - 1], data.length - 1)},${yMax} L ${getX(data[0], 0)},${yMax} Z`
                    : '';

                return (
                    <div style={{ position: 'relative' }}>
                        <svg width={width} height={h}>
                            <LinearGradient id="lineAreaGrad" from="#10B981" to="#10B981" fromOpacity={0.18} toOpacity={0} vertical />
                            <Group left={margin.left} top={margin.top}>
                                <GridRows scale={yScale} width={xMax} stroke="#F1F5F9" strokeDasharray="4 2" numTicks={5} />
                                <AxisLeft scale={yScale} numTicks={5} tickStroke="transparent" stroke="transparent"
                                    tickFormat={v => `₦${(Number(v) / 1000).toFixed(0)}k`}
                                    tickLabelProps={() => ({ fill: '#94A3B8', fontSize: 10, textAnchor: 'end', dy: '0.33em' })} />
                                <AxisBottom top={yMax} scale={xScale} tickStroke="transparent" stroke="#F1F5F9"
                                    tickFormat={(key) => {
                                        const d = data.find((d, i) => (d.key ?? `${i}`) === key);
                                        return d ? d.name : key;
                                    }}
                                    tickLabelProps={() => ({ fill: '#94A3B8', fontSize: 10, textAnchor: 'middle', fontWeight: 600 })} />

                                {areaPath && <path d={areaPath} fill="url(#lineAreaGrad)" />}

                                <LinePath data={data} x={(d, i) => getX(d, i)} y={getY}
                                    stroke="#10B981" strokeWidth={3} curve={curveMonotoneX} strokeLinecap="round" />

                                {data.map((d, i) => (
                                    <circle key={i} cx={getX(d, i)} cy={getY(d)} r={5}
                                        fill="#fff" stroke="#10B981" strokeWidth={2.5}
                                        style={{ cursor: 'pointer' }}
                                        onMouseMove={(e) => {
                                            const pt = localPoint(e) || { x: 0, y: 0 };
                                            showTooltip({ tooltipData: d, tooltipLeft: pt.x + margin.left, tooltipTop: pt.y + margin.top });
                                        }}
                                        onMouseLeave={hideTooltip}
                                    />
                                ))}
                            </Group>
                        </svg>
                        {tooltipOpen && tooltipData && (
                            <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={TT}>
                                <p style={{ fontWeight: 900, marginBottom: 4, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripPrefix(tooltipData.fullName || tooltipData.name)}</p>
                                <p style={{ color: '#94A3B8', fontSize: 10, marginBottom: 8 }}>{tooltipData.date}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                                    <span style={{ color: '#475569' }}>Revenue:</span>
                                    <span style={{ fontWeight: 700, color: '#10B981', marginLeft: 'auto' }}>₦{Number(tooltipData.amount).toLocaleString()}</span>
                                </div>
                            </TooltipWithBounds>
                        )}
                    </div>
                );
            }}
        </ParentSize>
    );
}

// ── DCC Donut ────────────────────────────────────────────────────────────────
function DccDonutChart({ data }: { data: any[] }) {
    const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip<any>();

    // Group slices < 4% into "Other" to avoid thin slivers
    const total = data.reduce((s, d) => s + d.value, 0);
    const threshold = total * 0.04;
    const main = data.filter(d => d.value >= threshold);
    const otherVal = data.filter(d => d.value < threshold).reduce((s, d) => s + d.value, 0);
    const chartData = otherVal > 0 ? [...main, { name: 'Other', value: otherVal }] : main;

    return (
        <ParentSize debounceTime={10}>
            {({ width }) => {
                if (!width) return null;
                const h = 160;
                const cx = width / 2;
                const cy = h / 2;
                const outerR = Math.min(cx, cy) - 8;
                const innerR = outerR * 0.52;

                return (
                    <div style={{ position: 'relative' }}>
                        <svg width={width} height={h}>
                            <Group top={cy} left={cx}>
                                <Pie data={chartData} pieValue={d => d.value} outerRadius={outerR} innerRadius={innerR} padAngle={0.025}>
                                    {pie => pie.arcs.map((arc, i) => {
                                        const [cx2, cy2] = pie.path.centroid(arc);
                                        const pct = total ? Math.round((arc.data.value / total) * 100) : 0;
                                        const color = COLORS[i % COLORS.length];
                                        return (
                                            <g key={i}>
                                                <path
                                                    d={pie.path(arc) || ''}
                                                    fill={color}
                                                    opacity={tooltipData?.name === arc.data.name ? 1 : 0.82}
                                                    style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                                                    onMouseMove={(e) => {
                                                        const pt = localPoint(e) || { x: 0, y: 0 };
                                                        showTooltip({ tooltipData: arc.data, tooltipLeft: pt.x + cx, tooltipTop: pt.y + cy });
                                                    }}
                                                    onMouseLeave={hideTooltip}
                                                />
                                                {pct >= 7 && (
                                                    <text x={cx2} y={cy2} textAnchor="middle" dominantBaseline="middle"
                                                        fill="#fff" fontSize={10} fontWeight={700} pointerEvents="none">
                                                        {pct}%
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </Pie>
                                <text textAnchor="middle" dominantBaseline="middle" fill="#0F172A" fontSize={20} fontWeight={900} y={-7}>{total}</text>
                                <text textAnchor="middle" dominantBaseline="middle" fill="#94A3B8" fontSize={9} fontWeight={700} y={10} letterSpacing={1}>TOTAL</text>
                            </Group>
                        </svg>
                        {tooltipOpen && tooltipData && (
                            <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={TT}>
                                <p style={{ fontWeight: 900, marginBottom: 6, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripPrefix(tooltipData.fullName || tooltipData.name)}</p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#475569' }}>Count:</span>
                                    <span style={{ fontWeight: 700 }}>{tooltipData.value}</span>
                                    <span style={{ color: '#94A3B8' }}>({total ? Math.round((tooltipData.value / total) * 100) : 0}%)</span>
                                </div>
                            </TooltipWithBounds>
                        )}
                    </div>
                );
            }}
        </ParentSize>
    );
}

// ── LCC Horizontal Bars ───────────────────────────────────────────────────────
function LccBarChart({ data }: { data: any[] }) {
    const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip<any>();
    const margin = { top: 8, right: 48, bottom: 8, left: 148 };
    const barH = 20;
    const gap = 8;

    return (
        <ParentSize debounceTime={10}>
            {({ width }) => {
                if (!width) return null;
                const xMax = width - margin.left - margin.right;
                const h = data.length * (barH + gap) + margin.top + margin.bottom;

                const xScale = scaleLinear({
                    domain: [0, Math.max(...data.map(d => d.value), 1) * 1.15],
                    range: [0, xMax],
                    nice: true,
                });

                return (
                    <div style={{ position: 'relative' }}>
                        <svg width={width} height={h}>
                            <LinearGradient id="lccG" from="#6366F1" to="#8B5CF6" fromOpacity={1} toOpacity={0.75} vertical={false} />
                            <Group left={margin.left} top={margin.top}>
                                {data.map((d, i) => {
                                    const y = i * (barH + gap);
                                    const bw = xScale(d.value) ?? 0;
                                    return (
                                        <Group key={i}>
                                            {/* Track */}
                                            <Bar x={0} y={y} width={xMax} height={barH} fill="#F1F5F9" rx={5} />
                                            {/* Value */}
                                            <Bar x={0} y={y} width={bw} height={barH} fill="url(#lccG)" rx={5}
                                                style={{ cursor: 'pointer' }}
                                                onMouseMove={(e) => {
                                                    const pt = localPoint(e) || { x: 0, y: 0 };
                                                    showTooltip({ tooltipData: d, tooltipLeft: pt.x + margin.left, tooltipTop: pt.y + margin.top });
                                                }}
                                                onMouseLeave={hideTooltip}
                                            />
                                            {/* Label left */}
                                            <text x={-8} y={y + barH / 2} textAnchor="end" dominantBaseline="middle"
                                                fill="#475569" fontSize={11} fontWeight={600}>
                                                {d.name.length > 20 ? d.name.substring(0, 20) + '…' : d.name}
                                            </text>
                                            {/* Value right */}
                                            <text x={bw + 6} y={y + barH / 2} dominantBaseline="middle"
                                                fill="#6366F1" fontSize={10} fontWeight={700}>
                                                {d.value}
                                            </text>
                                        </Group>
                                    );
                                })}
                            </Group>
                        </svg>
                        {tooltipOpen && tooltipData && (
                            <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={TT}>
                                <p style={{ fontWeight: 900, marginBottom: 6, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripPrefix(tooltipData.fullName || tooltipData.name)}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366F1', display: 'inline-block' }} />
                                    <span style={{ color: '#475569' }}>Registrants:</span>
                                    <span style={{ fontWeight: 700, marginLeft: 'auto' }}>{tooltipData.value}</span>
                                </div>
                            </TooltipWithBounds>
                        )}
                    </div>
                );
            }}
        </ParentSize>
    );
}

// ── Main Export ───────────────────────────────────────────────────────────────
interface Props {
    history: any[];
    analyticsData: {
        dccDistribution: any[];
        lccDistribution: any[];
        registrationTrend: any[];
        amountTrend: any[];
        topBatch: any | null;
        avgAmount: number;
    };
}

export default function AnalyticsSection({ history, analyticsData }: Props) {
    if (analyticsData.registrationTrend.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] text-[#94A3B8] bg-white rounded-2xl border border-[#E2E8F0]">
                <BarChart3 className="h-12 w-12 opacity-10 mb-4" />
                <p className="font-medium">No analytics data yet</p>
                <p className="text-sm opacity-60">Save batches to see analytics</p>
            </div>
        );
    }

    const kpis = [
        { label: 'Total Batches', value: history.length, icon: <History className="h-5 w-5" />, color: '#6366F1', bg: '#EEF2FF', sub: null },
        { label: 'Total Registrants', value: history.reduce((a, b) => a + (b.registrant_count || 0), 0), icon: <Users className="h-5 w-5" />, color: '#166534', bg: '#F0FDF4', sub: null },
        { label: 'Total Revenue', value: `₦${history.reduce((a, b) => a + (b.total_amount || 0), 0).toLocaleString()}`, icon: <DollarSign className="h-5 w-5" />, color: '#10B981', bg: '#ECFDF5', sub: null },
        { label: 'Avg / Batch', value: history.length ? Math.round(history.reduce((a, b) => a + (b.registrant_count || 0), 0) / history.length) + ' ppl' : '—', icon: <TrendingUp className="h-5 w-5" />, color: '#F59E0B', bg: '#FFFBEB', sub: null },
        { label: 'Avg Amount / Person', value: analyticsData.avgAmount > 0 ? `₦${analyticsData.avgAmount.toLocaleString()}` : '—', icon: <DollarSign className="h-5 w-5" />, color: '#EA580C', bg: '#FFF7ED', sub: null },
        { label: 'Top Batch', value: analyticsData.topBatch ? `${analyticsData.topBatch.registrant_count} ppl` : '—', icon: <BarChart3 className="h-5 w-5" />, color: '#8B5CF6', bg: '#F5F3FF', sub: analyticsData.topBatch?.name || null },
    ];

    return (
        <div className="space-y-6" translate="no">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpis.map((k, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: k.bg, color: k.color }}>{k.icon}</div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider truncate">{k.label}</p>
                            <p className="text-xl font-black text-[#0F172A] leading-tight truncate">{k.value}</p>
                            {k.sub && <p className="text-[10px] text-[#94A3B8] truncate">{k.sub}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Batch Performance */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base font-black text-[#0F172A]">Batch Performance Overview</h3>
                        <p className="text-xs text-[#94A3B8] mt-0.5">Registrants and revenue per batch</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#166534] inline-block" />Registrants</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#10B981] inline-block" />Revenue (₦)</span>
                    </div>
                </div>
                <BatchBarChart data={analyticsData.registrationTrend} />
            </div>

            {/* Revenue Trend + DCC */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                    <div className="mb-4">
                        <h3 className="text-base font-black text-[#0F172A]">Revenue Trend</h3>
                        <p className="text-xs text-[#94A3B8] mt-0.5">Collection over time</p>
                    </div>
                    <RevenueLineChart data={analyticsData.amountTrend} />
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                    <div className="mb-4">
                        <h3 className="text-base font-black text-[#0F172A]">DCC Breakdown</h3>
                        <p className="text-xs text-[#94A3B8] mt-0.5">Registrants by district</p>
                    </div>
                    {analyticsData.dccDistribution.length === 0 ? (
                        <div className="flex items-center justify-center h-[200px] text-[#94A3B8] text-sm">No DCC data</div>
                    ) : (
                        <div className="flex gap-4 items-start">
                            {/* Donut — fixed width so legend has room */}
                            <div style={{ width: 160, flexShrink: 0 }}>
                                <DccDonutChart data={analyticsData.dccDistribution} />
                            </div>
                            {/* Legend */}
                            <div className="flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: 200 }}>
                                {analyticsData.dccDistribution.map((d, i) => {
                                    const tot = analyticsData.dccDistribution.reduce((s, x) => s + x.value, 0);
                                    const pct = tot ? Math.round((d.value / tot) * 100) : 0;
                                    return (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-xs text-[#475569] truncate flex-1">{d.name}</span>
                                            <span className="text-xs font-bold text-[#0F172A]">{d.value}</span>
                                            <span className="text-[10px] text-[#94A3B8] w-8 text-right">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* LCC Top 10 */}
            {analyticsData.lccDistribution.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
                    <div className="mb-4">
                        <h3 className="text-base font-black text-[#0F172A]">Top Local Church Councils</h3>
                        <p className="text-xs text-[#94A3B8] mt-0.5">Registrants by LCC (top 10)</p>
                    </div>
                    <LccBarChart data={analyticsData.lccDistribution} />
                </div>
            )}
        </div>
    );
}
