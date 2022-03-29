//keycode mappings
var Left_codes = {
    //for those double tap multi-fingers, 
    //we need to choose from the best one
    24: 'q', //pinky + ring q
    12: 'w', //ring + middle w
    6 : 'e', //middle + index e
    //normal codes
    16: 2,
    8 : 3,
    4 : 4,
    2 : 5,
    1 : 1,
    5 : 14, //last selection
    14 : 10 //correction
}

var Right_codes = {
    24: 'o', //o
    12: 'i', //i
    6 : 'u', //u
    //normal codes
    16: 9,
    8 : 8,
    4 : 7,
    2 : 6,
    1 : 1,
    5 : 13, //next selection
    14 : -1, //backspace
    30 : -2, //remove words
    31 : 12 //enter
}

//socket io stuffs
var socket = io();

socket.on('tap data', (data) => {
    // console.log("receive: "+data.keycode);
    let keycode = 0;
    if (data.deviceid.includes("c5:80:8b:5c:8d:19")){
        if (data.keycode in Left_codes) {
            keycode = Left_codes[data.keycode]
        }
    } else {
        if (data.keycode in Right_codes) {
            keycode = Right_codes[data.keycode]
        }
    }
    //console.log('keycode : ', keycode, " original tap: ", data.keycode)
    tappingCode(keycode)
    
});

//for testing
$("html").keypress((e) => {
    let keycode = 100;
    //console.log(e.keyCode)

    if ([97, 113, 122].includes(e.keyCode)){
        keycode = 2;
    } else if ([119, 115, 120].includes(e.keyCode)){
        keycode = 3;
    } else if ([100, 101, 99].includes(e.keyCode)){
        keycode = 4;
    } else if ([102, 114, 118, 116, 103, 98].includes(e.keyCode)){
        keycode = 5;
    } else if ([121, 104, 110, 117, 106, 109].includes(e.keyCode)){
        keycode = 6;
    } else if ([105, 107].includes(e.keyCode)){
        keycode = 7;
    } else if ([108, 111].includes(e.keyCode)){
        keycode = 8;
    } else if ([112].includes(e.keyCode)){
        keycode = 9;
    } else if ([92].includes(e.keyCode)){
        keycode = -1;
    } else if ([32].includes(e.keyCode)){
        keycode = 1;
    } else if ([13].includes(e.keyCode)){
        keycode = 12; //enter
    } else if ([61].includes(e.keyCode)){
        keycode = 13; // selection, + -
    } else if ([45].includes(e.keyCode)){
        keycode = 14; // selection, + -
    } else if ([96].includes(e.keyCode)){
        keycode = 10; // correction, `
    } else if ([93].includes(e.keyCode)){
        keycode = -2;
    } else if ([49].includes(e.keyCode)){
        keycode = 'q';
    } else if ([55].includes(e.keyCode)){
        keycode = 'u';
    }
    if (keycode != 100){
        tappingCode(keycode)
    }
})
loadDictionary()


// =====================
// Global vars
var inputcodes = '';
var fixed_text = ''; // fixed text after the selection, always ends with space
var compose_text = ''; //the current composing text in the textarea
var commited_text = ''; //committed text in the present div, always ends with space

var decodeBeamList = [];

//var for correction feature. Stores possible words for correction < 1 edit dist
var possible_wrong_words = [];
var current_wrong_word_idx = -1;

var selectionmode = false;
var correctionmode = false;

var dictionary = {}
//======================
// KeyPress functions

