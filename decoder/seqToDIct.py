import json
keymap = {'q':'2', 'a':'2', 'z':'2',\
          'w':'3', 's':'3', 'x':'3',\
          'e':'4', 'd':'4', 'c':'4',\
          'r':'5', 'f':'5', 'v':'5',\
          't':'5', 'g':'5', 'b':'5',\
          'y':'6', 'h':'6', 'n':'6',\
          'u':'6', 'j':'6', 'm':'6',\
          'i':'7', 'k':'7',\
          'o':'8', 'l':'8',\
          'p':'9'}

def dumpToJson():
    keyseq = {}

    with open("words.txt") as f:
        for line in f:
            w, freq = line.strip().split()
            freq = int(freq)

            #key_sequence = ''.join([keymap[c] for c in w])
            key_seqs = ['']
            for c in w:
                key_seqs = [ks+keymap[c] for ks in key_seqs]

            for key_sequence in key_seqs:
                if key_sequence not in keyseq:
                    keyseq[key_sequence] = []
                keyseq[key_sequence].append((w, freq))

    for key in keyseq.keys():
        sorted(keyseq[key], key=lambda x: -x[1])

    with open("dict.json", 'w') as f:
        json.dump(keyseq, f)

dumpToJson()