/* Les Maudits — shared photo uploads powered by Supabase Storage. */
const LM_BUCKET = 'les-maudits';
const LM_MAX_DIM = 1600;
const lmSupabase = window.lmSupabase;
async function lmCurrentUploader(){ const {data:{session}}=await lmSupabase.auth.getSession(); return lmMemberFromUser(session&&session.user); }

function lmCompressImage(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader(); reader.onerror=reject;
    reader.onload=e=>{
      const img=new Image(); img.onerror=reject;
      img.onload=()=>{
        let w=img.width,h=img.height;
        if(Math.max(w,h)>LM_MAX_DIM){const s=LM_MAX_DIM/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
        const c=document.createElement('canvas'); c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
        c.toBlob(blob=>blob?resolve(blob):reject(new Error('Compression failed')),'image/jpeg',0.82);
      }; img.src=e.target.result;
    }; reader.readAsDataURL(file);
  });
}

function lmSafeName(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
async function handleGalleryUpload(fileList){
  const files=Array.from(fileList||[]).filter(f=>f.type.startsWith('image/')); if(!files.length)return;
  const zone=document.getElementById('upload-zone'); const old=zone&&zone.querySelector('h3')?.textContent;
  if(zone&&zone.querySelector('h3')) zone.querySelector('h3').textContent='Uploading…';
  try{
    for(const file of files){
      const blob=await lmCompressImage(file);
      const uploader=await lmCurrentUploader();
      if(!uploader) throw new Error('You must be logged in to upload.');
      const path='gallery/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'__'+lmSafeName(uploader)+'.jpg';
      const {error}=await lmSupabase.storage.from(LM_BUCKET).upload(path,blob,{contentType:'image/jpeg',upsert:false});
      if(error) throw error;
    }
    await renderGallery();
  }catch(err){ alert('Upload failed: '+(err.message||err)); }
  finally{ if(zone&&zone.querySelector('h3')) zone.querySelector('h3').textContent=old||'Drop photos here, or click to choose'; }
}

async function renderGallery(){
  const grid=document.getElementById('gallery-grid'); if(!grid)return;
  grid.innerHTML='<div class="gallery-empty">Loading shared archive…</div>';
  const {data,error}=await lmSupabase.storage.from(LM_BUCKET).list('gallery',{limit:100,sortBy:{column:'created_at',order:'desc'}});
  if(error){
    grid.innerHTML='<div class="gallery-empty"><strong>Gallery needs one final Supabase permission.</strong><br>Uploads are connected, but listing photos requires a SELECT policy for this bucket.</div>';
    return;
  }
  const items=(data||[]).filter(x=>x.name&&!x.name.endsWith('/'));
  if(!items.length){grid.innerHTML='<div class="gallery-empty">No shared photos yet. Be the first.</div>';return;}
  grid.innerHTML=items.map(item=>{
    const url=lmSupabase.storage.from(LM_BUCKET).getPublicUrl('gallery/'+item.name).data.publicUrl;
    const bits=item.name.split('__'); const uploader=bits[1]?bits[1].replace(/\.jpg$/,'').replace(/-/g,' '):'Maudit';
    const label=uploader.replace(/\b\w/g,c=>c.toUpperCase());
    const d=item.created_at?new Date(item.created_at).toLocaleDateString():'';
    return '<div class="gallery-item"><img src="'+url+'" alt="Les Maudits gallery photo" loading="lazy"><div class="g-meta">'+label+' · '+d+'</div></div>';
  }).join('');
}

/* Profile avatars remain browser-local for now; shared avatars will be added after member authentication. */
function lmReadFileAsCompressedDataURL(file,callback){const r=new FileReader();r.onload=e=>{const i=new Image();i.onload=()=>{let w=i.width,h=i.height;if(Math.max(w,h)>900){const s=900/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(i,0,0,w,h);callback(c.toDataURL('image/jpeg',.82));};i.src=e.target.result;};r.readAsDataURL(file);}
function loadAvatar(id){const saved=localStorage.getItem('lm_avatar_'+id);if(saved){const el=document.getElementById('avatar-img-'+id);if(el)el.src=saved;}}
function handleAvatarUpload(event,id){const f=event.target.files[0];if(!f)return;lmReadFileAsCompressedDataURL(f,data=>{localStorage.setItem('lm_avatar_'+id,data);const el=document.getElementById('avatar-img-'+id);if(el)el.src=data;});}

function initGalleryPage(){
  renderGallery();
  lmCurrentUploader().then(name=>{const el=document.getElementById('upload-identity');if(el)el.innerHTML='<strong>UPLOADING AS:</strong> '+(name||'Not signed in');});
  const zone=document.getElementById('upload-zone'),input=document.getElementById('gallery-file-input'); if(!zone||!input)return;
  zone.addEventListener('click',()=>input.click());
  input.addEventListener('change',async()=>{await handleGalleryUpload(input.files);input.value='';});
  ['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('dragover');}));
  ['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('dragover');}));
  zone.addEventListener('drop',e=>handleGalleryUpload(e.dataTransfer.files));
}