function tappingCode(tapcode){
    //console.log(tapcode, Date.now()/1000)
    if (tapcode == -1){
        new Audio('keypress2.mp3').play();
        backspacePressed();
    } else if (tapcode == 1){
        new Audio('keypress.mp3').play();
        spacePressed();
    } else if ([13, 14].includes(tapcode) /*pinch for candidate?*/) {
        //if in correction mode, left & right to switch between 
        //correction candidates
        new Audio('keypress.mp3').play();
        if (correctionmode){
            if (tapcode == 13){
                goNextCorrection();
            } else {
                goLastCorrection();
            }
        }
        else if (!selectionmode){
            if ( tapcode == 13)
            enterCandidateSelection();
        } else if (tapcode == 13){
            goNextCandidate();
        } else {
            goLastCandidate();
        }
    } else if (tapcode == 10 /*pinch for correction*/) {
        new Audio('keypress.mp3').play();
        toggleCorrection()
    } else if (tapcode == -2 /* remove words */){
        new Audio('keypress2.mp3').play();
        removeWords();
    } else if (tapcode == 12 /* enter */){
        new Audio('keypress_enter.mp3').play();
        $("#Next").click()
    } else if (tapcode > 0 && tapcode < 10)
    //normal input code
    {
        if (correctionmode || selectionmode){
            return;
        }
        new Audio('keypress.mp3').play();
        addInputCode(tapcode)
        //send request to decode
        requestDecode();
    } else if ('qweuio'.includes(tapcode)){
        //we have multiple codes
        if (correctionmode || selectionmode){
            return;
        }
        new Audio('keypress.mp3').play();
        addInputCodes(tapcode)
        //send request to decode
        requestDecode();
    }
    //console.log("fixed: ", fixed_text, 'inputcode : ', inputcodes)
}

function updateTranscribeData() {
    //for eval
    let textval = commited_text + compose_text;
    textval = textval.trim().split(' ')
    textval = textval.filter(function (el) {
        return el != '';
    }).join(' ');
    $('#Transcribe').attr('data-textval', textval);
}

function backspacePressed(){
    if (selectionmode){
        cancelCandidateSelection();
        return;
    }

    if (correctionmode){
        cancelCorrection();
        return;
    }

    if (compose_text.length == 0){
        if (commited_text.length > 0){
            commited_text = commited_text.slice(0, commited_text.length-1);
            setTextInDiv('Commit', commited_text);
        }
    } else {
        let needUpdateCandidate = true;
        if (compose_text[compose_text.length-1] == ' '){
            needUpdateCandidate = false;
        }
        compose_text = compose_text.slice(0, compose_text.length-1);
        setTextInDiv('Transcribe', compose_text);
        if (inputcodes.length > 0){
            inputcodes = inputcodes.slice(0, inputcodes.length-1);
            //also remove for the beam lists
            if (decodeBeamList.length > 0){
                for (let i in decodeBeamList){
                    let len = decodeBeamList[i].length;
                    decodeBeamList[i] = decodeBeamList[i].slice(0, len-1);
                }
            }
        }
        else if (fixed_text.length > 0){
            fixed_text = fixed_text.slice(0, fixed_text.length-1);
        }

        //we need to update the candidates... if the removed char is not space
        if (!needUpdateCandidate) return;
        let candidates = getLastWordCandidates();
        updateCandidateUI(candidates);
    }
}

function spacePressed() {
    //first if in candidate selection mode
    if (selectionmode){
        applyCurrentCandidate();
        return;
    }

    if (correctionmode){
        applyCorrection();
        return;
    }

    //else
    if (compose_text.length == 0){
        commited_text += ' ';
        setTextInDiv('Commit', commited_text);
    } else {
        if (compose_text.length > 1 &&
            compose_text[compose_text.length-1] == ' '){
            //double space to commit
            commitText();
        } else {
            compose_text += ' ';
            addInputCode('1')
            setTextInDiv('Transcribe', compose_text);

            //we reset all previous ambiguous input codes (qweuio)
            inputcodes = strToCode(compose_text.slice(fixed_text.length))
        }
    }
}

function removeLastWords(text, splitcode) {
    let words = text.trim().split(splitcode);
    if (words.length <= 1){
        return '';
    } else {
        return words.slice(0, words.length-1).join(splitcode)+splitcode;
    }
}

function removeWords() {
    if (selectionmode){
        cancelCandidateSelection();
        return;
    }
    if (correctionmode) {
        cancelCorrection();
    }

    if (compose_text.length == 0){
        if (commited_text.length > 0){
            commited_text = removeLastWords(commited_text, ' ');
            setTextInDiv('Commit', commited_text);
        }
    } else {
        //clear beamlist
        decodeBeamList = [];
        compose_text = removeLastWords(compose_text, ' ');
        if (compose_text == ''){
            fixed_text = '';
            resetInputCodes();
        } else {
            if (inputcodes.length > 0){
                //console.log("before remove word ", inputcodes)
                if (inputcodes[inputcodes.length-1] == '1'){
                    inputcodes = inputcodes.slice(0, inputcodes.length-1)
                }
                inputcodes = removeLastWords(inputcodes, '1');
                //console.log("after remove word ", inputcodes)
            } else {
                fixed_text = removeLastWords(fixed_text, ' ');
            }            
        }
        setTextInDiv('Transcribe', compose_text);
    }
    let candidates = getLastWordCandidates();
    updateCandidateUI(candidates);
}

