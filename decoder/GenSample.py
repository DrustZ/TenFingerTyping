import sys
import csv
import string
from random import randint
from tqdm import tqdm
from nltk import sent_tokenize
csv.field_size_limit(sys.maxsize)

table = str.maketrans({key: ' ' for key in string.punctuation})

#output range
def sampleFromCSV(fname):
    with open(fname) as csv_file:
        reader = csv.reader(csv_file, quotechar='"')
        for idx, line in enumerate(tqdm(reader, leave=False)):
            text = ""
            for content in line[1:]:
                content = content.replace('\n', ' ').replace('\a', ' ').replace('\\', '').strip()
                content = content.translate(table)
                content = ''.join([i for i in content if ord(i) < 128])

                if len(content) == 0:
                        continue

                tokens = list(filter(len, content.split()))
                offset = 0
                while offset+3 < len(tokens):
                    sentlen = min(randint(2, 25), len(tokens[offset:]))
                    sent = ' '.join(tokens[offset:offset+sentlen])
                    offset += int(sentlen/2) + randint(0, 5)
                    print (sent.lower())
 
def sampleFromCornell(fname):
    indata = {}
    with open(fname, encoding='iso-8859-1') as f:
        for idx, line in enumerate(tqdm(f.readlines(), leave=False)):
            content = line.strip().split('+++$+++')[-1]
            content = content.replace('\n', ' ').replace('\a', ' ').replace('\\', '').strip()
            content = content.translate(table)
            content = ''.join([i for i in content if ord(i) < 128])

            if len(content) == 0:
                    continue

            #avoid repetitive conversations
            if content not in indata:
                indata[content] = 0
            else:
                continue

            tokens = list(filter(len, content.split()))
            offset = 0
            while offset+3 < len(tokens):
                sentlen = min(randint(5, 25), len(tokens[offset:]))
                sent = ' '.join(tokens[offset:offset+sentlen])
                offset += int(sentlen/2) + randint(0, 5)
                print (sent.lower())

sampleFromCornell("/datasets/cornell movie-dialogs corpus/movie_lines.txt")