import { Button } from "./components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "./components/ui/field"
import { Input } from "./components/ui/input"
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"

export default function ForensicsForm() {
  const [ranking, setRanking] = useState<any>(null);
  const [text, setText] = useState("");
  const [isClicked, setIsClicked] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [discovHour, setDiscovHour] = useState("00");
  const [discovMin, setDiscovMin] = useState("00");  
  const [tod, setTod] = useState<{hours: number, minutes: number, day: number} | null>(null);
  const [fingerprintRanking, setFingerprintRanking] = useState<any[]>([]);

  function generatePdf(text: string) {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Forensics AI Analysis", 20, 20);
    
    doc.setFontSize(12);
    // splitTextToSize wraps long text to fit page width
    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, 20, 40);
    
    // Create a blob URL for inline display + download
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log('handleSubmit fired');
    console.trace();
    const formData = new FormData(e.currentTarget);

    // Prepare FormData for file upload (first 4 fields only)
    const uploadFormData = new FormData();
    uploadFormData.append('crimescene-fingerprint-bmp', formData.get('crimescene-fingerprint-bmp') as File);
    uploadFormData.append('crimescene-dna-fasta', formData.get('crimescene-dna-fasta') as File);
    uploadFormData.append('suspect-dna-fasta', formData.get('suspect-dna-fasta') as File);
    const suspectFiles = formData.getAll('suspect-folder');
    suspectFiles.forEach((file) => {
      if (file instanceof File) {
        uploadFormData.append('suspect-folder', file);
      }
    });

    // Prepare data for /api/tod (number and select fields)
    const todData = {
        'body-temp': formData.get('body-temp'),
        'ambient-temp': formData.get('ambient-temp'),
        'discov-hour': discovHour,
        'discov-min': discovMin,
    };

    // 1. Upload files
    fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData,
    })
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(text || res.statusText); });
        }
        return res.json();
      })
      .then(() => {
        // 2. Fetch ranking
        return fetch('/api/rank');
      })
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(text || res.statusText); });
        }
        return res.json();
      })
      .then(rankingData => {
        console.log('rankingData:', rankingData);
        setRanking(rankingData.ranking);
        setIsClicked(true);
        geminiApi("Based on this match visualization, describe the fingerprint pattern (e.g., whorl, loop) and explain why smudging in the upper-left quadrant might be lowering the algorithmic score despite a likely match.");
        // 3. Fetch TOD
        return fetch('/api/tod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(todData),
        });
      })
      .then(res => {
        if (res && !res.ok) {
          return res.text().then(text => { throw new Error(text || res.statusText); });
        }
        return res ? res.json() : null;
      })
      .then(todResult => {
            if (todResult && !todResult.error) {
                setTod(todResult);
            }
            // Fetch fingerprint ranking after TOD
            return fetch('/api/fingerprint_ranking');
        })
      .then(res => {
        if (res && !res.ok) {
          return res.text().then(text => { throw new Error(text || res.statusText); });
        }
        return res ? res.json() : null;
      })
      .then(fingerprintData => {
        if (fingerprintData && fingerprintData.ranking) {
          setFingerprintRanking(fingerprintData.ranking);
        }
      })
      .catch(err => {
        console.error('Error during upload, ranking, TOD, or fingerprint ranking:', err);
      });
  }

  function geminiApi(prompt: string) {
    fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
    }).then(r => r.json()).then(data => {
        console.log(data);
        generatePdf(data.response);
    })
  }

  useEffect(() => {
    if (isClicked)
        console.log(ranking)
  }, [ranking])

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Forensics Form</FieldLegend>
            <FieldDescription>
              Upload all your suspect file information to this form :)
            </FieldDescription>
            <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="upload-crimescene-fingerprint-bmp">
                    Upload CrimeScene_Fingerprint.BMP
                  </FieldLabel>
                  <Input
                    id="upload-crimescene-fingerprint-bmp"
                    name="crimescene-fingerprint-bmp"
                    type="file"
                    accept=".bmp"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="upload-crimescene-dna-fasta">
                    Upload CrimeScene_DNA.fasta
                  </FieldLabel>
                  <Input
                    id="upload-crimescene-dna-fasta"
                    name="crimescene-dna-fasta"
                    type="file"
                    accept=".fasta"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="upload-suspect-dna-fasta">
                    Upload Suspect_DNA.fasta
                  </FieldLabel>
                  <Input
                    id="upload-suspect-dna-fasta"
                    name="suspect-dna-fasta"
                    type="file"
                    accept=".fasta"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="upload-suspect-folder">
                    Upload All Suspect Files (you can select more than one file)
                  </FieldLabel>
                  <Input
                    id="upload-suspect-folder"
                    name="suspect-folder"
                    type="file"
                    multiple
                    accept=".bmp"
                  />
                </Field>
            </FieldGroup>
            <FieldGroup>
                <div className="flex">
                    <Field>
                        <FieldLabel htmlFor="body-temp">
                            Body Temperature
                        </FieldLabel>
                        <Input
                            id="body-temp"
                            name="body-temp"
                            type="number"
                            step="any"
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="ambient-temp">
                            Ambient Temperature
                        </FieldLabel>
                        <Input
                            id="ambient-temp"
                            name="ambient-temp"
                            type="number"
                            step="any"
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="discov-hour">
                            Discovered Hour
                        </FieldLabel>
                        <Select defaultValue="00"
                            onValueChange={setDiscovHour}>
                            <SelectTrigger id="discov-hour">
                                <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="discov-min">
                            Discovered Minute
                        </FieldLabel>
                        <Select defaultValue="00"
                            onValueChange={setDiscovMin}>
                            <SelectTrigger id="discov-min">
                                <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {Array.from({ length: 60 }, (_, i) => (
                                        <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
            </FieldGroup>
          </FieldSet>
          <FieldSeparator />
          <Field orientation="horizontal">
            <Button type="submit">Submit</Button>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <Button onClick={() => {setIsClicked(true)}}>Display Results</Button>
      {isClicked && ranking && (
        <div className="mt-6">
            <div>
                <h2 className="text-lg font-semibold mb-2">DNA Ranking Results</h2>
                <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                    <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Rank</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Suspect ID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Confidence</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Score</th>
                    </tr>
                </thead>
                <tbody>
                    {ranking.map((suspect: any, index: number) => (
                    <tr key={suspect.id} className={index === 0 ? "bg-yellow-50 font-bold" : ""}>
                        <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                        <td className="border border-gray-300 px-4 py-2">{suspect.id}</td>
                        <td className="border border-gray-300 px-4 py-2">{suspect.confidence}%</td>
                        <td className="border border-gray-300 px-4 py-2">{suspect.score}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            <div>
                {text}
            </div>
        </div>
      )}
      {isClicked && fingerprintRanking && fingerprintRanking.length > 0 && (
        <div className="mt-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Fingerprint Ranking Results</h2>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Rank</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Suspect Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Confidence</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Score</th>
                </tr>
              </thead>
              <tbody>
                {fingerprintRanking.map((row, index) => (
                  <tr key={row[0]} className={index === 0 ? "bg-yellow-50 font-bold" : ""}>
                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2">{row[0]}</td>
                    <td className="border border-gray-300 px-4 py-2">{row[1]}%</td>
                    <td className="border border-gray-300 px-4 py-2">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pdfUrl && (
        <div>
            <div className="mt-4">
                <a
                    href={pdfUrl}
                    download="forensics_analysis.pdf"
                    className="text-blue-600 underline mr-4"
                >
                ⬇ Download PDF
                </a>
                <iframe
                    src={pdfUrl}
                    className="w-full h-96 border border-gray-300 mt-2"
                    title="Forensics Analysis"
                />
            </div>
        </div>
    )}
    {tod && (
        <p className="mt-2 text-sm">
            Estimated time of death: <strong>{tod.hours.toString().padStart(2,'0')}:{tod.minutes.toString().padStart(2,'0')}</strong>
            {tod.day > 0 ? ` (${tod.day} day(s) before discovery)` : ''}
        </p>
    )}
    </div>
  )
}
