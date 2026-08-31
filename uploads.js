/* Les Maudits — client-side photo uploads.
   No backend exists, so images are stored in this browser's localStorage.
   That means: uploads are only visible on the device/browser that uploaded them,
   unless everyone is opening the site through the same synced browser profile. */

const LM_MAX_DIM = 900; // downscale uploads so localStorage doesn't fill up

function lmReadFileAsCompressedDataURL(file, callback){
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      let w = img.width, h = img.height;
      if (w > LM_MAX_DIM || h > LM_MAX_DIM){
        const scale = LM_MAX_DIM / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------------- Avatar upload (per student profile) ---------------- */

function loadAvatar(id){
  const saved = localStorage.getItem('lm_avatar_' + id);
  if (saved){
    const el = document.getElementById('avatar-img-' + id);
    if (el) el.src = saved;
  }
}

function handleAvatarUpload(event, id){
  const file = event.target.files[0];
  if (!file) return;
  lmReadFileAsCompressedDataURL(file, function(dataUrl){
    localStorage.setItem('lm_avatar_' + id, dataUrl);
    const el = document.getElementById('avatar-img-' + id);
    if (el) el.src = dataUrl;
  });
}

/* ---------------- Shared gallery ---------------- */

const LM_GALLERY_KEY = 'lm_gallery';
const LM_MEMBERS = ['William','Hopkins','JJ','Randy','Corneille','Val','Block'];

function lmGetGallery(){
  try {
    return JSON.parse(localStorage.getItem(LM_GALLERY_KEY)) || [];
  } catch(e){ return []; }
}

function lmSaveGallery(items){
  localStorage.setItem(LM_GALLERY_KEY, JSON.stringify(items));
}

function lmCurrentUploader(){
  return localStorage.getItem('lm_gallery_uploader') || 'William';
}

function lmSetUploader(name){
  localStorage.setItem('lm_gallery_uploader', name);
  renderUploaderTags();
  renderGallery();
}

function renderUploaderTags(){
  const row = document.getElementById('uploader-tag-row');
  if (!row) return;
  const current = lmCurrentUploader();
  row.innerHTML = LM_MEMBERS.map(function(name){
    const active = name === current ? ' active' : '';
    return '<button type="button" class="uploader-tag' + active + '" onclick="lmSetUploader(\'' + name + '\')">' + name + '</button>';
  }).join('');
}

function handleGalleryUpload(fileList){
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const uploader = lmCurrentUploader();
  let remaining = files.length;
  files.forEach(function(file){
    if (!file.type.startsWith('image/')) { remaining--; return; }
    lmReadFileAsCompressedDataURL(file, function(dataUrl){
      const items = lmGetGallery();
      items.unshift({
        img: dataUrl,
        uploader: uploader,
        ts: new Date().toISOString()
      });
      lmSaveGallery(items);
      remaining--;
      if (remaining <= 0) renderGallery();
    });
  });
}

function deleteGalleryItem(index){
  const items = lmGetGallery();
  items.splice(index, 1);
  lmSaveGallery(items);
  renderGallery();
}

function renderGallery(){
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  const items = lmGetGallery();
  if (!items.length){
    grid.innerHTML = '<div class="gallery-empty">No photos uploaded yet on this device. Be the first.</div>';
    return;
  }
  grid.innerHTML = items.map(function(item, i){
    const date = new Date(item.ts);
    const dateStr = isNaN(date) ? '' : date.toLocaleDateString();
    return '<div class="gallery-item">' +
      '<img src="' + item.img + '" alt="Uploaded by ' + item.uploader + '">' +
      '<div class="g-delete" onclick="deleteGalleryItem(' + i + ')">✕</div>' +
      '<div class="g-meta">' + item.uploader + ' · ' + dateStr + '</div>' +
      '</div>';
  }).join('');
}

function initGalleryPage(){
  renderUploaderTags();
  renderGallery();
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('gallery-file-input');
  if (!zone || !input) return;
  zone.addEventListener('click', function(){ input.click(); });
  input.addEventListener('change', function(){ handleGalleryUpload(input.files); input.value = ''; });
  ['dragenter','dragover'].forEach(function(evt){
    zone.addEventListener(evt, function(e){ e.preventDefault(); zone.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(function(evt){
    zone.addEventListener(evt, function(e){ e.preventDefault(); zone.classList.remove('dragover'); });
  });
  zone.addEventListener('drop', function(e){
    handleGalleryUpload(e.dataTransfer.files);
  });
}
