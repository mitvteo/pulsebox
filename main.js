import { fastFourierTransform } from "./synth/FFT.js";
import { events } from "./synth/global/Events.js";
import { Synth, Song, Config } from "./synth/synth.js";

window.beepbox = {}
window.beepbox.Synth = Synth;
window.beepbox.Config = Config;
window.beepbox.Song = Song;
const doc = {}
window.doc = doc
doc.synth = new Synth();
doc.synth.song = new Song();

window.OFFLINE = false;

doc.synth.song.fromBase64String(window.location.hash);

const favicon = new OffscreenCanvas(256, 256);
const fctx = favicon.getContext('2d');

const points = [
    { x: -1, y: -1, z: -1 },
    { x: -1, y: -1, z: 1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: 1, z: 1 },
    { x: 1, y: -1, z: -1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: 1, z: -1 },
    { x: 1, y: 1, z: 1 },
]
function rotate(pitch, roll, yaw) {
    var cosa = Math.cos(yaw);
    var sina = Math.sin(yaw);

    var cosb = Math.cos(pitch);
    var sinb = Math.sin(pitch);

    var cosc = Math.cos(roll);
    var sinc = Math.sin(roll);

    var Axx = cosa * cosb;
    var Axy = cosa * sinb * sinc - sina * cosc;
    var Axz = cosa * sinb * cosc + sina * sinc;

    var Ayx = sina * cosb;
    var Ayy = sina * sinb * sinc + cosa * cosc;
    var Ayz = sina * sinb * cosc - cosa * sinc;

    var Azx = -sinb;
    var Azy = cosb * sinc;
    var Azz = cosb * cosc;

    for (var i = 0; i < points.length; i++) {
        var px = points[i].x;
        var py = points[i].y;
        var pz = points[i].z;

        points[i].x = Axx * px + Axy * py + Axz * pz;
        points[i].y = Ayx * px + Ayy * py + Ayz * pz;
        points[i].z = Azx * px + Azy * py + Azz * pz;
    }
}

function drawLinePoints(i1, i2) {
    fctx.moveTo(128 + points[i1].x * 64, 128 + points[i1].y * 64);
    fctx.lineTo(128 + points[i2].x * 64, 128 + points[i2].y * 64);
}

function drawPoint(i) {
    fctx.beginPath();
    fctx.arc(128 + points[i].x * 64, 128 + points[i].y * 64, 6, 0, Math.PI * 2);
    fctx.closePath();
    fctx.fill();
}

let lastFaviconUpdate = performance.now();
async function updateFavicon() {
    lastFaviconUpdate = performance.now();

    fctx.clearRect(0, 0, 256, 256);
    fctx.fillStyle = `#024`
    fctx.beginPath();
    fctx.arc(128, 128, 128, 0, Math.PI * 2);
    fctx.closePath();
    fctx.fill();
    fctx.strokeStyle = '#08f';
    fctx.lineWidth = 12;
    fctx.beginPath();
    drawLinePoints(0, 1);
    drawLinePoints(0, 2);
    drawLinePoints(0, 4);
    drawLinePoints(1, 3);
    drawLinePoints(1, 5);
    drawLinePoints(2, 3);
    drawLinePoints(2, 6);
    drawLinePoints(3, 7);
    drawLinePoints(4, 5);
    drawLinePoints(4, 6);
    drawLinePoints(5, 7);
    drawLinePoints(7, 6);
    fctx.closePath();
    fctx.stroke();

    fctx.fillStyle = '#08f';
    drawPoint(0);
    drawPoint(1);
    drawPoint(2);
    drawPoint(3);
    drawPoint(4);
    drawPoint(5);
    drawPoint(6);
    drawPoint(7);

    document.getElementById('favicon').href = URL.createObjectURL(await favicon.convertToBlob({
        type: 'image/png',
        quality: 0
    }));
}

rotate(1, 1, 0);
setInterval(() => {
    const delta = performance.now() - lastFaviconUpdate;
    rotate(delta / 2000, delta / 2000 * 0.7, delta / 2000 * 0.1);
    updateFavicon();
}, 250);

const patternsElement = document.getElementById('patterns-auto');
const oscElement = document.getElementById('osc');
const patternsContainer = document.getElementById('patterns');
const playheadElement = document.getElementById('playhead');
const maincanvas = document.getElementById('notes-canvas');
/** @type {CanvasRenderingContext2D} */
const ctx = maincanvas.getContext('2d');

