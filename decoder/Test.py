# -*- coding: utf-8 -*-
import torch
from torch.utils.tensorboard import SummaryWriter
from torch.nn import CrossEntropyLoss
import torch.nn.functional as F

import random
import string
import numpy as np
from tqdm.notebook import trange, tqdm
from transformers import BertTokenizer

# If there's a GPU available...
if torch.cuda.is_available():    

    # Tell PyTorch to use the GPU.    
    device = torch.device("cuda")

    print('There are %d GPU(s) available.' % torch.cuda.device_count())

    print('We will use the GPU:', torch.cuda.get_device_name(0))

# If not...
else:
    print('No GPU available, using the CPU instead.')
    device = torch.device("cpu")

print(torch.cuda.current_device())

# Load the BERT tokenizer.
print('Loading BERT tokenizer...')
from transformers import AutoTokenizer, AutoModel

# tokenizer = AutoTokenizer.from_pretrained("prajjwal1/bert-small")

tokenizer = BertTokenizer.from_pretrained('bert-base-uncased', do_lower_case=True)

fingerlist = [2,3,4,5,6,7,8,9]

def char2label(ch):
  c2l = {c: i for i, c in enumerate(string.ascii_lowercase+' ')}
  if ch in c2l:
    return c2l[ch]
  else:
    return len(c2l)

def label2char(ii):
  l2c = {i: c for i, c in enumerate(string.ascii_lowercase+' ')}
  if ii in l2c:
    return l2c[ii]
  else:
    return '*'

special_tokens_count = tokenizer.num_added_tokens()+1
max_seq_length = 256
ignore_label_id = -100
pad_token = 0

def strToSample(precontent, typing_seq):
    pre_tokens = precontent.strip().split()
    if len(pre_tokens) > 0:
        pre_tokens = tokenizer.tokenize(' '.join(pre_tokens))

    #if typing seq is longer than max seq
    if len(typing_seq) > max_seq_length - special_tokens_count:
        typing_seq = typing_seq[:max_seq_length-special_tokens_count]

    #else if typing+token is longer than max seq
    extra = len(pre_tokens)+len(typing_seq)-\
            (max_seq_length - special_tokens_count)
    if extra > 0:
        pre_tokens = pre_tokens[extra:]

    # The sample format:
    # [precontext] what is your [typing] k e y
    # [CLS] token_id token_id token_id [SEP] finger_id finger_id finger_id [SEP]

    pre_ids = tokenizer.convert_tokens_to_ids(['[CLS]']+pre_tokens+['[SEP]'])
    input_ids = pre_ids+typing_seq+tokenizer.convert_tokens_to_ids(['[SEP]'])

    label_ids = len(pre_ids)*[ignore_label_id]+\
            [char2label(c) for c in typing_seq]+\
            [ignore_label_id]

    segment_ids = len(pre_ids)*[0]+(len(typing_seq)+1)*[1]
    input_mask = len(label_ids)*[1]

    padding_len = max_seq_length - len(input_ids)
    input_ids += [pad_token]*padding_len
    input_mask += [pad_token]*padding_len
    segment_ids += [pad_token]*padding_len
    label_ids += [ignore_label_id]*padding_len

    assert len(input_ids) == max_seq_length
    assert len(input_mask) == max_seq_length
    assert len(segment_ids) == max_seq_length
    assert len(label_ids) == max_seq_length

    return input_ids, input_mask, segment_ids, label_ids

def searchInsertionNTranspositions(prefix, searchlists):
    testcases = np.array([strToSample(prefix, seq) for seq in searchlists])
    testcases = testcases.transpose((1,0,2)) # (batch, item, input) to (item, batch, input)
    testcases = torch.LongTensor(testcases).contiguous().to(device)
    inputs = {"input_ids": testcases[0], "attention_mask": testcases[1],
                              "token_type_ids": testcases[2], "labels": testcases[3]}
    with torch.no_grad():
        outputs = model(**inputs)
        tmp_eval_loss, logits = outputs[:2]
        probs = F.softmax(logits, dim=-1).detach().cpu().numpy()
        out_label_ids = inputs["labels"].detach().cpu().numpy()
    return probs, out_label_ids

