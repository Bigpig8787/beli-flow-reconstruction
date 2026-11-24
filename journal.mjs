import { findPlaces, googleExploreEmbedUrl, mapSearchLinks } from './maps.mjs';
import { groupMeals, localDate, mealDateFromPhotos, mealPhotoLimit, monthDates, sampleMeals, shiftDay } from './journal-data.mjs';
import { mealCard, preparePhoto, sharePhoto } from './journal-media.mjs';
import { qrcode } from './vendor/qrcode.mjs';

const view = document.querySelector('#view');
const status = document.querySelector('#status');
const login = document.querySelector('#login');
const detail = document.querySelector('#meal-detail');
const detailBody = document.querySelector('#detail-body');
const pages = ['feed', 'friends', 'record', 'explore', 'profile'];
const friendCode = /^[a-f0-9]{12}$/;
const coverFields = 'id,owner,restaurant,caption,eaten_on,eaten_time,created_at,photo,place_id';
const sample = sampleMeals();
const config = await fetch('./journal-config.json', { cache: 'no-store' }).then(response => response.json()).catch(() => ({}));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let client;
let session;
let diner;
let friends = [];
let feed = [];
let personal = [];
let found;
let saving = false;
let updating = 0;
let authenticating = 0;
let draft = {};
let month = localDate().slice(0, 7);
const url = new URL(location.href);
const invite = url.searchParams.get('invite') || sessionStorage.getItem('fomery-invite');
const entry = friendCode.test(invite || '') ? invite : '';
if (entry) sessionStorage.setItem('fomery-invite', entry);
const base = new URL('./', url);
let searchCode = entry;
let page = entry ? 'friends' : 'feed';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const title = (text, actions = '') => '<div class="view-heading"><h2 id="view-title" tabindex="-1">' + text + '</h2>' + actions + '</div>';
const checked = ({ data, error }) => { if (error) throw error; return data; };

function notice(message = '', error = false) {
  status.hidden = !message;
  status.textContent = message;
  status.classList.toggle('error', error);
}

function nameFor(id) {
  if (id === diner?.id) return diner.nickname;
  return friends.find(row => row.sender === id || row.recipient === id)
    ?.other?.nickname ?? id;
}

function photo(meal, label, className = '', lazy = false) {
  const src = meal.id.startsWith('sample-') || /^data:image\/jpeg;base64,[a-z0-9+/]+={0,2}$/i.test(meal.photo)
    ? meal.photo : '';
  return '<img class="' + className + '" src="' + escape(src) + '" alt="' + escape(label) + '"' + (lazy ? ' loading="lazy"' : '') + '>';
}

function tile(meal) {
  return '<button class="tile" type="button" data-meal="' + escape(meal.id) + '">' + photo(meal, '', '', true)
    + '<strong>' + escape(meal.restaurant) + '</strong>' + (meal.caption ? '<small>' + escape(meal.caption) + '</small>' : '') + '</button>';
}

function feedPage() {
  const meals = diner ? feed : sample.filter(meal => meal.owner !== '你');
  const rows = [...groupMeals(meals, 'owner')].map(([owner, items]) => {
    const row = escape(nameFor(owner));
    const arrows = items.length > 2 ? '<div class="feed-arrows"><button type="button" data-shift-row="-1" aria-label="較新的餐" disabled>‹</button><button type="button" data-shift-row="1" aria-label="較早的餐">›</button></div>' : '';
    return `<section class="friend-row" aria-label="${row} 的近況"><header><h3>${row}</h3>${arrows}</header><div class="tile-grid">${items.map(tile).join('')}</div></section>`;
  });
  const action = diner ? '<button type="button" data-refresh>更新</button>' : '<small>示範餐照</small>';
  return title('朋友近況', action) + (rows.length ? rows.join('') : '<p>好友最近七天還沒有貼文。</p><button type="button" data-page="friends">去加好友</button>');
}