let theme = "default";
let themeColors = {
    "default": {
        notes: {
            pitch: [
                "#003377",
                "#004477",
                "#005577",
                "#006677",
                "#007777",
            ],
            drum: [
                "#404040",
                "#404048",
                "#404050",
                "#444458"
            ],
            mod: [
                "#337733",
                "#336633",
                "#335533",
                "#334433",
            ]
        },
        notesBG: {
            pitch: [
                "#00193b",
                "#00223b",
                "#002a3b",
                "#00333b",
                "#003b3b",
            ],
            drum: [
                "#202020",
                "#202024",
                "#202028",
                "#22222c"
            ],
            mod: [
                "#193b19",
                "#193319",
                "#192a19",
                "#192219",
            ]
        }
    }
}

function nmod(n, d) {
    const remainder = n % d;
    if (remainder * d < 0) return remainder + d;
    return remainder;
}

const lerp = (a, b, t) => a + (b - a) * t;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const hash = str => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
};

const previewHeight = 96;
const previewWidth = 128;
const previewNotes = 24;
const pixelSubDivision = 1;

const patternHashes = [];
window.ph = patternHashes;
window.upp = updatePatternPreviews;

const delayBetweenUpdates = 5;

const patternPreviews = [];
const patternPreviewImgs = [];
async function updatePatternPreviews() {
    let changed = 0;

    let currentTime = performance.now();
    const data = doc.synth.song;
    const ticksPerPattern = 24 * data.beatsPerBar;
    const ticksPerPixel = ticksPerPattern / previewWidth / pixelSubDivision;

    let colorPitch = 0;
    let colorDrum = 0;
    let colorMod = 0;

    for (let i = 0; i < data.channels.length; i++) {
        const channel = data.channels[i];
        let type = "pitch";
        if (i >= data.pitchChannelCount) {
            type = "drum"
            if (i >= data.pitchChannelCount + data.noiseChannelCount) {
                type = "mod"
            }
        }
        let colorId;
        switch (type) {
            case "pitch":
                colorId = colorPitch % themeColors[theme].notes.pitch.length;
                colorPitch += 1;
                break;
            case "drum":
                colorId = colorDrum % themeColors[theme].notes.drum.length;
                colorDrum += 1;
                break;
            default:
                colorId = colorMod % themeColors[theme].notes.mod.length;
                colorMod += 1;
                break;
        }
        if (!patternPreviews[i]) patternPreviews[i] = [];
        if (!patternHashes[i]) patternHashes[i] = [];
        if (!patternPreviewImgs[i]) patternPreviewImgs[i] = [];
        if (type === 'mod') {
            const modSettings = channel.instruments[0].modulators;
            for (let i2 = 0; i2 < channel.patterns.length; i2++) {
                const imgs = document.querySelectorAll(`*[data-pattern-preview="c${i}-p${i2 + 1}"]`);

                if (imgs.length > 0) {
                    const pattern = channel.patterns[i2];
                    if (!patternPreviews[i][i2]) patternPreviews[i][i2] = new OffscreenCanvas(previewWidth, previewHeight);
                    const newHash = hash(JSON.stringify(pattern));
                    const oldHash = patternHashes[i][i2];
                    if (!oldHash) patternHashes[i][i2] = newHash;
                    if (oldHash !== newHash) {
                        const ctx = patternPreviews[i][i2].getContext('2d');
                        ctx.clearRect(0, 0, previewWidth, previewHeight);
                        ctx.fillStyle = themeColors[theme].notesBG[type][colorId];
                        ctx.strokeStyle = themeColors[theme].notes[type][colorId];

                        const notes = pattern.notes;
                        ctx.beginPath();
                        for (let i3 = 0; i3 < notes.length; i3++) {
                            const pitch = notes[i3].pitches[0];
                            const points = notes[i3].pins;
                            const setting = modSettings[pitch];
                            // const min = modulators[setting].convertRealFactor;
                            const add = (Config.modulators)[setting].maxRawVol;
                            const start = notes[i3].start / ticksPerPixel;
                            const end = notes[i3].end / ticksPerPixel;
                            ctx.fillRect(start / pixelSubDivision, ((5 - pitch)) * (previewHeight / 6) + 1, (end - start) / pixelSubDivision, 14);

                            for (let px = start; px < end; px++) {
                                let atIndex = points.length - 1;
                                for (let point = 0; point < points.length - 1; point++) {
                                    if (points[point + 1].time / ticksPerPixel > px - start) {
                                        atIndex = point;
                                        break;
                                    }
                                }
                                const lerpAmt = ((px - start) - (points[atIndex].time / ticksPerPixel)) / (points[atIndex + 1].time / ticksPerPixel - points[atIndex].time / ticksPerPixel);
                                const volume = lerp(points[atIndex].size, points[atIndex + 1].size, lerpAmt);
                                const norm = Math.max(Math.min(volume / add, 1), 0);
                                const x = px / pixelSubDivision + 0.5;
                                ctx.moveTo(x, ((5 - pitch) + 1) * (previewHeight / 6));
                                ctx.lineTo(x, ((5 - pitch) + 1 - norm) * (previewHeight / 6));
                            }
                        }
                        ctx.closePath();
                        ctx.stroke();

                        (async () => {
                            let preview = URL.createObjectURL(await patternPreviews[i][i2].convertToBlob({
                                type: 'image/png',
                            }));
                            patternPreviewImgs[i][i2] = preview;
                            imgs.forEach(e => {
                                e.src = preview;
                            });
                        })();

                        changed++

                        currentTime += delayBetweenUpdates;
                        if (currentTime > performance.now()) await sleep(currentTime - performance.now());
                    } else {
                        imgs.forEach(e => {
                            if (e.src !== patternPreviewImgs[i][i2]) e.src = patternPreviewImgs[i][i2];
                        });
                    }
                }
            }
        } else if (type === 'pitch' || type === 'drum') {
            const rowAmt = type === 'pitch' ? previewNotes : 12;
            for (let i2 = 0; i2 < channel.patterns.length; i2++) {
                const imgs = document.querySelectorAll(`*[data-pattern-preview="c${i}-p${i2 + 1}"]`);

                if (imgs.length > 0) {
                    const pattern = channel.patterns[i2];
                    if (!patternPreviews[i][i2]) patternPreviews[i][i2] = new OffscreenCanvas(previewWidth, previewHeight);
                    const newHash = hash(JSON.stringify(pattern));
                    const oldHash = patternHashes[i][i2];
                    if (!oldHash) patternHashes[i][i2] = newHash;
                    if (oldHash !== newHash) {
                        const ctx = patternPreviews[i][i2].getContext('2d');
                        ctx.clearRect(0, 0, previewWidth, previewHeight);

                        const notes = pattern.notes;
                        const path1 = new Path2D();
                        const path2 = new Path2D();
                        for (let i3 = 0; i3 < notes.length; i3++) {
                            const pitches = notes[i3].pitches;
                            const points = notes[i3].pins;
                            // const min = modulators[setting].convertRealFactor;
                            const start = notes[i3].start / ticksPerPixel;
                            const end = notes[i3].end / ticksPerPixel;
                            // ctx.fillRect(start, ((5 - pitch)) * (previewHeight / 6) + 1, end - start, 14);

                            for (let px = start; px < end; px++) {
                                let atIndex = points.length - 1;
                                for (let point = 0; point < points.length - 1; point++) {
                                    if (points[point + 1].time / ticksPerPixel > px - start) {
                                        atIndex = point;
                                        break;
                                    }
                                }
                                const lerpAmt = ((px - start) - (points[atIndex].time / ticksPerPixel)) / (points[atIndex + 1].time / ticksPerPixel - points[atIndex].time / ticksPerPixel);
                                const volume = lerp(points[atIndex].size, points[atIndex + 1].size, lerpAmt);
                                const bend = lerp(points[atIndex].interval, points[atIndex + 1].interval, lerpAmt);
                                const norm = volume / 6;
                                const size = 0.7 * norm;
                                pitches.forEach(pitch => {
                                    const x = px / pixelSubDivision + 0.5;
                                    path1.moveTo(x, (rowAmt - nmod(pitch + bend, rowAmt) + (0.5 - size)) * previewHeight / rowAmt);
                                    path1.lineTo(x, (rowAmt - nmod(pitch + bend, rowAmt) + (0.5 + size)) * previewHeight / rowAmt);
                                    path2.moveTo(x, (rowAmt - nmod(pitch + bend, rowAmt) + (0.5 - 0.7)) * previewHeight / rowAmt);
                                    path2.lineTo(x, (rowAmt - nmod(pitch + bend, rowAmt) + (0.5 + 0.7)) * previewHeight / rowAmt);
                                    if (type === 'pitch' && nmod(pitch + bend, previewNotes) < 1) {
                                        path1.moveTo(x, (previewNotes - nmod(pitch + bend, previewNotes) - previewNotes + (0.5 - size)) * previewHeight / previewNotes);
                                        path1.lineTo(x, (previewNotes - nmod(pitch + bend, previewNotes) - previewNotes + (0.5 + size)) * previewHeight / previewNotes);
                                        path2.moveTo(x, (previewNotes - nmod(pitch + bend, previewNotes) - previewNotes + (0.5 - 0.7)) * previewHeight / previewNotes);
                                        path2.lineTo(x, (previewNotes - nmod(pitch + bend, previewNotes) - previewNotes + (0.5 + 0.7)) * previewHeight / previewNotes);
                                    }
                                });
                            }
                        }
                        ctx.strokeStyle = themeColors[theme].notesBG[type][colorId];
                        ctx.stroke(path2);
                        ctx.strokeStyle = themeColors[theme].notes[type][colorId];
                        ctx.stroke(path1);

                        (async () => {
                            let preview = URL.createObjectURL(await patternPreviews[i][i2].convertToBlob({
                                type: 'image/png',
                            }));
                            patternPreviewImgs[i][i2] = preview;
                            imgs.forEach(e => {
                                e.src = preview;
                            });
                        })();

                        changed++

                        currentTime += delayBetweenUpdates;
                        if (currentTime > performance.now()) await sleep(currentTime - performance.now());
                    } else {
                        imgs.forEach(e => {
                            if (e.src !== patternPreviewImgs[i][i2]) e.src = patternPreviewImgs[i][i2];
                        });
                    }
                }
            }
        }
    }
}

