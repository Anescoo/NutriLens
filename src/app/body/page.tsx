'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { getAllBodyMeasurements, saveBodyMeasurement, deleteBodyMeasurement } from '@/lib/db';
import type { BodyMeasurement } from '@/types';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(date: string) {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

interface FormState {
  date: string;
  weight: string;
  height: string;
  bodyFat: string;
  muscleMass: string;
  waist: string;
  chest: string;
  leftArm: string;
  rightArm: string;
  notes: string;
  autoMuscle: boolean;
}

function emptyForm(): FormState {
  return {
    date: today(), weight: '', height: '', bodyFat: '', muscleMass: '',
    waist: '', chest: '', leftArm: '', rightArm: '', notes: '',
    autoMuscle: true,
  };
}

function calcBMI(weight: number, height: number): number {
  return weight / Math.pow(height / 100, 2);
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Insuffisance', color: '#60a5fa' };
  if (bmi < 25)   return { label: 'Normal', color: '#10b981' };
  if (bmi < 30)   return { label: 'Surpoids', color: '#f59e0b' };
  return { label: 'Obésité', color: '#ef4444' };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DeltaBadge({ value, unit = '', invert = false }: { value: number; unit?: string; invert?: boolean }) {
  if (value === 0) return null;
  // invert: for fat/waist, decrease = green
  const isGood = invert ? value < 0 : value > 0;
  return (
    <span className={`text-[11px] font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}{unit}
    </span>
  );
}

function StatCard({
  label, value, unit, delta, invertDelta, accent,
}: {
  label: string; value: string; unit?: string; delta?: number; invertDelta?: boolean; accent?: string;
}) {
  return (
    <div className="bg-[#0F0F1A] rounded-2xl p-3 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: accent || '#6B6B8A' }}>
        {label}
      </span>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-white leading-none">{value}</span>
        {unit && <span className="text-xs text-[#6B6B8A] mb-0.5">{unit}</span>}
      </div>
      {delta !== undefined && <DeltaBadge value={delta} unit={unit} invert={invertDelta} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-[#A78BFA] font-medium mb-1">{label}</p>
      <p className="text-white font-bold">{payload[0].value?.toFixed(1)} {unit}</p>
    </div>
  );
}

function TrendChart({
  data, dataKey, color, unit, gradient,
}: {
  data: BodyMeasurement[];
  dataKey: keyof BodyMeasurement;
  color: string;
  unit: string;
  gradient: string;
}) {
  const points = data
    .filter((m) => m[dataKey] != null)
    .map((m) => ({ date: fmt(m.date), value: m[dataKey] as number }));

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-[#6B6B8A] text-xs">
        Au moins 2 mesures nécessaires pour le graphique
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.2, 1);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d1f5e" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B6B8A' }} tickLine={false} axisLine={false} />
        <YAxis
          width={34}
          domain={[min - pad, max + pad]}
          tick={{ fontSize: 10, fill: '#6B6B8A' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toFixed(0)}
        />
        <ReferenceLine y={avg} stroke="#6B6B8A" strokeDasharray="4 3" strokeWidth={1} />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradient})`}
          dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5.5, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function NumberField({
  label, value, onChange, placeholder, step = '1', readOnly,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; step?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-[#6B6B8A] mb-1 block">{label}</label>
      <input
        type="number" value={value} step={step}
        readOnly={readOnly}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7C3AED] outline-none transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BodyPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [activeChart, setActiveChart] = useState<'weight' | 'bodyFat' | 'waist'>('weight');

  const load = useCallback(async () => {
    setMeasurements(await getAllBodyMeasurements());
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-compute muscle mass
  useEffect(() => {
    if (!form.autoMuscle) return;
    const w = parseFloat(form.weight);
    const bf = parseFloat(form.bodyFat);
    if (!isNaN(w) && !isNaN(bf) && bf > 0 && bf < 100) {
      setForm((f) => ({ ...f, muscleMass: (w * (1 - bf / 100)).toFixed(1) }));
    } else {
      setForm((f) => ({ ...f, muscleMass: '' }));
    }
  }, [form.weight, form.bodyFat, form.autoMuscle]);

  async function handleSave() {
    const w = parseFloat(form.weight);
    if (isNaN(w) || w <= 0) return;
    setSaving(true);
    await saveBodyMeasurement({
      id: uid(),
      date: form.date,
      weight: w,
      height: form.height ? parseFloat(form.height) : undefined,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : undefined,
      muscleMass: form.muscleMass ? parseFloat(form.muscleMass) : undefined,
      waist: form.waist ? parseFloat(form.waist) : undefined,
      chest: form.chest ? parseFloat(form.chest) : undefined,
      leftArm: form.leftArm ? parseFloat(form.leftArm) : undefined,
      rightArm: form.rightArm ? parseFloat(form.rightArm) : undefined,
      notes: form.notes || undefined,
    });
    await load();
    setForm(emptyForm());
    setShowForm(false);
    setSaving(false);
  }

  const latest = measurements[measurements.length - 1];
  const prev = measurements[measurements.length - 2];

  const wDelta = latest && prev ? latest.weight - prev.weight : undefined;
  const bfDelta = latest?.bodyFat != null && prev?.bodyFat != null ? latest.bodyFat - prev.bodyFat : undefined;
  const mmDelta = latest?.muscleMass != null && prev?.muscleMass != null ? latest.muscleMass - prev.muscleMass : undefined;

  // Use the most recent height available across all measurements
  const latestHeight = [...measurements].reverse().find((m) => m.height != null)?.height;
  const bmi = latest && latestHeight ? calcBMI(latest.weight, latestHeight) : null;
  const bmiInfo = bmi ? bmiCategory(bmi) : null;

  const chartOptions = [
    { key: 'weight' as const, label: 'Poids', color: '#7C3AED', unit: 'kg', gradient: 'gWeight' },
    { key: 'bodyFat' as const, label: 'MG %', color: '#f59e0b', unit: '%', gradient: 'gFat' },
    { key: 'waist' as const, label: 'Taille', color: '#10b981', unit: 'cm', gradient: 'gWaist' },
  ];
  const activeOpt = chartOptions.find((o) => o.key === activeChart)!;

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">

      {/* Header */}
      <div className="pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Corps</h1>
          <p className="text-xs text-[#6B6B8A] mt-0.5">
            {measurements.length > 0
              ? `${measurements.length} mesure${measurements.length > 1 ? 's' : ''} enregistrée${measurements.length > 1 ? 's' : ''}`
              : 'Suivi des mensurations'}
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm()); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-[#7C3AED] hover:bg-[#6d28d9] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Mesure
        </button>
      </div>

      {/* Stats strip */}
      {latest ? (
        <div className="mt-4 mb-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Poids" value={latest.weight.toFixed(1)} unit="kg" delta={wDelta} accent="#7C3AED" />
            {latest.bodyFat != null
              ? <StatCard label="Masse grasse" value={latest.bodyFat.toFixed(1)} unit="%" delta={bfDelta} invertDelta accent="#f59e0b" />
              : <div className="bg-[#0F0F1A] rounded-2xl p-3 flex items-center justify-center text-[10px] text-[#2d1f5e] text-center">Non renseigné</div>
            }
            {latest.muscleMass != null
              ? <StatCard label="Muscle" value={latest.muscleMass.toFixed(1)} unit="kg" delta={mmDelta} accent="#10b981" />
              : <div className="bg-[#0F0F1A] rounded-2xl p-3 flex items-center justify-center text-[10px] text-[#2d1f5e] text-center">Non renseigné</div>
            }
          </div>
          {bmi && bmiInfo && (
            <div className="bg-[#0F0F1A] rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6B8A]">IMC</span>
                <span className="text-xl font-bold text-white">{bmi.toFixed(1)}</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: bmiInfo.color, background: `${bmiInfo.color}20` }}
                >
                  {bmiInfo.label}
                </span>
              </div>
              {latestHeight && (
                <span className="text-xs text-[#6B6B8A]">Taille : {latestHeight} cm</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 mb-4 bg-[#1A1A2E] border border-dashed border-[#2d1f5e] rounded-2xl p-8 text-center">
          <div className="text-3xl mb-3">📏</div>
          <p className="text-white font-semibold text-sm mb-1">Aucune mesure</p>
          <p className="text-[#6B6B8A] text-xs mb-4">Enregistre ta première mesure pour commencer le suivi</p>
          <button
            onClick={() => { setForm(emptyForm()); setShowForm(true); }}
            className="bg-[#7C3AED] text-white text-sm font-semibold px-5 py-2 rounded-xl"
          >
            Ajouter une mesure
          </button>
        </div>
      )}

      {/* Trend chart */}
      <div className="mb-4">
        <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl overflow-hidden">
          {/* Chart tabs */}
          <div className="flex border-b border-[#2d1f5e]">
            {chartOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setActiveChart(opt.key)}
                className={[
                  'flex-1 py-3 text-xs font-semibold transition-colors relative',
                  activeChart === opt.key ? 'text-white' : 'text-[#6B6B8A]',
                ].join(' ')}
              >
                {opt.label}
                {activeChart === opt.key && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                    style={{ background: opt.color }}
                  />
                )}
              </button>
            ))}
          </div>
          {/* Chart area */}
          <div className="p-3">
            <TrendChart
              data={measurements}
              dataKey={activeOpt.key}
              color={activeOpt.color}
              unit={activeOpt.unit}
              gradient={activeOpt.gradient}
            />
          </div>
        </div>
      </div>

      {/* Circumferences (latest) */}
      {latest && (latestHeight || latest.waist || latest.chest || latest.leftArm || latest.rightArm) && (
        <div className="mb-4">
          <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">
              Mensurations actuelles
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {latestHeight && <MiniStat label="Taille" value={`${latestHeight} cm`} />}
              {latest.waist && <MiniStat label="Tour de taille" value={`${latest.waist} cm`} />}
              {latest.chest && <MiniStat label="Poitrine" value={`${latest.chest} cm`} />}
              {latest.leftArm && <MiniStat label="Bras gauche" value={`${latest.leftArm} cm`} />}
              {latest.rightArm && <MiniStat label="Bras droit" value={`${latest.rightArm} cm`} />}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {measurements.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">
            Historique
          </h2>
          <div className="space-y-2">
            {[...measurements].reverse().map((m, idx, arr) => {
              const prevM = arr[idx + 1];
              const wd = prevM ? m.weight - prevM.weight : 0;
              return (
                <div key={m.id} className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-white capitalize">
                        {new Date(m.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      {m.notes && <p className="text-xs text-[#6B6B8A] italic mt-0.5">{m.notes}</p>}
                    </div>
                    <button
                      onClick={() => deleteBodyMeasurement(m.id).then(load)}
                      className="p-1.5 text-[#6B6B8A] hover:text-red-400 transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <polyline points="3,6 5,6 21,6" /><path d="M19,6l-1,14H6L5,6" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Chip label="Poids" value={`${m.weight.toFixed(1)} kg`} delta={wd} invert={false} color="#7C3AED" />
                    {m.bodyFat != null && (
                      <Chip
                        label="MG" value={`${m.bodyFat.toFixed(1)}%`}
                        delta={prevM?.bodyFat != null ? m.bodyFat - prevM.bodyFat : 0}
                        invert color="#f59e0b"
                      />
                    )}
                    {m.muscleMass != null && (
                      <Chip
                        label="Muscle" value={`${m.muscleMass.toFixed(1)} kg`}
                        delta={prevM?.muscleMass != null ? m.muscleMass - prevM.muscleMass : 0}
                        invert={false} color="#10b981"
                      />
                    )}
                    {m.height != null && <Chip label="Taille" value={`${m.height} cm`} color="#60a5fa" />}
                    {m.height != null && <Chip label="IMC" value={calcBMI(m.weight, m.height).toFixed(1)} color={bmiCategory(calcBMI(m.weight, m.height)).color} />}
                    {m.waist != null && <Chip label="Tour taille" value={`${m.waist} cm`} color="#6B6B8A" />}
                    {m.chest != null && <Chip label="Poitrine" value={`${m.chest} cm`} color="#6B6B8A" />}
                    {m.leftArm != null && <Chip label="B. gauche" value={`${m.leftArm} cm`} color="#6B6B8A" />}
                    {m.rightArm != null && <Chip label="B. droit" value={`${m.rightArm} cm`} color="#6B6B8A" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
          <div className="w-full bg-[#1A1A2E] border-t border-[#2d1f5e] rounded-t-3xl max-h-[92vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#2d1f5e]" />
            </div>

            <div className="px-5 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-white">Nouvelle mesure</h2>
                <button onClick={() => setShowForm(false)} className="text-[#6B6B8A] hover:text-white p-1 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <label className="text-xs text-[#6B6B8A] mb-1 block">Date</label>
                <input
                  type="date" value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7C3AED] outline-none"
                />
              </div>

              {/* Section: essentials */}
              <p className="text-[10px] text-[#6B6B8A] uppercase tracking-widest mb-2">Essentiels</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <NumberField label="Poids (kg) *" value={form.weight} onChange={(v) => setForm((f) => ({ ...f, weight: v }))} placeholder="75.0" step="0.1" />
                <NumberField label="Taille (cm)" value={form.height} onChange={(v) => setForm((f) => ({ ...f, height: v }))} placeholder="175" step="1" />
                <NumberField label="Masse grasse (%)" value={form.bodyFat} onChange={(v) => setForm((f) => ({ ...f, bodyFat: v }))} placeholder="15.0" step="0.1" />
              </div>

              {/* Muscle mass with auto toggle */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[#6B6B8A]">Masse musculaire (kg)</label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, autoMuscle: !f.autoMuscle }))}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-[10px] text-[#6B6B8A]">Auto</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${form.autoMuscle ? 'bg-[#7C3AED]' : 'bg-[#2d1f5e]'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${form.autoMuscle ? 'left-[18px]' : 'left-0.5'}`} />
                    </div>
                  </button>
                </div>
                <NumberField
                  label="" value={form.muscleMass}
                  onChange={(v) => setForm((f) => ({ ...f, muscleMass: v }))}
                  placeholder={form.autoMuscle ? 'Calculé auto…' : '60.0'}
                  step="0.1" readOnly={form.autoMuscle}
                />
              </div>

              {/* Section: circumferences */}
              <p className="text-[10px] text-[#6B6B8A] uppercase tracking-widest mb-2">Mensurations (cm)</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <NumberField label="Tour de taille" value={form.waist} onChange={(v) => setForm((f) => ({ ...f, waist: v }))} placeholder="80" />
                <NumberField label="Tour de poitrine" value={form.chest} onChange={(v) => setForm((f) => ({ ...f, chest: v }))} placeholder="95" />
                <NumberField label="Bras gauche" value={form.leftArm} onChange={(v) => setForm((f) => ({ ...f, leftArm: v }))} placeholder="35" />
                <NumberField label="Bras droit" value={form.rightArm} onChange={(v) => setForm((f) => ({ ...f, rightArm: v }))} placeholder="35" />
              </div>

              <div className="mb-6">
                <label className="text-xs text-[#6B6B8A] mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Après sport, à jeun, matin…"
                  rows={2}
                  className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-sm text-white resize-none focus:border-[#7C3AED] outline-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !form.weight}
                className="w-full bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer la mesure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-[#0F0F1A] rounded-xl px-3 py-2">
      <span className="text-xs text-[#6B6B8A]">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function Chip({
  label, value, delta, invert, color,
}: {
  label: string; value: string; delta?: number; invert?: boolean; color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-[#0F0F1A] rounded-xl px-2.5 py-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</span>
      <span className="text-xs font-bold text-white">{value}</span>
      {delta !== undefined && delta !== 0 && (
        <ChipDelta value={delta} invert={invert} />
      )}
    </div>
  );
}

function ChipDelta({ value, invert = false }: { value: number; invert?: boolean }) {
  const isGood = invert ? value < 0 : value > 0;
  return (
    <span className={`text-[10px] font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}
    </span>
  );
}