function profilePage() {
  const meals = diner ? personal : sample.filter(meal => meal.owner === '你');
  const { blanks, days } = monthDates(month);
  const byDay = groupMeals(meals, 'eaten_on');
  const today = localDate();
  const cells = Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = month + '-' + String(day).padStart(2, '0');
    const daily = byDay.get(date) || [];
    const classes = 'day' + (daily.length > 1 ? ' double' : '') + (date === today ? ' today' : '');
    const number = '<span class="day-number">' + day + '</span>';
    if (!daily.length) return '<div class="' + classes + '">' + number + '</div>';
    return '<button type="button" class="' + classes + '" data-day="' + date + '" aria-label="' + date + '，' + daily.length + ' 餐">'
      + number + daily.slice(0, 2).map(meal => photo(meal, '', '', true)).join('')
      + (daily.length > 2 ? '<span class="day-more">＋' + (daily.length - 2) + '</span>' : '') + '</button>';
  });
  const weekdays = [...'一二三四五六日'].map(day => '<span class="day-label">' + day + '</span>').join('');
  const account = diner ? '<p class="muted">' + escape(diner.nickname) + '</p>' : '';
  const dark = document.documentElement.dataset.theme === 'dark';
  const appearance = `<div class="appearance-switch" role="group" aria-label="外觀">
    <button type="button" data-theme="light" aria-pressed="${!dark}">淺色</button>
    <button type="button" data-theme="dark" aria-pressed="${dark}">深色</button>
  </div>`;
  const refreshButton = diner ? '<button type="button" data-refresh>更新</button>' : '';
  return title('個人', '<div class="profile-actions">' + appearance + refreshButton + '</div>') + account
    + '<section class="month" aria-label="用餐月曆"><header class="month-header">'
    + '<button type="button" data-month="-1" aria-label="上個月">‹</button><h3>' + month.replace('-', ' 年 ') + ' 月</h3>'
    + '<button type="button" data-month="1" aria-label="下個月">›</button></header>'
    + '<div class="calendar">' + weekdays + '<span aria-hidden="true"></span>'.repeat(blanks) + cells.join('') + '</div></section>'
    + (diner ? '<button type="button" data-sign-out>登出</button>' : '<p class="muted">登入後，用這張月曆回看自己的餐照。</p>');
}

function person(row) {
  const outgoing = row.sender === diner.id;
  const action = row.accepted ? '移除' : outgoing ? '撤回' : '拒絕';
  const key = row.sender + '/' + row.recipient;
  const receive = !row.accepted && !outgoing ? '<button type="button" class="primary" data-accept="' + key + '">接受</button>' : '';
  return '<div class="person"><div><strong>' + escape(row.other.nickname) + '</strong><br><small>'
    + (row.accepted ? row.other.friend_id : outgoing ? '等待對方接受' : '好友申請') + '</small></div><div class="controls">'
    + receive + '<button type="button" data-remove="' + key + '">' + action + '</button></div></div>';
}

function inviteLink() {
  const link = new URL(base);
  link.searchParams.set('invite', diner.friend_id);
  return link.href;
}

function friendsPage() {
  if (!diner) {
    const names = [...groupMeals(sample.filter(meal => meal.owner !== '你'), 'owner').keys()];
    return title('好友', '<small>示範好友</small>')
      + '<p>登入後可用好友 ID、邀請連結或 QR Code 加好友。</p>'
      + '<div class="panel"><h3>我的好友</h3>'
      + names.map(name => '<div class="person"><strong>' + escape(name) + '</strong></div>').join('') + '</div>';
  }
  const qr = qrcode(0, 'M');
  qr.addData(inviteLink(), 'Byte');
  qr.make();
  const pending = friends.filter(row => !row.accepted);
  const accepted = friends.filter(row => row.accepted);
  const thisPair = found && friends.some(row => row.other.id === found.id);
  const send = found && found.id !== diner.id && !thisPair
    ? '<button type="button" class="primary" data-request>送出好友申請</button>' : '';
  return title('好友', '<button type="button" data-refresh>更新</button>')
    + '<div class="panel"><strong>我的好友 ID</strong> <code>' + escape(diner.friend_id) + '</code>'
    + '<div class="controls"><button type="button" data-copy-id>複製 ID</button><button type="button" data-share>分享邀請連結</button></div>'
    + '<details class="qr"><summary>邀請 QR Code</summary><img alt="掃描 QR Code 開啟好友邀請" src="' + qr.createDataURL(4, 16) + '"></details></div>'
    + '<form class="fields panel" data-find><label>加好友<input name="code" inputmode="text" maxlength="12" required placeholder="輸入好友 ID" value="' + escape(searchCode) + '"></label>'
    + '<div><button type="submit">找好友</button></div></form>'
    + (found ? '<div class="person panel"><strong>' + escape(found.nickname) + '</strong>' + send + '</div>' : '')
    + (pending.length ? '<div class="panel"><h3>好友申請</h3>' + pending.map(person).join('') + '</div>' : '')
    + '<div class="panel"><h3>我的好友</h3>' + (accepted.length ? accepted.map(person).join('') : '<p class="muted">還沒有好友。</p>') + '</div>';
}

function photoStrip() {
  const photos = draft.photos || [];
  return photos.map((item, index) => `<figure class="draft-tile">
    <img src="${item.src}" alt="第 ${index + 1} 張餐照">
    <button type="button" class="drop-photo" data-drop-photo="${index}" aria-label="移除第 ${index + 1} 張照片">×</button>
    ${index === 0 ? '<figcaption>首圖</figcaption>' : ''}
    ${item.original ? `<button type="button" class="save-photo" data-save-photo="${index}">儲存原圖</button>` : ''}
  </figure>`).join('');
}

function dateHint() {
  if (draft.dateEdited || !draft.photos?.length) return '';
  if (draft.dateReason === 'mixed') return '餐照拍攝日期不同，請選用餐日期。';
  if (draft.dateReason === 'missing') return '找不到可用的拍攝日期，請選用餐日期。';
  return '已帶入拍攝日期，可自行修改。';
}