const channelColors = [];

function updatePatterns() {
    const temp = document.createDocumentFragment();
    let str = '';

    let colorPitch = 0;
    let colorDrum = 0;
    let colorMod = 0;

    const data = doc.synth.song;

    const currentTheme = themeColors[theme];

    for (let i = 0; i < data.channels.length; i++) {
        const channel = data.channels[i];
        let type = "pitch";
        if (i >= data.pitchChannelCount) {
            type = "drum"
            if (i >= data.pitchChannelCount + data.noiseChannelCount) {
                type = "mod"
            }
        }
        let color;
        switch (type) {
            case "pitch":
                color = { type, notes: currentTheme.notes.pitch[colorPitch % currentTheme.notes.pitch.length], bg: currentTheme.notesBG.pitch[colorPitch % currentTheme.notes.pitch.length] };
                colorPitch += 1;
                break;
            case "drum":
                color = { type, notes: currentTheme.notes.drum[colorDrum % currentTheme.notes.drum.length], bg: currentTheme.notesBG.drum[colorDrum % currentTheme.notes.drum.length] };
                colorDrum += 1;
                break;
            default:
                color = { type, notes: currentTheme.notes.mod[colorMod % currentTheme.notes.mod.length], bg: currentTheme.notesBG.mod[colorMod % currentTheme.notes.mod.length] };
                colorMod += 1;
                break;
        }
        channelColors[i] = color;
        const channelDiv = document.createElement("div");
        channelDiv.classList.add('channel-patterns');
        channelDiv.dataset.channel = `c${i}`
        channelDiv.style.setProperty(`--channel-color`, color.notes);
        for (let i2 = 0; i2 < channel.bars.length; i2++) {
            const barDiv = document.createElement("div");
            barDiv.classList.add('pattern');
            if (channel.bars[i2] !== 0) {
                const name = document.createElement('p');
                name.innerText = String(channel.bars[i2]);
                const img = document.createElement('img');
                img.dataset.bar = `b${i2}`;
                img.dataset.patternPreview = `c${i}-p${channel.bars[i2]}`;
                img.src = "";
                barDiv.appendChild(name);
                barDiv.appendChild(img);
            }
            channelDiv.appendChild(barDiv);
        }
        temp.appendChild(channelDiv);
    }
    patternsElement.replaceChildren(temp);

    updatePatternPreviews();
}