//TTC-style correction
function toggleCorrection() {
    //reset the var for correction
    possible_wrong_words = [];
    current_wrong_word_idx = -1;

    let words = compose_text.trim().split(' ');
    if (words.length == 0 || words.length > 1) return;
    
    correctionmode = true;
    let lastword = words[words.length-1];
    let correctioncode = strToCode(lastword);

    //compare the edit dist of each code with the correction one
    //and sort
    words = commited_text.trim().split(' ')
    let smallest_dist = [-1, 100];
    for (let i = 0; i < words.length; ++i){
        if (words[i] == lastword) continue;
        let wcode = strToCode(words[i]);
        let code_dist = editDist(wcode, correctioncode);
        if (code_dist <= smallest_dist[1]){
            smallest_dist = [i, code_dist]
            //console.log(smallest_dist)
        }
        if (code_dist <= 1)
            possible_wrong_words.push(i);
    }
    current_wrong_word_idx = possible_wrong_words.indexOf(smallest_dist[0]);
    if (current_wrong_word_idx < 0){
        possible_wrong_words.push(smallest_dist[0]);
        current_wrong_word_idx = 0;
    }
    highlightCorrections();
}

function cancelCorrection(){
    correctionmode = false;
    setTextInDiv("Commit", commited_text);
}

//adds a new code to input code and the beam list
function addInputCode(code){
    inputcodes += code;
    if (decodeBeamList.length == 0){
        decodeBeamList.push(inputcodes);
    }
    else {
        decodeBeamList = [];
        decodeBeamList[0] = inputcodes;
        // for (let i = 1; i < decodeBeamList.length; ++i){
        //     decodeBeamList[i] += code;
        // }
    }
}

//add multiple inputcodes as multiple fingers pressed down
//and we need to select the best
function addInputCodes(code){
    inputcodes += code
    decodeBeamList = [inputcodes]
    // let codes = []
    // if (code == 23){
    //     codes = [2, 3];
    // } else if (code == 34){
    //     codes = [3, 4];
    // } else if (code == 45){
    //     codes = [4, 5];
    // } else if (code == 67){
    //     codes = [6, 7];
    // } else if (code == 78){
    //     codes = [7, 8];
    // } else if (code == 89){
    //     codes = [8, 9];
    // }

    // decodeBeamList = []
    // decodeBeamList.push(inputcodes+codes[0])
    // decodeBeamList.push(inputcodes+codes[1])
    // inputcodes += codes[0]
}

// =================
// Logic functions

function commitText(){
    commited_text += compose_text.trim()+' ';
    compose_text = '';
    fixed_text = '';
    setTextInDiv('Commit', commited_text);
    setTextInDiv('Transcribe', compose_text);
    //remove all candidates and other vars
    resetInputCodes();
}

function requestDecode(){
    
    let codelist = []
    for (let i = 0; i < decodeBeamList.length; ++i){
        codelist.push(decodeBeamList[i])//.split('').map(x=>+x))
    }
    // console.log(inputcodes)
    let precontext = commited_text + fixed_text;
    socket.emit("decode request", JSON.stringify({ "precontext": precontext, "codes": codelist }))
    /*$.ajax({
        method: "POST",
        url: "http://172.28.100.98:8765",//"http://192.168.50.69:8765",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify({ "precontext": precontext, "codes": codelist })
    }).done(handleDecodeMessage);*/
}

socket.on('decode result', handleDecodeMessage)