function selectedPlace() {
  const place = draft.place;
  return place ? `<div class="chosen-place">
    <div><strong>${escape(place.displayName)}</strong><small>${escape(place.formattedAddress)}</small></div>
    <button type="button" data-clear-place aria-label="清除連結店家">×</button>
    <span class="map-attribution" translate="no">Google Maps</span>
  </div>` : '';
}

function recordPage() {
  return title('記錄一餐') + `<form class="fields" data-record ${saving ? 'inert' : ''}>
    <section class="photo-picker" aria-label="餐照">
      <header><strong>餐照</strong><small data-photo-count>${draft.photos?.length || 0} / ${mealPhotoLimit}</small></header>
      <div class="photo-strip" data-preview>${photoStrip()}</div>
      <div class="photo-inputs">
        <input type="file" accept="image/*" name="photo" multiple hidden>
        <input type="file" accept="image/*" name="camera" capture="environment" hidden>
        <button type="button" data-select-photo="photo" ${draft.reading ? 'disabled' : ''}>從相簿選</button>
        <button type="button" data-select-photo="camera" aria-label="拍照" ${draft.reading ? 'disabled' : ''}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h4l2-3h6l2 3h4v14H3z"/><circle cx="12" cy="13" r="4"/></svg></button>
      </div>
    </section>
    <div class="place-entry">
      <label>用餐店家<input name="restaurant" maxlength="100" required placeholder="輸入店名" value="${escape(draft.restaurant)}"></label>
      ${config.mapsKey ? '<button type="button" data-place-search>找店</button>' : ''}
    </div>
    <div data-chosen-place ${draft.place ? '' : 'hidden'}>${selectedPlace()}</div>
    <div data-place-results hidden></div>
    <label>心得（選填）<textarea name="caption" rows="3" maxlength="280" placeholder="這餐吃起來怎樣？當時是什麼心情？">${escape(draft.caption)}</textarea></label>
    <div class="meal-date">
      <label>用餐日期<input type="date" name="eaten_on" max="${localDate()}" required aria-describedby="date-hint" value="${escape(draft.eaten_on)}"></label>
      <label>時間（選填）<input type="time" name="eaten_time" value="${escape(draft.eaten_time)}"></label>
    </div>
    <small id="date-hint" aria-live="polite" ${dateHint() ? '' : 'hidden'}>${dateHint()}</small>
    <div class="controls"><button type="submit" class="primary" ${diner && !draft.reading ? '' : 'disabled'}>發布給好友</button>
    ${diner ? '' : '<small>登入後可發布餐照。</small>'}</div></form>`;
}

function explorePage() {
  return title('探索')
    + '<form class="fields" data-explore><label>找店<input name="query" required maxlength="180" placeholder="輸入店名、地址或地區"></label>'
    + '<div><button type="submit" class="primary">' + (config.mapsKey ? '找店' : '在 Google 地圖找店 ↗') + '</button></div>'
    + '<div data-place-results hidden></div></form>'
    + '<iframe class="explore-map" title="地圖" loading="lazy" referrerpolicy="no-referrer" src="' + escape(googleExploreEmbedUrl) + '"></iframe>';
}

