import React, { useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { Bar, LinePath, Pie } from '@visx/shape';
import { scaleLinear, scaleBand, scalePoint } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { LinearGradient } from '@visx/gradient';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { curveMonotoneX } from 'd3-shape';

const COLORS = ['#166534','#10B981','#6366F1','#F59E0B','#EA580C','#8B5CF6','#EC4899','#0EA5E9','#14B8A6'];
const strip = (n: string) => (n||'').replace(/^HEKAN_Registration_Batch_?/i,'').trim()||n;

const TT: React.CSSProperties = {
  ...defaultStyles,
  background:'#fff', border:'1px solid #E2E8F0', borderRadius:12,
  boxShadow:'0 10px 25px -5px rgba(0,0,0,0.12)', padding:'10px 14px',
  fontSize:12, color:'#0F172A', minWidth:160, pointerEvents:'none',
};

// Date Range Filter
export function DateRangeFilter({ history, onFilter }: { history: any[]; onFilter: (f: any[]) => void }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const apply = () => {
    if (!from && !to) { onFilter(history); return; }
    onFilter(history.filter(b => {
      const d = new Date(b.created_at);
      if (from && d < new Date(from)) return false;
      if (to && d > new Date(to + 'T23:59:59')) return false;
      return true;
    }));
  };
  const reset = () => { setFrom(''); setTo(''); onFilter(history); };
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 flex flex-wrap items-center gap-3">
      <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Filter by Date:</span>
      <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="text-xs border border-[#E2E8F0] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#166534]"/>
      <span className="text-xs text-[#94A3B8]">to</span>
      <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="text-xs border border-[#E2E8F0] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#166534]"/>
      <button onClick={apply} className="text-xs font-bold bg-[#166534] text-white px-4 py-1.5 rounded-lg hover:bg-[#14532D] transition-colors">Apply</button>
      {(from||to) && <button onClick={reset} className="text-xs font-bold text-[#94A3B8] hover:text-[#EF4444] transition-colors">Clear</button>}
    </div>
  );
}

