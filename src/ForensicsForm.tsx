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

export default function ForensicsForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const fingerprintFile = formData.get('crimescene-fingerprint-bmp');
    const dnaFile = formData.get('crimescene-dna-fasta');
    const suspectDnaFile = formData.get('suspect-dna-fasta');
    const suspectFiles = formData.getAll('suspect-folder');

    // Example: log file info
    console.log('Fingerprint:', fingerprintFile);
    console.log('DNA:', dnaFile);
    console.log('Suspect DNA:', suspectDnaFile);
    console.log('All Suspect Files:', suspectFiles);
  }

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
                  />
                </Field>
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
    </div>
  )
}
