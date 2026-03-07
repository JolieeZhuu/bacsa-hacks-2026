# Python 3.12.1
from dp import seq_align # from our dp (dynamic programming) file
from Bio import SeqIO # p

sequences = {}
# Iterate through each record in the file
for record in SeqIO.parse("seqeunces.fasta", "fasta"):
    print("ID: " + str(record.id))
    print("Sequence: " + str(record.seq))
    print("Length: " + str(len(record.seq)))
    sequences[record.id] = [str(record.seq),0] # Dictonary with key = record ID, value = [seqeunce, alignment score]

ids = list(sequences) # puts all keys into list
print(ids)
if len(sequences) > 1: # do we need to loop through all sequences?
    sequences[ids[1]][1] = seq_align(sequences[ids[0]][0], sequences[ids[1]][0])
    print(sequences[ids[1]][1])
else:
    print("Only one DNA sequence provided.")