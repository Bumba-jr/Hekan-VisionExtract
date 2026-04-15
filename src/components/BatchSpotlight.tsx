import React, { useState, useEffect } from 'react';

const ACCENT_COLORS = [
    { primary: '#166534', light: '#F0FDF4', text: '#166534' },
    { primary: '#6366F1', light: '#EEF2FF', text: '#6366F1' },
    { primary: '#EA580C', light: '#FFF7ED', text: '#EA580C' },
    { primary: '#0EA5E9', light: '#F0F9FF', text: '#0EA5E9' },
    { primary: '#8B5CF6', light: '#F5F3FF', text: '#8B5CF6' },
    { primary: '#EC4899', light: '#FDF2F8', text: '#EC4899' },
    { primary: '#10B981', light: '#ECFDF5', text: '#10B981' },
    { primary: '#F59E0B', light: '#FFFBEB', text: '#B45309' },
];

const strip = (name: string) =>
    (name || '').replace(/^HEKAN_Registration_Batch_?/i, '').trim() || name;

function Dots({ total, current, goTo, color }: { total: number; current: number; goTo: (i: number) => void; color: string }) {
    return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {Array.from({ length: total }).map((_, i) => (
                <button
                    key={i}
                    onClick={() => goTo(i)}
                    style={{
                        width: i === current ? 20 : 6,
                        height: 6,
                        borderRadius: 99,
                        background: i === current ? color : '#E2E8F0',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.3s ease',
                    }}
                />
            ))}
        </div>
    );
}

export default function BatchSpotlight({ history }: { history: any[] }) {
    const [index, setIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (history.length <= 1) return;
        const id = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setIndex(p => (p + 1) % history.length);
                setVisible(true);
            }, 380);
        }, 4000);
        return () => clearInterval(id);
    }, [history.length]);

    const goTo = (i: number) => {
        setVisible(false);
        setTimeout(() => { setIndex(i); setVisible(true); }, 380);
    };

    if (!history.length) return null;

    const b = history[index];
    const name = strip(b.name);
    const date = new Date(b.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const theme = ACCENT_COLORS[index % ACCENT_COLORS.length];

    const maxReg = Math.max(...history.map(h => h.registrant_count || 0), 1);
    const maxAmt = Math.max(...history.map(h => h.total_amount || 0), 1);
    const regPct = Math.round(((b.registrant_count || 0) / maxReg) * 100);
    const amtPct = Math.round(((b.total_amount || 0) / maxAmt) * 100);

    return (
        <div style={{
            background: '#fff',
            border: `1.5px solid ${theme.primary}30`,
            borderRadius: 20,
            padding: 28,
            boxShadow: `0 4px 24px ${theme.primary}14`,
            transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Color avatar */}
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: theme.light,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.4s ease',
                    }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: theme.primary, transition: 'color 0.4s ease' }}>
                            {(name[0] || 'B').toUpperCase()}
                        </span>
                    </div>
                    <div style={{
                        opacity: visible ? 1 : 0,
                        transform: visible ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'opacity 0.38s ease, transform 0.38s ease',
                    }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: theme.primary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, transition: 'color 0.4s ease' }}>
                            Batch Spotlight
                        </p>
                        <p style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{name}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{date}</p>
                    </div>
                </div>
                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, flexShrink: 0 }}>
                    {index + 1} / {history.length}
                </span>
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.38s ease 0.04s, transform 0.38s ease 0.04s',
            }}>
                <div style={{ background: theme.light, borderRadius: 14, padding: '18px 20px', transition: 'background 0.4s ease' }}>
                    <p style={{ fontSize: 10, color: theme.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, transition: 'color 0.4s ease' }}>
                        Registrants
                    </p>
                    <p style={{ fontSize: 34, fontWeight: 900, color: '#0F172A', margin: 0, lineHeight: 1 }}>
                        {b.registrant_count ?? 0}
                    </p>
                    <div style={{ marginTop: 10 }}>
                        <div style={{ height: 4, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${regPct}%`,
                                background: theme.primary,
                                borderRadius: 99,
                                transition: 'width 0.6s ease, background 0.4s ease',
                            }} />
                        </div>
                        <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>{regPct}% of best batch</p>
                    </div>
                </div>

                <div style={{ background: theme.light, borderRadius: 14, padding: '18px 20px', transition: 'background 0.4s ease' }}>
                    <p style={{ fontSize: 10, color: theme.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, transition: 'color 0.4s ease' }}>
                        Revenue
                    </p>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', margin: 0, lineHeight: 1 }}>
                        ₦{(b.total_amount ?? 0).toLocaleString()}
                    </p>
                    <div style={{ marginTop: 10 }}>
                        <div style={{ height: 4, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${amtPct}%`,
                                background: theme.primary,
                                borderRadius: 99,
                                transition: 'width 0.6s ease, background 0.4s ease',
                            }} />
                        </div>
                        <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>{amtPct}% of best batch</p>
                    </div>
                </div>
            </div>

            {/* Dots */}
            <Dots total={history.length} current={index} goTo={goTo} color={theme.primary} />
        </div>
    );
}