#search the best from the list
def searchFromLists(prefix, inputseqs):
    probs, out_label_ids = searchInsertionNTranspositions(prefix, inputseqs)
    probsmax = np.max(probs, axis=-1)
    preds = np.argmax(probs, axis=-1) * (out_label_ids != ignore_label_id)
    valid_probs = probsmax * (out_label_ids != ignore_label_id)

    avg_probs = []
    for i in range(len(valid_probs)):
        vprob = valid_probs[i]
        #only calculate the last words' avg prob (26 is space)
        if 1 in inputseqs[0]:
            idx = np.where(preds[i]==26)[0][-1]
            vprob[:idx+1] = 0
        probsum = vprob.sum()
        avg_probs.append(probsum / (vprob > 0).sum())
    avg_probs = np.array(avg_probs)
    top_indices = (-avg_probs).argsort()

    preds = preds[top_indices[0]]
    out_label_ids = out_label_ids[top_indices[0]]
    preds_list = []
    for j in range(len(out_label_ids)):
      if out_label_ids[j] != ignore_label_id:
        preds_list.append(label2char(preds[j]))
    res = ''.join(preds_list)
    return res


#beam search for omission / transposition errors
def searchAlternatives(prefix, inputseqs):
    problists = []
    labellists = []
    
    searchlists = []
    for seq in inputseqs:
        searchlists += [seq]
        # if len(seq) == len(inputseqs[0]):
        #     searchlists += [seq[:-1]+[c,seq[-1]] for c in fingerlist]
        if (len(seq) > 2) and (1 not in seq[-3:]):
            searchlists.append(seq[:-2]+[seq[-1],seq[-2]])
        searchlists = list(dict.fromkeys(map(tuple, searchlists)))
        searchlists = list(map(list, searchlists))
    for i in range(0, len(searchlists), 20):
        probs, out_label_ids = searchInsertionNTranspositions(prefix, searchlists[i:i+20])
        if len(problists) == 0:
            problists = probs
            labellists = out_label_ids
        else:
            problists = np.concatenate((problists, probs), axis=0)
            labellists = np.concatenate((labellists, out_label_ids), axis=0)
    probsmax = np.max(problists, axis=-1)
    preds = np.argmax(problists, axis=-1) * (labellists != ignore_label_id)
    valid_probs = probsmax * (labellists != ignore_label_id)
    
    avg_probs = []
    for i in range(len(valid_probs)):
        vprob = valid_probs[i]
        #only calculate the last words' avg prob (26 is space)
        if 1 in inputseqs[0]:
            idx = np.where(preds[i]==26)[0][-1]
            vprob[:idx+1] = 0
        probsum = vprob.sum()
        avg_probs.append(probsum / (vprob > 0).sum())
    avg_probs = np.array(avg_probs)
    # avg_probs[1:] -= 0.05
    top_indices = (-avg_probs).argsort()[:10]
    #always the original sequence (the 0-index)
    top_indices = [0] + list(top_indices[top_indices!=0])
    return preds[top_indices], labellists[top_indices]

pretrained_path = 'goodcheckpoint-510000/'
from transformers import (
    WEIGHTS_NAME,
    AdamW,
    AutoConfig,
    BertForTokenClassification,
    AutoTokenizer,
    get_linear_schedule_with_warmup,
)

config = AutoConfig.from_pretrained(
        pretrained_path,
        num_labels=len(string.ascii_lowercase+' ')+1,
        cache_dir=None,
    )

model = BertForTokenClassification.from_pretrained(
    pretrained_path,
    config=config,)

model.to(device)
model.eval()

'''
testcase = strToSample('', [6,2,5,4,1,2,1,5,8,8,4])
out_label_ids = testcase[-1]
testcase = [torch.LongTensor(t) for t in testcase]
testcase = [t.unsqueeze(0) for t in testcase]
testcase = tuple(t.to(device) for t in testcase)
inputs = {"input_ids": testcase[0], "attention_mask": testcase[1],
                      "token_type_ids": testcase[2], "labels": testcase[3]}

with torch.no_grad():
  outputs = model(**inputs)
  print(outputs[1].shape)
  tmp_eval_loss, logits = outputs[:2]

  preds = logits.detach().cpu().numpy().squeeze()

preds = np.argmax(preds, axis=1)
preds_list = []
for j in range(len(out_label_ids)):
  if out_label_ids[j] != ignore_label_id:
    preds_list.append(label2char(preds[j]))

print(''.join(preds_list))
'''

#server
