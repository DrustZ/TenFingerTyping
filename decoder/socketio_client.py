# -*- coding: utf-8 -*-
from Test import *
import socketio
import json
import numpy as np
from time import time
import pkg_resources
from symspellpy import SymSpell, Verbosity
from datetime import datetime

sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
dictionary_path = pkg_resources.resource_filename(
    "symspellpy", "frequency_dictionary_en_82_765.txt")
# term_index is the column of the term and count_index is the
# column of the term frequency
sym_spell.load_dictionary(dictionary_path, term_index=0, count_index=1)

sio = socketio.Client()
sio.connect('http://localhost:3000')
print("connected!")

@sio.on('decode request')
def on_message(data):
    res = decode_taps(json.loads(data))
    sio.emit('decode result', res)
    
def decode_taps(data):
    res = get_best_res(data['precontext'], data['codes'])
    #get the spell suggest for the last word
    words = res.split()
    spell_suggestions = []
    if len(words) > 0:
        lastword = words[-1]
        suggestions = sym_spell.lookup(lastword, Verbosity.ALL,
                       max_edit_distance=2)
        if len(suggestions) > 0:
            for suggestion in suggestions:
                if len(suggestion.term) >= len(lastword) and\
                    suggestion.term != lastword:
                    spell_suggestions.append(suggestion.term)
                    break
    print(datetime.now(), res)
    return json.dumps({'res':res, 'suggestion':spell_suggestions})


def get_res(prefix, codes):
    testcase = strToSample(prefix, codes)
    out_label_ids = testcase[-1]
    testcase = [torch.LongTensor(t) for t in testcase]
    testcase = [t.unsqueeze(0) for t in testcase]
    testcase = tuple(t.to(device) for t in testcase)
    inputs = {"input_ids": testcase[0], "attention_mask": testcase[1],
                          "token_type_ids": testcase[2], "labels": testcase[3]}

    with torch.no_grad():
      outputs = model(**inputs)
      tmp_eval_loss, logits = outputs[:2]
      preds = logits.detach().cpu().numpy().squeeze()

    preds = np.argmax(preds, axis=1)
    preds_list = []
    for j in range(len(out_label_ids)):
      if out_label_ids[j] != ignore_label_id:
        preds_list.append(label2char(preds[j]))
    res = ''.join(preds_list)
    return res

def get_res_beam_search(prefix, codes):
    preds, labels = searchAlternatives(prefix, codes)
    res = []
    for j in range(len(labels)):
        resid = preds[j][ labels[j] != ignore_label_id ]
        decoded = ''.join([label2char(c) for c in resid])
        res.append(decoded)
    return res

def get_best_res(prefix, codes):
    #when detected two fingers, group codes for each finger ids
    letter2char = {'q':['2', '3'], 'w':['3', '4'], 'e': ['4', '5'],
                   'u':['6', '7'], 'i':['7', '8'], 'o': ['8', '9']}
    seq = codes[0]
    possible_seqs = ['']
    for c in seq:
        if c in 'qweuio':
            seqs1 = [seq+letter2char[c][0] for seq in possible_seqs]
            seqs2 = [seq+letter2char[c][1] for seq in possible_seqs]
            possible_seqs = seqs1 + seqs2
        else:
            possible_seqs = [seq+c for seq in possible_seqs]
    possible_seqs = [list(map(int, list(seq))) for seq in possible_seqs]
    res = searchFromLists(prefix, possible_seqs)
    return res