// Cumulative Running Total Line Chart
export function CumulativeLineChart({ data }: { data: any[] }) {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip<any>();
  const margin = { top:20, right:20, bottom:48, left:64 };
  return (
    <ParentSize debounceTime={10}>
      {({ width }) => {
        if (!width) return null;
        const h=220, xMax=width-margin.left-margin.right, yMax=h-margin.top-margin.bottom;
        const xScale = scalePoint<string>({ domain:data.map((_,i)=>`${i}`), range:[0,xMax], padding:0.5 });
        const regMax = Math.max(...data.map(d=>d.cumRegistrants),1);
        const amtMax = Math.max(...data.map(d=>d.cumAmount),1);
        const yReg = scaleLinear({ domain:[0,regMax*1.2], range:[yMax,0], nice:true });
        const yAmt = scaleLinear({ domain:[0,amtMax*1.2], range:[yMax,0], nice:true });
        const gx = (_:any,i:number) => xScale(`${i}`)??0;
        return (
          <div style={{position:'relative'}}>
            <svg width={width} height={h}>
              <Group left={margin.left} top={margin.top}>
                <GridRows scale={yReg} width={xMax} stroke="#F1F5F9" strokeDasharray="4 2" numTicks={4}/>
                <AxisLeft scale={yReg} numTicks={4} tickStroke="transparent" stroke="transparent"
                  tickLabelProps={()=>({fill:'#94A3B8',fontSize:10,textAnchor:'end',dy:'0.33em'})}/>
                <AxisBottom top={yMax} scale={xScale} tickStroke="transparent" stroke="#F1F5F9"
                  tickFormat={k=>{const d=data[Number(k)];return d?d.name:'';}}
                  tickLabelProps={()=>({fill:'#94A3B8',fontSize:10,textAnchor:'middle',fontWeight:600})}/>
                <LinePath data={data} x={gx} y={d=>yReg(d.cumRegistrants)??0}
                  stroke="#166534" strokeWidth={2.5} curve={curveMonotoneX} strokeLinecap="round"/>
                <LinePath data={data} x={gx} y={d=>yAmt(d.cumAmount)??0}
                  stroke="#6366F1" strokeWidth={2.5} curve={curveMonotoneX} strokeLinecap="round" strokeDasharray="6 3"/>
                {data.map((d,i)=>(
                  <circle key={i} cx={gx(d,i)} cy={yReg(d.cumRegistrants)??0} r={4}
                    fill="#fff" stroke="#166534" strokeWidth={2} style={{cursor:'pointer'}}
                    onMouseMove={e=>{const pt=localPoint(e)||{x:0,y:0};showTooltip({tooltipData:d,tooltipLeft:pt.x+margin.left,tooltipTop:pt.y+margin.top});}}
                    onMouseLeave={hideTooltip}/>
                ))}
              </Group>
            </svg>
            {tooltipOpen&&tooltipData&&(
              <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={TT}>
                <p style={{fontWeight:900,marginBottom:4}}>{tooltipData.name}</p>
                <p style={{color:'#94A3B8',fontSize:10,marginBottom:6}}>{tooltipData.date}</p>
                <div style={{display:'flex',gap:6,marginBottom:3}}>
                  <span style={{width:10,height:10,borderRadius:2,background:'#166534',display:'inline-block',marginTop:1}}/>
                  <span style={{color:'#475569'}}>Total Registrants:</span>
                  <span style={{fontWeight:700,marginLeft:'auto'}}>{tooltipData.cumRegistrants}</span>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <span style={{width:10,height:10,borderRadius:2,background:'#6366F1',display:'inline-block',marginTop:1}}/>
                  <span style={{color:'#475569'}}>Total Revenue:</span>
                  <span style={{fontWeight:700,color:'#6366F1',marginLeft:'auto'}}>₦{tooltipData.cumAmount.toLocaleString()}</span>
                </div>
              </TooltipWithBounds>
            )}
          </div>
        );
      }}
    </ParentSize>
  );
}