function handleDecodeMessage(msg) {
    msg = JSON.parse(msg)
    if ('res' in msg){
        //console.log("get msg," + Date.now()/1000)
        if (msg['res'].length < inputcodes.length) return;
        // if (decodeBeamList.length > 1){
        //     inputcodes = strToCode(msg['res'])
        // }
        decodeBeamList = []
        let decoded_words = msg['res'].split(' ');
        let decoded_last_word = decoded_words[decoded_words.length-1];
        compose_text = fixed_text + msg['res'];
        
        let suggested_words = msg['suggestion']
        let dic_candidates = getLastWordCandidates();
        
        if (suggested_words.length > 0 && 
            !dic_candidates.includes(suggested_words[0])){
            dic_candidates.splice(0, 0, suggested_words[0]);
        }

        if (dic_candidates.length < 5){
            for (let i = 0; i < Math.min(5-dic_candidates.length,
                                        suggested_words.length-1); ++i){
                if (!dic_candidates.includes(suggested_words[i])){
                    dic_candidates.push(suggested_words[i])
                }
            }
        }

        setTextInDiv('Transcribe', compose_text);
        updateCandidateUI(dic_candidates);
    }
}

//change for different key mapping
function strToCode(string){
    let code = ''
    for (let cr of string){
        if ('qaz'.includes(cr)){
            code += '2'
        } else if ('wsx'.includes(cr)){
            code += '3'
        } else if ('edc'.includes(cr)){
            code += '4'
        } else if ('rfvtgb'.includes(cr)){
            code += '5'
        } else if ('yhnujm'.includes(cr)){
            code += '6'
        } else if ('ik'.includes(cr)){
            code += '7'
        } else if ('ol'.includes(cr)){
            code += '8'
        } else if ('p'.includes(cr)){
            code += '9'
        } else {// if (cr == ' '){
            code += '1'
        }
    }
    return code;
}

function getLastWordCandidates(){
    let words = compose_text.trim().split(' ');
    
    if (words.length == 0) return [];
    let lastword = words[words.length-1];
    let wcodes = strToCode(lastword);
    if (inputcodes.length > 0 &&
        lastword.length > inputcodes.length){
        //in this condition, the input codes is part of the last word 
        //and we will only provide candidates of the inputcode
        wcodes = inputcodes;
        if (wcodes[wcodes.length-1] == '1'){
            wcodes = wcodes.slice(0, wcodes.length-1)
        }
    }
    
    //get candidate according to codes
    if (wcodes in dictionary){
        let cands = []
        for (let itm of dictionary[wcodes]){
            cands.push(itm[0])
        }

        let idx = cands.indexOf(words[words.length-1])
        if (idx >= 0){
            cands.splice(idx, 1);
        }
        return cands;
    }
    return [];
}

function applyCurrentCandidate(){
    //apply the candidate to the text
    let candidate = $('.selcandidate').text();
    let cur_words = compose_text.trim().split(' ');
    if (cur_words.length > 1){
        let lastword = cur_words[cur_words.length-1]
        logPickCorrection({'from': lastword, 'to': candidate})
        if (inputcodes.length > 0 &&
            lastword.length > inputcodes.length){
            //in this condition, the input codes is part of the last word 
            //and we will only apply candidates of the inputcode
            compose_text = compose_text.slice(
                0, compose_text.length-inputcodes.length) + 
                candidate;
        } else {
            compose_text = (
                cur_words.slice(0, cur_words.length-1).join(' ')
                +' '+candidate);
        }
    } else {
        //log the selection
        logPickCorrection({'from': compose_text, 'to': candidate})
        compose_text = candidate;
    }
    
    //we reset input codes
    resetInputCodes();
    compose_text += ' ';
    fixed_text = compose_text;
    setTextInDiv('Transcribe', compose_text);

    $('.candidate').html('');
    $('.candidate').removeClass('selcandidate');
    selectionmode = false;
}

function applyCorrection(){
    if (!correctionmode) return;
    if (current_wrong_word_idx < 0) return;
    
    let words = commited_text.trim().split(' ')
    words[ possible_wrong_words[current_wrong_word_idx] ] = compose_text.trim();
    //we substitute the wrong word
    //and clear the input codes
    commited_text = words.join(' ')+' ';
    compose_text = ''
    fixed_text = ''
    $('#Transcribe').attr('data-correction', 1);
    setTextInDiv("Transcribe", '')
    $('#Transcribe').attr('data-correction', 0);

    cancelCorrection()
    resetInputCodes()
}

function resetInputCodes() {
    inputcodes = '';
    decodeBeamList = [];
    $('.candidate').html('');
}

// =====================
// UI functions
function setTextInDiv(divid, text){
    updateTranscribeData();
    $('#'+divid).html(text+'<span class="cursorspan"> </span>');
}

