/* OUR LITTLE CINEMA — Akbar & Deandra
   1) Isi firebaseConfig di bawah.
   2) Deploy Firebase Realtime Database + Anonymous Authentication.
*/
const firebaseConfig = {
  apiKey: "ISI_API_KEY",
  authDomain: "ISI_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://ISI_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ISI_PROJECT_ID",
  storageBucket: "ISI_PROJECT_ID.appspot.com",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID"
};
const START_DATE = new Date(2026, 2, 3);
const $ = s => document.querySelector(s);
const state = {room:null, db:null, roomRef:null, isFirebase:false, user:null, shared:{}, localMessages:[], currentFeature:null, mediaStream:null, pet:{name:"Mochi",level:1,xp:0,mood:"happy"}, puzzleOrder:[], puzzleMoves:0, audioCtx:null};
const features = [
 ["constellation","✧","Our Love Constellation","Bintang-bintang yang menyimpan momen kalian."],
 ["capsule","⌛","Time Capsule 2027","Pesan rahasia untuk dibuka di tahun 2027."],
 ["destiny","♧","Choose Our Destiny","Cerita bercabang; pilihan kalian menentukan akhir."],
 ["aquarium","♧","Our Dream Aquarium","Akuarium mimpi yang tumbuh bersama."],
 ["mystery","⌕","Mystery Investigation","Pecahkan misteri kecil dari petunjuk cinta."],
 ["photobooth","▣","Virtual Photobooth","Ambil foto berdua dan simpan kenangannya."],
 ["heartbeat","♡","Heartbeat Scanner","Simulasi detak visual dengan pesan acak."],
 ["solar","☼","Our Solar System","Planet-planet berisi impian masa depan."],
 ["distance","⌁","Distance Explorer","Jelajahi jarak dan tujuan pertemuan."],
 ["future","⌘","Message From Future Akbar","Pesan imajinatif dari Akbar di masa depan."],
 ["gravity","✦","Gravity Love","Tarik bintang-bintang ke pusat gravitasi cinta."],
 ["pet","♟","Digital Pet","Rawat hewan virtual kalian bersama."],
 ["puzzle","▦","Memory Puzzle","Susun potongan kenangan menjadi utuh."],
 ["frequency","〰","Secret Frequency","Temukan frekuensi rahasia semesta kalian."],
 ["nightsky","☾","Night Sky","Langit malam interaktif untuk ditaburi bintang."]
];
const descriptions = {
 constellation:"Pilih bintang untuk menambahkan kenangan. Daftar ini tersimpan di ruang bersama.",
 capsule:"Tulis pesan untuk masa depan. Pesan akan terkunci sampai 1 Januari 2027. Ini fitur playful, bukan pengamanan rahasia.",
 destiny:"Pilih jalan cerita bersama. Setiap pilihan mengubah bab selanjutnya.",
 aquarium:"Tambahkan ikan dan tulis mimpi yang ingin kalian wujudkan bersama.",
 mystery:"Ada pesan tersembunyi. Baca petunjuk dan pecahkan kode sederhana.",
 photobooth:"Aktifkan kamera, ambil foto, lalu simpan ke perangkat. Foto tidak otomatis diunggah ke database.",
 heartbeat:"Tekan dan tahan tombol untuk melihat animasi denyut. Ini simulasi visual, bukan pengukuran detak jantung.",
 solar:"Setiap planet mewakili impian kalian. Tambahkan planet baru.",
 distance:"Catat kota kalian dan tempat yang ingin dikunjungi bersama. Peta ini ilustrasi, bukan GPS.",
 future:"Baca surat imajinatif dari Akbar versi masa depan.",
 gravity:"Klik atau sentuh area untuk menambah bintang; gravitasi akan menariknya ke pusat.",
 pet:"Rawat Mochi. Aksi dan level disimpan bersama di database.",
 puzzle:"Cocokkan pasangan simbol. Skor langkah disimpan lokal di perangkat ini.",
 frequency:"Mainkan nada-nada sederhana untuk membuka pesan rahasia.",
 nightsky:"Klik langit untuk menambah bintang dan buat rasi kalian sendiri."
};
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function safeKey(s){return String(s).toLowerCase().replace(/[^a-z0-9_-]/g,"-").slice(0,40)}
function renderFeatures(){$("#featureGrid").innerHTML=features.map(f=>`<button class="feature-card" data-feature="${f[0]}"><span class="feature-icon">${f[1]}</span><b>${f[2]}</b><small>${f[3]}</small></button>`).join("");document.querySelectorAll("[data-feature]").forEach(b=>b.addEventListener("click",()=>openFeature(b.dataset.feature)))}
function setSync(ok,msg){$("#syncStatus").classList.toggle("online",ok);$("#syncStatus").innerHTML=`<i></i> ${msg}`}
function daysTogether(){const d=Math.max(0,Math.floor((new Date()-START_DATE)/86400000));$("#daysTogether").textContent=d.toLocaleString("id-ID")}
function init(){
 renderFeatures();daysTogether();setInterval(daysTogether,60000);
 $("#enterRoom").addEventListener("click",enterRoom);$("#roomCode").addEventListener("keydown",e=>{if(e.key==="Enter")enterRoom()});
 $("#closeModal").addEventListener("click",closeFeature);$("#featureModal").addEventListener("click",e=>{if(e.target.dataset.close)closeFeature()});
 $("#musicToggle").addEventListener("click",toggleMusic);$("#themeToggle").addEventListener("click",()=>document.body.classList.toggle("light"));
 $("#surpriseBtn").addEventListener("click",()=>openFeature(features[Math.floor(Math.random()*features.length)][0]));
 $("#messageForm").addEventListener("submit",sendMessage);
 $("#boot").classList.add("hidden");$("#roomGate").classList.remove("hidden");
}
async function enterRoom(){
 const code=safeKey($("#roomCode").value.trim());if(code.length<5){$("#gateError").textContent="Kode ruang minimal 5 karakter.";return}
 $("#gateError").textContent="";$("#enterRoom").disabled=true;$("#enterRoom").textContent="Menghubungkan...";
 state.room=code;
 const configured=firebaseConfig.apiKey!=="ISI_API_KEY" && firebaseConfig.projectId!=="ISI_PROJECT_ID";
 if(configured){
  try{
   if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
   await firebase.auth().signInAnonymously();state.user=firebase.auth().currentUser;state.db=firebase.database();state.roomRef=state.db.ref("rooms/"+code);state.isFirebase=true;
   await state.roomRef.child("meta/lastSeen").set(Date.now());listenShared();
   setSync(true,"Synced");
  }catch(err){console.error(err);setSync(false,"Offline");toast("Firebase belum tersambung: "+err.message);loadLocal()}
 }else{loadLocal();setSync(false,"Demo mode")}
 $("#roomGate").classList.add("hidden");$("#app").classList.remove("hidden");
}
function loadLocal(){state.shared=JSON.parse(localStorage.getItem("olc_"+state.room)||"{}");state.localMessages=state.shared.messages||[];renderMessages()}
function saveLocal(){localStorage.setItem("olc_"+state.room,JSON.stringify(state.shared))}
function listenShared(){
 state.roomRef.child("features").on("value",snap=>{state.shared.features=snap.val()||{};refreshOpenFeature()});
 state.roomRef.child("messages").limitToLast(30).on("value",snap=>{const val=snap.val()||{};state.localMessages=Object.values(val).sort((a,b)=>(a.time||0)-(b.time||0));renderMessages()});
}
function getFeatureData(id){return (state.shared.features||{})[id]||{}}
async function updateFeature(id,patch){
 const old=getFeatureData(id), next={...old,...patch,updatedAt:Date.now()};state.shared.features={...(state.shared.features||{}),[id]:next};
 if(state.isFirebase){try{await state.roomRef.child("features/"+id).update(next)}catch(e){toast("Gagal menyimpan: "+e.message)}}else saveLocal();
 refreshOpenFeature();
}
function renderMessages(){
 const list=$("#messageList");if(!state.localMessages.length){list.innerHTML='<p class="muted">Belum ada pesan. Mulai duluan, yuk.</p>';return}
 list.innerHTML=state.localMessages.slice(-20).reverse().map(m=>`<div class="message-item">${escapeHTML(m.text)}<small>${escapeHTML(m.from||"Seseorang")} · ${new Date(m.time||Date.now()).toLocaleString("id-ID")}</small></div>`).join("");
}
async function sendMessage(e){e.preventDefault();const text=$("#messageInput").value.trim();if(!text)return;const m={text,from:"Akbar / Deandra",time:Date.now()};if(state.isFirebase){await state.roomRef.child("messages").push(m)}else{state.localMessages.push(m);state.shared.messages=state.localMessages;saveLocal();renderMessages()}$("#messageInput").value=""}
function openFeature(id){state.currentFeature=id;$("#featureModal").classList.remove("hidden");renderFeature(id)}
function closeFeature(){stopCamera();$("#featureModal").classList.add("hidden");state.currentFeature=null}
function refreshOpenFeature(){if(state.currentFeature)renderFeature(state.currentFeature)}
function shell(id,body){const f=features.find(x=>x[0]===id);$("#modalContent").innerHTML=`<div class="modal-kicker">OUR LITTLE UNIVERSE / ${f[0].toUpperCase()}</div><h2 class="modal-title">${f[2]}</h2><p class="modal-desc">${descriptions[id]}</p><div class="feature-body">${body}</div>`}
function renderFeature(id){
 const d=getFeatureData(id);
 if(id==="constellation")return constellation(d);
 if(id==="capsule")return capsule(d);
 if(id==="destiny")return destiny(d);
 if(id==="aquarium")return aquarium(d);
 if(id==="mystery")return mystery(d);
 if(id==="photobooth")return photobooth();
 if(id==="heartbeat")return heartbeat();
 if(id==="solar")return solar(d);
 if(id==="distance")return distance(d);
 if(id==="future")return future();
 if(id==="gravity")return gravity();
 if(id==="pet")return pet(d);
 if(id==="puzzle")return puzzle();
 if(id==="frequency")return frequency();
 if(id==="nightsky")return nightSky(d);
}
function constellation(d){
 const items=d.items||[];shell("constellation",`<div class="canvas-box"><canvas id="constCanvas"></canvas></div><div class="action-row"><input id="starText" placeholder="Kenangan yang ingin disimpan..." maxlength="90"><button class="btn primary" id="addStar">Tambah bintang ✦</button></div><div id="starList" class="message-list"></div>`);
 const c=$("#constCanvas"),ctx=c.getContext("2d");c.width=700;c.height=260;ctx.fillStyle="#fff";items.forEach((it,i)=>{const x=70+(i*113)%560,y=40+(i*67)%180;ctx.beginPath();ctx.arc(x,y,3+(i%3),0,7);ctx.fill();ctx.fillStyle="#ff9bb5";ctx.fillText(it.text.slice(0,18),x+7,y-7);ctx.fillStyle="#fff"});
 $("#starList").innerHTML=items.map(x=>`<div class="message-item">✦ ${escapeHTML(x.text)}<small>${new Date(x.time).toLocaleDateString("id-ID")}</small></div>`).join("")||'<small class="muted">Belum ada bintang. Tambahkan kenangan pertama.</small>';
 $("#addStar").onclick=()=>{const text=$("#starText").value.trim();if(!text)return;updateFeature("constellation",{items:[...items,{text,time:Date.now()}]})};
}
function capsule(d){
 const locked=Date.now()<new Date("2027-01-01T00:00:00+07:00").getTime();shell("capsule",`<div class="big-message">${locked?"🔒":"💌"}<br>${locked?"A letter is waiting for 2027":"The capsule is ready to open"}</div>${d.note?`<p>${locked?"Pesan sudah ditulis. Isinya disembunyikan sampai 2027.":escapeHTML(d.note)}</p>`:`<textarea id="capsuleText" rows="4" placeholder="Tulis pesan untuk Akbar & Deandra di tahun 2027..."></textarea><div class="action-row"><button class="btn primary" id="saveCapsule">Segel kapsul ♥</button></div>`}<p class="tiny muted">Target buka: 1 Januari 2027. Penguncian ini berbasis tanggal di browser, bukan sistem keamanan.</p>`);
 if($("#saveCapsule"))$("#saveCapsule").onclick=()=>{const note=$("#capsuleText").value.trim();if(note)updateFeature("capsule",{note,createdAt:Date.now()})};
}
const story=[{q:"Suatu hari, kalian punya satu hari bebas. Mau ke mana?",a:["Ke pantai saat matahari terbenam","Jalan tanpa tujuan di kota baru"],n:[1,2]},{q:"Hujan turun saat perjalanan. Apa yang kalian lakukan?",a:["Cari tempat hangat dan ngobrol","Tetap lanjut, jadikan cerita"],n:[3,4]},{q:"Kalian menemukan toko kecil yang lucu.",a:["Beli benda kecil sebagai kenangan","Foto bersama di depan toko"],n:[4,3]},{q:"Malam tiba. Bagaimana menutup hari?",a:["Tulis surat untuk dibaca nanti","Buat janji petualangan berikutnya"],n:[5,6]},{q:"Satu hal yang paling penting?",a:["Selalu saling mendengar","Terus tumbuh bersama"],n:[5,6]},{q:"ENDING: Rumah adalah tempat kita saling pulang.",a:["Mainkan lagi"],n:[0]},{q:"ENDING: Cerita terbaik belum selesai ditulis.",a:["Mainkan lagi"],n:[0]}];
function destiny(d){const step=d.step||0,part=story[step];shell("destiny",`<div class="eyebrow">CHAPTER ${step+1} / 7</div><h3>${part.q}</h3><div class="choice-grid">${part.a.map((a,i)=>`<button class="choice" data-next="${part.n[i]}">${a}</button>`).join("")}</div><p class="tiny muted">Pilihan terakhir tersimpan dan terlihat di kedua HP.</p>`);document.querySelectorAll("[data-next]").forEach(b=>b.onclick=()=>updateFeature("destiny",{step:Number(b.dataset.next),lastChoice:b.textContent}))}
function aquarium(d){const fish=d.fish||[];shell("aquarium",`<div class="canvas-box" style="background:linear-gradient(#122b46,#0b1930 60%,#123d50)"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-around;font-size:30px">${fish.map((f,i)=>`<span style="animation:float ${2+i*.4}s infinite">${f.emoji}</span>`).join("")||"🫧"}</div><div style="position:absolute;bottom:12px;left:15px;color:#b6e8f5;font-size:10px">OUR DREAM AQUARIUM · ${fish.length} DREAMS</div></div><div class="action-row"><input id="dreamInput" placeholder="Mimpi yang ingin diwujudkan..." maxlength="65"><button class="btn primary" id="addFish">Tambahkan ikan 🐠</button></div><div class="message-list">${fish.map(f=>`<div class="message-item">${f.emoji} ${escapeHTML(f.text)}</div>`).join("")}</div>`);$("#addFish").onclick=()=>{const text=$("#dreamInput").value.trim();if(text)updateFeature("aquarium",{fish:[...fish,{text,emoji:["🐠","🐟","🐡","🪼"][fish.length%4]}]})}}
function mystery(d){const solved=!!d.solved;shell("mystery",`<div class="big-message">🕵️ CASE #0303<br><small style="font-size:12px;color:var(--muted)">“Aku selalu ada di antara kalian, tak terlihat tapi terasa. Aku tumbuh setiap kali kalian saling percaya.”</small></div><p class="muted">Petunjuk: jawabannya adalah sesuatu yang menjaga hubungan tetap kuat.</p>${solved?'<h3>Kasus terpecahkan! 🔓</h3><p>Jawabannya: KEPERCAYAAN. Good detective!</p>':`<input id="mysteryAnswer" placeholder="Masukkan jawaban..."><div class="action-row"><button class="btn primary" id="solveMystery">Periksa jawaban</button></div>`}`);if($("#solveMystery"))$("#solveMystery").onclick=()=>{const a=$("#mysteryAnswer").value.trim().toLowerCase();if(["kepercayaan","percaya","trust"].includes(a))updateFeature("mystery",{solved:true});else toast("Belum tepat. Coba pikirkan lagi ♥")}}
function photobooth(){shell("photobooth",`<video id="cameraView" autoplay playsinline class="photo-preview"></video><canvas id="photoCanvas" class="hidden"></canvas><div class="action-row"><button class="btn primary" id="startCamera">Aktifkan kamera</button><button class="pill" id="takePhoto">Ambil foto</button><button class="pill" id="savePhoto">Simpan foto</button></div><p class="tiny muted">Kamera meminta izin browser. Foto diproses di perangkat ini dan tidak diunggah ke Firebase.</p><img id="photoResult" class="photo-preview hidden" alt="Hasil foto">`);$("#startCamera").onclick=startCamera;$("#takePhoto").onclick=takePhoto;$("#savePhoto").onclick=savePhoto}
async function startCamera(){try{state.mediaStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});$("#cameraView").srcObject=state.mediaStream;toast("Kamera aktif!")}catch(e){toast("Kamera tidak bisa diakses. Izinkan permission browser.")}}
function takePhoto(){const v=$("#cameraView");if(!v.srcObject){toast("Aktifkan kamera dulu.");return}const c=$("#photoCanvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").translate(c.width,0);c.getContext("2d").scale(-1,1);c.getContext("2d").drawImage(v,0,0);$("#photoResult").src=c.toDataURL("image/png");$("#photoResult").classList.remove("hidden");toast("Foto berhasil diambil!")}
function savePhoto(){const src=$("#photoResult").src;if(!src){toast("Ambil foto dulu.");return}const a=document.createElement("a");a.href=src;a.download="akbar-deandra-photobooth.png";a.click()}
function stopCamera(){if(state.mediaStream){state.mediaStream.getTracks().forEach(t=>t.stop());state.mediaStream=null}}
function heartbeat(){shell("heartbeat",`<div class="big-message" id="pulseHeart" style="font-size:75px">♡</div><p class="muted" style="text-align:center">Tekan dan tahan tombol di bawah, rasakan animasi kecilnya.</p><div style="text-align:center"><button class="btn primary" id="pulseBtn">Hold to feel the beat</button></div><p id="pulseMessage" class="big-message" style="font-size:15px">“Jarak boleh jauh, rasa tetap dekat.”</p>`);const btn=$("#pulseBtn"),heart=$("#pulseHeart");let timer;btn.onpointerdown=()=>{heart.style.animation="pulse .65s infinite";timer=setInterval(()=>heart.textContent=heart.textContent==="♥"?"♡":"♥",330)};const stop=()=>{heart.style.animation="";clearInterval(timer)};btn.onpointerup=stop;btn.onpointerleave=stop}
function solar(d){const planets=d.planets||["Rumah impian","Liburan pertama","Masa depan bahagia"];shell("solar",`<div class="canvas-box"><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:36px">☀️</div>${planets.map((p,i)=>`<div style="position:absolute;left:${10+i*25}%;top:${25+(i%2)*45}%;font-size:22px" title="${escapeHTML(p)}">${["🪐","🌍","🌕","💫"][i%4]}</div>`).join("")}</div><div class="action-row"><input id="planetInput" placeholder="Nama impian baru..."><button class="btn primary" id="addPlanet">Tambah planet</button></div><div class="message-list">${planets.map(p=>`<div class="message-item">🪐 ${escapeHTML(p)}</div>`).join("")}</div>`);$("#addPlanet").onclick=()=>{const v=$("#planetInput").value.trim();if(v)updateFeature("solar",{planets:[...planets,v]})}}
function distance(d){shell("distance",`<div class="big-message">📍 AKBAR <span style="color:var(--muted)">· · · · ·</span> DEANDRA 📍</div><div class="canvas-box"><svg viewBox="0 0 600 260" width="100%" height="100%"><path d="M65 170 Q300 -20 535 170" stroke="#ff658c" stroke-width="2" stroke-dasharray="7 8" fill="none"/><circle cx="65" cy="170" r="9" fill="#ff658c"/><circle cx="535" cy="170" r="9" fill="#9b8cff"/><text x="65" y="200" fill="white" text-anchor="middle" font-size="13">AKBAR</text><text x="535" y="200" fill="white" text-anchor="middle" font-size="13">DEANDRA</text><text x="300" y="95" fill="#ffb0c5" text-anchor="middle" font-size="15">♡ ALWAYS CONNECTED ♡</text></svg></div><p class="muted">Isi kota asal dan destinasi impian kalian. Visual ini ilustrasi, bukan lokasi GPS.</p><div class="action-row"><input id="cityInput" placeholder="Kota / tempat impian..."><button class="btn primary" id="addCity">Simpan tujuan</button></div><div class="message-list">${(d.places||[]).map(p=>`<div class="message-item">✈️ ${escapeHTML(p)}</div>`).join("")}</div>`);$("#addCity").onclick=()=>{const v=$("#cityInput").value.trim();if(v)updateFeature("distance",{places:[...(d.places||[]),v]})}}
function future(){shell("future",`<div class="big-message">Dear Akbar,<br><br>Terima kasih sudah tetap memilih Deandra, bahkan di hari-hari yang tidak selalu mudah. Semoga saat kamu membaca ini, kalian sudah punya lebih banyak cerita, lebih banyak tawa, dan lebih banyak tempat untuk disebut rumah.<br><br>Jangan lupa: hal sederhana yang dilakukan dengan tulus sering menjadi kenangan paling besar.<br><br><span style="font-size:14px">— Akbar dari masa depan, 2030 ♥</span></div><div class="action-row"><button class="pill" id="futureAgain">Baca pesan lagi</button></div>`);$("#futureAgain").onclick=()=>toast("Pesan dari masa depan: tetap saling memilih ♥")}
function gravity(){shell("gravity",`<div class="canvas-box"><canvas id="gravityCanvas"></canvas></div><div class="action-row"><button class="btn primary" id="addGravity">Tambah bintang ✦</button><button class="pill" id="clearGravity">Reset universe</button></div><p class="tiny muted">Sentuh area atau tekan tombol untuk menambahkan bintang yang tertarik ke pusat.</p>`);const c=$("#gravityCanvas"),ctx=c.getContext("2d");c.width=700;c.height=260;let pts=Array.from({length:35},()=>({x:Math.random()*700,y:Math.random()*260}));function frame(){ctx.clearRect(0,0,700,260);pts.forEach(p=>{p.x+=(350-p.x)*.003;p.y+=(130-p.y)*.003;ctx.fillStyle="#ff8eae";ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,7);ctx.fill()});requestAnimationFrame(frame)}frame();$("#addGravity").onclick=()=>pts.push({x:Math.random()*700,y:Math.random()*260});c.onclick=e=>{const r=c.getBoundingClientRect();pts.push({x:(e.clientX-r.left)/r.width*700,y:(e.clientY-r.top)/r.height*260})};$("#clearGravity").onclick=()=>pts=[]}
function pet(d){const p={...state.pet,...d};shell("pet",`<div class="pet-stage"><div><div class="pet">${p.mood==="sleep"?"😴":"🐱"}</div><div class="pet-name">${escapeHTML(p.name)} · Level ${p.level}</div><small class="muted">XP ${p.xp}/100</small><div class="meter"><span style="width:${p.xp}%"></span></div></div></div><div class="action-row"><button class="pill" id="feedPet">🍓 Feed</button><button class="pill" id="playPet">🧶 Play</button><button class="pill" id="sleepPet">🌙 Sleep</button></div><p class="tiny muted">Aksi kalian tersinkron ke ruang bersama.</p>`);function act(mood){let xp=(p.xp||0)+25,level=p.level||1;if(xp>=100){xp=0;level++}updateFeature("pet",{name:p.name,level,xp,mood})}$("#feedPet").onclick=()=>act("happy");$("#playPet").onclick=()=>act("happy");$("#sleepPet").onclick=()=>updateFeature("pet",{...p,mood:"sleep"})}
function puzzle(){let symbols=["♥","☾","✦","∞","♥","☾","✦","∞"];if(!state.puzzleOrder.length)state.puzzleOrder=symbols.sort(()=>Math.random()-.5);shell("puzzle",`<p class="muted">Temukan 4 pasangan simbol yang sama.</p><div class="choice-grid" id="puzzleGrid">${state.puzzleOrder.map((s,i)=>`<button class="choice" data-card="${i}" style="height:65px;text-align:center;font-size:22px">?</button>`).join("")}</div><p id="puzzleScore" class="tiny muted">Langkah: ${state.puzzleMoves}</p><div class="action-row"><button class="pill" id="restartPuzzle">Acak ulang</button></div>`);let opened=[],matched=[];document.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>{const i=+b.dataset.card;if(opened.includes(i)||matched.includes(i))return;b.textContent=state.puzzleOrder[i];opened.push(i);if(opened.length===2){state.puzzleMoves++;setTimeout(()=>{const [a,c]=opened;if(state.puzzleOrder[a]===state.puzzleOrder[c])matched.push(a,c);else{document.querySelectorAll("[data-card]").forEach(x=>{if(opened.includes(+x.dataset.card))x.textContent="?"})}opened=[];$("#puzzleScore").textContent=`Langkah: ${state.puzzleMoves} · Pasangan: ${matched.length/2}/4`;if(matched.length===8)toast("Memory master! Kalian hebat ♥")},500)}});$("#restartPuzzle").onclick=()=>{state.puzzleOrder=[];state.puzzleMoves=0;puzzle()}}
function frequency(){shell("frequency",`<div class="frequency">${Array.from({length:25},()=>"<i></i>").join("")}</div><p style="text-align:center" class="muted">Mainkan nada rahasia satu per satu.</p><div class="action-row" style="justify-content:center"><button class="pill" data-tone="261.63">C</button><button class="pill" data-tone="329.63">E</button><button class="pill" data-tone="392">G</button><button class="pill" data-tone="523.25">C²</button></div><div class="big-message" id="frequencyMsg" style="font-size:14px">Dengarkan baik-baik...</div>`);document.querySelectorAll("[data-tone]").forEach(b=>b.onclick=()=>playTone(+b.dataset.tone))}
function playTone(freq){try{const A=window.AudioContext||window.webkitAudioContext;if(!state.audioCtx)state.audioCtx=new A();const o=state.audioCtx.createOscillator(),g=state.audioCtx.createGain();o.frequency.value=freq;o.type="sine";g.gain.setValueAtTime(.12,state.audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,state.audioCtx.currentTime+.6);o.connect(g);g.connect(state.audioCtx.destination);o.start();o.stop(state.audioCtx.currentTime+.6);$("#frequencyMsg").textContent="Secret frequency unlocked: love is our favorite sound ♥"}catch(e){toast("Audio tidak tersedia di browser ini.")}}
function nightSky(d){const stars=d.stars||[];shell("nightsky",`<div class="canvas-box"><canvas id="nightCanvas"></canvas></div><div class="action-row"><input id="starName" placeholder="Nama rasi bintang..."><button class="btn primary" id="addNightStar">Buat bintang</button></div><div class="message-list">${stars.map(s=>`<div class="message-item">✧ ${escapeHTML(s)}</div>`).join("")}</div>`);const c=$("#nightCanvas"),ctx=c.getContext("2d");c.width=700;c.height=260;for(let i=0;i<110;i++){ctx.fillStyle=`rgba(255,255,255,${Math.random()*.8+.2})`;ctx.beginPath();ctx.arc(Math.random()*700,Math.random()*260,Math.random()*1.8,0,7);ctx.fill()}stars.forEach((s,i)=>{ctx.fillStyle="#ff8eae";ctx.font="12px sans-serif";ctx.fillText("✦ "+s,20,25+i*22)});$("#addNightStar").onclick=()=>{const v=$("#starName").value.trim();if(v)updateFeature("nightsky",{stars:[...stars,v]})}}
function toggleMusic(){const a=$("#bgMusic");if(a.paused){a.play().then(()=>$("#musicToggle").textContent="Ⅱ").catch(()=>toast("Ketuk sekali lagi untuk mengizinkan musik."))}else{a.pause();$("#musicToggle").textContent="♫"}}
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopCamera()});
init();
