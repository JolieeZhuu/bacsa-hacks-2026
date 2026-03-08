# Python 3.12.1
from .dp import seq_align # from our dp (dynamic programming) file
from Bio import SeqIO # p
from flask import Flask, request, jsonify
import os

def get_dna_ranking():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    crime_scene_path = os.path.join(base_dir, "CrimeScene_DNA.fasta")
    suspect_path = os.path.join(base_dir, "Suspect_DNA.fasta")
    target_seq = []

    # iterate through record in file containing crime scene sequences
    # this code can account for multiple DNA sequences found in crime scene
    for record in SeqIO.parse(crime_scene_path, "fasta"):  # ← use the variable
        target_seq.append(str(record.seq))

    sequences = {}
    for record in SeqIO.parse(suspect_path, "fasta"):      # ← use the variable
        sequences[record.id] = [str(record.seq), 0]
        # print("ID: " + str(record.id))
        # print("Sequence: " + str(record.seq))
        # print("Length: " + str(len(record.seq)))
        sequences[record.id] = [str(record.seq),0] # Dictonary with key = record ID, value = [seqeunce, alignment score]

    ranking = [] # list of dictionary of ranking of suspects and scores
    top_seq = []
    # make sure there were at least one crime scene and suspect DNA sequence
    if target_seq and sequences: 
        # compare the suspect sequence with all crime sequence
        for seq in target_seq: # if there are more than one set of DNA sequence found at scene
            target = seq_align(seq, seq)[0] #target score if DNA perfectly aligns with crime scene
            #print(target)
            DNA = {} # new place to collect the DNA sequences to return top sequence only
            for item in sequences:
                #print(sequences[item][0])
                sequences[item][1] = seq_align(seq, sequences[item][0])[0] # crime scene then suspect
                #print(sequences[item][1])
                DNA[item] = sequences[item][0]
                #print(DNA[item])
                sequences[item][0] = max(0.00, round(sequences[item][1]/target*100, 2)) # change dna sequence to confidence level (0-100)
            ordered_seq = dict(sorted(sequences.items(), key=lambda item: item[1][1], reverse=True))
            ranking.append(ordered_seq)
            top_seq.append([seq, seq_align(seq, DNA[next(iter(ordered_seq))])[1], seq_align(seq, DNA[next(iter(ordered_seq))])[2]])
            # print(top_seq)
            # print(ranking)
    else:
        print("Insufficient DNA sequence provided.")

    print(ranking, top_seq)
    return [ranking, top_seq]