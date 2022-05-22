# TenFingerTyping
Implementation of TypeAnywhere

(Click to watch the demo on youtube)
[![TypeAnywhere Demo](http://i3.ytimg.com/vi/WDIp7moK0wo/hqdefault.jpg)](https://www.youtube.com/watch?v=WDIp7moK0wo)


### Decoder
You can directly run `socketio_client.py` under `decoder/` to test the app. The modal weight can be downloaded [here](https://drive.google.com/file/d/1HP7zbijsYhrpu5fJdEtURdhZcFvIhnGw/view?usp=sharing).

There are also training scripts in the `decoder/` path

### Webapp
You can run the webapp for the typing demo. 

Run the server first and then run the python tap receiver; then run the decoder (the deocder is a socket-io client) to  begin typing. 


## Citation
If you use the code in your paper, then please cite it as:

```
@inproceedings{10.1145/3491102.3517686,
author = {Zhang, Mingrui Ray and Zhai, Shumin and Wobbrock, Jacob O.},
title = {TypeAnywhere: A QWERTY-Based Text Entry Solution for Ubiquitous Computing},
year = {2022},
isbn = {9781450391573},
publisher = {Association for Computing Machinery},
address = {New York, NY, USA},
url = {https://doi.org/10.1145/3491102.3517686},
doi = {10.1145/3491102.3517686},
booktitle = {CHI Conference on Human Factors in Computing Systems},
articleno = {339},
numpages = {16},
keywords = {Text entry, ubiquitous computing, neural networks, QWERTY., wearable},
location = {New Orleans, LA, USA},
series = {CHI '22}
}
```