updatePatterns();

window.up = updatePatterns;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

document.addEventListener("drop", (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    const files = dt.files;

    const reader = new FileReader();
    if (!files[0].name.toLowerCase().includes("json")) return;
    reader.readAsText(files[0]);
    reader.onloadend = function () {
        doc.synth.song.fromBase64String(reader.result, "auto");
        updatePatterns();
    }
}, false);

patternsContainer.addEventListener('mousedown', (e) => {
    const pos = (e.x + patternsContainer.scrollLeft - 16) / 98;
    const posY = (e.y - patternsContainer.offsetTop + patternsContainer.scrollTop - 16) / 64;
    if (e.button === 0) {
        let wasPlaying = doc.synth.playing;
        currentChannel = Math.floor(posY);
        horizontalScroll = pos * 1 + (maincanvas.clientWidth * 0.5) / -(1000 * horizontalZoom);
        if (wasPlaying) {
            if (e.shiftKey) {
                doc.synth.pause();
                doc.synth.playhead = pos;
                doc.synth.play();
            }
        } else {
            if (e.shiftKey) {
                doc.synth.playhead = pos;
            } else {
                doc.synth.playhead = Math.floor(pos + 0.2);
            }
        }
    }
});

patternsContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const pos = (e.x + patternsContainer.scrollLeft - 16) / 98;
    const posY = (e.y - patternsContainer.offsetTop + patternsContainer.scrollTop - 16) / 64;
    let channel = Math.floor(posY);

    if (doc.synth.song.channels[channel]) {
        registerContextMenu(100, [
            {
                text: `Channel ${channel + 1} (${channelColors[channel].type})`,
                title: true
            },
            {
                text: (doc.synth.song.channels[channel].muted ? "Unmute Channel" : "Mute Channel"),
                func: () => {
                    doc.synth.song.channels[channel].muted = !doc.synth.song.channels[channel].muted;
                    updateMuted();
                }
            },
            {
                text: "Toggle Solo Channel",
                func: () => {
                    soloChannel(channel);
                }
            }
        ]);
    }

    showContextMenu();
});

