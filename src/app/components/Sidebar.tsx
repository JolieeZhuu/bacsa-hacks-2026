import React, { useState } from 'react';
import { Fingerprint, Dna, FolderInput, ListIcon, Clock, Thermometer, Activity, CheckCircle2 } from 'lucide-react';
import { Dropzone } from './Dropzone';

interface SidebarProps {
  onResultsReady: (results: any) => void;
}

export function Sidebar({ onResultsReady }: SidebarProps) {
  const [fingerprintFile, setFingerprintFile] = useState<File | null>(null);
  const [dnaFile, setDnaFile] = useState<File | null>(null);
  const [suspectDnaFile, setSuspectDnaFile] = useState<File | null>(null);
  const [suspectFiles, setSuspectFiles] = useState<FileList | null>(null);
  const [bodyTemp, setBodyTemp] = useState('');
  const [ambientTemp, setAmbientTemp] = useState('');
  const [discovTime, setDiscovTime] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  async function handleAnalysis(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    if (fingerprintFile) formData.append('crimescene-fingerprint-bmp', fingerprintFile);
    if (dnaFile) formData.append('crimescene-dna-fasta', dnaFile);
    if (suspectDnaFile) formData.append('suspect-dna-fasta', suspectDnaFile);
    if (suspectFiles) {
      Array.from(suspectFiles).forEach(file => formData.append('suspect-folder', file));
    }

    let discovHour = '00', discovMin = '00';
    if (discovTime) {
      const [h, m] = discovTime.split(':');
      discovHour = h || '00';
      discovMin = m || '00';
    }
    const todPayload = {
      'body-temp': bodyTemp,
      'ambient-temp': ambientTemp,
      'discov-hour': discovHour,
      'discov-min': discovMin,
    };

    try {
        // Upload files
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error(await uploadRes.text());

        // DNA ranking
        const rankRes = await fetch('/api/rank');
        if (!rankRes.ok) throw new Error(await rankRes.text());
        const rankingData = await rankRes.json();

        // Time of death
        let todData = null;
        if (bodyTemp && ambientTemp && discovTime) {
        const todRes = await fetch('/api/tod', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(todPayload),
        });
        if (!todRes.ok) throw new Error(await todRes.text());
            todData = await todRes.json();
        }

        // Fingerprint ranking
        const fpRes = await fetch('/api/fingerprint_ranking');
        if (!fpRes.ok) throw new Error(await fpRes.text());
        const fpData = await fpRes.json();
        // Pass all results up to App
        onResultsReady({
            ranking: rankingData.ranking,
            tod: todData,
            fingerprints: fpData.ranking,
            sequences: rankingData.topseq,
            gemini: null
        });

        setUploadStatus('Analysis complete!');

        // Then fire Gemini separately in the background
        fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: "Based on this forensic analysis, describe the fingerprint pattern and DNA alignment findings for the top suspect." })
        })
            .then(res => res.json())
            .then(geminiText => {
                onResultsReady({
                    ranking: rankingData.ranking,
                    tod: todData,
                    fingerprints: fpData.ranking,
                    sequences: rankingData.topseq,
                    gemini: geminiText
                });
            })
            .catch(() => {
                // Gemini failed silently, rest of UI is unaffected
            });
    } catch (err: any) {
      setUploadStatus('Error: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <aside className="w-[30%] min-w-[320px] max-w-[400px] h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="p-6 pb-2 border-b border-zinc-900 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-white">
            The<span className="text-cyan-400 font-light">Tale</span>
          </h1>
        </div>
        <p className="text-xs font-mono text-zinc-500 mt-2 tracking-widest uppercase">Digital Forensics Protocol</p>
      </div>

      <form className="flex-1 p-6 space-y-8" onSubmit={handleAnalysis}>
        {/* Section 1: Core Evidence */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">Core Evidence</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">Mandatory</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Dropzone
              id="upload-1"
              label={fingerprintFile ? `1 file uploaded` : "CrimeScene_Fingerprint.BMP"}
              icon={<Fingerprint className="w-6 h-6" />}
              accept=".bmp"
              onFileChange={files => setFingerprintFile(files?.[0] ?? null)}
              fileCount={fingerprintFile ? 1 : 0}
              uploaded={!!fingerprintFile}
            />
            <Dropzone
              id="upload-2"
              label={dnaFile ? `1 file uploaded` : "CrimeScene_DNA.fasta"}
              icon={<Dna className="w-6 h-6" />}
              accept=".fasta"
              onFileChange={files => setDnaFile(files?.[0] ?? null)}
              fileCount={dnaFile ? 1 : 0}
              uploaded={!!dnaFile}
            />
            <Dropzone
              id="upload-3"
              label={suspectFiles && suspectFiles.length > 0 ? `${suspectFiles.length} files uploaded` : "Suspect_Fingerprints/"}
              icon={<FolderInput className="w-6 h-6" />}
              accept=".bmp"
              onFileChange={setSuspectFiles}
              fileCount={suspectFiles ? suspectFiles.length : 0}
              uploaded={!!suspectFiles && suspectFiles.length > 0}
            />
            <Dropzone
              id="upload-4"
              label={suspectDnaFile ? `1 file uploaded` : "Suspect_DNA.fasta"}
              icon={<Dna className="w-6 h-6" />}
              accept=".fasta"
              onFileChange={files => setSuspectDnaFile(files?.[0] ?? null)}
              fileCount={suspectDnaFile ? 1 : 0}
              uploaded={!!suspectDnaFile}
            />
          </div>
        </section>

        {/* Section 2: Additional Forensics */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">Additional Forensics</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">Optional</span>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-5">
            <div className="space-y-3">
              <label className="text-xs font-mono text-cyan-400 flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5" />
                Environmental Metrics
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-400 block flex items-center gap-1"><Clock className="w-3 h-3" /> Time (HH:MM)</span>
                  <input type="time" value={discovTime} onChange={e => setDiscovTime(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-sm text-zinc-200 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-400 block">Body Temp (°C)</span>
                  <input type="number" step="0.1" placeholder="e.g. 33.5" value={bodyTemp} onChange={e => setBodyTemp(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-sm text-zinc-200 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <span className="text-xs text-zinc-400 block">Ambient Temp (°C)</span>
                  <input type="number" step="0.1" placeholder="e.g. 21.0" value={ambientTemp} onChange={e => setAmbientTemp(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-sm text-zinc-200 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Button */}
        <div className="p-0 pt-4 mt-auto">
          <button type="submit" disabled={uploading} className="group relative w-full flex items-center justify-center gap-2 py-4 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all duration-300 overflow-hidden disabled:opacity-60">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            <Activity className="w-5 h-5" />
            <span>{uploading ? 'Running...' : 'RUN ANALYSIS'}</span>
          </button>
          {uploadStatus && <div className="mt-2 text-xs text-center text-cyan-300">{uploadStatus}</div>}
        </div>
      </form>
    </aside>
  );
}