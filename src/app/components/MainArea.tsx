import React from 'react';
import { jsPDF } from "jspdf";
import { Database, TrendingUp, Network, Microscope, Activity, Brain, Fingerprint, Thermometer, Droplet, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface DnaRankEntry {
  id: string;
  confidence: number;
  score: number;
}

// Fingerprint ranking comes back as [name, confidence, score] tuples
type FpRankEntry = [string, number, number];

interface TodResult {
  hours: number;
  minutes: number;
  day: number;
}

type DNASeq = [string, string, string] // seq 1, branches, seq 2

type GeminiApi = string

interface Results {
  ranking: DnaRankEntry[];
  tod: TodResult;
  fingerprints: FpRankEntry[];
  sequences: DNASeq[];
  gemini: GeminiApi;
}

interface MainAreaProps {
  results: Results | null;
}

export function MainArea({ results }: MainAreaProps) {
  // Merge DNA and fingerprint rankings by matching on suspect name/id
  const topDna = results?.ranking?.[0];
  const topFp = results?.fingerprints?.[0];
  const tod = results?.tod;
  const topSeq = results?.sequences?.[0];
  const gemini = results?.gemini;
  
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  console.log(tod);
  console.log(topSeq);
  console.log("gemini: ", gemini);

  // If top DNA and top fingerprint have the same confidence and id, ensure DNA suspect is first in the table
  // ✅ Replace with this
    let ranking = results?.ranking ? [...results.ranking] : [];
    let fingerprints = results?.fingerprints ? [...results.fingerprints] : [];

    const topDnaId = ranking[0]?.id;
    const topFpName = fingerprints[0]?.[0];
    const topFpBaseName = topFpName?.replace(/\.[^/.]+$/, '');

    const todString = tod
        ? `${tod.hours.toString().padStart(2, '0')}:${tod.minutes.toString().padStart(2, '0')}${tod.day > 0 ? ` (${tod.day}d before discovery)` : ''}`
        : '—';

    const fallbackReport = results ? [
        `Case ID: 2026-0308-01`,
        `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        `Investigating Officer: AI Laboratory Assistant`,
        ``,
        `1. Executive Summary`,
        `A multimodal biometric analysis was conducted on biological evidence recovered from the crime scene. By integrating DNA sequence homology and fingerprint minutiae matching, the investigation has identified ${topDna?.id ?? 'an unknown suspect'} as the primary suspect.`,
        ``,
        `2. Biological Evidence Analysis`,
        ``,
        `A. DNA Sequence Homology (Needleman-Wunsch Algorithm)`,
        `The recovered sample was analyzed using global alignment with a match reward of +2, mismatch penalty of -3, and gap penalty of -2.`,
        ``,
        `| Suspect | Score | DNA Confidence | Interpretation |`,
        `| --- | --- | --- | --- |`,
        ...ranking.map((r, i) => `| ${r.id ?? '—'} | ${r.score ?? '—'} | ${r.confidence ?? '—'}% | ${i === 0 ? 'Positive Match' : i === 1 ? 'Background Noise' : 'No Correlation'} |`),
        ``,
        `B. Fingerprint Analysis`,
        `Latent prints were processed using ORB feature matching against the suspect database.`,
        ``,
        `| Suspect | Score | Confidence |`,
        `| --- | --- | --- |`,
        ...fingerprints.map(f => `| ${f?.[0]?.replace(/\.[^/.]+$/, '') ?? '—'} | ${f?.[2] ?? '—'} | ${f?.[1] ?? '—'}% |`),
        ``,
        `* ${topDna?.id ?? 'The primary suspect'} is the top match across both DNA and fingerprint categories.`,
        ``,
        ...(tod ? [
            `3. Post-Mortem Interval (PMI) Verification`,
            `The Time of Death was established based on thermal equilibrium data:`,
            `* Estimated TOD: ${todString}`,
            `* The cooling rate follows the standard Algor Mortis curve, confirming the calculated TOD.`,
            ``,
            `4. Final Determination`,
        ] : [
            `3. Final Determination`,
        ]),
        `The intersection of the ${topDna?.score ?? '—'}-point DNA alignment and the ${topFp?.[2] ?? '—'}-score fingerprint match creates a unique biometric profile that exclusively identifies ${topDna?.id ?? 'the primary suspect'}. The probability of this occurring by chance is estimated at less than 1 in 100,000,000.`,
        ].join('\n') : '';


    React.useEffect(() => {
        if (gemini) generatePdf(typeof gemini === 'string' ? gemini : (gemini as any).response);
    }, [gemini]);

    function generatePdf(text: string) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;
        let y = 20;

        const checkPageBreak = (height: number) => {
            if (y + height > 280) {
                doc.addPage();
                y = 20;
            }
        };

        const lines = text.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { y += 4; continue; }

            // H1
            if (trimmed.startsWith('# ')) {
                checkPageBreak(10);
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(trimmed.replace('# ', ''), margin, y);
                y += 10;

            // H2
            } else if (trimmed.startsWith('## ')) {
                checkPageBreak(9);
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.text(trimmed.replace('## ', ''), margin, y);
                y += 9;

            // H3 / numbered sections like "1. Executive Summary"
            } else if (trimmed.match(/^\d+\.\s/) || trimmed.startsWith('### ')) {
                checkPageBreak(8);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(trimmed.replace('### ', ''), margin, y);
                y += 8;

            // Sub-headers like "A. DNA..."
            } else if (trimmed.match(/^[A-Z]\.\s/)) {
                checkPageBreak(7);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(trimmed, margin, y);
                y += 7;

            // Table rows
            } else if (trimmed.startsWith('|')) {
                if (trimmed.includes(':---') || trimmed.includes('---')) continue; // skip separator
                const cells = trimmed.split('|').filter(c => c.trim());
                const colWidth = maxWidth / cells.length;
                checkPageBreak(7);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                cells.forEach((cell, i) => {
                    doc.text(cell.trim(), margin + i * colWidth, y, { maxWidth: colWidth - 2 });
                });
                y += 7;

            // Bullet points
            } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                checkPageBreak(6);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const content = trimmed.replace(/^[\*\-]\s/, '');
                const wrapped = doc.splitTextToSize(`• ${content}`, maxWidth - 5);
                wrapped.forEach((l: string) => {
                    checkPageBreak(6);
                    doc.text(l, margin + 3, y);
                    y += 6;
                });

            // Regular paragraph text
            } else {
                checkPageBreak(6);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                // Strip inline markdown bold (**text**)
                const clean = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
                const wrapped = doc.splitTextToSize(clean, maxWidth);
                wrapped.forEach((l: string) => {
                    checkPageBreak(6);
                    doc.text(l, margin, y);
                    y += 6;
                });
            }
        }

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
    }

  return (
    <main className="flex-1 h-screen bg-[#0a0a0c] overflow-y-auto custom-scrollbar relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto p-8 space-y-8 relative z-10">

        {/* Top Header Section */}
        <header className="flex justify-between items-end border-b border-zinc-800/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
              <Database className="w-6 h-6 text-cyan-500" />
              Analysis Dashboard
            </h1>
            <p className="text-sm font-mono text-zinc-500 mt-1">Session ID: THE-TALE-94B-XQ</p>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-500 font-mono">Status</span>
              {results ? (
                <span className="text-sm font-bold text-[#39ff14] flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#39ff14]" /> Analysis Complete
                </span>
              ) : (
                <span className="text-sm font-bold text-zinc-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-600" /> Awaiting Upload
                </span>
              )}
            </div>
          </div>
        </header>

        {!results ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-600">
            <Activity className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-mono text-sm">Upload files and run analysis to see results.</p>
          </div>
        ) : (
          <>
            {/* Section 1: Suspect Rankings */}
            <section>
              <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Suspect Rankings
              </h2>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-xl shadow-black/50">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-xs uppercase border-b border-zinc-800" style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                    <tr>
                      <th className="px-6 py-4 font-semibold w-16 text-center">Rank</th>
                      <th className="px-6 py-4 font-semibold">Suspect</th>
                      <th className="px-6 py-4 font-semibold">Fingerprint Score</th>
                      <th className="px-6 py-4 font-semibold">Fingerprint Confidence</th>
                      <th className="px-6 py-4 font-semibold">DNA Score</th>
                      <th className="px-6 py-4 font-semibold text-right">DNA Confidence</th>
                    </tr>
                  </thead>
                </table>
                <div style={{ maxHeight: 320, overflowY: 'auto' }} className="custom-scrollbar bg-transparent">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <tbody className="divide-y divide-zinc-800/60" style={{ display: 'block', width: '100%' }}>
                      {ranking.map((suspect, index) => {
                        // Match fingerprint row by index (same ordering assumed)
                        const fp = fingerprints?.[index];
                        const isTop = index === 0;
                        return (
                          <tr key={suspect.id} className={`transition-colors ${isTop ? 'bg-green-950/20 hover:bg-green-900/30' : 'hover:bg-zinc-800/40 text-zinc-300'}`} style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                            <td className="px-6 py-4 relative">
                              {isTop && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#39ff14]" />}
                              <span className={`flex items-center justify-center w-6 h-6 rounded font-bold text-xs mx-auto ${isTop ? 'bg-[#39ff14]/20 text-[#39ff14]' : 'bg-zinc-800 text-zinc-500'}`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className={`px-6 py-4 ${isTop ? 'font-bold text-zinc-100' : ''}`}>{suspect.id}</td>
                            <td className="px-6 py-4 font-mono text-cyan-300">{fp ? fp[2] : '—'}</td>
                            <td className="px-6 py-4 font-mono text-cyan-300">{fp ? `${fp[1]}%` : '—'}</td> 
                            <td className="px-6 py-4 font-mono text-cyan-300">{suspect.score}</td>
                            <td className={`px-6 py-4 font-bold text-right ${isTop ? 'text-[#39ff14] text-lg' : 'font-mono text-zinc-400'}`}>
                              {suspect.confidence}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Section 2: Raw Evidence Data */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                  <Network className="w-5 h-5 text-cyan-400" />
                  Raw Evidence Data
                </h2>
                <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  Target: {topDna?.id ?? 'Subject #1'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card A: Fingerprint */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col hover:border-cyan-500/50 transition-colors group">
                  <div className="flex items-center gap-2 mb-4">
                    <Fingerprint className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-zinc-200">ORB Keypoint Matching</h3>
                  </div>
                  <div className="relative mb-4 rounded-lg overflow-hidden border border-zinc-700/50 bg-black aspect-video">
                    <img
                        src="/api/crimescene_fingerprint"
                        alt="Crime Scene Fingerprint"
                        className="w-full h-full object-contain opacity-80"
                    />
                  </div>
                  <div className="mt-auto pt-4 border-t border-zinc-800/60 flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Top Match Score</span>
                    <span className="font-mono text-sm font-bold text-cyan-300">
                      {topDna && topFp ? `${topDna.id}: ${topFp[2]}` : '—'}
                    </span>
                  </div>
                </div>

                {/* Card B: DNA */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col hover:border-[#39ff14]/50 transition-colors group">
                  <div className="flex items-center gap-2 mb-4">
                    <Microscope className="w-4 h-4 text-[#39ff14]" />
                    <h3 className="text-sm font-bold text-zinc-200">Needleman-Wunsch Alignment</h3>
                  </div>
                  <div className="flex-1 bg-black/50 border border-zinc-800 rounded-lg p-4 font-mono text-[10px] sm:text-xs text-zinc-400 overflow-x-auto relative mb-4 custom-scrollbar">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#39ff14]/20" />
                    <pre className="leading-relaxed">
{`SEQ1 ${topSeq?.[0]}
     ${topSeq?.[1]}
SEQ2 ${topSeq?.[2]}

-- LOG --
Gap Penalty:    -2.0
Match Reward:   +2.0
Mismatch Pen:   -3.0`}
                    </pre>
                  </div>
                  <div className="mt-auto pt-4 border-t border-zinc-800/60 flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Alignment Score</span>
                    <span className="font-mono text-sm font-bold text-[#39ff14]">
                      Score: {topDna?.score ?? '—'}
                    </span>
                  </div>
                </div>

                {/* Card C: Auxiliary */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col hover:border-purple-500/50 transition-colors group">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-zinc-200">Biological Context</h3>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Thermometer className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs text-zinc-500 font-mono uppercase">Algor Mortis Eq.</span>
                      </div>
                      <div className="text-sm text-zinc-300 font-medium">
                        Estimated ToD: <span className="text-purple-300 font-mono">{todString}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-zinc-800/60 flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Top DNA Confidence</span>
                    <span className="font-mono text-sm font-bold text-purple-400">
                      {topDna ? `${topDna.confidence}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: AI Forensic Report */}
            <section className="relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500 rounded-tl-xl opacity-50 z-20 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500 rounded-br-xl opacity-50 z-20 pointer-events-none" />

              <div className="bg-zinc-900/80 border border-cyan-500/30 rounded-xl p-6 relative overflow-hidden backdrop-blur-md shadow-[0_0_30px_rgba(0,240,255,0.05)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-zinc-800/60 pb-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center relative">
                    <Brain className="w-5 h-5 text-cyan-400 absolute" />
                    <Sparkles className="w-3 h-3 text-[#39ff14] absolute -top-1 -right-1" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                      Gemini AI <span className="font-light text-cyan-400">Investigative Reasoning</span>
                    </h2>
                    <span className="text-xs font-mono text-zinc-500">Model: gemini-3-flash-preview</span>
                  </div>
                </div>

                {/* <div className="relative z-10">
                  <p className="text-sm text-zinc-300 leading-relaxed font-sans max-w-4xl">
                    Based on multi-factor analysis,{' '}
                    <span className="font-bold text-white bg-zinc-800 px-1 rounded">
                      {topDna?.id ?? 'the top suspect'}
                    </span>{' '}
                    is the primary match with a DNA confidence of{' '}
                    <span className="text-cyan-400 font-mono font-bold">{topDna?.confidence ?? '—'}%</span>.
                    {tod && (
                      <> The estimated time of death is <span className="text-purple-400 font-mono font-bold">{todString}</span>.</>
                    )}
                  </p>

                  <div className="mt-6 flex items-center gap-3 bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 max-w-max">
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Conclusion:</span>
                    <span className="text-sm font-bold text-[#39ff14] flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {topDna && topDna.confidence > 70 ? 'HIGH CONFIDENCE TO DETAIN' : 'INSUFFICIENT EVIDENCE'}
                    </span>
                  </div>
                </div> */}
                <div className="relative z-10">
                    {gemini ? (
                        <>
                        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                            The following case report was generated by Gemini AI based on the forensic evidence collected, including fingerprint ORB matching, DNA Needleman-Wunsch alignment, and biological context data. It summarizes the findings and provides an investigative recommendation.
                        </p>
                        {pdfUrl && (
                            <div className="mt-4">
                            <a href={pdfUrl} download="forensics_analysis.pdf" className="text-cyan-400 underline mr-4 text-sm">
                                ⬇ Download Case Report PDF
                            </a>
                            <iframe src={pdfUrl} className="w-full h-96 border border-zinc-700 rounded-lg mt-2" title="Forensics Analysis" />
                            </div>
                        )}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => generatePdf(typeof fallbackReport === 'string' ? fallbackReport : '')}
                                className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg"
                                >
                                Generate Case Report PDF
                            </button>
                            {pdfUrl && (
                            <div className="mt-4">
                                <a href={pdfUrl} download="forensics_analysis.pdf" className="text-cyan-400 underline mr-4 text-sm">
                                ⬇ Download Case Report PDF
                                </a>
                                <iframe src={pdfUrl} className="w-full h-96 border border-zinc-700 rounded-lg mt-2" title="Forensics Analysis" />
                            </div>
                            )}
                        </>
                    )}
                    </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}