const keysDown = {};

function soloChannel(id) {
    let alreadySolo = true;
    if (doc.synth.song.channels[id].muted) alreadySolo = false;
    for (let c = 0; c < doc.synth.song.channels.length; c++) {
        if (channelColors[c].type !== 'mod' && c !== id) {
            if (!doc.synth.song.channels[c].muted) alreadySolo = false;
        }
    }
    if (alreadySolo) {
        for (let c = 0; c < doc.synth.song.channels.length; c++) {
            if (doc.synth.song.channels[id].muted) alreadySolo = false;
            if (channelColors[c].type !== 'mod' && c !== id) {
                doc.synth.song.channels[c].muted = false;
            }
        }
    } else {
        doc.synth.song.channels[id].muted = false;
        for (let c = 0; c < doc.synth.song.channels.length; c++) {
            if (doc.synth.song.channels[id].muted) alreadySolo = false;
            if (channelColors[c].type !== 'mod' && c !== id) {
                doc.synth.song.channels[c].muted = true;
            }
        }
    }
    updateMuted();
}

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case (' '):
            e.preventDefault();
            if (doc.synth.playing) {
                doc.synth.pause();
                doc.synth.resetEffects();
                doc.synth.maintainLiveInput();
            }
            else doc.synth.play();
            break;
        case ('s'):
            soloChannel(currentChannel);
            break;
        case ('m'):
            doc.synth.song.channels[currentChannel].muted = !doc.synth.song.channels[currentChannel].muted;
            updateMuted();
            break;
    }
});

const vc = oscElement.getContext('2d');

function drawWave(array, largestSlopeIndex) {
    let x = 0;

    for (let i = largestSlopeIndex - 150; i < largestSlopeIndex + 150; i += 1) {
        const v = array[i * 2] * 255;
        const y = v * oscElement.height / 255 + oscElement.height * 0.5;

        if (x === 0) vc.moveTo(x * oscElement.width / 300, y);
        else vc.lineTo(x * oscElement.width / 300, y);

        x += 1;
    }
}
let outVolume;

let useFFT = true;
window.fastFourierTransform = fastFourierTransform;

let priority = 0;
let currentContextMenu
function registerContextMenu(to, cm) {
    if (to === 0) {
        priority = 0;
        currentContextMenu = [
            { text: "no available functions", disabled: true }
        ];
    } else if (to >= priority) {
        currentContextMenu = cm;
    }
}

const cmc = document.getElementById("contextmenuContainer");
const cm = document.getElementById("contextmenu");

let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

function showContextMenu() {
    cmc.classList.add('visible');
    cm.style.setProperty('top', mouseY + "px");
    cm.style.setProperty('left', mouseX + "px");

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < currentContextMenu.length; i++) {
        let item = currentContextMenu[i];

        const txt = document.createElement("li");
        if (item.title) {
            const b = document.createElement("b");
            b.innerHTML = item.text;
            txt.appendChild(b);
        } else txt.innerText = item.text;
        if (item.disabled) txt.classList.add("disabled");
        if (item.func) {
            txt.addEventListener('mousedown', (e) => {
                item.func();
                closeContextMenu();
            });
        }
        fragment.appendChild(txt);
    }

    cm.replaceChildren(fragment);
}

function closeContextMenu() {
    cmc.classList.remove('visible');
}

window.closeContextMenu = closeContextMenu;

