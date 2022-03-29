// T-sequence file for evaluation
// Refer to the repo: https://github.com/DrustZ/TextTestPP

//vars related to T-seq change
var oldVal = "";
var tsequence = [""];

//vars related to results
var IF = 0;

//vars related to phrase
var phrasecount = 0;
var totalcount = 0;
var phraselimit = 0;
var Allphrases = [];
var allphrases = [];
var PresentString = "";
var correction_times = 0;

//vars related to log
var AllJson = [];
var ItemJson = { Transcribe: []};
var CurrentJson;
var DefaultName = "TextTest"

//logic vars
var Started = false;

$('.ui.accordion')
  .accordion()
;

$.ajax({
    url:'phrases.txt',
    success: function (data){
    allphrases = data.split('\n');
    Allphrases = allphrases;
    PresentString = allphrases[phrasecount].replace(/^\s+|\s+$/g, '');
    PresentString = PresentString.toLowerCase();
    $('#Present').html(PresentString);
}
});

// actions in settings
$("#upload").click(function(){
    if (!window.FileReader) {
        alert('Your browser is not supported')
    }
    var input = $("#fileInput").get(0);
    
    // Create a reader object
    var reader = new FileReader();
    if (input.files.length) {
        var textFile = input.files[0];
        reader.readAsText(textFile);
        $(reader).on('load', processFile);
    } else {
        alert('Please upload a file before continuing')
    } 
})

//process the upload phrase file
function processFile(e) {
    var file = e.target.result,
        results;
    if (file && file.length) {
        allphrases = file.split("\n");
        Allphrases = allphrases;
        phrasecount = 0;
        PresentString = allphrases[phrasecount].replace(/^\s+|\s+$/g, '');
        PresentString = PresentString.toLowerCase();
        $('#Present').html(PresentString);
        $('#phraseCount').html('Phrase Count ');
        clearContent();
        AllJson = [];
        ItemJson = { Transcribe: []};
    }
}

$("#SetTotal").on('change', function(){
   if ($("#SetTotal").prop("checked")) {
       $("#numofPhrase").prop("disabled", false);
       phraselimit = Number($("#numofPhrase").val)
   } else {
       $("#numofPhrase").prop("disabled", true);
       phraselimit = 0;
   }
});

$("#numofPhrase").on("change paste keyup", function(){
    phraselimit = Number($("#numofPhrase").val())
});

//shuffle the phrases
$("#Shuffle").click(function(){
    shuffle(allphrases)
    phrasecount = 0;
    PresentString = allphrases[phrasecount].replace(/^\s+|\s+$/g, '');
    PresentString = PresentString.toLowerCase();
    $('#Present').html(PresentString);
    $('#phraseCount').html('Phrase Count ');
    clearContent();
    AllJson = [];
    ItemJson = { Transcribe: []};
})


//refresh process
function clearContent(){
    $('#Transcribe').html('<span class="cursorspan"> </span>');
    $('#Commit').html('<span class="cursorspan"> </span>');
    IF = 0, tsequence = [""];
    oldVal = "";
}

function collectTextNodes(element, texts) {
    for (var child= element.firstChild; child!==null; child= child.nextSibling) {
        if (child.nodeType===3)
            texts.push(child);
        else if (child.nodeType===1)
            collectTextNodes(child, texts);
    }
}

function getTextWithSpaces(element) {
    var texts= [];
    collectTextNodes(element, texts);
    for (var i= texts.length; i-->0;)
        texts[i]= texts[i].data;
    return texts.join(' ');
}

//whenever there's a change happens in the transcribed string (e.g. an Action happens)
//this function is triggered
$('body').on('DOMSubtreeModified', '#Transcribe', function(){
    textChanged();
});

$('body').on('DOMSubtreeModified', '#Commit', function(){
    textChanged();
});

function textChanged() {
    var currentVal = $("#Transcribe").attr('data-textval');
    
    if (currentVal.trim() == "") {
        oldVal = "";
        ItemJson = { Transcribe: []};
        IF = 0, tsequence = [""];
        correction_times = 0;
    }
    currentVal = currentVal.trim().split(' ')
    currentVal = currentVal.filter(function (el) {
        return el != '';
    }).join(' ');
    if (currentVal == oldVal) {
        return; //check to prevent multiple simultaneous triggers
    }
    //console.log("current val: " + currentVal)
    let correction = $("#Transcribe").attr('data-correction');
    if (correction == 1){
        correction_times += 1;
    }
    ItemJson["Transcribe"].push({Text: currentVal, TimeStamp: Date.now()})
	oldVal = currentVal;
    tsequence.push(currentVal);
}

//log pick corrections
function logPickCorrection(correctionMsg) {
    if (ItemJson["pick"] === undefined) {
        ItemJson["pick"] = []
    }
    ItemJson["pick"].push(correctionMsg)
}

