# -*- coding: utf-8 -*-
'''
qwe = a
rt = b
asd = c
fg = d
zxc =e
vb = f
yu = g
iop = h
hj = i
kl = j
n = k
m = l
'''

import json
keymap = {'q':'2', 'a':'2', 'z':'2',\
          'w':'3', 's':'3', 'x':'3',\
          'e':'4', 'd':'4', 'c':'5',\
          'r':'5', 'f':'5', 'v':'5',\
          't':'5', 'g':'5', 'b':'6',\
          'y':'6', 'h':'6', 'n':'6',\
          'u':'6', 'j':'6', 'm':'6',\
          'i':'7', 'k':'7',\
          'o':'8', 'l':'8',\
          'p':'9'}

def dumpToJson():
    keyseq = {}

    with open("dict.txt") as f:
        for line in f:
            w, freq = line.strip().split()
            freq = int(freq)

            #key_sequence = ''.join([keymap[c] for c in w])
            key_seqs = ['']
            for c in w:
                if len(keymap[c]) > 1:
                    tmp = []
                    for km in keymap[c]:
                        tmp += [ks+km for ks in key_seqs]
                    key_seqs = tmp
                else:
                    key_seqs = [ks+keymap[c] for ks in key_seqs]

            for key_sequence in key_seqs:
                if key_sequence not in keyseq:
                    keyseq[key_sequence] = []
                keyseq[key_sequence].append((w, freq))

    for key in keyseq.keys():
        sorted(keyseq[key], key=lambda x: -x[1])

    with open("dict.json", 'w') as f:
        json.dump(keyseq, f)


def avekeyToWords():
    with open("dict.json") as f:
        keyseq = json.load(f)

    kwords = []
    for key, v in keyseq.items():
        kwords.append(len(v))
    kwords.sort(key = lambda x: -x)
    print (sum(kwords)/len(kwords))
    print (kwords[:50])

dumpToJson()
avekeyToWords()

'''
original: 18, 15, 13 
asd -> 12, 11, 11 
yui -> 15, 13, 13 ()
all -> 9, 9, 8 (avg: 1.08)
qw, zx -> 15, 14, 14, 13
'''