async function mealCovers(owner, activePage, first, end) {
  const rows = [];
  const batch = 100;
  for (let start = 0; ; start += batch) {
    let query = client.from('meals').select(coverFields).gte('eaten_on', first).lte('eaten_on', end);
    query = activePage === 'feed' ? query.neq('owner', owner) : query.eq('owner', owner);
    const chunk = checked(await query.order('eaten_on', { ascending: false })
      .order('eaten_time', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
      .order('id').range(start, start + batch - 1));
    rows.push(...chunk);
    if (chunk.length < batch) return [...new Map(rows.map(meal => [meal.id, meal])).values()];
  }
}

function render(focus = false) {
  login.hidden = !!session || !client;
  for (const button of document.querySelectorAll('nav button')) {
    if (button.dataset.page === page) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  view.ariaBusy = 'false';
  if (session && !diner) {
    view.innerHTML = title('建立個人資料') + '<form data-profile class="fields"><label>顯示暱稱<input name="nickname" maxlength="32" required autocomplete="nickname"></label><div><button type="submit" class="primary">繼續</button></div></form>';
  } else {
    view.innerHTML = { feed: feedPage, friends: friendsPage, record: recordPage, explore: explorePage, profile: profilePage }[page]();
  }
  if (focus) view.querySelector('h2').focus();
}

async function refresh() {
  const turn = ++updating;
  if (!diner) return;
  const owner = diner.id;
  const activePage = page;
  if (activePage === 'friends' || activePage === 'feed') {
    const [rows, meals] = await Promise.all([
      client.from('friend_requests').select('*,sender_info:diners!friend_requests_sender_fkey(*),recipient_info:diners!friend_requests_recipient_fkey(*)'),
      activePage === 'feed' ? mealCovers(owner, 'feed', shiftDay(localDate(), -6), localDate()) : [],
    ]);
    if (updating !== turn) return;
    friends = checked(rows).map(row => ({ ...row, other: row.sender === owner ? row.recipient_info : row.sender_info }));
    if (activePage === 'feed') feed = meals;
  }
  if (activePage === 'profile') {
    const { first, next } = monthDates(month);
    const result = await mealCovers(owner, 'profile', first, shiftDay(next, -1));
    if (updating === turn) personal = result;
  }
  return updating === turn && ['feed', 'friends', 'profile'].includes(activePage);
}

async function find(code) {
  searchCode = code.trim().toLowerCase();
  if (!friendCode.test(searchCode)) {
    found = undefined;
    render();
    return notice('請輸入 12 碼好友 ID。', true);
  }
  const result = checked(await client.rpc('find_diner', { code: searchCode }).maybeSingle());
  if (page !== 'friends' || !diner) return;
  found = result;
  if (!found) notice('找不到這個好友 ID。', true);
  render();
}

async function openInvite() {
  if (!diner || !entry || page !== 'friends' || !sessionStorage.getItem('fomery-invite')) return;
  await find(entry);
  sessionStorage.removeItem('fomery-invite');
  history.replaceState(null, '', base);
}

async function initialize(nextSession) {
  const turn = ++authenticating;
  ++updating;
  session = nextSession;
  diner = undefined;
  friends = [];
  feed = [];
  personal = [];
  found = undefined;
  draft = {};
  if (detail.open) detail.close();
  detailBody.replaceChildren();
  if (session) {
    const profile = await client.from('diners').select('*').eq('id', session.user.id).maybeSingle();
    if (turn !== authenticating) return;
    diner = checked(profile);
    await refresh();
    if (turn !== authenticating) return;
    await openInvite();
  }
  render();
}

function paintRecordPhotos(scroll = false) {
  const form = view.querySelector('[data-record]');
  const photos = draft.photos || [];
  if (!draft.dateEdited) {
    const { day, time, reason } = mealDateFromPhotos(photos);
    draft.eaten_on = day;
    if (!draft.timeEdited) draft.eaten_time = time;
    draft.dateReason = reason;
  }
  if (!form) return;
  const strip = form.querySelector('[data-preview]');
  strip.innerHTML = photoStrip();
  if (scroll) strip.scrollLeft = strip.scrollWidth;
  form.querySelector('[data-photo-count]').textContent = `${photos.length} / ${mealPhotoLimit}`;
  form.querySelector('#date-hint').textContent = dateHint();
  form.querySelector('#date-hint').hidden = !dateHint();
  form.elements.eaten_on.value = draft.eaten_on || '';
  form.elements.eaten_time.value = draft.eaten_time || '';
  for (const button of form.querySelectorAll('[data-select-photo], [data-drop-photo]')) button.disabled = !!draft.reading || saving;
  form.querySelector('[type="submit"]').disabled = !diner || !!draft.reading || saving;
}

function galleryImages(meal, photos, offset = 0) {
  return photos.map((src, index) => `<figure>${photo({ ...meal, photo: src }, `餐照 ${offset + index + 1}`, 'detail-photo', index > 0 || offset > 0)}</figure>`).join('');
}

function showGalleryCount(track) {
  const total = track.children.length;
  const index = Math.max(0, Math.min(total - 1, Math.round(track.scrollLeft / track.clientWidth) || 0));
  const controls = track.nextElementSibling;
  controls.hidden = total < 2;
  const caption = `${index + 1} / ${total}`;
  if (controls.querySelector('output').textContent !== caption) controls.querySelector('output').textContent = caption;
  controls.querySelector('[data-slide="-1"]').disabled = index === 0;
  controls.querySelector('[data-slide="1"]').disabled = index === total - 1;
}

function mealDetails(meal) {
  const own = meal.owner === (diner?.id ?? '你');
  const photos = [meal.photo, ...(meal.extra_photos || [])];
  return `<article class="meal-story" data-meal-story="${escape(meal.id)}">
    <div class="gallery-track" aria-label="這餐的照片">${galleryImages(meal, photos)}</div>
    <div class="gallery-controls" ${photos.length > 1 ? '' : 'hidden'}>
      <button type="button" data-slide="-1" aria-label="上一張">‹</button><output aria-live="polite"></output><button type="button" data-slide="1" aria-label="下一張">›</button>
    </div>
    <header class="meal-story-heading"><h3>${escape(meal.restaurant)}</h3><small>${escape(nameFor(meal.owner))} · ${escape(meal.eaten_on)}${meal.eaten_time ? ' · ' + escape(meal.eaten_time.slice(0, 5)) : ''}</small></header>
    ${meal.caption ? `<p class="meal-caption">${escape(meal.caption)}</p>` : ''}
    ${meal.place_id ? `<a class="meal-map" target="_blank" rel="noopener noreferrer" href="${escape(mapSearchLinks(meal.restaurant, meal.place_id).google)}">在 Google 地圖開啟 ↗</a>` : ''}
    <div class="story-actions">
      ${diner ? '<button type="button" data-like aria-pressed="false" disabled><span aria-hidden="true">♡</span> <span data-likes>按讚</span></button><button type="button" data-comment-focus>留言</button>' : ''}
      ${own ? '<button type="button" data-share-meal>分享餐照</button>' : ''}
    </div>
    ${diner ? `<section class="story-comments" aria-label="留言">
      <div data-comments></div>
      <form class="comment-form" data-comment><input name="message" aria-label="寫留言" placeholder="留一句話…" maxlength="280" required><button type="submit">送出</button></form>
    </section>` : ''}
    <p class="story-feedback" role="status" data-story-status hidden></p>
    ${own && diner ? `<button type="button" class="delete-meal" data-delete-meal="${escape(meal.id)}">刪除紀錄</button>` : ''}
  </article>`;
}

function storyNotice(article, message) {
  const status = article.querySelector('[data-story-status]');
  status.textContent = message;
  status.hidden = !message;
}

async function refreshLikes(article) {
  const id = article.dataset.mealStory;
  const [total, mine] = await Promise.all([
    client.from('meal_likes').select('meal_id', { count: 'exact', head: true }).eq('meal_id', id),
    client.from('meal_likes').select('meal_id').eq('meal_id', id).eq('owner', diner.id).maybeSingle(),
  ]);
  checked(total);
  const liked = !!checked(mine);
  if (!article.isConnected) return;
  const button = article.querySelector('[data-like]');
  button.setAttribute('aria-pressed', String(liked));
  button.firstElementChild.textContent = liked ? '♥' : '♡';
  button.querySelector('[data-likes]').textContent = (liked ? '已按讚' : '按讚') + (total.count ? ` ${total.count}` : '');
  button.disabled = false;
}

async function refreshComments(article, through) {
  const query = client.from('meal_comments').select('id,owner,nickname,body,created_at')
    .eq('meal_id', article.dataset.mealStory).order('created_at', { ascending: false }).order('id', { ascending: false });
  const container = article.querySelector('[data-comments]');
  const start = through || 0;
  const request = String(Number(container.dataset.request || 0) + 1);
  container.dataset.request = request;
  const comments = checked(await query.range(start, start + 49));
  if (!article.isConnected || container.dataset.request !== request) return;
  const items = comments.reverse().map(comment => `<div class="story-comment">
    <div><strong>${escape(comment.nickname)}</strong><p>${escape(comment.body)}</p></div>
    ${comment.owner === diner.id ? `<button type="button" data-delete-comment="${escape(comment.id)}" aria-label="刪除這則留言">×</button>` : ''}
  </div>`).join('');
  const earlier = comments.length === 50 ? `<button type="button" data-older-comments="${start + 50}">看更早的留言</button>` : '';
  if (start) {
    container.querySelector('[data-older-comments]')?.remove();
    container.insertAdjacentHTML('afterbegin', earlier + items);
  } else container.innerHTML = earlier + items;
}

function openDetails(button) {
  const source = diner ? (page === 'profile' ? personal : feed) : sample;
  const meals = button.dataset.day
    ? groupMeals(source.filter(meal => meal.owner === (diner?.id ?? '你') && meal.eaten_on === button.dataset.day), 'eaten_on').get(button.dataset.day)
    : source.filter(meal => meal.id === button.dataset.meal);
  if (meals?.length) {
    const origin = button.querySelector('img')?.getBoundingClientRect();
    detailBody.innerHTML = '<h2 id="detail-title"' + (button.dataset.day ? '' : ' class="visually-hidden"') + '>' + escape(button.dataset.day || meals[0].restaurant) + '</h2>'
      + '<div class="day-meals">' + meals.map(mealDetails).join('') + '</div>';
    detail.showModal();
    const target = detailBody.querySelector('.detail-photo');
    if (origin && !button.dataset.day && !reducedMotion.matches) {
      const end = target.getBoundingClientRect();
      if (end.width && end.height) target.animate([
        { transformOrigin: 'top left', transform: `translate(${origin.x - end.x}px, ${origin.y - end.y}px) scale(${origin.width / end.width}, ${origin.height / end.height})`, opacity: 0.45 },
        { transformOrigin: 'top left', transform: 'none', opacity: 1 },
      ], { duration: 430, easing: 'cubic-bezier(.2,.78,.24,1)' });
    }
    for (const [index, article] of [...detailBody.querySelectorAll('[data-meal-story]')].entries()) {
      const track = article.querySelector('.gallery-track');
      showGalleryCount(track);
      if (!diner) continue;
      const meal = meals[index];
      void Promise.all([
        client.from('meals').select('extra_photos').eq('id', meal.id).single().then(result => {
          const photos = checked(result).extra_photos;
          if (article.isConnected && photos.length) {
            track.insertAdjacentHTML('beforeend', galleryImages(meal, photos, 1));
            showGalleryCount(track);
          }
        }),
        refreshLikes(article),
        refreshComments(article),
      ]).catch(() => { if (article.isConnected) storyNotice(article, '部分貼文內容載入失敗，請關閉後再試。'); });
    }
  }
}

async function action(work, errorMessage) {
  try { await work(); } catch { notice(errorMessage, true); }
}

function paintChosenPlace(form) {
  const box = form.querySelector('[data-chosen-place]');
  box.hidden = !draft.place;
  box.innerHTML = selectedPlace();
}

async function placeSearch(form, value, button) {
  const query = value.trim();
  if (!query) return notice('先輸入店名或地址。', true);
  const record = form.matches('[data-record]');
  const results = form.querySelector('[data-place-results]');
  const input = form.elements[record ? 'restaurant' : 'query'];
  const active = () => form.isConnected && input.value.trim() === query && results.dataset.query === query;
  results.dataset.query = query;
  results.hidden = false;
  results.innerHTML = '<p role="status">找店中…</p>';
  button.disabled = true;
  try {
    const places = (await findPlaces(query, config.mapsKey)).filter(place => place.id && place.displayName);
    if (!active()) return;
    results.innerHTML = `<div class="place-results">
      ${places.map((place, index) => {
        const item = `<strong>${escape(place.displayName)}</strong><small>${escape(place.formattedAddress)}</small>`;
        return record ? `<button type="button" data-choose-place="${index}">${item}</button>`
          : `<a target="_blank" rel="noopener noreferrer" href="${escape(mapSearchLinks(query, place.id).google)}">${item}</a>`;
      }).join('') || '<p>找不到符合的店家。試試店名加分店或地區。</p>'}
      <span class="map-attribution" translate="no">Google Maps</span>
    </div>`;
    results.onclick = event => {
      const choice = event.target.closest('[data-choose-place]');
      if (!record || !choice || !active() || saving) return;
      draft.place = places[Number(choice.dataset.choosePlace)];
      paintChosenPlace(form);
      results.hidden = true;
      form.elements.restaurant.focus();
    };
  } catch {
    if (!active()) return;
    results.innerHTML = `<p role="status">目前無法在站內找店。 <a target="_blank" rel="noopener noreferrer" href="${escape(mapSearchLinks(query).google)}">改用 Google 地圖 ↗</a></p>`;
  } finally {
    button.disabled = false;
  }
}

async function storyAction(button, work) {
  const story = button.closest('[data-meal-story]');
  button.disabled = true;
  storyNotice(story, '');
  try { await work(story); } catch (error) { if (story.isConnected) storyNotice(story, error.message || '操作失敗，請稍後再試。'); }
  finally { button.disabled = false; }
}

detail.addEventListener('scroll', event => {
  if (event.target.matches?.('.gallery-track')) showGalleryCount(event.target);
}, { capture: true, passive: true });

view.addEventListener('scroll', event => {
  const track = event.target;
  if (!track.matches?.('.tile-grid')) return;
  const arrows = track.previousElementSibling.querySelector('.feed-arrows');
  if (!arrows) return;
  arrows.firstElementChild.disabled = track.scrollLeft <= 2;
  arrows.lastElementChild.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
}, { capture: true, passive: true });

detail.addEventListener('close', () => {
  if (!detail.open) detailBody.replaceChildren();
});

detail.addEventListener('submit', async event => {
  const form = event.target;
  if (!form.matches('[data-comment]')) return;
  event.preventDefault();
  const body = form.elements.message.value.trim();
  if (!diner || !body || form.querySelector('button').disabled) return;
  await storyAction(form.querySelector('button'), async article => {
    const result = await client.from('meal_comments').insert({ meal_id: article.dataset.mealStory, body });
    if (result.error) throw Error('留言未送出，請再試一次。');
    form.reset();
    await refreshComments(article);
  });
});

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const data = button.dataset;
  if (data.theme === 'light' || data.theme === 'dark') {
    document.documentElement.dataset.theme = data.theme;
    try { localStorage.setItem('fomery-theme', data.theme); } catch {}
    for (const option of button.parentElement.querySelectorAll('button[data-theme]')) {
      option.setAttribute('aria-pressed', String(option.dataset.theme === data.theme));
    }
  } else if (pages.includes(data.page)) {
    page = data.page;
    notice();
    render(true);
    window.scrollTo(0, 0);
    void action(async () => { if (await refresh()) render(true); }, '載入失敗，請稍後再試。');
  } else if (data.refresh !== undefined) {
    notice();
    void action(async () => { if (await refresh()) render(true); }, '更新失敗，請稍後再試。');
  } else if (data.shiftRow) {
    const track = button.closest('.friend-row').querySelector('.tile-grid');
    const step = track.children[1].offsetLeft - track.children[0].offsetLeft;
    track.scrollBy({ left: Number(data.shiftRow) * step, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  } else if (data.selectPhoto) {
    if (!draft.reading && !saving) button.form.elements[data.selectPhoto].click();
  } else if (data.dropPhoto !== undefined) {
    if (draft.reading || saving) return;
    draft.photos.splice(Number(data.dropPhoto), 1);
    paintRecordPhotos();
    view.querySelector('[data-select-photo="photo"]').focus();
  } else if (data.savePhoto !== undefined) {
    const file = draft.photos[Number(data.savePhoto)]?.original;
    if (file) void action(() => sharePhoto(file), '原圖無法儲存，請再試一次。');
  } else if (data.placeSearch !== undefined) {
    void placeSearch(button.form, button.form.elements.restaurant.value, button);
  } else if (data.clearPlace !== undefined) {
    const form = button.form;
    draft.place = undefined;
    paintChosenPlace(form);
    form.elements.restaurant.focus();
  } else if (data.meal || data.day) {
    openDetails(button);
  } else if (data.slide) {
    const track = button.parentElement.previousElementSibling;
    const index = Math.round(track.scrollLeft / track.clientWidth) + Number(data.slide);
    track.scrollTo({ left: index * track.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  } else if (data.commentFocus !== undefined) {
    button.closest('article').querySelector('[name="message"]').focus();
  } else if (data.shareMeal !== undefined) {
    void storyAction(button, async article => {
      const img = article.querySelector('.detail-photo');
      await sharePhoto(mealCard(img, article.querySelector('h3').textContent));
    });
  } else if (data.like !== undefined && diner) {
    void storyAction(button, async article => {
      const meal_id = article.dataset.mealStory;
      const liked = button.getAttribute('aria-pressed') === 'true';
      const result = liked ? await client.from('meal_likes').delete().eq('meal_id', meal_id).eq('owner', diner.id)
        : await client.from('meal_likes').insert({ meal_id });
      if (result.error && result.error.code !== '23505') throw Error('無法更新按讚，請再試一次。');
      await refreshLikes(article);
      if (!liked && !reducedMotion.matches && button.isConnected) {
        button.firstElementChild.animate([{ transform: 'scale(.72)' }, { transform: 'scale(1.22)', offset: .65 }, { transform: 'scale(1)' }], { duration: 280 });
      }
    });
  } else if (data.olderComments && diner) {
    void storyAction(button, article => refreshComments(article, Number(data.olderComments)));
  } else if (data.deleteComment && diner) {
    void storyAction(button, async article => {
      checked(await client.from('meal_comments').delete().eq('id', data.deleteComment).eq('owner', diner.id));
      await refreshComments(article);
    });
  } else if (data.month) {
    const date = new Date(month + '-01T12:00:00');
    date.setMonth(date.getMonth() + Number(data.month));
    month = localDate(date).slice(0, 7);
    render();
    view.querySelector('[data-month="' + data.month + '"]').focus();
    void action(async () => {
      if (await refresh()) {
        render();
        view.querySelector('[data-month="' + data.month + '"]').focus();
      }
    }, '月曆載入失敗，請稍後再試。');
  } else if (data.copyId !== undefined || data.share !== undefined) {
    const isInvite = data.share !== undefined;
    const value = isInvite ? inviteLink() : diner.friend_id;
    void action(async () => {
      if (isInvite && navigator.share) {
        await navigator.share({ title: '加我為 Fomery 好友', url: value }).catch(error => { if (error.name !== 'AbortError') throw error; });
      } else {
        await navigator.clipboard.writeText(value);
        notice(isInvite ? '已複製邀請連結。' : '已複製好友 ID。');
      }
    }, '無法分享，請使用我的好友 ID 或邀請 QR Code。');
  } else if (data.request !== undefined || data.accept || data.remove) {
    void action(async () => {
      if (data.request !== undefined) {
        checked(await client.from('friend_requests').insert({ recipient: found.id }));
      } else {
        const [sender, recipient] = (data.accept || data.remove).split('/');
        const query = data.accept
          ? client.from('friend_requests').update({ accepted: true }).eq('accepted', false)
          : client.from('friend_requests').delete();
        const changed = checked(await query.eq('sender', sender).eq('recipient', recipient).select('sender'));
        if (!changed.length) throw Error();
      }
      await refresh();
      render();
      notice(data.accept ? '已成為好友。' : data.remove ? '好友狀態已更新。' : '好友申請已送出。');
    }, '好友狀態未能更新，請重新整理後再試。');
  } else if (data.deleteMeal && confirm('刪除這餐？好友動態和你的月曆都會移除。')) {
    void action(async () => {
      checked(await client.from('meals').delete().eq('id', data.deleteMeal).select('id').single());
      detail.close();
      await refresh();
      render();
      notice('已刪除這餐。');
    }, '刪除失敗，請稍後再試。');
  } else if (data.signOut !== undefined) {
    detail.close();
    void action(async () => checked(await client.auth.signOut()), '登出失敗，請稍後再試。');
  }
});

view.addEventListener('input', event => {
  const input = event.target;
  const form = input.form;
  if (form?.matches('[data-record]') && input.type !== 'file') {
    draft[input.name] = input.value;
    if (input.name === 'eaten_on') {
      draft.dateEdited = true;
      form.querySelector('#date-hint').hidden = true;
    }
    if (input.name === 'eaten_time') draft.timeEdited = true;
    if (input.name === 'restaurant' && draft.place) {
      draft.place = undefined;
      paintChosenPlace(form);
    }
  }
  if (['restaurant', 'query'].includes(input.name)) {
    const results = form.querySelector('[data-place-results]');
    results.hidden = true;
    delete results.dataset.query;
  }
  if (input.form?.matches('[data-find]')) searchCode = input.value;
});

view.addEventListener('change', async event => {
  const input = event.target;
  if (input.type !== 'file' || !input.files.length || draft.reading || saving) return;
  const files = [...input.files];
  input.value = '';
  const current = draft;
  const photos = draft.photos ||= [];
  const remaining = mealPhotoLimit - photos.length;
  if (!remaining) return notice(`每餐最多 ${mealPhotoLimit} 張，先移除一張再加。`, true);
  const errors = [];
  draft.reading = true;
  paintRecordPhotos();
  try {
    for (const file of files.slice(0, remaining)) {
      try { photos.push(await preparePhoto(file, input.name === 'camera')); }
      catch (error) { errors.push(error.message); }
      if (current !== draft) return;
    }
    if (page === 'record') notice(errors[0] || (files.length > remaining ? `每餐最多 ${mealPhotoLimit} 張，已加入前 ${remaining} 張。` : ''), !!errors.length);
  } finally {
    delete current.reading;
    if (current === draft) paintRecordPhotos(true);
  }
});

view.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  const values = new FormData(form);
  notice();
  if (form.matches('[data-explore]')) {
    if (config.mapsKey) await placeSearch(form, values.get('query'), event.submitter || form.querySelector('button'));
    else await action(() => window.open(mapSearchLinks(values.get('query')).google, '_blank', 'noopener,noreferrer'), '請輸入要查找的店名或地址。');
    return;
  }
  if (!session || saving || (form.matches('[data-record]') && draft.reading)) return;
  const submit = event.submitter ?? form.querySelector('button[type="submit"]');
  saving = true;
  submit.disabled = true;
  if (form.matches('[data-record]')) form.inert = true;
  try {
    if (form.matches('[data-profile]')) {
      const nickname = values.get('nickname').trim();
      if (!nickname) return notice('請輸入暱稱。', true);
      diner = checked(await client.from('diners').insert({ nickname }).select().single());
      await refresh();
      await openInvite();
      render();
    } else if (form.matches('[data-find]')) {
      await find(values.get('code'));
    } else if (form.matches('[data-record]')) {
      const submitted = draft;
      const owner = diner.id;
      const restaurant = values.get('restaurant').trim();
      if (!draft.photos?.length || !restaurant) return notice('請先加入餐照並輸入店名。', true);
      const eaten_on = values.get('eaten_on');
      const [photo, ...extra_photos] = draft.photos.map(item => item.src);
      const nextMeal = { id: draft.id ??= crypto.randomUUID(), eaten_on, eaten_time: values.get('eaten_time') || null,
        restaurant, place_id: draft.place?.id || null, caption: values.get('caption').trim(), photo, extra_photos };
      const result = await client.from('meals').insert(nextMeal);
      if (submitted !== draft) return;
      if (result.error?.code === '23505') {
        checked(await client.from('meals').select('id').eq('id', nextMeal.id).eq('owner', owner).single());
      } else checked(result);
      if (submitted !== draft) return;
      draft = {};
      page = 'profile';
      month = eaten_on.slice(0, 7);
      notice('已發布給好友。');
      await action(refresh, '已發布。月曆暫時無法更新，請稍後再試。');
      render(true);
    }
  } catch {
    notice('這次操作未能完成，請稍後再試。', true);
  } finally {
    saving = false;
    view.querySelector('[data-record]')?.removeAttribute('inert');
    submit.disabled = false;
  }
});

if (/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(config.url) && /^sb_publishable_[a-zA-Z0-9_-]+$/.test(config.key)) {
  await action(async () => {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './vendor/supabase.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
    client = window.supabase.createClient(config.url, config.key, { auth: { flowType: 'pkce', storageKey: 'fomery-journal-auth' } });
    login.addEventListener('click', () => {
      void action(async () => checked(await client.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: base.href },
      })), '無法開啟 Google 登入，請稍後再試。');
    });
    await initialize(checked(await client.auth.getSession()).session);
    client.auth.onAuthStateChange((_event, nextSession) => {
      if (session?.user.id === nextSession?.user.id) return;
      setTimeout(() => void action(() => initialize(nextSession), '無法載入帳號，請重新整理。'), 0);
    });
  }, '目前無法連線登入服務，請稍後再試。');
}
render();
if (url.searchParams.has('error')) notice('Google 登入未完成，請再試一次。', true);