$("#Next").click(function() {
    $("#Next").blur();
    let commit_content = getTextWithSpaces(document.getElementById('Commit'));
    if ( commit_content.trim().length == 0 ) return;
    res = getGuessResult(PresentString, tsequence[tsequence.length - 1]);
    ItemJson["Trial"] = phrasecount;
    ItemJson["Present"] = PresentString;
    ItemJson["IF"] = IF, ItemJson["INF"] = res[0], ItemJson["C"] = res[1];
    ItemJson["CER"] = (IF/(IF+res[1]+res[0])).toFixed(3)
    ItemJson["UER"] = (res[0]/(IF+res[1]+res[0])).toFixed(3)
    ItemJson["TER"] = ((IF+res[0])/(IF+res[1]+res[0])).toFixed(3)
    ItemJson["Transcribed"] = tsequence[tsequence.length - 1];
    ItemJson["TTCcorrections"] = correction_times;
    //console.log("click next, corrections ", correction_times);
    let ts = ItemJson["Transcribe"]
    ItemJson["Time"] = ts[ts.length-1].TimeStamp - ts[0].TimeStamp;
    //console.log(ItemJson)
    AllJson.push(JSON.parse(JSON.stringify(ItemJson)));
    ItemJson = { Transcribe: []};
    correction_times = 0;
    clearContent();
    
    phrasecount += 1
    totalcount += 1
    
    if (phraselimit > 0 && totalcount >= phraselimit)
        $('#phraseCount').html('<inline style="color:red;"> Task Done!</inline>')
    
    if (phrasecount >= allphrases.length){
        phrasecount = 0;
    }
    PresentString = allphrases[phrasecount].replace(/^\s+|\s+$/g, '')
    PresentString = PresentString.toLowerCase();
    $('#Present').html(PresentString)
    
    if ($('#phraseCount').html().startsWith('Phrase')){
        $('#phraseCount').html('Phrase Count '+totalcount)
    }
    $("#Redo").prop('disabled', false);
})

$("#Redo").click(function(){
    AllJson.pop();
    clearContent();
    phrasecount -= 1
    totalcount -= 1
    if (phrasecount < 0)
        phrasecount = allphrases.length-1
    PresentString = allphrases[phrasecount].replace(/^\s+|\s+$/g, '')
    PresentString = PresentString.toLowerCase();
    $('#Present').html(PresentString)
    if ($('#phraseCount').html().startsWith('Phrase')){
        $('#phraseCount').html('Phrase Count '+phrasecount)
    }
    $("#Redo").prop('disabled', true);
})

function array_equal(a1, a2) {
    return a1.length == a2.length && a1.every(function(v, i) {
        return v === a2[i]
    });
}

function getGuessResult(p, t) {
    if ($("#IgnoreCase").prop("checked")){
        p = p.toLocaleLowerCase();
        t = t.toLocaleLowerCase();
    }
    let INF = levenshtein(p, t);
    let C = Math.max(p.length, t.length) - INF;
    return [INF, C];
//    return "Guess Result: INF " + INF_2 + " IF " + IF_2 + " C " + C_2;
}

const levenshtein = (a, b) => {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length
    let tmp, i, j, prev, val
        // swap to save some memory O(min(a,b)) instead of O(a)
    if (a.length > b.length) {
        tmp = a
        a = b
        b = tmp
    }

    row = Array(a.length + 1)
        // init the row
    for (i = 0; i <= a.length; i++) {
        row[i] = i
    }

    // fill in the rest
    for (i = 1; i <= b.length; i++) {
        prev = i
        for (j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                val = row[j - 1] // match
            } else {
                val = Math.min(row[j - 1] + 1, // substitution
                        Math.min(prev + 1, // insertion
                            row[j] + 1)) // deletion
            }
            row[j - 1] = prev
            prev = val
        }
        row[a.length] = prev
    }
    return row[a.length]
}

//following are download and format
$("#Download").click(function(){
    CurrentJson = AllJson;
    var fname = DefaultName
    if ($("#Filename").val() != "")
        fname = $("#Filename").val()
    
    if ($("#Selectformat").val() == 0){ 
        download(fname+".json", JSON.stringify(CurrentJson, null, '\t'));
    } else if ($("#Selectformat").val() == 1){
        var csv = JsonToCSV(CurrentJson)
        download(fname+".csv", csv);
    }
})

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

//utils
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
}

//transfor from Json to CSV
//new metrics
function JsonToCSV(json){
    //WPM : WORD PRE MINUTE  CPM: CORRECTION PER MINUTE   TCCPM : Total character change per minute
    //TCC: total character change
    //AC: Action counts  DAC: delete action counts  IAC: insert action counts  SAC: substitute action counts
    //ratio
    //UER: Unfixed error rate  CER: corrected error rate  TER: total error rate
    //CPA: character change per action  TPA: transcribe character per action
    //CPC: character change per correct action
    //HIR: human input ratio   MIR: machine input ratio
    //rate
    //AE: action efficiency  CE: correct efficiency  TE: transcribe efficiency
    var csv = "Trial, Seconds, Tlen, Plen, IF, INF, C, WPM, UER, CER, TER, CCER, TTCcorrection\n"
    for (var j = 0; j < json.length; ++j){
        let item = json[j]
        let ts = item.Transcribe
        if (ts.length == 0) continue;
        let time = (ts[ts.length-1].TimeStamp - ts[0].TimeStamp) / 1000, fix_time = 0, delete_time = 0
        
        let Tlen = ts[ts.length-1].Text.length
        
        let WPM = (Tlen) / (time/12)
        let CCER = (item.INF) / (item.C + item.INF)
        csv += [j, time, Tlen, item.Present.length, item.IF, 
            item.INF, item.C, WPM, item.UER, item.CER, item.TER, 
            CCER, item.TTCcorrections].map(function(n){return Number(n).toFixed(2)}).join(',') + '\n'
    }
    return csv    
}

//random shuffle array with a seed
//https://github.com/yixizhang/seed-shuffle/blob/master/index.js
function seedshuffle(array, seed) {
    let currentIndex = array.length, temporaryValue, randomIndex;
    seed = seed || 1;
    let random = function() {
      var x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(random() * currentIndex);
      currentIndex -= 1;
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
}