// Position Breakdown Donut
export function PositionDonutChart({ data }: { data: any[] }) {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip<any>();
  const total = data.reduce((s,d)=>s+d.value,0);
  const threshold = total*0.03;
  const main = data.filter(d=>d.value>=threshold);
  const otherVal = data.filter(d=>d.value<threshold).reduce((s,d)=>s+d.value,0);
  const chartData = otherVal>0?[...main,{name:'Other',value:otherVal}]:main;
  return (
    <ParentSize debounceTime={10}>
      {({ width }) => {
        if (!width) return null;
        const h=180, cx=width/2, cy=h/2;
        const outerR=Math.min(cx,cy)-8, innerR=outerR*0.5;
        return (
          <div style={{position:'relative'}}>
            <svg width={width} height={h}>
              <Group top={cy} left={cx}>
                <Pie data={chartData} pieValue={d=>d.value} outerRadius={outerR} innerRadius={innerR} padAngle={0.025}>
                  {pie=>pie.arcs.map((arc,i)=>{
                    const [cx2,cy2]=pie.path.centroid(arc);
                    const pct=total?Math.round((arc.data.value/total)*100):0;
                    return (
                      <g key={i}>
                        <path d={pie.path(arc)||''} fill={COLORS[i%COLORS.length]}
                          opacity={tooltipData?.name===arc.data.name?1:0.82} style={{cursor:'pointer'}}
                          onMouseMove={e=>{const pt=localPoint(e)||{x:0,y:0};showTooltip({tooltipData:arc.data,tooltipLeft:pt.x+cx,tooltipTop:pt.y+cy});}}
                          onMouseLeave={hideTooltip}/>
                        {pct>=7&&<text x={cx2} y={cy2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={10} fontWeight={700} pointerEvents="none">{pct}%</text>}
                      </g>
                    );
                  })}
                </Pie>
                <text textAnchor="middle" dominantBaseline="middle" fill="#0F172A" fontSize={18} fontWeight={900} y={-6}>{total}</text>
                <text textAnchor="middle" dominantBaseline="middle" fill="#94A3B8" fontSize={9} fontWeight={700} y={9} letterSpacing={1}>TOTAL</text>
              </Group>
            </svg>
            {tooltipOpen&&tooltipData&&(
              <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={TT}>
                <p style={{fontWeight:900,marginBottom:6}}>{tooltipData.name}</p>
                <div style={{display:'flex',gap:8}}>
                  <span style={{color:'#475569'}}>Count:</span>
                  <span style={{fontWeight:700}}>{tooltipData.value}</span>
                  <span style={{color:'#94A3B8'}}>({total?Math.round((tooltipData.value/total)*100):0}%)</span>
                </div>
              </TooltipWithBounds>
            )}
          </div>
        );
      }}
    </ParentSize>
  );
}

// Revenue per Registrant Bar Chart
export function RevenuePerRegChart({ data }: { data: any[] }) {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip<any>();
  const margin = { top:16, right:16, bottom:48, left:64 };
  return (
    <ParentSize debounceTime={10}>
      {({ width }) => {
        if (!width) return null;
        const h=220, xMax=width-margin.left-margin.right, yMax=h-margin.top-margin.bottom;
        const xScale = scaleBand<string>({ domain:data.map((_,i)=>`${i}`), range:[0,xMax], padding:data.length===1?0.6:0.4 });
        const yScale = scaleLinear({ domain:[0,Math.max(...data.map(d=>d.avgRevenue),1)*1.25], range:[yMax,0], nice:true });
        const bw = xScale.bandwidth();
        return (
          <div style={{position:'relative'}}>
            <svg width={width} height={h}>
              <LinearGradient id="rprGrad" from="#EA580C" to="#EA580C" fromOpacity={1} toOpacity={0.4} vertical/>
              <Group left={margin.left} top={margin.top}>
                <GridRows scale={yScale} width={xMax} stroke="#F1F5F9" strokeDasharray="4 2" numTicks={4}/>
                <AxisLeft scale={yScale} numTicks={4} tickStroke="transparent" stroke="transparent"
                  tickFormat={v=>`₦${(Number(v)/1000).toFixed(0)}k`}
                  tickLabelProps={()=>({fill:'#94A3B8',fontSize:10,textAnchor:'end',dy:'0.33em'})}/>
                <AxisBottom top={yMax} scale={xScale} tickStroke="transparent" stroke="#F1F5F9"
                  tickFormat={k=>{const d=data[Number(k)];return d?d.name:'';}}
                  tickLabelProps={()=>({fill:'#94A3B8',fontSize:10,textAnchor:'middle',fontWeight:600})}/>
                {data.map((d,i)=>{
                  const x=xScale(`${i}`)??0;
                  const barH=yMax-(yScale(d.avgRevenue)??0);
                  return (
                    <Bar key={i} x={x} y={yMax-barH} width={bw} height={barH}
                      fill="url(#rprGrad)" rx={4} style={{cursor:'pointer'}}
                      onMouseMove={e=>{const pt=localPoint(e)||{x:0,y:0};showTooltip({tooltipData:d,tooltipLeft:pt.x+margin.left,tooltipTop:pt.y+margin.top});}}
                      onMouseLeave={hideTooltip}/>
                  );
                })}
              </Group>
            </svg>
            {tooltipOpen&&tooltipData&&(
              <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={TT}>
                <p style={{fontWeight:900,marginBottom:4}}>{tooltipData.name}</p>
                <p style={{color:'#94A3B8',fontSize:10,marginBottom:6}}>{tooltipData.date}</p>
                <div style={{display:'flex',gap:6}}>
                  <span style={{color:'#475569'}}>Avg per person:</span>
                  <span style={{fontWeight:700,color:'#EA580C',marginLeft:'auto'}}>₦{tooltipData.avgRevenue.toLocaleString()}</span>
                </div>
              </TooltipWithBounds>
            )}
          </div>
        );
      }}
    </ParentSize>
  );
}

// Growth Rate Chart
export function GrowthRateChart({ data }: { data: any[] }) {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip<any>();
  const margin = { top:20, right:16, bottom:48, left:52 };
  const filtered = data.slice(1);
  return (
    <ParentSize debounceTime={10}>
      {({ width }) => {
        if (!width||filtered.length===0) return <div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',fontSize:13}}>Need at least 2 batches</div>;
        const h=220, xMax=width-margin.left-margin.right, yMax=h-margin.top-margin.bottom;
        const allVals=filtered.flatMap(d=>[d.regGrowth,d.amtGrowth]);
        const minV=Math.min(...allVals,-10), maxV=Math.max(...allVals,10);
        const xScale=scaleBand<string>({domain:filtered.map((_,i)=>`${i}`),range:[0,xMax],padding:0.4});
        const yScale=scaleLinear({domain:[minV*1.3,maxV*1.3],range:[yMax,0],nice:true});
        const zero=yScale(0)??0;
        const bw=Math.max(4,(xScale.bandwidth()/2)-2);
        return (
          <div style={{position:'relative'}}>
            <svg width={width} height={h}>
              <Group left={margin.left} top={margin.top}>
                <GridRows scale={yScale} width={xMax} stroke="#F1F5F9" strokeDasharray="4 2" numTicks={5}/>
                <line x1={0} x2={xMax} y1={zero} y2={zero} stroke="#E2E8F0" strokeWidth={1.5}/>
                <AxisLeft scale={yScale} numTicks={5} tickStroke="transparent" stroke="transparent"
                  tickFormat={v=>`${v}%`}
                  tickLabelProps={()=>({fill:'#94A3B8',fontSize:10,textAnchor:'end',dy:'0.33em'})}/>
                <AxisBottom top={yMax} scale={xScale} tickStroke="transparent" stroke="#F1F5F9"
                  tickFormat={k=>{const d=filtered[Number(k)];return d?d.name:'';}}
                  tickLabelProps={()=>({fill:'#94A3B8',fontSize:10,textAnchor:'middle',fontWeight:600})}/>
                {filtered.map((d,i)=>{
                  const x0=xScale(`${i}`)??0;
                  const regH=Math.abs((yScale(d.regGrowth)??0)-zero);
                  const amtH=Math.abs((yScale(d.amtGrowth)??0)-zero);
                  const regY=d.regGrowth>=0?zero-regH:zero;
                  const amtY=d.amtGrowth>=0?zero-amtH:zero;
                  const onHover=(e:React.MouseEvent)=>{const pt=localPoint(e)||{x:0,y:0};showTooltip({tooltipData:d,tooltipLeft:pt.x+margin.left,tooltipTop:pt.y+margin.top});};
                  return (
                    <Group key={i}>
                      <Bar x={x0} y={regY} width={bw} height={regH} fill={d.regGrowth>=0?'#166534':'#EF4444'} rx={3} style={{cursor:'pointer'}} onMouseMove={onHover} onMouseLeave={hideTooltip}/>
                      <Bar x={x0+bw+3} y={amtY} width={bw} height={amtH} fill={d.amtGrowth>=0?'#10B981':'#F59E0B'} rx={3} style={{cursor:'pointer'}} onMouseMove={onHover} onMouseLeave={hideTooltip}/>
                    </Group>
                  );
                })}
              </Group>
            </svg>
            {tooltipOpen&&tooltipData&&(
              <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={TT}>
                <p style={{fontWeight:900,marginBottom:4}}>{tooltipData.name}</p>
                <div style={{display:'flex',gap:6,marginBottom:3}}>
                  <span style={{color:'#475569'}}>Registrant growth:</span>
                  <span style={{fontWeight:700,color:tooltipData.regGrowth>=0?'#166534':'#EF4444',marginLeft:'auto'}}>{tooltipData.regGrowth>0?'+':''}{tooltipData.regGrowth}%</span>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <span style={{color:'#475569'}}>Revenue growth:</span>
                  <span style={{fontWeight:700,color:tooltipData.amtGrowth>=0?'#10B981':'#F59E0B',marginLeft:'auto'}}>{tooltipData.amtGrowth>0?'+':''}{tooltipData.amtGrowth}%</span>
                </div>
              </TooltipWithBounds>
            )}
          </div>
        );
      }}
    </ParentSize>
  );
}

// Batch Comparison
export function BatchComparison({ history }: { history: any[] }) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(Math.min(1,history.length-1));
  if (history.length<2) return null;
  const bA=history[a], bB=history[b];
  const metrics=[
    {label:'Registrants',a:bA.registrant_count??0,b:bB.registrant_count??0,fmt:(v:number)=>`${v}`},
    {label:'Revenue',a:bA.total_amount??0,b:bB.total_amount??0,fmt:(v:number)=>`₦${v.toLocaleString()}`},
    {label:'Avg/Person',a:bA.registrant_count?Math.round((bA.total_amount||0)/bA.registrant_count):0,b:bB.registrant_count?Math.round((bB.total_amount||0)/bB.registrant_count):0,fmt:(v:number)=>`₦${v.toLocaleString()}`},
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1.5">Batch A</label>
          <select value={a} onChange={e=>setA(Number(e.target.value))} className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#166534] bg-white">
            {history.map((h,i)=><option key={i} value={i}>{strip(h.name)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1.5">Batch B</label>
          <select value={b} onChange={e=>setB(Number(e.target.value))} className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6366F1] bg-white">
            {history.map((h,i)=><option key={i} value={i}>{strip(h.name)}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-5">
        {metrics.map((m,i)=>{
          const max=Math.max(m.a,m.b,1);
          const pctA=Math.round((m.a/max)*100), pctB=Math.round((m.b/max)*100);
          const winner=m.a>m.b?'a':m.b>m.a?'b':'tie';
          return (
            <div key={i}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">{m.label}</span>
                {winner!=='tie'&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:winner==='a'?'#F0FDF4':'#EEF2FF',color:winner==='a'?'#166534':'#6366F1'}}>{winner==='a'?strip(bA.name):strip(bB.name)} leads</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#166534] font-bold truncate max-w-[100px]">{strip(bA.name)}</span>
                    <span className="font-bold text-[#0F172A]">{m.fmt(m.a)}</span>
                  </div>
                  <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#166534] rounded-full transition-all duration-700" style={{width:`${pctA}%`}}/>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#6366F1] font-bold truncate max-w-[100px]">{strip(bB.name)}</span>
                    <span className="font-bold text-[#0F172A]">{m.fmt(m.b)}</span>
                  </div>
                  <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#6366F1] rounded-full transition-all duration-700" style={{width:`${pctB}%`}}/>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Top DCCs Leaderboard
export function TopDCCsLeaderboard({ data }: { data: any[] }) {
  const total = data.reduce((s,d)=>s+d.value,0);
  const medals = ['🥇','🥈','🥉'];
  return (
    <div className="space-y-1.5">
      {data.slice(0,10).map((d,i)=>{
        const pct=total?Math.round((d.value/total)*100):0;
        return (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F8F9FA] transition-colors">
            <span className="text-sm w-6 text-center flex-shrink-0">{medals[i]||<span className="text-xs font-bold text-[#94A3B8]">{i+1}</span>}</span>
            <span className="text-xs font-bold text-[#0F172A] flex-1 truncate">{d.name}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-20 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,backgroundColor:COLORS[i%COLORS.length]}}/>
              </div>
              <span className="text-xs font-bold text-[#0F172A] w-6 text-right">{d.value}</span>
              <span className="text-[10px] text-[#94A3B8] w-8 text-right">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