events.listen('oscUpdate', (l, r) => {
    oscElement.width = oscElement.clientWidth;
    oscElement.height = oscElement.clientHeight;
    vc.globalCompositeOperation = 'screen';

    if (useFFT) {
        const realL = [...l];
        const imagL = (new Array(l.length)).fill(0);

        const realR = [...r];
        const imagR = (new Array(r.length)).fill(0);

        fastFourierTransform(realL, imagL);
        fastFourierTransform(realR, imagR);

        const fL = new Array(600);
        const fR = new Array(600);

        const minBin = 3;
        const maxBin = 300;

        for (let i = 0; i < 600; i++) {

            const t = i / (600 - 1);
            const logIndex = minBin * Math.pow(maxBin / minBin, t);
            const idx = Math.min(Math.floor(logIndex), maxBin - 1);

            const frac = logIndex - Math.floor(logIndex);
            const i0 = Math.floor(logIndex);
            const i1 = Math.min(i0 + 1, maxBin - 1);

            let hl0 = Math.min(Math.hypot(realL[i0], imagL[i0]), 85);
            let hl1 = Math.min(Math.hypot(realL[i1], imagL[i1]), 85);
            let hr0 = Math.min(Math.hypot(realR[i0], imagR[i0]), 85);
            let hr1 = Math.min(Math.hypot(realR[i1], imagR[i1]), 85);
            const magL = lerp(hl0, hl1, frac);
            const magR = lerp(hr0, hr1, frac);

            fL[i] = 0.5 - lerp(20 * Math.log10(Math.abs(magL)), magL, 0.75) / 80;
            fR[i] = 0.5 - lerp(20 * Math.log10(Math.abs(magR)), magR, 0.75) / 80;
        }

        vc.lineJoin = "bevel";
        vc.beginPath();
        drawWave(fL, 150);
        vc.strokeStyle = "#bb88ff";
        vc.lineWidth = 2;
        vc.stroke();
        vc.beginPath();
        drawWave(fR, 150);
        vc.strokeStyle = "#88bbff";
        vc.lineWidth = 2;
        vc.stroke();
    } else {
        let largestSlope = 0;
        let largestSlopeIndex = 200;
        outVolume = 0;

        const start = Math.floor(200);
        const end = Math.floor(l.length * 0.5 - 200);
        const length = end - start

        for (let i = start; i < end; i += 2) {
            const v = (l[i * 2] + r[i * 2]);
            let slope = 0;

            for (let i2 = 0; i2 < 10; i2 += 2) {
                slope += (l[i * 2 - i2] + r[i * 2 - i2]) - v;
            }

            if (slope > largestSlope) {
                largestSlope = slope;
                largestSlopeIndex = i;
            }

            outVolume += (v * v) / length;
        }

        outVolume = Math.sqrt(outVolume);

        vc.lineJoin = "bevel";
        vc.beginPath();
        drawWave(l, largestSlopeIndex);
        vc.strokeStyle = "#bb88ff";
        vc.lineWidth = 2;
        vc.stroke();
        vc.beginPath();
        drawWave(r, largestSlopeIndex);
        vc.strokeStyle = "#88bbff";
        vc.lineWidth = 2;
        vc.stroke();
    }
});

oscElement.addEventListener('mousedown', (e) => {
    useFFT = !useFFT;
});

const limiterDuckDisplay = document.getElementById("limiterDuck");
const limiterOutputDisplay = document.getElementById("limiterOutput");
const limiterDuckTextDisplay = document.getElementById("limiterDuckText");
const limiterOutputTextDisplay = document.getElementById("limiterOutputText");
const limiterDisplay = document.getElementById("limiter");
let limiterLastOver = 0;
events.listen("limiterUpdate", (limitedVolume, volumeCap) => {
    let lim = (Math.log2(limitedVolume));
    limiterDuckDisplay.style.height = `${Math.abs(lim * 0.4 * 100)}%`
    if (lim < 0) {
        limiterDuckDisplay.style.marginTop = `${limiterDisplay.clientHeight * 0.5}px`;
    } else {
        limiterDuckDisplay.style.marginTop = `${limiterDisplay.clientHeight * (0.5 - lim * 0.4)}px`;
    }
    limiterOutputDisplay.style.height = `${volumeCap * 100}%`;
    limiterDuckTextDisplay.innerText = limitedVolume.toFixed(1) + "x";
    limiterOutputTextDisplay.innerText = String(Math.floor(volumeCap * 100)) + "%";

    limiterDuckTextDisplay.style.marginTop = `${limiterDisplay.clientHeight * 0.5}px`;
    limiterOutputTextDisplay.style.marginTop = `${limiterDisplay.clientHeight * 0.5}px`;

    let limiterOver = volumeCap > 0.95 ? 2 : (limitedVolume < 0.975 ? 1 : 0);
    let newColor;

    switch (limiterOver) {
        case 1: newColor = "#dd2"; break;
        case 2: newColor = "#d22"; break;
        default: newColor = "#2d2"; break;
    }

    if (limiterOutputDisplay.style.backgroundColor !== newColor) {
        limiterOutputDisplay.style.backgroundColor = newColor;
    }
});

let lastBarOn = null;

