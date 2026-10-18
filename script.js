import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  off,
  set,
  remove
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";
import { firebaseConfig } from "./config.js";

(() => {
  "use strict";
  const MAX_PHOTOS = 3;
  const MAX_PHOTO_BYTES = 300 * 1024;
  const MAX_IMAGE_DIMENSION = 1200;
  const quotes = [
    {text:"Great things are done by a series of small things brought together.",author:"Vincent van Gogh"},
    {text:"It always seems impossible until it's done.",author:"Often attributed to Nelson Mandela"},
    {text:"Believe you can and you're halfway there.",author:"Theodore Roosevelt"},
    {text:"Act as if what you do makes a difference. It does.",author:"William James"},
    {text:"The secret of getting ahead is getting started.",author:"Often attributed to Mark Twain"},
    {text:"You are never too old to set another goal or to dream a new dream.",author:"C. S. Lewis"},
    {text:"No act of kindness, no matter how small, is ever wasted.",author:"Aesop"},
    {text:"It is never too late to be what you might have been.",author:"Often attributed to George Eliot"},
    {text:"Start where you are. Use what you have. Do what you can.",author:"Arthur Ashe"},
    {text:"The journey of a thousand miles begins with one step.",author:"Lao Tzu"},
    {text:"Nothing diminishes anxiety faster than action.",author:"Walter Anderson"},
    {text:"How we spend our days is, of course, how we spend our lives.",author:"Annie Dillard"},
    {text:"Almost everything will work again if you unplug it for a few minutes, including you.",author:"Anne Lamott"},
    {text:"Nothing is worth more than this day.",author:"Johann Wolfgang von Goethe"},
    {text:"With the new day comes new strength and new thoughts.",author:"Eleanor Roosevelt"},
    {text:"The only impossible journey is the one you never begin.",author:"Tony Robbins"},
    {text:"Do what you can, with what you have, where you are.",author:"Theodore Roosevelt"},
    {text:"The best way out is always through.",author:"Robert Frost"},
    {text:"Keep some room in your heart for the unimaginable.",author:"Mary Oliver"},
    {text:"Nothing can dim the light that shines from within.",author:"Often attributed to Maya Angelou"},
    {text:"Try to be a rainbow in someone's cloud.",author:"Maya Angelou"},
    {text:"You don't have to be perfect to be amazing.",author:"Unknown"},
    {text:"Your direction is more important than your speed.",author:"Unknown"},
    {text:"A little progress each day adds up to big results.",author:"Unknown"},
    {text:"One day or day one. You decide.",author:"Unknown"},
    {text:"The secret of life is to fall seven times and to get up eight times.",author:"Often attributed to Paulo Coelho"},
    {text:"It is during our darkest moments that we must focus to see the light.",author:"Aristotle"},
    {text:"You are enough just as you are.",author:"Meghan Markle"},
    {text:"Nothing can bring you peace but yourself.",author:"Ralph Waldo Emerson"},
    {text:"The future depends on what you do today.",author:"Mahatma Gandhi"}
  ];
  const prompts = [
    "What made today meaningful?","What did I learn about myself today?","What challenged me, and how did I respond?",
    "What am I grateful for?","What small win should I celebrate?","What would I like my future self to remember?",
    "What do I want to do differently tomorrow?","When did I feel most like myself today?",
    "What did I notice today that I might usually overlook?","What can I let go of before tomorrow?"
  ];
  const $ = id => document.getElementById(id);
  const els = {
    headerDate:$("headerDate"), userEmail:$("userEmail"), signInBtn:$("signInBtn"), signOutBtn:$("signOutBtn"),
    authPanel:$("authPanel"), authForm:$("authForm"), authEmail:$("authEmail"), authPassword:$("authPassword"),
    authMessage:$("authMessage"), signInSubmit:$("signInSubmit"), signUpSubmit:$("signUpSubmit"),
    quoteDay:$("quoteDay"), quoteText:$("quoteText"), quoteAuthor:$("quoteAuthor"), saveQuoteBtn:$("saveQuoteBtn"),
    entryDatePill:$("entryDatePill"), promptText:$("promptText"), newPromptBtn:$("newPromptBtn"), entryText:$("entryText"),
    wordCount:$("wordCount"), wordProgress:$("wordProgress"), goalMessage:$("goalMessage"), photoInput:$("photoInput"),
    photoGrid:$("photoGrid"), photoCaption:$("photoCaption"), saveEntryBtn:$("saveEntryBtn"), saveStatus:$("saveStatus"),
    streakCount:$("streakCount"), weekRow:$("weekRow"), totalEntries:$("totalEntries"), totalWords:$("totalWords"),
    exportBtn:$("exportBtn"), journalList:$("journalList"), searchEntries:$("searchEntries"), sortEntries:$("sortEntries"),
    memoryGallery:$("memoryGallery"), themeToggle:$("themeToggle"), toast:$("toast"), entryDialog:$("entryDialog"),
    dialogClose:$("dialogClose"), dialogDate:$("dialogDate"), dialogTitle:$("dialogTitle"), dialogPhotos:$("dialogPhotos"),
    dialogCaption:$("dialogCaption"), dialogBody:$("dialogBody"), editEntryBtn:$("editEntryBtn"),
    deleteEntryBtn:$("deleteEntryBtn"), clearDataBtn:$("clearDataBtn")
  };
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);
  let user = null, entries = {}, savedQuotes = [], draftPhotos = [];
  let editingDate = todayKey(), dialogDateKey = null, promptIndex = dailyIndex(prompts.length, "prompt");
  let entryRef = null, quoteRef = null, activeView = "today", baseUpdatedAt = null, isSaving = false;

  function todayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }
  function parseDate(key) { const [y,m,d]=key.split("-").map(Number); return new Date(y,m-1,d); }
  function dailyIndex(length,salt="") {
    const s=todayKey()+salt; let hash=0;
    for (const c of s) hash=(hash*31+c.charCodeAt(0))|0;
    return Math.abs(hash)%length;
  }
  function formatDate(key, options={weekday:"long",month:"long",day:"numeric",year:"numeric"}) {
    return parseDate(key).toLocaleDateString(undefined,options);
  }
  function wordCount(text) { const t=(text||"").trim(); return t ? t.split(/\s+/).length : 0; }
  function escapeHTML(value="") {
    return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function showToast(message) {
    els.toast.textContent=message; els.toast.classList.add("show");
    window.clearTimeout(showToast.timer); showToast.timer=window.setTimeout(()=>els.toast.classList.remove("show"),3200);
  }
  function authMessage(message, error=false) {
    els.authMessage.textContent=message;
    els.authMessage.style.color=error ? "#a33b32" : "var(--muted)";
  }
  function currentQuote() { return quotes[dailyIndex(quotes.length,"quote")]; }
  function renderQuote() {
    const q=currentQuote();
    els.quoteText.textContent=q.text; els.quoteAuthor.textContent="— "+q.author;
    els.quoteDay.textContent=formatDate(todayKey(),{month:"short",day:"numeric"}).toUpperCase();
    const saved=savedQuotes.some(x=>x.text===q.text);
    els.saveQuoteBtn.textContent=saved ? "♥ Saved quote" : "♡ Save quote";
  }
  function renderHeader() {
    els.headerDate.textContent=formatDate(todayKey(),{weekday:"short",month:"short",day:"numeric"});
    els.entryDatePill.textContent=formatDate(editingDate,{month:"short",day:"numeric",year:"numeric"});
    els.promptText.textContent=prompts[promptIndex];
  }
  function setSignedInState(signedIn) {
    document.body.classList.toggle("signed-out",!signedIn);
    els.authPanel.hidden=signedIn;
    els.signInBtn.hidden=signedIn;
    els.signOutBtn.hidden=!signedIn;
    els.userEmail.textContent=signedIn ? user.email : "Not signed in";
    document.querySelectorAll(".nav-link").forEach(b=>b.disabled=!signedIn);
  }
  function requireUser() {
    if (!user) { showToast("Please sign in to use your private journal."); return false; }
    return true;
  }
  function subscribeUserData() {
    if (entryRef) off(entryRef);
    if (quoteRef) off(quoteRef);
    entries={}; savedQuotes=[];
    entryRef=ref(db, `users/${user.uid}/entries`);
    quoteRef=ref(db, `users/${user.uid}/savedQuotes`);
    onValue(entryRef, snap=>{
      entries=snap.val() || {};
      if (!entries || typeof entries!=="object") entries={};
      if (!isSaving) loadEditorDate(editingDate in entries ? editingDate : todayKey(), false);
      renderAll();
      els.saveStatus.textContent="Synced with your private journal ✓";
    }, err=>{ console.error(err); showToast("Could not load journal. Check your connection and database rules."); });
    onValue(quoteRef,snap=>{ savedQuotes=Array.isArray(snap.val()) ? snap.val().filter(Boolean) : Object.values(snap.val()||{}); renderQuote(); },
      err=>{console.error(err); showToast("Could not load saved quotes.");});
  }
  function loadEditorDate(key, showMessage=true) {
    editingDate=key;
    const e=entries[key] || {};
    els.entryText.value=e.text || "";
    els.photoCaption.value=e.caption || "";
    draftPhotos=(e.photos || []).map(p=>({...p}));
    baseUpdatedAt=e.updatedAt || null;
    renderDraftPhotos(); updateWordCount(); renderHeader();
    els.saveEntryBtn.innerHTML=(key===todayKey() ? "Save today's entry" : "Save edited entry")+' <span>↗</span>';
    els.saveStatus.textContent=e.updatedAt ? "Entry loaded from cloud." : "New entry — not saved yet.";
    if (showMessage) showToast(`Loaded ${formatDate(key,{month:"short",day:"numeric",year:"numeric"})}.`);
  }
  function updateWordCount() {
    const count=wordCount(els.entryText.value);
    els.wordCount.textContent=count;
    els.wordProgress.style.width=`${Math.min(count/150,1)*100}%`;
    els.goalMessage.textContent=count<100 ? (count===0 ? "A few words can open the door." : `${100-count} more ${100-count===1?"word":"words"} to reach your goal.`) :
      count<=150 ? "Daily goal reached. You showed up for yourself ✦" : "You've written beyond your goal. Keep going if it feels good.";
  }
  function renderDraftPhotos() {
    els.photoGrid.innerHTML="";
    if (!draftPhotos.length) { els.photoGrid.innerHTML='<div class="empty-photos">＋ Your photos will appear here</div>'; return; }
    draftPhotos.forEach((photo,index)=>{
      const item=document.createElement("div"); item.className="photo-item";
      const img=document.createElement("img"); img.src=photo.data; img.alt=photo.name || `Journal photo ${index+1}`;
      const remove=document.createElement("button"); remove.className="remove-photo"; remove.type="button"; remove.textContent="×"; remove.setAttribute("aria-label","Remove photo");
      remove.addEventListener("click",()=>{draftPhotos.splice(index,1);renderDraftPhotos();});
      item.append(img,remove); els.photoGrid.append(item);
    });
  }
  async function compressImage(file) {
    const source=await new Promise((resolve,reject)=>{
      const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error("Could not read image."));
      reader.readAsDataURL(file);
    });
    const img=await new Promise((resolve,reject)=>{
      const image=new Image(); image.onload=()=>resolve(image); image.onerror=()=>reject(new Error("This image could not be opened."));
      image.src=source;
    });
    const scale=Math.min(1,MAX_IMAGE_DIMENSION/Math.max(img.width,img.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext("2d"); ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let quality=.82, data=canvas.toDataURL("image/jpeg",quality);
    while (data.length*0.75>MAX_PHOTO_BYTES && quality>.35) { quality-=.08; data=canvas.toDataURL("image/jpeg",quality); }
    if (data.length*0.75>MAX_PHOTO_BYTES) throw new Error("Image is still too large after compression. Choose a smaller photo.");
    return {name:file.name,data};
  }
  async function handlePhotoUpload(event) {
    const files=Array.from(event.target.files||[]); event.target.value="";
    for (const file of files) {
      if (!file.type.startsWith("image/")) {showToast(`${file.name} is not an image.`);continue;}
      if (draftPhotos.length>=MAX_PHOTOS) {showToast(`You can add up to ${MAX_PHOTOS} photos per entry.`);break;}
      try { draftPhotos.push(await compressImage(file)); renderDraftPhotos(); }
      catch(e) {showToast(e.message || `Could not process ${file.name}.`);}
    }
  }
  async function saveEntry() {
    if (!requireUser() || isSaving) return;
    const text=els.entryText.value.trim(), caption=els.photoCaption.value.trim();
    if (!text && !caption && !draftPhotos.length) {showToast("Write a few words or add a photo before saving.");els.entryText.focus();return;}
    const existing=entries[editingDate] || {};
    if ((existing.updatedAt || null)!==baseUpdatedAt) {
      const proceed=window.confirm("This entry changed in the database since you loaded it (possibly on another device). Save your version anyway and replace the newer version?");
      if (!proceed) {loadEditorDate(editingDate);return;}
    }
    const payload={text,caption,photos:draftPhotos,updatedAt:Date.now(),createdAt:existing.createdAt||Date.now()};
    isSaving=true; els.saveEntryBtn.disabled=true; els.saveStatus.textContent="Saving securely…";
    try {
      await set(ref(db, `users/${user.uid}/entries/${editingDate}`), payload);
      entries[editingDate]=payload; baseUpdatedAt=payload.updatedAt;
      els.saveStatus.textContent="Saved and synced ✓"; renderAll(); showToast("Your memory has been saved ✦");
    } catch(e) { console.error(e); els.saveStatus.textContent="Save failed — check your connection."; showToast("Could not save. Check your connection and Firebase database rules."); }
    finally {isSaving=false;els.saveEntryBtn.disabled=false;}
  }
  function validEntry(e) { return e && (e.text || e.caption || (e.photos && e.photos.length)); }
  function sortedKeys() {
    return Object.keys(entries).filter(k=>validEntry(entries[k])).sort((a,b)=>els.sortEntries.value==="oldest"?a.localeCompare(b):b.localeCompare(a));
  }
  function entryTitle(e) {
    const first=(e.text||"").trim().split(/\n/).find(x=>x.trim()) || e.caption || "A little moment";
    return first.length>58 ? first.slice(0,55)+"…" : first;
  }
  function renderJournal() {
    if (!user) return;
    const query=els.searchEntries.value.trim().toLowerCase();
    const keys=sortedKeys().filter(k=>!query || [entries[k].text,entries[k].caption,formatDate(k)].join(" ").toLowerCase().includes(query));
    els.journalList.innerHTML="";
    if (!keys.length) {els.journalList.innerHTML=`<div class="empty-state"><strong>${query?"No matching entries":"Your story starts here."}</strong>${query?"Try another word or date.":"Write your first 100–150 words on the Today page."}</div>`;return;}
    keys.forEach(key=>{
      const e=entries[key], d=parseDate(key), row=document.createElement("article"); row.className="entry-row"; row.tabIndex=0; row.setAttribute("role","button");
      row.setAttribute("aria-label","Open entry from "+formatDate(key));
      row.innerHTML=`<div class="entry-date-block"><strong>${d.getDate()}</strong><span>${d.toLocaleDateString(undefined,{month:"short"})}</span></div><div class="entry-summary"><h3>${escapeHTML(entryTitle(e))}</h3><p>${escapeHTML((e.text||e.caption||"A photo memory saved for this day.").replace(/\s+/g," "))}</p></div><div class="entry-meta">${wordCount(e.text)} words${e.photos?.length?" · 📷 "+e.photos.length:""}</div>`;
      row.addEventListener("click",()=>openEntry(key)); row.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();openEntry(key);}});
      els.journalList.append(row);
    });
  }
  function renderMemories() {
    if (!user) return;
    els.memoryGallery.innerHTML="";
    const memories=sortedKeys().flatMap(key=>(entries[key].photos||[]).map((photo,index)=>({key,photo,index,entry:entries[key]})));
    if (!memories.length) {els.memoryGallery.innerHTML='<div class="empty-state" style="grid-column:1/-1"><strong>Your memory garden is waiting.</strong>Add a photo to a journal entry, and it will bloom here.</div>';return;}
    memories.forEach(({key,photo,index,entry})=>{
      const card=document.createElement("article"); card.className="memory-card";
      const img=document.createElement("img"); img.src=photo.data; img.alt=photo.name||"Journal memory"; img.loading="lazy";
      const info=document.createElement("div"); info.className="memory-info";
      info.innerHTML=`<small>${escapeHTML(formatDate(key,{month:"short",day:"numeric",year:"numeric"}).toUpperCase())}</small><h3>${escapeHTML(entryTitle(entry))}</h3><p>${escapeHTML(entry.caption||"A moment worth remembering")}</p>`;
      card.append(img,info); card.addEventListener("click",()=>openEntry(key)); els.memoryGallery.append(card);
    });
  }
  function openEntry(key) {
    const e=entries[key]; if(!e)return; dialogDateKey=key;
    els.dialogDate.textContent=formatDate(key).toUpperCase(); els.dialogTitle.textContent=entryTitle(e);
    els.dialogCaption.textContent=e.caption||""; els.dialogBody.textContent=e.text||"No written entry for this memory.";
    els.dialogPhotos.innerHTML="";
    (e.photos||[]).forEach(p=>{const img=document.createElement("img");img.src=p.data;img.alt=p.name||"Journal photo";els.dialogPhotos.append(img);});
    els.editEntryBtn.textContent="Edit this entry"; els.entryDialog.showModal();
  }
  function renderStats() {
    const keys=Object.keys(entries).filter(k=>validEntry(entries[k])).sort();
    els.totalEntries.textContent=keys.length;
    els.totalWords.textContent=keys.reduce((n,k)=>n+wordCount(entries[k].text),0).toLocaleString();
    const set=new Set(keys); let cursor=parseDate(todayKey()); if(!set.has(todayKey()))cursor.setDate(cursor.getDate()-1);
    let streak=0;while(set.has(todayKey(cursor))){streak++;cursor.setDate(cursor.getDate()-1);}
    els.streakCount.textContent=streak;
  }
  function renderWeek() {
    els.weekRow.innerHTML=""; const now=new Date(), monday=new Date(now); monday.setDate(now.getDate()-((now.getDay()+6)%7));
    const labels=["M","T","W","T","F","S","S"];
    for(let i=0;i<7;i++){const day=new Date(monday);day.setDate(monday.getDate()+i);const key=todayKey(day),done=validEntry(entries[key]);const el=document.createElement("div");el.className="week-day"+(done?" done":"")+(key===todayKey()?" today":"");el.innerHTML=`<span>${labels[i]}</span><span>${done?"✓":day.getDate()}</span>`;els.weekRow.append(el);}
  }
  function renderAll(){renderQuote();renderStats();renderWeek();renderJournal();renderMemories();}
  async function saveCurrentQuote() {
    if(!requireUser())return;
    const q=currentQuote(), i=savedQuotes.findIndex(x=>x.text===q.text);
    if(i>=0)savedQuotes.splice(i,1);else savedQuotes.push({...q,savedAt:todayKey()});
    try {await set(ref(db, `users/${user.uid}/savedQuotes`), savedQuotes);renderQuote();showToast(i>=0?"Removed from saved quotes.":"Quote saved for another day ✦");}
    catch(e){console.error(e);showToast("Could not update saved quotes.");}
  }
  function exportJournal() {
    if(!requireUser())return;
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),note:"Private Dear Tomorrow backup. Photo data is included; keep this file secure.",entries,savedQuotes},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`dear-tomorrow-journal-${todayKey()}.json`;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("Journal backup downloaded.");
  }
  async function clearData() {
    if(!requireUser())return;
    if(!window.confirm("Permanently delete ALL your journal entries, photos and saved quotes from Firebase? Export a backup first. This cannot be undone."))return;
    try {await remove(ref(db, `users/${user.uid}`));entries={};savedQuotes=[];loadEditorDate(todayKey(),false);renderAll();showToast("Your cloud journal data has been deleted.");}
    catch(e){console.error(e);showToast("Could not delete data. Check your connection.");}
  }
  function navigate(view) {
    activeView=view;
    document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active",s.id===`view-${view}`));
    $("hero").style.display=view==="today"?"":"none";
    if(view==="journal")renderJournal(); if(view==="memories")renderMemories();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function friendlyAuthError(error) {
    const code=error?.code||"";
    const messages={
      "auth/email-already-in-use":"That email already has an account. Try signing in.",
      "auth/invalid-email":"Enter a valid email address.",
      "auth/weak-password":"Choose a password with at least 6 characters.",
      "auth/user-not-found":"No account found for that email. Create an account first.",
      "auth/wrong-password":"That password doesn't match. Try again.",
      "auth/invalid-credential":"Email or password is incorrect.",
      "auth/too-many-requests":"Too many attempts. Wait a little and try again.",
      "auth/network-request-failed":"Network error. Check your internet connection.",
      "auth/operation-not-allowed":"Email/password sign-in is not enabled in Firebase Authentication."
    };
    return messages[code] || error?.message || "Something went wrong. Please try again.";
  }
  async function signIn(event) {
    event?.preventDefault();
    if(!firebaseConfig.apiKey || String(firebaseConfig.apiKey).startsWith("PASTE_")) {
      authMessage("First add your real Firebase values to config.js, then reload.",true); return;
    }
    try {await signInWithEmailAndPassword(auth, els.authEmail.value.trim(), els.authPassword.value);}
    catch(e){authMessage(friendlyAuthError(e),true);}
  }
  async function signUp() {
    if(!firebaseConfig.apiKey || String(firebaseConfig.apiKey).startsWith("PASTE_")) {authMessage("First add your real Firebase values to config.js, then reload.",true);return;}
    try {await createUserWithEmailAndPassword(auth, els.authEmail.value.trim(), els.authPassword.value);}
    catch(e){authMessage(friendlyAuthError(e),true);}
  }
  function initFirebase() {
    if (!firebaseConfig.apiKey || String(firebaseConfig.apiKey).startsWith("PASTE_")) {
      setSignedInState(false);
      authMessage("Configure Firebase in config.js to enable private cloud syncing.", true);
      return;
    }
    onAuthStateChanged(auth, nextUser => {
      user = nextUser;
      if (user) {
        setSignedInState(true);
        authMessage("Signed in. Your journal is private to this account.");
        subscribeUserData();
      } else {
        if (entryRef) off(entryRef);
        if (quoteRef) off(quoteRef);
        entries = {};
        savedQuotes = [];
        setSignedInState(false);
        renderQuote();
        authMessage("Sign in or create an account to begin.");
      }
    });
  }

  document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
  els.entryText.addEventListener("input",updateWordCount);
  els.photoInput.addEventListener("change",handlePhotoUpload);
  els.saveEntryBtn.addEventListener("click",saveEntry);
  els.newPromptBtn.addEventListener("click",()=>{promptIndex=(promptIndex+1)%prompts.length;els.promptText.textContent=prompts[promptIndex];});
  els.saveQuoteBtn.addEventListener("click",saveCurrentQuote);
  els.exportBtn.addEventListener("click",exportJournal);
  els.searchEntries.addEventListener("input",renderJournal);
  els.sortEntries.addEventListener("change",renderJournal);
  els.themeToggle.addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("dearTomorrow.dark",document.body.classList.contains("dark"));els.themeToggle.textContent=document.body.classList.contains("dark")?"☀":"☾";});
  if(localStorage.getItem("dearTomorrow.dark")==="true"){document.body.classList.add("dark");els.themeToggle.textContent="☀";}
  els.dialogClose.addEventListener("click",()=>els.entryDialog.close());
  els.entryDialog.addEventListener("click",e=>{if(e.target===els.entryDialog)els.entryDialog.close();});
  els.editEntryBtn.addEventListener("click",()=>{if(!dialogDateKey)return;els.entryDialog.close();loadEditorDate(dialogDateKey);navigate("today");els.entryText.focus();});
  els.deleteEntryBtn.addEventListener("click",async()=>{
    if(!requireUser()||!dialogDateKey||!confirm(`Delete the entry from ${formatDate(dialogDateKey)} and its photos? This cannot be undone.`))return;
    try {await remove(ref(db, `users/${user.uid}/entries/${dialogDateKey}`));delete entries[dialogDateKey];els.entryDialog.close();renderAll();showToast("Entry deleted.");}
    catch(e){console.error(e);showToast("Could not delete entry. Check your connection.");}
  });
  els.clearDataBtn.addEventListener("click",clearData);
  els.signInBtn.addEventListener("click",()=>{els.authPanel.hidden=false;els.authEmail.focus();});
  els.signOutBtn.addEventListener("click",async()=>{try{await signOut(auth);showToast("Signed out.");}catch(e){showToast("Could not sign out.");}});
  els.authForm.addEventListener("submit",signIn);
  els.signUpSubmit.addEventListener("click",signUp);
  renderHeader();renderQuote();updateWordCount();initFirebase();
})();