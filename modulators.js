const EffectType = {
    reverb: 0,
    chorus: 1,
    panning: 2,
    distortion: 3,
    bitcrusher: 4,
    noteFilter: 5,
    echo: 6,
    pitchShift: 7,
    detune: 8,
    vibrato: 9,
    transition: 10,
    chord: 11,
    ringModulation: 12,
    phaser: 13,
    noteRange: 14,
    invertWave: 15,
    granular: 16,
    length: 17,
}

const Config = {};

Config.noteSizeMax = 6;
Config.volumeRange = 50;
// Beepbox's old volume scale used factor -0.5 and was [0~7] had roughly value 6 = 0.125 power. This new value is chosen to have -21 be the same,
// given that the new scale is [-25~25]. This is such that conversion between the scales is roughly equivalent by satisfying (0.5*6 = 0.1428*21)
Config.volumeLogScale = 0.1428;

Config.panCenter = 50;
Config.panMax = Config.panCenter * 2;
Config.panDelaySecondsMax = 0.001;

Config.tempoMin = 1;
Config.tempoMax = 500;
Config.octaveMin = -2;
Config.octaveMax = 2;
Config.echoDelayRange = 24;
Config.echoDelayStepTicks = 4;
Config.echoSustainRange = 8;
Config.echoShelfHz = 4000.0; // The cutoff freq of the shelf filter that is used to decay echoes.
Config.echoShelfGain = Math.pow(2.0, -0.5);
Config.reverbShelfHz = 8000.0; // The cutoff freq of the shelf filter that is used to decay reverb.
Config.reverbShelfGain = Math.pow(2.0, -1.5);
Config.reverbRange = 32;
Config.reverbDelayBufferSize = 16384; // TODO: Compute a buffer size based on sample rate.
Config.reverbDelayBufferMask = Config.reverbDelayBufferSize - 1; // TODO: Compute a buffer size based on sample rate.
Config.phaserMixRange = 32; 
Config.phaserFeedbackRange = 32; 
Config.phaserFreqRange = 32; 
Config.phaserMinFreq = 8.0; 
Config.phaserMaxFreq = 20000.0; 
Config.phaserMinStages = 0; 
Config.phaserMaxStages = 32; 
Config.beatsPerBarMin = 1;
Config.beatsPerBarMax = 64;
Config.barCountMin = 1;
Config.barCountMax = 1024;
Config.instrumentCountMin = 1;
Config.layeredInstrumentCountMax = 10;
//this still hasn't been properly tested...
Config.patternInstrumentCountMax = 10;
Config.partsPerBeat = 24;
Config.ticksPerPart = 2;
Config.ticksPerArpeggio = 3;