let lastPlayhead = doc.synth.playhead;
let lastChannelAmt = 0;

let playheadLerp = 0;

let currentChannel = 3;
let horizontalZoom = 0.5;
let horizontalScroll = 0;

let verticalScroll = 0;
let verticalZoom = 1;

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

maincanvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    if ((e.shiftKey && e.ctrlKey) || e.altKey) {
        if (e.wheelDeltaY > 0) {
            horizontalZoom *= 1.1;
        } else if (e.wheelDeltaY < 0) {
            horizontalZoom /= 1.1;
        }
    } else if (e.shiftKey) {
        if (e.wheelDeltaY > 0) {
            horizontalScroll -= 0.2 / horizontalZoom;
        } else if (e.wheelDeltaY < 0) {
            horizontalScroll += 0.2 / horizontalZoom;
        }
    }
})

async function drawChannelNotes(drawChannel, startPattern, endPattern) {
    const pixelSubDivision = (drawChannel === currentChannel ? 1 : 0.5);
    const ticksPerPattern = 24 * doc.synth.song.beatsPerBar;
    const ticksPerPixel = ticksPerPattern / (horizontalZoom * 1000) / pixelSubDivision;

    const color = channelColors[drawChannel];

    const playheadPos = Math.floor(doc.synth.playhead * horizontalZoom * 1000 - horizontalScroll * horizontalZoom * 1000 - 2);

    for (let i = startPattern; i < endPattern; i++) {
        const channel = doc.synth.song.channels[drawChannel];
        const patternId = channel.bars[i];
        if (patternId !== 0) {
            const pattern = channel.patterns[patternId - 1];
            const offsetX = (horizontalScroll - i) * horizontalZoom * 1000;

            const notes = pattern.notes;
            for (let i3 = 0; i3 < notes.length; i3++) {
                const path1 = new Path2D();
                const path2 = new Path2D();

                const pitches = notes[i3].pitches;
                const points = notes[i3].pins;
                const start = Math.ceil(notes[i3].start / ticksPerPixel);
                const end = Math.floor(notes[i3].end / ticksPerPixel);
                let soundPlayed = 0;
                const patternPosStart = notes[i3].start / ticksPerPattern + i;
                const patternPosEnd = notes[i3].end / ticksPerPattern + i;

                if (doc.synth.playhead >= patternPosStart && doc.synth.playhead <= patternPosEnd) {
                    soundPlayed = Math.max(0.7, (1 - (doc.synth.playhead - patternPosStart) / 0.25) * 0.3 + 0.7);
                } else if (doc.synth.playhead >= patternPosEnd && doc.synth.playhead <= patternPosEnd + 0.25) {
                    soundPlayed = Math.max(0, (1 - (doc.synth.playhead - patternPosEnd) / 0.25) * 0.5);
                }

                for (let px = start; px < end; px++) {
                    let atIndex = points.length - 1;
                    for (let point = -1; point < points.length - 1; point++) {
                        if (points[point + 1].time / ticksPerPixel > px - start) {
                            atIndex = point;
                            break;
                        }
                    }

                    const x = Math.floor(px / pixelSubDivision + 0.5 - offsetX);

                    const lerpAmt = ((px - start) - (points[atIndex].time / ticksPerPixel)) / (points[atIndex + 1].time / ticksPerPixel - points[atIndex].time / ticksPerPixel);
                    const volume = lerp(points[atIndex].size, points[atIndex + 1].size, lerpAmt);
                    const bend = lerp(points[atIndex].interval, points[atIndex + 1].interval, lerpAmt);
                    const norm = volume / 6;
                    // const size = 0.5 * norm * (1 + Math.max((1 - Math.abs(x - playheadPos) / 10), 0) ** 0.5);
                    const size = 0.5 * norm;
                    pitches.forEach(pitch => {
                        if (x < 0 || x > maincanvas.width) return;
                        path1.rect(x, (maincanvas.height) - (pitch + bend + (0.5 + size)) * (maincanvas.height * verticalZoom / 96), 1 / pixelSubDivision, size * 2 * (maincanvas.height * verticalZoom / 96));
                        if (drawChannel === currentChannel) {
                            path2.rect(x, (maincanvas.height) - (pitch + bend + (0.5 + 0.7)) * (maincanvas.height * verticalZoom / 96), 1 / pixelSubDivision, 1.4 * (maincanvas.height * verticalZoom / 96));
                        }
                    });
                }
                if (drawChannel === currentChannel) {
                    ctx.fillStyle = color.bg;
                    if (soundPlayed > 0) {
                        const rgb = hexToRgb(color.bg);
                        const newclr = rgbToHex(Math.floor(lerp(rgb.r, 128, soundPlayed)), Math.floor(lerp(rgb.g, 128, soundPlayed)), Math.floor(lerp(rgb.b, 128, soundPlayed)));
                        ctx.fillStyle = newclr;
                    }
                    ctx.fill(path2);
                }
                ctx.fillStyle = color.notes + (drawChannel === currentChannel ? 'ff' : '44');
                if (soundPlayed) {
                    const rgb = hexToRgb(color.notes);
                    const newclr = rgbToHex(Math.floor(lerp(rgb.r, 255, soundPlayed)), Math.floor(lerp(rgb.g, 255, soundPlayed)), Math.floor(lerp(rgb.b, 255, soundPlayed)));
                    ctx.fillStyle = newclr + (drawChannel === currentChannel ? 'ff' : '44');
                };
                ctx.fill(path1);
            }
        }
    }
}