function updateCandidateUI(candidates){
    $('.candidate').html('');
    $('.candidate').removeClass('selcandidate');
    for (let i in candidates){
        if (i >= 5) break;
        $('.candidate:eq('+i+')').html(candidates[i]);
    }
}

function cancelCandidateSelection() {
    selectionmode = false;
    $('.candidate').removeClass('selcandidate');
}

function enterCandidateSelection() {
    if ($('.candidate:eq(0)').text().length > 0){
        selectionmode = true;
        $('.candidate:eq(0)').addClass('selcandidate');
    }
}

function highlightCorrections() {
    if (!correctionmode) return;
    let words = commited_text.trim().split(' ')
    let new_commited = '';
    if (current_wrong_word_idx >= 0){
        for (let i = 0; i < words.length; ++i){
            if (i == possible_wrong_words[current_wrong_word_idx]){
                new_commited += '<span class="correction sandybrown">'+words[i]+'</span> ';
            }
            else if (possible_wrong_words.includes(i)){
                new_commited += '<span class="correction">'+words[i]+'</span> ';
            } else {
                new_commited += words[i] + ' ';
            }
        }
    }
    setTextInDiv('Commit', new_commited);
}

$("#Next").click(function() {
    if (commited_text.trim().length == 0) return;
    clearStatus();
})

$("#Redo").click(function() {
    clearStatus();
})

function clearStatus(){
    resetInputCodes();
    commited_text = '';
    compose_text = '';
    fixed_text = '';
    current_wrong_word_idx = -1;
    selectionmode = false;
    correctionmode = false;
    decodeBeamList = [];
}

//next/last candidate
function goNextCandidate() {
    let index = $('.candidate').index($('.selcandidate'));
    $('.selcandidate').removeClass('selcandidate')
    index += 1;
    if (index > 4) index = 0;
    if ($('.candidate:eq('+index+')').text().length == 0){
        index = 0;
    }
    
    $('.candidate:eq('+index+')').addClass('selcandidate');
}

function goLastCandidate() {
    let index = $('.candidate').index($('.selcandidate'));
    $('.selcandidate').removeClass('selcandidate')
    index -= 1;
    if (index < 0) {
        for (let i = 4; i >= 0; --i){
            if ($('.candidate:eq('+i+')').text().length > 0){
                index = i;
                break;
            }
        }
    }
    $('.candidate:eq('+index+')').addClass('selcandidate');
}

//next/last correction
function goNextCorrection() {
    current_wrong_word_idx += 1;
    if (current_wrong_word_idx >= possible_wrong_words.length){
        current_wrong_word_idx = possible_wrong_words.length-1;
    }
    highlightCorrections();
}

function goLastCorrection() {
    current_wrong_word_idx -= 1;
    if (current_wrong_word_idx < 0){
        current_wrong_word_idx = 0;
    }
    highlightCorrections();
}

// ============================
// Util functions
//change for different key mapping
function loadDictionary() {
    console.log("loading dict...")
    
    $.getJSON("dict.json", function(json) {
        dictionary = json
        console.log(Object.keys(dictionary).length)
    });
}


function editDist(s, t) {
    var d = []; //2d matrix

    // Step 1
    var n = s.length;
    var m = t.length;

    if (n == 0) return m;
    if (m == 0) return n;

    //Create an array of arrays in javascript (a descending loop is quicker)
    for (var i = n; i >= 0; i--) d[i] = [];

    // Step 2
    for (var i = n; i >= 0; i--) d[i][0] = i;
    for (var j = m; j >= 0; j--) d[0][j] = j;

    // Step 3
    for (var i = 1; i <= n; i++) {
        var s_i = s.charAt(i - 1);

        // Step 4
        for (var j = 1; j <= m; j++) {

            //Check the jagged ld total so far
            if (i == j && d[i][j] > 4) return n;

            var t_j = t.charAt(j - 1);
            var cost = (s_i == t_j) ? 0 : 1; // Step 5

            //Calculate the minimum
            var mi = d[i - 1][j] + 1;
            var b = d[i][j - 1] + 1;
            var c = d[i - 1][j - 1] + cost;

            if (b < mi) mi = b;
            if (c < mi) mi = c;

            d[i][j] = mi; // Step 6

            //Damerau transposition
            if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }

    // Step 7
    return d[n][m];
}