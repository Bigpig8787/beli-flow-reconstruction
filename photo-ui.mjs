// HTML renderers for the photo journal. Pure string builders from state.
import { restaurants } from './catalog.mjs';
import { people, skins, petStage, areFriends, demoDay } from './social.mjs';
import { placeCoords, visiblePhotos, petMemories, validPhotoSrc } from './photos.mjs';

export const food = { 早餐: '🥐', 麵食: '🍜', 鍋物: '🍲', 咖啡: '☕', 甜點: '🍮', 飲品: '🍵' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = stamp => stamp ? stamp.slice(5, 10).replace('-', '/') + ' ' + stamp.slice(11, 16) : '';
const names = ids => ids.map(id => id === 'you' ? '你' : people[id]).join('、');
const skinIcon = id => skins.find(item => item.id === id)?.icon ?? '';

export function petOverlay(pet, handle = '') {
  if (!pet) return '';
  return `<span class="photo-pet" ${handle} style="--x:${(pet.x * 100).toFixed(1)}%;--y:${(pet.y * 100).toFixed(1)}%;--s:${pet.scale}">`
    + `${pet.stage}<i>${skinIcon(pet.skin)}</i></span>`;
}

export function photoImage(src, place, alt) {
  if (validPhotoSrc(src) && src.startsWith('data:')) return `<img src="${src}" alt="${esc(alt)}">`;
  const p = restaurants.get(src?.slice(4)) ?? place;
  return `<div class="photo-art art-${p.price}" role="img" aria-label="${esc(alt)}"><span>${food[p.cuisine] ?? '🍽'}</span></div>`;
}

export function photoFrame(p, handle = '') {
  const place = restaurants.get(p.place);
  return `<div class="photo-frame">${photoImage(p.src, place, place.name + '的用餐照片')}${petOverlay(p.pet, handle)}</div>`;
}

export function photoCard(s, p) {
  const place = restaurants.get(p.place);
  const mine = p.actor === s.actor;
  const want = p.reactions.filter(r => r.kind === 'want');
  const together = p.reactions.filter(r => r.kind === 'together');
  const iWant = want.some(r => r.actor === s.actor);
  const myInvite = together.find(r => r.actor === s.actor);
  const summary = [want.length ? names(want.map(r => r.actor)) + ' 想吃' : '', together.length ? names(together.map(r => r.actor)) + ' 想約一起去' : ''].filter(Boolean).join(' · ');
  const actions = mine
    ? `${p.pet ? `<button type="button" data-photo-export="${esc(p.id)}">⇪ 分享合照圖片</button>` : ''}<button type="button" class="quiet" data-photo-delete="${esc(p.id)}">刪除</button>`
    : `<button type="button" class="react${iWant ? ' on' : ''}" aria-pressed="${iWant}" data-photo-react="want" data-id="${esc(p.id)}">${iWant ? '♥ 想吃' : '♡ 想吃'}</button>`
      + (myInvite ? `<button type="button" class="react on" data-page="gatherings">✓ 已約 · 看回覆</button>`
        : `<button type="button" class="react" data-photo-react="together" data-id="${esc(p.id)}">🍽 下次一起</button>`);
  return `<article class="photo-card" id="photo-${esc(p.id)}"><header><span class="avatar">${(mine ? '你' : people[p.actor]).slice(0, 1)}</span>`
    + `<div><strong>${mine ? '你' : people[p.actor]}</strong><small>${when(p.takenAt)}${p.with.length ? ' · 和 ' + names(p.with) : ''}</small></div>`
    + `${mine ? `<span class="demo-badge">${p.audience === 'friends' ? '好友可見' : '只有我'}</span>` : ''}</header>`
    + photoFrame(p)
    + `<div class="photo-body"><button type="button" class="text-button" data-detail="${place.id}"><h3>${esc(place.name)} ↗</h3></button>`
    + `<p class="muted">${place.district} · ${place.cuisine} · ${'＄'.repeat(place.price)}${p.pet ? ' · 糰子入鏡' : ''}</p>`
    + (p.caption ? `<p>${esc(p.caption)}</p>` : '')
    + (summary ? `<p class="reaction-summary">${esc(summary)}</p>` : '')
    + `<div class="photo-actions">${actions}</div></div></article>`;
}

export function invitesPanel(s) {
  const today = demoDay(s);
  const invites = s.events.filter(e => e.invited.includes(s.actor) && e.date.slice(0, 10) >= today);
  const mineSent = s.events.filter(e => e.host === s.actor && e.photo && e.date.slice(0, 10) >= today);
  if (!invites.length && !mineSent.length) return '';
  return `<section class="invite-strip"><h3>約飯</h3>`
    + invites.map(e => `<div class="invite-item"><p><strong>${people[e.host]}</strong> 約你 ${esc(e.date.replace('T', ' '))} 一起去 <strong>${esc(restaurants.get(e.place).name)}</strong></p>`
      + `<button type="button" class="primary" data-social="joinEvent" data-id="${esc(e.id)}">我要去</button></div>`).join('')
    + mineSent.map(e => `<div class="invite-item"><p>你約了 ${names(e.invited.length ? e.invited : e.members.filter(id => id !== s.actor))} 去 <strong>${esc(restaurants.get(e.place).name)}</strong> · ${e.members.length} 人已確認</p>`
      + `<button type="button" data-page="gatherings">看聚餐</button></div>`).join('')
    + `</section>`;
}

export function hasFriends(s) {
  return Object.keys(people).some(id => id !== s.actor && areFriends(s, s.actor, id));
}

export function activityPage(s, toolbar) {
  const friends = visiblePhotos(s, 'friends');
  const mine = visiblePhotos(s, 'mine');
  return `<div class="page-heading"><div><p class="eyebrow">YOUR DAILY BITES</p><h2 id="view-title">朋友最近吃了什麼？</h2></div></div>`
    + toolbar + invitesPanel(s)
    + `<button type="button" class="record-cta" data-page="record"><span aria-hidden="true">📸</span><span><strong>記下這一餐</strong><small>從相簿選照片，自動帶入日期與附近店家</small></span></button>`
    + (hasFriends(s)
      ? (friends.length ? friends.slice(0, 8).map(p => photoCard(s, p)).join('')
        : '<p class="empty-state">朋友還沒分享照片。先記下你的這一餐，他們會看到。</p>')
      : `<section class="diary-intro"><h3>還沒有朋友加入也沒關係</h3><p>這裡會先當作你的美食日記：每張照片都記得時間、店家和一起吃的人。</p><button type="button" data-page="community">邀請朋友</button></section>`)
    + `<div class="section-heading"><h3>我的美食日記</h3><button type="button" data-page="review">回顧 ↗</button></div>`
    + (mine.length ? mine.slice(0, 3).map(p => photoCard(s, p)).join('') : '<p class="empty-state">第一張照片，就從今天這一餐開始。</p>');
}

// ---------- Record ----------
export function recordPage(s, drafts) {
  const pet = s.pets[s.actor];
  const friendIds = Object.keys(people).filter(id => id !== s.actor && areFriends(s, s.actor, id));
  const options = [...restaurants.values()];
  const card = (d, i) => {
    const place = restaurants.get(d.place);
    const petNow = d.petOn ? { ...d.pet, stage: petStage(pet.xp).icon, skin: pet.skin } : null;
    return `<section class="draft-card" data-draft="${i}" aria-label="第 ${i + 1} 張照片">`
      + `<div class="photo-frame editable" data-pet-frame="${i}">${photoImage(d.src, place ?? restaurants.get(d.src.slice(4)) ?? { price: 2, cuisine: '' }, '待發布的照片')}${petOverlay(petNow, `data-pet-handle="${i}" role="slider" tabindex="0" aria-label="拖曳調整糰子位置，可用方向鍵微調" aria-valuetext="水平 ${Math.round(d.pet.x * 100)}%，垂直 ${Math.round(d.pet.y * 100)}%"`)}</div>`
      + `<div class="draft-fields">`
      + `<label>拍攝時間<input type="datetime-local" data-draft-field="takenAt" value="${esc(d.takenAt)}"><small class="muted">${d.dateSource === 'exif' ? '已從照片帶入' : '照片沒有拍攝時間，先用檔案時間，可修改'}</small></label>`
      + `<fieldset><legend>在哪裡吃的？</legend>`
      + (d.candidates.length
        ? `<p class="muted">依照片位置，可能是：</p><div class="candidates">${d.candidates.map(c => `<button type="button" data-draft-place="${c.place.id}" aria-pressed="${d.place === c.place.id}">📍 ${esc(c.place.name)}<small>${c.km < 1 ? Math.round(c.km * 1000) + ' m' : c.km.toFixed(1) + ' km'}</small></button>`).join('')}</div>`
        : `<p class="muted">${d.hadGps ? '附近沒有收錄的店家，' : '照片沒有位置資訊，'}請手動選擇。</p>`)
      + `<select data-draft-field="place" aria-label="手動選擇店家"><option value="">${d.candidates.length ? '都不是？手動選擇' : '選擇店家'}</option>${options.map(o => `<option value="${o.id}"${d.place === o.id ? ' selected' : ''}>${esc(o.name)} · ${o.district}</option>`).join('')}</select></fieldset>`
      + `<label>說點什麼<textarea data-draft-field="caption" maxlength="140" rows="2" placeholder="這一餐最想記住的是？">${esc(d.caption)}</textarea></label>`
      + (friendIds.length ? `<fieldset><legend>和誰一起</legend><div class="chip-checks">${friendIds.map(id => `<label><input type="checkbox" data-draft-with="${id}"${d.with.includes(id) ? ' checked' : ''}> ${people[id]}</label>`).join('')}</div></fieldset>` : '')
      + `<fieldset><legend>分享給</legend><div class="chip-checks">`
      + `<label><input type="radio" name="audience-${i}" value="friends" data-draft-field="audience"${d.audience === 'friends' ? ' checked' : ''}> 好友</label>`
      + `<label><input type="radio" name="audience-${i}" value="private" data-draft-field="audience"${d.audience === 'private' ? ' checked' : ''}> 只有我（日記）</label></div></fieldset>`
      + `<label class="pet-toggle"><input type="checkbox" data-draft-field="petOn"${d.petOn ? ' checked' : ''}> 讓 ${petStage(pet.xp).icon} 糰子入鏡</label>`
      + (d.petOn ? `<label>糰子大小<input type="range" min="10" max="60" value="${Math.round(d.pet.scale * 100)}" data-draft-field="petScale"></label><p class="muted">在照片上拖曳糰子，放到食物旁邊。</p>` : '')
      + `<button type="button" class="quiet" data-draft-remove="${i}">移除這張</button></div></section>`;
  };
  const ready = drafts.filter(d => d.place).length;
  return `<p class="eyebrow">RECORD A MEAL</p><h2 id="view-title">記下這一餐</h2>`
    + `<p class="muted">選照片後會帶入拍攝時間；照片有位置資訊時，推薦附近店家讓你確認。</p>`
    + `<label class="upload-zone"><input type="file" id="photo-input" accept="image/*" multiple><span aria-hidden="true">🖼</span><strong>從相簿選照片</strong><small>一次最多 6 張</small></label>`
    + `<button type="button" class="text-button sample-link" data-record-sample>沒有照片？用示範照片試試</button>`
    + `<p class="privacy-note">🔒 位置只用來推薦店家，不會儲存或分享；朋友只看得到你選的店名。</p>`
    + drafts.map(card).join('')
    + (drafts.length ? `<div class="publish-bar"><span>${ready}/${drafts.length} 張已選店家</span><button type="button" class="primary" data-record-publish${ready === drafts.length ? '' : ' disabled'}>發布 ${drafts.length} 張</button></div>` : '')
    + `<p class="muted record-alt">只想幫餐廳評分排名？<button type="button" class="text-button" data-page="search">找店評價 ↗</button></p>`;
}

// ---------- Review ----------
export function reviewPage(s) {
  const mine = visiblePhotos(s, 'mine');
  const month = demoDay(s).slice(0, 7);
  const memories = petMemories(s, s.actor);
  const places = new Set(mine.map(p => p.place));
  const top = memories.friends[0];
  const groups = new Map();
  for (const p of mine) {
    const key = p.takenAt.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const pet = s.pets[s.actor];
  return `<p class="eyebrow">LOOK BACK</p><h2 id="view-title">吃過的，都記得。</h2>`
    + `<div class="review-stats"><div><strong>${mine.length}</strong>餐</div><div><strong>${mine.filter(p => p.takenAt.startsWith(month)).length}</strong>本月</div>`
    + `<div><strong>${places.size}</strong>家店</div><div><strong>${top ? esc(top.name) : '—'}</strong>最常一起吃</div></div>`
    + `<section class="pet-memory"><span class="pet-memory-icon" aria-hidden="true">${petStage(pet.xp).icon}<i>${skinIcon(pet.skin)}</i></span><div><h3>糰子的餐桌回憶</h3>`
    + `<p>入鏡 <strong>${memories.photos.length}</strong> 次${memories.friends.length ? ' · ' + memories.friends.map(f => `和 ${esc(f.name)} 吃過 ${f.count} 次`).join('、') : ''}</p>`
    + `<button type="button" data-page="pets">照顧糰子 ↗</button></div></section>`
    + (mine.length ? [...groups].map(([key, items]) => `<h3 class="month-title">${key.slice(0, 4)} 年 ${Number(key.slice(5))} 月 · ${items.length} 餐</h3><div class="photo-grid">`
      + items.map(p => { const place = restaurants.get(p.place); return `<button type="button" class="photo-tile" data-detail="${place.id}" aria-label="${esc(place.name)} ${when(p.takenAt)}">${photoFrame(p)}<span>${esc(place.name)}<small>${when(p.takenAt).slice(0, 5)}</small></span></button>`; }).join('')
      + '</div>').join('')
      : '<p class="empty-state">還沒有紀錄。按下方「＋記錄」開始你的美食日記。</p>');
}

// ---------- Photo map ----------
export function photoMapPage(s, scope, focus) {
  const photos = visiblePhotos(s, scope);
  const coords = [...placeCoords.values()];
  const lat = coords.map(c => c.lat), lng = coords.map(c => c.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lat), Math.max(...lat), Math.min(...lng), Math.max(...lng)];
  const byPlace = new Map();
  for (const p of photos) byPlace.set(p.place, [...(byPlace.get(p.place) ?? []), p]);
  const pins = [...byPlace].map(([id, items]) => {
    const c = placeCoords.get(id), place = restaurants.get(id);
    const x = 8 + (c.lng - minLng) / (maxLng - minLng) * 84, y = 10 + (maxLat - c.lat) / (maxLat - minLat) * 80;
    return `<button type="button" class="photo-pin${focus === id ? ' active' : ''}" style="--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%" data-map-place="${id}" aria-label="${esc(place.name)}，${items.length} 張照片">`
      + `<span>${food[place.cuisine]}</span>${items.length > 1 ? `<b>${items.length}</b>` : ''}</button>`;
  }).join('');
  const list = focus && byPlace.has(focus) ? byPlace.get(focus) : photos;
  return `<p class="eyebrow">PHOTO MAP</p><h2 id="view-title">照片地圖</h2>`
    + `<div class="switcher" role="group" aria-label="照片範圍"><button type="button" data-map-scope="mine" aria-pressed="${scope === 'mine'}">我的</button><button type="button" data-map-scope="friends" aria-pressed="${scope === 'friends'}">朋友的</button></div>`
    + `<div class="photo-map" aria-label="照片地圖，示範位置"><svg aria-hidden="true" viewBox="0 0 480 300" preserveAspectRatio="none"><path d="M0 190Q150 230 260 160T480 190" fill="none" stroke="#c5dcdf" stroke-width="26"/><path d="M150 0v300M330 0v300M0 95h480M0 240h480M80 0v150M410 120v180" fill="none" stroke="#fff" stroke-width="9"/><rect x="175" y="18" width="110" height="46" rx="8" fill="#d3e0bc"/></svg>`
    + `<div class="map-labels"><span>北巷</span><span>中街</span><span>南埕</span></div>${pins}<span class="map-note">示範位置 · 台中市區</span></div>`
    + `<div class="section-heading"><h3>${focus && byPlace.has(focus) ? esc(restaurants.get(focus).name) : scope === 'mine' ? '我拍過的' : '朋友拍過的'} · ${list.length} 張</h3>`
    + `${focus ? '<button type="button" data-map-place="">顯示全部</button>' : ''}</div>`
    + (list.length ? list.map(p => photoCard(s, p)).join('')
      : `<p class="empty-state">${scope === 'mine' ? '還沒有照片。記下一餐，它就會出現在地圖上。' : hasFriends(s) ? '朋友還沒分享照片。' : '加入好友後，就能看到朋友吃過的地方。'}</p>`)
    + `<p class="muted record-alt">想找真實店家？<button type="button" class="text-button" data-page="explore">開啟 Google 地圖 ↗</button></p>`;
}