function updateMuted() {
    for (let c = 0; c < doc.synth.song.channels.length; c++) {
        let ch = document.querySelector(`*[data-channel="c${c}"]`);
        if (doc.synth.song.channels[c].muted) ch.classList.add("muted");
        else ch.classList.remove("muted");
    }
}

updateMuted();

let lastFrame = performance.now();
function draw() {
    requestAnimationFrame(draw);
    registerContextMenu(0);
    if (document.hidden && performance.now() - lastFrame < 1000) return;
    const delta = performance.now() - lastFrame;
    lastFrame = performance.now();

    // console.log(1 / (delta / 1000));

    if (doc.synth.playhead != lastPlayhead) {
        lastPlayhead = doc.synth.playhead;
        playheadElement.style.left = `calc(${lastPlayhead * 6 + 1}rem + ${lastPlayhead * 2}px)`;
    }

    if (lastChannelAmt !== doc.synth.song.channels.length) {
        lastChannelAmt = doc.synth.song.channels.length;
        playheadElement.style.height = `calc(${lastChannelAmt * 4}rem + ${lastChannelAmt * 2}px)`;
    }

    const newBarOn = doc.synth.playing ? Math.floor(doc.synth.playhead) : null;

    if (lastBarOn !== newBarOn) {
        let last = lastBarOn;
        lastBarOn = newBarOn;

        if (last !== null) {
            document.querySelectorAll(`*[data-bar='b${last}']`).forEach((e) => {
                e.classList.remove('active');
            });
        }
        document.querySelectorAll(`*[data-bar='b${newBarOn}']`).forEach((e) => {
            e.classList.add('active');
        });
    }

    maincanvas.width = maincanvas.clientWidth;
    maincanvas.height = maincanvas.clientHeight;

    const startPattern = Math.max(Math.floor(horizontalScroll), 0);
    const endPattern = Math.min(Math.ceil(horizontalScroll + (maincanvas.width / 1000) / horizontalZoom), doc.synth.song.barCount);

    for (let c = 0; c < doc.synth.song.channels.length; c++) {
        if (channelColors[c].type === channelColors[currentChannel].type && c !== currentChannel) {
            drawChannelNotes(c, startPattern, endPattern);
        }
    }
    drawChannelNotes(currentChannel, startPattern, endPattern);

    const clr = channelColors[currentChannel].notes;
    const outline = channelColors[currentChannel].bg;
    for (let i = startPattern; i < endPattern; i++) {
        let id = doc.synth.song.channels[currentChannel].bars[i];
        if (id) {
            const offsetX = (horizontalScroll - i) * horizontalZoom * 1000;
            ctx.fillStyle = outline;
            ctx.fillRect(-offsetX - 1, 0, horizontalZoom * 1000 + 1, 14);
        }
    }
    ctx.font = '12px Quicksand';
    for (let i = startPattern; i < endPattern; i++) {
        let id = doc.synth.song.channels[currentChannel].bars[i];
        if (id) {
            const offsetX = (horizontalScroll - i) * horizontalZoom * 1000;
            ctx.fillStyle = clr;
            ctx.fillRect(-offsetX + 1, 0, horizontalZoom * 1000 - 2, 12);
            ctx.fillStyle = '#33333388';
            ctx.fillRect(-offsetX - 1, 0, 2, maincanvas.height);

            ctx.fillStyle = '#fff';
            ctx.fillText(`Pattern ${id}`, -offsetX + 4, 10);
        }
    }

    ctx.fillStyle = '#fff';
    playheadLerp = lerp(playheadLerp, doc.synth.playhead, 1 - 0.5 ** (delta / 1000 * 60));
    ctx.fillRect(Math.floor(playheadLerp * horizontalZoom * 1000 - horizontalScroll * horizontalZoom * 1000 - 2), 0, 4, maincanvas.height);


}

draw();