const modulators = [{
    name: "none",
    pianoName: "None",
    maxRawVol: 6, newNoteVol: 6, forSong: true, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "No Mod Setting",
    promptDesc: ["No setting has been chosen yet, so this modulator will have no effect. Try choosing a setting with the dropdown, then click this '?' again for more info.", "[$LO - $HI]"]
},
{
    name: "song volume",
    pianoName: "Volume",
    maxRawVol: 100, newNoteVol: 100, forSong: true, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Song Volume",
    promptDesc: ["This setting affects the overall volume of the song, just like the main volume slider.", "At $HI, the volume will be unchanged from default, and it will get gradually quieter down to $LO.", "[MULTIPLICATIVE] [$LO - $HI] [%]"]
},
{
    name: "tempo",
    pianoName: "Tempo",
    maxRawVol: Config.tempoMax - Config.tempoMin, newNoteVol: Math.ceil((Config.tempoMax - Config.tempoMin) / 2), forSong: true, convertRealFactor: Config.tempoMin, associatedEffect: EffectType.length,
    promptName: "Song Tempo",
    promptDesc: ["This setting controls the speed your song plays at, just like the tempo slider.", "When you first make a note for this setting, it will default to your current tempo. Raising it speeds up the song, up to $HI BPM, and lowering it slows it down, to a minimum of $LO BPM.", "Note that you can make a 'swing' effect by rapidly changing between two tempo values.", "[OVERWRITING] [$LO - $HI] [BPM]"]
},
{
    name: "song reverb",
    pianoName: "Reverb",
    maxRawVol: Config.reverbRange * 2, newNoteVol: Config.reverbRange, forSong: true, convertRealFactor: -Config.reverbRange, associatedEffect: EffectType.length,
    promptName: "Song Reverb",
    promptDesc: ["This setting affects the overall reverb of your song. It works by multiplying existing reverb for instruments, so those with no reverb set will be unaffected.", "At $MID, all instruments' reverb will be unchanged from default. This increases up to double the reverb value at $HI, or down to no reverb at $LO.", "[MULTIPLICATIVE] [$LO - $HI]"]
},
{
    name: "next bar",
    pianoName: "Next Bar",
    maxRawVol: 1, newNoteVol: 1, forSong: true, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Go To Next Bar",
    promptDesc: ["This setting functions a little different from most. Wherever a note is placed, the song will jump immediately to the next bar when it is encountered.", "This jump happens at the very start of the note, so the length of a next-bar note is irrelevant. Also, the note can be value 0 or 1, but the value is also irrelevant - wherever you place a note, the song will jump.", "You can make mixed-meter songs or intro sections by cutting off unneeded beats with a next-bar modulator.", "[$LO - $HI]"]
},
{
    name: "note volume",
    pianoName: "Note Vol.",
    maxRawVol: Config.volumeRange, newNoteVol: Math.ceil(Config.volumeRange / 2), forSong: false, convertRealFactor: Math.ceil(-Config.volumeRange / 2.0), associatedEffect: EffectType.length,
    promptName: "Note Volume",
    promptDesc: ["This setting affects the volume of your instrument as if its note size had been scaled.", "At $MID, an instrument's volume will be unchanged from default. This means you can still use the volume sliders to mix the base volume of instruments. The volume gradually increases up to $HI, or decreases down to mute at $LO.", "This setting was the default for volume modulation in JummBox for a long time. Due to some new effects like distortion and bitcrush, note volume doesn't always allow fine volume control. Also, this modulator affects the value of FM modulator waves instead of just carriers. This can distort the sound which may be useful, but also may be undesirable. In those cases, use the 'mix volume' modulator instead, which will always just scale the volume with no added effects.", "For display purposes, this mod will show up on the instrument volume slider, as long as there is not also an active 'mix volume' modulator anyhow. However, as mentioned, it works more like changing note volume.", "[MULTIPLICATIVE] [$LO - $HI]"]
},
{
    name: "pan",
    pianoName: "Pan",
    maxRawVol: Config.panMax, newNoteVol: Math.ceil(Config.panMax / 2), forSong: false, convertRealFactor: 0, associatedEffect: EffectType.panning,
    promptName: "Instrument Panning",
    promptDesc: ["This setting controls the panning of your instrument, just like the panning slider.", "At $LO, your instrument will sound like it is coming fully from the left-ear side. At $MID it will be right in the middle, and at $HI, it will sound like it's on the right.", "[OVERWRITING] [$LO - $HI] [L-R]"]
},
{
    name: "reverb",
    pianoName: "Reverb",
    maxRawVol: Config.reverbRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.reverb,
    promptName: "Instrument Reverb",
    promptDesc: ["This setting controls the reverb of your insturment, just like the reverb slider.", "At $LO, your instrument will have no reverb. At $HI, it will be at maximum.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "distortion",
    pianoName: "Distortion",
    maxRawVol: Config.distortionRange - 1, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.distortion,
    promptName: "Instrument Distortion",
    promptDesc: ["This setting controls the amount of distortion for your instrument, just like the distortion slider.", "At $LO, your instrument will have no distortion. At $HI, it will be at maximum.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "fm slider 1",
    pianoName: "FM 1",
    maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "FM Slider 1",
    promptDesc: ["This setting affects the strength of the first FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"]
},
{
    name: "fm slider 2",
    pianoName: "FM 2",
    maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "FM Slider 2",
    promptDesc: ["This setting affects the strength of the second FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"]
},
{
    name: "fm slider 3",
    pianoName: "FM 3",
    maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "FM Slider 3",
    promptDesc: ["This setting affects the strength of the third FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"]
},
{
    name: "fm slider 4",
    pianoName: "FM 4",
    maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "FM Slider 4",
    promptDesc: ["This setting affects the strength of the fourth FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"]
},
{
    name: "fm feedback",
    pianoName: "FM Feedback",
    maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "FM Feedback",
    promptDesc: ["This setting affects the strength of the FM feedback slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"]
},
{
    name: "pulse width",
    pianoName: "Pulse Width",
    maxRawVol: Config.pulseWidthRange, newNoteVol: Config.pulseWidthRange, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Pulse Width",
    promptDesc: ["This setting controls the width of this instrument's pulse wave, just like the pulse width slider.", "At $HI, your instrument will sound like a pure square wave (on 50% of the time). It will gradually sound narrower down to $LO, where it will be inaudible (as it is on 0% of the time).", "Changing pulse width randomly between a few values is a common strategy in chiptune music to lend some personality to a lead instrument.", "[OVERWRITING] [$LO - $HI] [%Duty]"]
},
{
    name: "detune",
    pianoName: "Detune",
    maxRawVol: Config.detuneMax - Config.detuneMin, newNoteVol: Config.detuneCenter, forSong: false, convertRealFactor: -Config.detuneCenter, associatedEffect: EffectType.detune,
    promptName: "Instrument Detune",
    promptDesc: ["This setting controls the detune for this instrument, just like the detune slider.", "At $MID, your instrument will have no detune applied. Each tick corresponds to one cent, or one-hundredth of a pitch. Thus, each change of 100 ticks corresponds to one half-step of detune, up to two half-steps up at $HI, or two half-steps down at $LO.", "[OVERWRITING] [$LO - $HI] [cents]"]
},
{
    name: "vibrato depth",
    pianoName: "Vibrato Depth",
    maxRawVol: 50, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.vibrato,
    promptName: "Vibrato Depth",
    promptDesc: ["This setting controls the amount that your pitch moves up and down by during vibrato, just like the vibrato depth slider.", "At $LO, your instrument will have no vibrato depth so its vibrato would be inaudible. This increases up to $HI, where an extreme pitch change will be noticeable.", "[OVERWRITING] [$LO - $HI] [pitch ÷25]"]
},
{
    name: "song detune",
    pianoName: "Detune",
    maxRawVol: Config.songDetuneMax - Config.songDetuneMin, newNoteVol: Math.ceil((Config.songDetuneMax - Config.songDetuneMin) / 2), forSong: true, convertRealFactor: -250, associatedEffect: EffectType.length,
    promptName: "Song Detune",
    promptDesc: ["This setting controls the overall detune of the entire song. There is no associated slider.", "At $MID, your song will have no extra detune applied and sound unchanged from default. Each tick corresponds to four cents, or four hundredths of a pitch. Thus, each change of 25 ticks corresponds to one half-step of detune, up to 10 half-steps up at $HI, or 10 half-steps down at $LO.", "[ADDITIVE] [$LO - $HI] [cents x4]"]
},
{
    name: "vibrato speed",
    pianoName: "Vibrato Speed",
    maxRawVol: 30, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.vibrato,
    promptName: "Vibrato Speed",
    promptDesc: ["This setting controls the speed your instrument will vibrato at, just like the slider.", "A setting of $LO means there will be no oscillation, and vibrato will be disabled. Higher settings will increase the speed, up to a dramatic trill at the max value, $HI.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "vibrato delay",
    pianoName: "Vibrato Delay",
    maxRawVol: 50, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.vibrato,
    promptName: "Vibrato Delay",
    promptDesc: ["This setting controls the amount of time vibrato will be held off for before triggering for every new note, just like the slider.", "A setting of $LO means there will be no delay. A setting of 24 corresponds to one full beat of delay. As a sole exception to this scale, setting delay to $HI will completely disable vibrato (as if it had infinite delay).", "[OVERWRITING] [$LO - $HI] [beats ÷24]"]
},
{
    name: "arp speed",
    pianoName: "Arp Speed",
    maxRawVol: 50, newNoteVol: 12, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.chord,
    promptName: "Arpeggio Speed",
    promptDesc: ["This setting controls the speed at which your instrument's chords arpeggiate, just like the arpeggio speed slider.", "Each setting corresponds to a different speed, from the slowest to the fastest. The speeds are listed below.",
        "[0-4]: x0, x1/16, x⅛, x⅕, x¼,", "[5-9]: x⅓, x⅖, x½, x⅔, x¾,", "[10-14]: x⅘, x0.9, x1, x1.1, x1.2,", "[15-19]: x1.3, x1.4, x1.5, x1.6, x1.7,", "[20-24]: x1.8, x1.9, x2, x2.1, x2.2,", "[25-29]: x2.3, x2.4, x2.5, x2.6, x2.7,", "[30-34]: x2.8, x2.9, x3, x3.1, x3.2,", "[35-39]: x3.3, x3.4, x3.5, x3.6, x3.7,", "[40-44]: x3.8, x3.9, x4, x4.15, x4.3,", "[45-50]: x4.5, x4.8, x5, x5.5, x6, x8", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "pan delay",
    pianoName: "Pan Delay",
    maxRawVol: 20, newNoteVol: 10, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.panning,
    promptName: "Panning Delay",
    promptDesc: ["This setting controls the delay applied to panning for your instrument, just like the pan delay slider.", "With more delay, the panning effect will generally be more pronounced. $MID is the default value, whereas $LO will remove any delay at all. No delay can be desirable for chiptune songs.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "reset arp",
    pianoName: "Reset Arp",
    maxRawVol: 1, newNoteVol: 1, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.chord,
    promptName: "Reset Arpeggio",
    promptDesc: ["This setting functions a little different from most. Wherever a note is placed, the arpeggio of this instrument will reset at the very start of that note. This is most noticeable with lower arpeggio speeds. The lengths and values of notes for this setting don't matter, just the note start times.", "This mod can be used to sync up your apreggios so that they always sound the same, even if you are using an odd-ratio arpeggio speed or modulating arpeggio speed.", "[$LO - $HI]"]
},
{
    name: "eq filter",
    pianoName: "EQFlt",
    maxRawVol: 10, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "EQ Filter",
    promptDesc: ["This setting controls a few separate things for your instrument's EQ filter.", "When the option 'morph' is selected, your modulator values will indicate a sub-filter index of your EQ filter to 'morph' to over time. For example, a change from 0 to 1 means your main filter (default) will morph to sub-filter 1 over the specified duration. You can shape the main filter and sub-filters in the large filter editor ('+' button). If your two filters' number, type, and order of filter dots all match up, the morph will happen smoothly and you'll be able to hear them changing. If they do not match up, the filters will simply jump between each other.", "Note that filters will morph based on endpoints in the pattern editor. So, if you specify a morph from sub-filter 1 to 4 but do not specifically drag in new endpoints for 2 and 3, it will morph directly between 1 and 4 without going through the others.", "If you target Dot X or Dot Y, you can finely tune the coordinates of a single dot for your filter. The number of available dots to choose is dependent on your main filter's dot count.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "note filter",
    pianoName: "N.Flt",
    maxRawVol: 10, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.noteFilter,
    promptName: "Note Filter",
    promptDesc: ["This setting controls a few separate things for your instrument's note filter.", "When the option 'morph' is selected, your modulator values will indicate a sub-filter index of your note filter to 'morph' to over time. For example, a change from 0 to 1 means your main filter (default) will morph to sub-filter 1 over the specified duration. You can shape the main filter and sub-filters in the large filter editor ('+' button). If your two filters' number, type, and order of filter dots all match up, the morph will happen smoothly and you'll be able to hear them changing. If they do not match up, the filters will simply jump between each other.", "Note that filters will morph based on endpoints in the pattern editor. So, if you specify a morph from sub-filter 1 to 4 but do not specifically drag in new endpoints for 2 and 3, it will morph directly between 1 and 4 without going through the others.", "If you target Dot X or Dot Y, you can finely tune the coordinates of a single dot for your filter. The number of available dots to choose is dependent on your main filter's dot count.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "bit crush",
    pianoName: "Bitcrush",
    maxRawVol: Config.bitcrusherQuantizationRange - 1, newNoteVol: Math.round(Config.bitcrusherQuantizationRange / 2), forSong: false, convertRealFactor: 0, associatedEffect: EffectType.bitcrusher,
    promptName: "Instrument Bit Crush",
    promptDesc: ["This setting controls the bit crush of your instrument, just like the bit crush slider.", "At a value of $LO, no bit crush will be applied. This increases and the bit crush effect gets more noticeable up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "freq crush",
    pianoName: "Freq Crush",
    maxRawVol: Config.bitcrusherFreqRange - 1, newNoteVol: Math.round(Config.bitcrusherFreqRange / 2), forSong: false, convertRealFactor: 0, associatedEffect: EffectType.bitcrusher,
    promptName: "Instrument Frequency Crush",
    promptDesc: ["This setting controls the frequency crush of your instrument, just like the freq crush slider.", "At a value of $LO, no frequency crush will be applied. This increases and the frequency crush effect gets more noticeable up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "echo",
    pianoName: "Echo",
    maxRawVol: Config.echoSustainRange - 1, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.echo,
    promptName: "Instrument Echo Sustain",
    promptDesc: ["This setting controls the echo sustain (echo loudness) of your instrument, just like the echo slider.", "At $LO, your instrument will have no echo sustain and echo will not be audible. Echo sustain increases and the echo effect gets more noticeable up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "echo delay",
    pianoName: "Echo Delay",
    maxRawVol: Config.echoDelayRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Instrument Echo Delay",
    promptDesc: ["This setting controls the echo delay of your instrument, just like the echo delay slider.", "At $LO, your instrument will have very little echo delay, and this increases up to 2 beats of delay at $HI.", "[OVERWRITING] [$LO - $HI] [~beats ÷12]"]
}, // Disabled via associatedEffect and manually in list build in SongEditor, enable and set back to echo after fixing bugginess!
{
    name: "chorus",
    pianoName: "Chorus",
    maxRawVol: Config.chorusRange - 1, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.chorus,
    promptName: "Instrument Chorus",
    promptDesc: ["This setting controls the chorus strength of your instrument, just like the chorus slider.", "At $LO, the chorus effect will be disabled. The strength of the chorus effect increases up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "eq filt cut",
    pianoName: "EQFlt Cut",
    maxRawVol: Config.filterSimpleCutRange - 1, newNoteVol: Config.filterSimpleCutRange - 1, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "EQ Filter Cutoff Frequency",
    promptDesc: ["This setting controls the filter cut position of your instrument, just like the filter cut slider.", "This setting is roughly analagous to the horizontal position of a single low-pass dot on the advanced filter editor. At lower values, a wider range of frequencies is cut off.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "eq filt peak",
    pianoName: "EQFlt Peak",
    maxRawVol: Config.filterSimplePeakRange - 1, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "EQ Filter Peak Gain",
    promptDesc: ["This setting controls the filter peak position of your instrument, just like the filter peak slider.", "This setting is roughly analagous to the vertical position of a single low-pass dot on the advanced filter editor. At lower values, the cutoff frequency will not be emphasized, and at higher values you will hear emphasis on the cutoff frequency.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "note filt cut",
    pianoName: "N.Flt Cut",
    maxRawVol: Config.filterSimpleCutRange - 1, newNoteVol: Config.filterSimpleCutRange - 1, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.noteFilter,
    promptName: "Note Filter Cutoff Frequency",
    promptDesc: ["This setting controls the filter cut position of your instrument, just like the filter cut slider.", "This setting is roughly analagous to the horizontal position of a single low-pass dot on the advanced filter editor. At lower values, a wider range of frequencies is cut off.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "note filt peak",
    pianoName: "N.Flt Peak",
    maxRawVol: Config.filterSimplePeakRange - 1, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.noteFilter,
    promptName: "Note Filter Peak Gain",
    promptDesc: ["This setting controls the filter peak position of your instrument, just like the filter peak slider.", "This setting is roughly analagous to the vertical position of a single low-pass dot on the advanced filter editor. At lower values, the cutoff frequency will not be emphasized, and at higher values you will hear emphasis on the cutoff frequency.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "pitch shift",
    pianoName: "Pitch Shift",
    maxRawVol: Config.pitchShiftRange - 1, newNoteVol: Config.pitchShiftCenter, forSong: false, convertRealFactor: -Config.pitchShiftCenter, associatedEffect: EffectType.pitchShift,
    promptName: "Pitch Shift",
    promptDesc: ["This setting controls the pitch offset of your instrument, just like the pitch shift slider.", "At $MID your instrument will have no pitch shift. This increases as you decrease toward $LO pitches (half-steps) at the low end, or increases towards +$HI pitches at the high end.", "[OVERWRITING] [$LO - $HI] [pitch]"]
},
{
    name: "sustain",
    pianoName: "Sustain",
    maxRawVol: Config.stringSustainRange - 1, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Picked String Sustain",
    promptDesc: ["This setting controls the sustain of your picked string instrument, just like the sustain slider.", "At $LO, your instrument will have minimum sustain and sound 'plucky'. This increases to a more held sound as your modulator approaches the maximum, $HI.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "mix volume",
    pianoName: "Mix Vol.",
    maxRawVol: Config.volumeRange, newNoteVol: Math.ceil(Config.volumeRange / 2), forSong: false, convertRealFactor: Math.ceil(-Config.volumeRange / 2.0), associatedEffect: EffectType.length,
    promptName: "Mix Volume",
    promptDesc: ["This setting affects the volume of your instrument as if its volume slider had been moved.", "At $MID, an instrument's volume will be unchanged from default. This means you can still use the volume sliders to mix the base volume of instruments, since this setting and the default value work multiplicatively. The volume gradually increases up to $HI, or decreases down to mute at $LO.", "Unlike the 'note volume' setting, mix volume is very straightforward and simply affects the resultant instrument volume after all effects are applied.", "[MULTIPLICATIVE] [$LO - $HI]"]
},
{
    name: "fm slider 5",
    pianoName: "FM 5",
    maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "FM Slider 5",
    promptDesc: ["This setting affects the strength of the fifth FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"]
},
{
    name: "fm slider 6",
    pianoName: "FM 6",
    maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "FM Slider 6",
    promptDesc: ["This setting affects the strength of the sixth FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"]
},
{
    name: "decimal offset",
    pianoName: "Decimal Offset",
    maxRawVol: 99, newNoteVol: 0, forSong: false, convertRealFactor: 0, invertSliderIndicator: true, associatedEffect: EffectType.length,
    promptName: "Decimal Offset",
    promptDesc: ["This setting controls the decimal offset that is subtracted from the pulse width; use this for creating values like 12.5 or 6.25.", "[$LO - $HI]"]
},
{
    name: "envelope speed",
    pianoName: "EnvelopeSpd",
    maxRawVol: 50, newNoteVol: 12, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Envelope Speed",
    promptDesc: ["This setting controls how fast all of the envelopes for the instrument play.", "At $LO, your instrument's envelopes will be frozen, and at values near there they will change very slowly. At 12, the envelopes will work as usual, performing at normal speed. This increases up to $HI, where the envelopes will change very quickly. The speeds are given below:",
        "[0-4]: x0, x1/16, x⅛, x⅕, x¼,", "[5-9]: x⅓, x⅖, x½, x⅔, x¾,", "[10-14]: x⅘, x0.9, x1, x1.1, x1.2,", "[15-19]: x1.3, x1.4, x1.5, x1.6, x1.7,", "[20-24]: x1.8, x1.9, x2, x2.1, x2.2,", "[25-29]: x2.3, x2.4, x2.5, x2.6, x2.7,", "[30-34]: x2.8, x2.9, x3, x3.1, x3.2,", "[35-39]: x3.3, x3.4, x3.5, x3.6, x3.7,", "[40-44]: x3.8, x3.9, x4, x4.15, x4.3,", "[45-50]: x4.5, x4.8, x5, x5.5, x6, x8", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "dynamism",
    pianoName: "Dynamism",
    maxRawVol: Config.supersawDynamismMax, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Supersaw Dynamism",
    promptDesc: ["This setting controls the supersaw dynamism of your instrument, just like the dynamism slider.", "At $LO, your instrument will have only a single pulse contributing. Increasing this will raise the contribution of other waves which is similar to a chorus effect. The effect gets more noticeable up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "spread",
    pianoName: "Spread",
    maxRawVol: Config.supersawSpreadMax, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Supersaw Spread",
    promptDesc: ["This setting controls the supersaw spread of your instrument, just like the spread slider.", "At $LO, all the pulses in your supersaw will be at the same frequency. Increasing this value raises the frequency spread of the contributing waves, up to a dissonant spread at the max value, $HI.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "saw shape",
    pianoName: "Saw Shape",
    maxRawVol: Config.supersawShapeMax, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Supersaw Shape",
    promptDesc: ["This setting controls the supersaw shape of your instrument, just like the Saw↔Pulse slider.", "As the slider's name implies, this effect will give you a sawtooth wave at $LO, and a full pulse width wave at $HI. Values in between will be a blend of the two.", "[OVERWRITING] [$LO - $HI] [%]"]
},
{
    name: "song bitcrush",
    pianoName: "Song Bit crush",
    maxRawVol: Config.bitcrusherQuantizationRange * 2, newNoteVol: Config.bitcrusherQuantizationRange, forSong: true, convertRealFactor: -Config.bitcrusherQuantizationRange, associatedEffect: EffectType.length,
    promptName: "Song Bit crush",
    promptDesc: ["This setting affects the overall bitcrush of your song. It works by multiplying existing bitcrush for instruments, so those with no bitcrush set will be unaffected.", "At $MID, all instruments' bitcrush will be unchanged from default. This increases up to double the set bitcrush value at $HI, or down to no bitcrush at $LO.", "[MULTIPLICATIVE] [$LO - $HI]"]
},
{
    name: "song freqcrush",
    pianoName: "Song freqcrush",
    maxRawVol: Config.bitcrusherFreqRange * 2, newNoteVol: Config.bitcrusherFreqRange, forSong: true, convertRealFactor: -Config.bitcrusherFreqRange, associatedEffect: EffectType.length,
    promptName: "Song Freq crush",
    promptDesc: ["This setting affects the overall frequency crush of your song. It works by multiplying existing freq crush for instruments, so those with no bitcrush or freq crush set will be unaffected.", "At $MID, all instruments' bitcrush will be unchanged from default. This increases up to double the set bitcrush value at $HI, or down to no bitcrush at $LO.", "[MULTIPLICATIVE] [$LO - $HI]"]
},
{
    name: "song panning",
    pianoName: "Song Panning",
    maxRawVol: Config.panMax * 2, newNoteVol: Config.panMax, forSong: true, convertRealFactor: -Config.panMax, associatedEffect: EffectType.panning,
    promptName: "Song Panning",
    promptDesc: ["This setting affects the overall panning of your song. It works by adding to existing pan for instruments, so those with no panning set will be unaffected.", "At $MID, nothing will be added to the songs panning. At $HI, all instruments will have 100+ panning added, which would max out the panning. At $LO, -100+ panning added to it, which would make the panning as low as possible.", "[ADDITIVE] [$LO - $HI]"]
},
{
    name: "song chorus",
    pianoName: "Song Chorus",
    maxRawVol: Config.chorusRange * 2, newNoteVol: Config.chorusRange, forSong: true, convertRealFactor: -Config.chorusRange, associatedEffect: EffectType.length,
    promptName: "Song Chorus",
    promptDesc: ["This setting affects the overall chorus of your song. It works by multiplying existing chorus for instruments, so those with no chorus set will be unaffected.", "At $MID, all instruments' chorus will be unchanged from default. This increases up to double the set chorus value at $HI, or down to no chorus at $LO.", "[MULTIPLICATIVE] [$LO - $HI]"]
},
{
    name: "song distortion",
    pianoName: "Song Distortion",
    maxRawVol: Config.distortionRange * 2, newNoteVol: Config.distortionRange, forSong: true, convertRealFactor: -Config.distortionRange, associatedEffect: EffectType.length,
    promptName: "Song Distortion",
    promptDesc: ["This setting affects the overall distortion of your song. It works by multiplying existing distortion for instruments, so those with no distortion set will be unaffected.", "At $MID, all instruments' distortion will be unchanged from default. This increases up to double the set distortion value at $HI, or down to no distortion at $LO.", "[MULTIPLICATIVE] [$LO - $HI]"]
},
{
    name: "ring modulation",
    pianoName: "Ring Modulation",
    maxRawVol: Config.ringModRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Ring Modulation",
    promptDesc: ["This setting controls the Ring Modulation effect in your instrument.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "song ring modulation",
    pianoName: "Songwide Ring Modulation",
    maxRawVol: Config.ringModRange * 2, newNoteVol: Config.ringModRange, forSong: true, convertRealFactor: -Config.ringModRange, associatedEffect: EffectType.length,
    promptName: "Songwide Ring Modulation",
    promptDesc: ["This setting multiplies the Ring Modulation effect across all instruments.", "[MULTIPLICATIVE] [$LO - $HI]"]
},
{
    name: "ring mod hertz",
    pianoName: "Ring Modulation (Hertz)",
    maxRawVol: Config.ringModHzRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Ring Modulation (Hertz)",
    promptDesc: ["This setting controls the Hertz (Hz) used in the Ring Modulation effect in your instrument.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "phaser",
    pianoName: "Phaser",
    maxRawVol: Config.phaserMixRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.phaser,
    promptName: "Instrument Phaser",
    promptDesc: ["This setting controls the Phaser Mix of your insturment, just like the Phaser slider.", "At $LO, your instrument will have no phaser. At $HI, it will be at maximum.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "phaser frequency",
    pianoName: "Phaser Frequency",
    maxRawVol: Config.phaserFreqRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.phaser,
    promptName: "Phaser Frequency",
    promptDesc: ["This setting controls the phaser frequency of your insturment, just like the phaser freq slider.", "At $LO, your instrument will have no phaser freq. At $HI, it will be at maximum.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "phaser feedback",
    pianoName: "Phaser Feedback",
    maxRawVol: Config.phaserFeedbackRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.phaser,
    promptName: "Phaser Feedback",
    promptDesc: ["This setting controls the phaser feedback of your insturment, just like the phaser feedback slider.", "At $LO, your instrument will have no phaser feedback. At $HI, it will be at maximum.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "phaser stages",
    pianoName: "Phaser Stages",
    maxRawVol: Config.phaserMaxStages, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.phaser,
    promptName: "Phaser Stages",
    promptDesc: ["This setting controls the number of phaser stages in your insturment, just like the phaser stages slider.", "At $LO, your instrument will have no phaser stages. At $HI, it will be at maximum.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "song pitch shift",
    pianoName: "Song Pitch Shift",
    maxRawVol: (Config.pitchShiftRange * 2) - 2, newNoteVol: Config.pitchShiftRange, forSong: true, convertRealFactor: -Config.pitchShiftRange + 1, associatedEffect: EffectType.pitchShift,
    promptName: "Songwide Pitch Shift",
    promptDesc: ["This setting controls the pitch offset of all instruments regardless of whether or not the instrument has the effect itself, just like the pitch shift slider.", "At $MID your instrument will have no pitch shift. This increases as you decrease toward $LO pitches (half-steps) at the low end, or increases towards +$HI pitches at the high end.", "[ADDITIVE] [$LO - $HI] [pitch]"]
},
{
    name: "individual envelope speed",
    pianoName: "IndvEnvSpd",
    maxRawVol: 63, newNoteVol: 23, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length,
    promptName: "Individual Envelope Speed",
    promptDesc: ["This setting controls how fast the specified envelope of the instrument will play.", "At $LO, your the envelope will be frozen, and at values near there they will change very slowly. At 23, the envelope will work as usual, performing at normal speed. This increases up to $HI, where the envelope will change very quickly. The speeds are given below:", "[0-4]: x0, x0.01, x0.02, x0.03, x0.04,", "[5-9]: x0.05, x0.06, x0.07, x0.08, x0.09,", "[10-14]: x0.1, x0.2, x0.25, x0.3, x0.33,", "[15-19]: x0.4, x0.5, x0.6, x0.6667, x0.7,", "[20-24]: x0.75, x0.8, x0.9, x1, x1.25,", "[25-29]: x1.3333, x1.5, x1.6667, x1.75, x2,", "[30-34]: x2.25, x2.5, x2.75, x3, x3.5,", "[35-39]: x4, x4.5, x5, x5.5, x6,", "[40-44]: x6.5, x7, x7.5, x8, x8.5,", "[45-49]: x9, x9.5, x10, x11, x12", "[50-54]: x13, x14, x15, x16, x17", "[55-59]: x18, x19, x20, x24, x32", "[60-63]: x40, x64, x128, x256", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "invert wave",
    pianoName: "Invert Wave",
    maxRawVol: 1, newNoteVol: 1, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.invertWave,
    promptName: "Invert Wave",
    promptDesc: ["Allows you to toggle the Invert Wave effect on instruments. Value must be exactly 1 for this to take effect.", "[$LO - $HI]"]
},
{
    name: "granular",
    pianoName: "Granular",
    maxRawVol: Config.granularRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.granular,
    promptName: "Granular",
    promptDesc: ["This setting controls the granular effect in your instrument.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "grain freq",
    pianoName: "Grain #",
    maxRawVol: Config.grainAmountsMax, newNoteVol: 8, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.granular,
    promptName: "Grain Count",
    promptDesc: ["This setting controls the density of grains for the granular effect on your instrument.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "grain size",
    pianoName: "Grain Size",
    maxRawVol: Config.grainSizeMax / Config.grainSizeStep, newNoteVol: Config.grainSizeMin / Config.grainSizeStep, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.granular,
    promptName: "Grain Size", promptDesc: ["This setting controls the grain size of the granular effect in your instrument.", "The number shown in the mod channel is multiplied by " + Config.grainSizeStep + " to get the actual grain size.", "[OVERWRITING] [$LO - $HI]"]
},
{
    name: "grain range",
    pianoName: "Grain Range",
    maxRawVol: Config.grainRangeMax / Config.grainSizeStep, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.granular,
    promptName: "Grain Range",
    promptDesc: ["This setting controls the range of values for your grain size of the granular effect in your instrument, from no variation to a lot", "The number shown in the mod channel is multiplied by " + Config.grainSizeStep + " to get the actual grain size.", "[OVERWRITING] [$LO - $HI]"]
},]
