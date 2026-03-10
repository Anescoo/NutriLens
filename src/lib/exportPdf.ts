import type { WorkoutSession, WorkoutPlan, BodyMeasurement } from '@/types';

export type ExportStyle = 'table' | 'styled';

interface ExportData {
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  measurements: BodyMeasurement[];
  userName?: string;
}

// RGB colors
const V: [number, number, number] = [124, 58, 237];    // violet
const LV: [number, number, number] = [167, 139, 250];  // light violet
const DK: [number, number, number] = [20, 20, 35];     // dark text
const MU: [number, number, number] = [107, 107, 138];  // muted
const WH: [number, number, number] = [255, 255, 255];  // white
const LB: [number, number, number] = [245, 243, 255];  // light bg
const SB: [number, number, number] = [235, 228, 255];  // section bg

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtTs(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function calcBMI(weight: number, height: number) {
  return (weight / Math.pow(height / 100, 2)).toFixed(1);
}

export async function exportWorkoutPdf(data: ExportData, style: ExportStyle): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const exportDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const lastY = () => (doc as any).lastAutoTable?.finalY ?? 30;

  // ── TABLE VERSION ──────────────────────────────────────────────────────────
  if (style === 'table') {
    // Header bar
    doc.setFillColor(...V);
    doc.rect(0, 0, W, 18, 'F');
    doc.setTextColor(...WH);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('NutriLens — Export données', 15, 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.userName ?? 'Utilisateur'} · ${exportDate}`, W - 15, 12, { align: 'right' });

    let y = 26;

    // Plans
    if (data.plans.length > 0) {
      doc.setTextColor(...V);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PLANS D\'ENTRAÎNEMENT', 15, y);
      y += 2;

      const rows: string[][] = [];
      for (const plan of data.plans) {
        for (const session of plan.sessions) {
          if (session.exercises.length === 0) {
            rows.push([plan.name, session.name, '(aucun exercice)', '—', '—']);
          }
          for (const ex of session.exercises) {
            rows.push([
              plan.name,
              session.name,
              ex.name,
              String(ex.sets),
              ex.groupType ? (ex.groupType === 'biset' ? 'Bi-set' : 'Superset') : '—',
            ]);
          }
        }
      }

      autoTable(doc, {
        startY: y,
        head: [['Plan', 'Séance', 'Exercice', 'Séries', 'Groupe']],
        body: rows,
        headStyles: { fillColor: V, textColor: WH, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: DK },
        alternateRowStyles: { fillColor: LB },
        columnStyles: {
          0: { cellWidth: 35 }, 1: { cellWidth: 30 }, 2: { cellWidth: 70 },
          3: { cellWidth: 20 }, 4: { cellWidth: 25 },
        },
        margin: { left: 15, right: 15 },
      });
      y = lastY() + 12;
    }

    // Charges
    if (data.sessions.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setTextColor(...V);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SUIVI DES CHARGES', 15, y);
      y += 2;

      const rows: string[][] = [];
      const sorted = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
      for (const session of sorted) {
        for (const ex of session.exercises) {
          ex.sets.forEach((set, i) => {
            rows.push([
              fmtDate(session.date),
              session.name,
              ex.name,
              String(i + 1),
              set.weight ?? '—',
              set.reps ?? '—',
              set.isDropSet ? 'Oui' : '',
              set.done ? '✓' : '',
            ]);
          });
        }
      }

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Séance', 'Exercice', '#', 'Poids (kg)', 'Reps', 'Drop', 'Fait']],
        body: rows.length > 0 ? rows : [['Aucune donnée', '', '', '', '', '', '', '']],
        headStyles: { fillColor: V, textColor: WH, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: DK },
        alternateRowStyles: { fillColor: LB },
        columnStyles: {
          0: { cellWidth: 24 }, 1: { cellWidth: 32 }, 2: { cellWidth: 53 },
          3: { cellWidth: 10 }, 4: { cellWidth: 20 }, 5: { cellWidth: 14 },
          6: { cellWidth: 13 }, 7: { cellWidth: 10 },
        },
        margin: { left: 15, right: 15 },
      });
      y = lastY() + 12;
    }

    // Mesures
    if (data.measurements.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setTextColor(...V);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('MESURES CORPORELLES', 15, y);
      y += 2;

      const rows = [...data.measurements]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((m) => [
          fmtDate(m.date),
          m.weight.toFixed(1),
          m.height ? String(m.height) : '—',
          m.height ? calcBMI(m.weight, m.height) : '—',
          m.bodyFat != null ? `${m.bodyFat.toFixed(1)}%` : '—',
          m.muscleMass != null ? m.muscleMass.toFixed(1) : '—',
          m.waist != null ? String(m.waist) : '—',
          m.chest != null ? String(m.chest) : '—',
          m.leftArm != null ? String(m.leftArm) : '—',
          m.notes ?? '',
        ]);

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Poids', 'Taille', 'IMC', 'MG%', 'Muscle', 'Taille', 'Poitrine', 'Bras', 'Notes']],
        body: rows,
        headStyles: { fillColor: V, textColor: WH, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: DK },
        alternateRowStyles: { fillColor: LB },
        columnStyles: {
          0: { cellWidth: 22 }, 1: { cellWidth: 15 }, 2: { cellWidth: 13 },
          3: { cellWidth: 13 }, 4: { cellWidth: 13 }, 5: { cellWidth: 14 },
          6: { cellWidth: 13 }, 7: { cellWidth: 17 }, 8: { cellWidth: 12 }, 9: { cellWidth: 48 },
        },
        margin: { left: 15, right: 15 },
      });
    }

    // Footer
    const pc = doc.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(...MU);
      doc.text(`NutriLens · Page ${i}/${pc}`, W / 2, H - 8, { align: 'center' });
    }

  // ── STYLED VERSION ─────────────────────────────────────────────────────────
  } else {
    const sectionHeader = (title: string, yPos: number): number => {
      doc.setFillColor(...V);
      doc.rect(0, yPos, W, 9, 'F');
      doc.setTextColor(...WH);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), 17, yPos + 6);
      return yPos + 13;
    };

    // Cover header
    doc.setFillColor(...V);
    doc.rect(0, 0, W, 38, 'F');
    doc.setFillColor(110, 40, 220);
    doc.rect(0, 28, W, 10, 'F');

    doc.setTextColor(...WH);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('NutriLens', 15, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Rapport d\'entraînement & suivi physique', 15, 28);
    doc.setFontSize(8.5);
    doc.text(data.userName ?? 'Utilisateur', W - 15, 19, { align: 'right' });
    doc.text(`Généré le ${exportDate}`, W - 15, 27, { align: 'right' });

    // Stats summary box
    doc.setFillColor(...LB);
    doc.rect(15, 43, W - 30, 18, 'F');
    const statW = (W - 30) / 3;
    const stats = [
      { n: data.plans.length, label: 'plans' },
      { n: data.sessions.length, label: 'séances' },
      { n: data.measurements.length, label: 'mesures' },
    ];
    stats.forEach(({ n, label }, i) => {
      const cx = 15 + statW * i + statW / 2;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...V);
      doc.text(String(n), cx, 53, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MU);
      doc.text(label, cx, 58, { align: 'center' });
    });

    let y = 68;

    // ── Plans
    if (data.plans.length > 0) {
      y = sectionHeader('Plans d\'entraînement', y);

      for (const plan of data.plans) {
        if (y > 252) { doc.addPage(); y = 20; }

        // Plan title bar
        doc.setFillColor(...SB);
        doc.rect(15, y, W - 30, 9, 'F');
        doc.setTextColor(...V);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text(plan.name, 18, y + 6.2);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MU);
        doc.text(
          `${fmtTs(plan.createdAt)} · ${plan.sessions.length} séance${plan.sessions.length > 1 ? 's' : ''}`,
          W - 18, y + 6.2, { align: 'right' }
        );
        y += 12;

        for (const session of plan.sessions) {
          if (y > 258) { doc.addPage(); y = 20; }

          doc.setTextColor(80, 40, 160);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(`▸ ${session.name}`, 20, y);
          y += 4;

          if (session.exercises.length > 0) {
            autoTable(doc, {
              startY: y,
              body: session.exercises.map((ex) => [
                ex.name,
                `${ex.sets} série${ex.sets > 1 ? 's' : ''}`,
                ex.groupType ? (ex.groupType === 'biset' ? 'Bi-set' : 'Superset') : '',
              ]),
              bodyStyles: { fontSize: 7.5, textColor: DK, cellPadding: 1.5 },
              alternateRowStyles: { fillColor: [248, 246, 255] as [number, number, number] },
              columnStyles: { 0: { cellWidth: 113 }, 1: { cellWidth: 33 }, 2: { cellWidth: 34 } },
              margin: { left: 22, right: 22 },
              theme: 'plain',
            });
            y = lastY() + 5;
          } else {
            doc.setFontSize(7.5);
            doc.setTextColor(...MU);
            doc.text('(aucun exercice configuré)', 22, y);
            y += 6;
          }
        }
        y += 4;
      }
    }

    // ── Progression des charges
    if (data.sessions.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      y = sectionHeader('Progression des charges', y);

      // Build exercise history map
      const exMap = new Map<string, { date: string; session: string; best: number }[]>();
      const sortedS = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));

      for (const session of sortedS) {
        for (const ex of session.exercises) {
          const doneSets = ex.sets.filter((s) => s.done && s.weight);
          if (doneSets.length === 0) continue;
          const weights = doneSets
            .map((s) => parseFloat(s.weight!.split('-')[0]))
            .filter((w) => !isNaN(w));
          if (weights.length === 0) continue;
          const best = Math.max(...weights);
          const arr = exMap.get(ex.name) ?? [];
          arr.push({ date: session.date, session: session.name, best });
          exMap.set(ex.name, arr);
        }
      }

      if (exMap.size === 0) {
        doc.setTextColor(...MU);
        doc.setFontSize(8);
        doc.text('Aucune charge saisie', 18, y);
        y += 10;
      } else {
        const topEx = [...exMap.entries()]
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 12);

        for (const [exName, records] of topEx) {
          if (y > 258) { doc.addPage(); y = 20; }

          const first = records[0];
          const last = records[records.length - 1];
          const delta = last.best - first.best;

          doc.setTextColor(...DK);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.text(exName, 18, y);

          if (delta !== 0) {
            const dColor: [number, number, number] = delta > 0 ? [16, 185, 129] : [239, 68, 68];
            doc.setTextColor(...dColor);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.text(`${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`, W - 18, y, { align: 'right' });
          }

          doc.setDrawColor(...LV);
          doc.setLineWidth(0.2);
          doc.line(18, y + 1.5, W - 18, y + 1.5);
          y += 5;

          autoTable(doc, {
            startY: y,
            body: records.slice(-5).map((r) => [fmtDate(r.date), r.session, `${r.best} kg`]),
            bodyStyles: { fontSize: 7, textColor: DK, cellPadding: 1.2 },
            alternateRowStyles: { fillColor: [248, 246, 255] as [number, number, number] },
            columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 110 }, 2: { cellWidth: 30 } },
            margin: { left: 20, right: 20 },
            theme: 'plain',
          });
          y = lastY() + 6;
        }
      }
    }

    // ── Mesures corporelles
    if (data.measurements.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      y = sectionHeader('Mesures corporelles', y);

      const sortedM = [...data.measurements].sort((a, b) => a.date.localeCompare(b.date));
      const firstM = sortedM[0];
      const lastM = sortedM[sortedM.length - 1];

      if (sortedM.length > 1) {
        const delta = lastM.weight - firstM.weight;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DK);
        doc.text(`Poids : ${firstM.weight.toFixed(1)} kg → ${lastM.weight.toFixed(1)} kg`, 18, y);
        const dColor: [number, number, number] = delta < 0 ? [16, 185, 129] : delta > 0 ? [245, 158, 11] : MU;
        doc.setTextColor(...dColor);
        doc.text(`(${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg)`, 130, y);
        y += 7;
      }

      const rows = sortedM.map((m) => [
        fmtDate(m.date),
        `${m.weight.toFixed(1)} kg`,
        m.height ? `${m.height} cm` : '—',
        m.height ? calcBMI(m.weight, m.height) : '—',
        m.bodyFat != null ? `${m.bodyFat.toFixed(1)}%` : '—',
        m.muscleMass != null ? `${m.muscleMass.toFixed(1)} kg` : '—',
        m.waist != null ? `${m.waist} cm` : '—',
        m.chest != null ? `${m.chest} cm` : '—',
        m.leftArm != null ? `${m.leftArm} cm` : '—',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Poids', 'Taille', 'IMC', 'MG%', 'Muscle', 'Tour taille', 'Poitrine', 'Bras']],
        body: rows,
        headStyles: { fillColor: SB, textColor: V, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: DK },
        alternateRowStyles: { fillColor: [248, 246, 255] as [number, number, number] },
        columnStyles: {
          0: { cellWidth: 24 }, 1: { cellWidth: 20 }, 2: { cellWidth: 18 },
          3: { cellWidth: 14 }, 4: { cellWidth: 14 }, 5: { cellWidth: 20 },
          6: { cellWidth: 22 }, 7: { cellWidth: 20 }, 8: { cellWidth: 18 },
        },
        margin: { left: 15, right: 15 },
      });
    }

    // Footer on all pages
    const pc = doc.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(...MU);
      doc.setDrawColor(...LV);
      doc.setLineWidth(0.3);
      doc.line(15, H - 12, W - 15, H - 12);
      doc.text('NutriLens · Confidentiel', 15, H - 7);
      doc.text(`Page ${i} / ${pc}`, W - 15, H - 7, { align: 'right' });
    }
  }

  doc.save(`nutrilens-${style}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
