# Python 3.12.1
from dp import seq_align # from our dp (dynamic programming) file
from Bio import SeqIO # p

target_seq = []
# iterate through record in file containing crime scene sequences
# this code can account for multiple DNA sequences found in crime scene
for record in SeqIO.parse("CrimeScene_DNA.fasta", "fasta"):
    target_seq.append(str(record.seq)) # don't need the id

sequences = {}
# Iterate through each record in the file containing suspects 
for record in SeqIO.parse("Suspect_DNA.fasta", "fasta"):
    # print("ID: " + str(record.id))
    # print("Sequence: " + str(record.seq))
    # print("Length: " + str(len(record.seq)))
    sequences[record.id] = [str(record.seq),0] # Dictonary with key = record ID, value = [seqeunce, alignment score]

ranking = [] # list of dictionary of ranking of suspects and scores
# make sure there were at least one crime scene and suspect DNA sequence
if target_seq and sequences: 
    # compare the suspect sequence with all crime sequence
    for seq in target_seq: # if there are more than one set of DNA sequence found at scene
        target = seq_align(seq, seq) #target score if DNA perfectly aligns with crime scene
        print(target)
        for item in sequences:
            sequences[item][1] = seq_align(sequences[item][0], seq)
            # print(sequences[item][1])
            sequences[item][0] = max(0.00, round(sequences[item][1]/target*100, 2)) # change dna sequence to confidence level (0-100)
    ranking.append(dict(sorted(sequences.items(), key=lambda item: item[1][1], reverse=True)))
    # print(ranking)
else:
    print("Insufficient DNA sequence provided.")

print(ranking)