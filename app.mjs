import { restaurants, createDemoState } from './catalog.mjs';
import { mapsUrl, googleExploreEmbedUrl } from './maps.mjs';
import { createSocialState, transition } from './social.mjs';
import { community, gatherings, pets, socialFeed, growthReceipt } from './social-ui.mjs';
import { beginRanking, compare, finishRanking, moods, opponent, progress, score } from './ranking.mjs';

const key = 'table-notes-demo-v2';
const empty = { ranked: [], saved: [], recent: [] };
const view = document.querySelector('#view');
const dialog = document.querySelector('#dialog');
const form = document.querySelector('#rating-form');
const fields = document.querySelector('#details-form');
const comparison = document.querySelector('#comparison');
const extras = document.querySelector('#extras');
const submit = form.querySelector('[type="submit"]');
const status = document.querySelector('#status');
const error = document.querySelector('#dialog-error');
const labels = { liked: '喜歡', fine: '普通', disliked: '不喜歡' };
const all = [...restaurants.values()];
const filters = { district: '', cuisine: '', price: '' };
const tour = [
  { title: '01 / 找到一起吃飯的人', summary: '向 Mika 發送好友邀請，切換成 Mika 接受；回到你的角色，加入「週末咖啡散步」，看看群組裡朋友的寵物。', action: '新增好友與加入群組', page: 'community' },
  { title: '02 / 把下一餐變成聚會', summary: '建立一場聚餐，主動邀請 Jamie。切換成 Jamie 接受邀請，也可以用其他群組成員的角色自由加入，展示人數即時更新。', action: '發起一場聚餐', page: 'gatherings' },
  { title: '03 / 每一篇分享，都讓糰子長大', summary: '到寵物頁發第一篇群組貼文，寶寶就會進化！用示範金幣買主廚造型，再模擬隔天繼續餵養。到群組查看彼此的寵物。', action: '認識我的糰子', page: 'pets' },
];
let noticeTimer;
let page = 'activity';
let listMap = false;
let tourStep = 0;
let selected = null;
let ratingId = null;
let ratingSession = 0;
let draft = null;
let query = '';
let mapQuery = '台中市 餐廳';
let state = load();
if (!state.social) state = { ...state, social: createSocialState() };

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (!value) return createDemoState();
    const validRank = row => row && restaurants.has(row.id) && moods.includes(row.mood)
      && Number.isFinite(row.value) && Array.isArray(row.tags)
      && row.tags.every(tag => typeof tag === 'string');
    if (![value.ranked, value.saved, value.recent].every(Array.isArray)
        || !value.ranked.every(validRank)
        || ![...value.saved, ...value.recent].every(id => restaurants.has(id))) {
      throw new Error('Invalid stored records');
    }
    return value;
  } catch {
    notify('讀取本機紀錄失敗，暫以空白清單顯示。');
    return empty;
  }
}

function notify(message) {
  clearTimeout(noticeTimer);
  status.textContent = message;
  noticeTimer = setTimeout(() => { status.textContent = ''; }, 4500);
}

function save(next, message) {
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    (dialog.open ? error : status).textContent = '無法儲存。請確認瀏覽器允許本機儲存，或換一張較小的照片。';
    return false;
  }
  state = next;
  if (message) notify(message);
  return true;
}

function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

const food = { 早餐: '🥐', 麵食: '🍜', 鍋物: '🍲', 咖啡: '☕', 甜點: '🍮', 飲品: '🍵' };
function artwork(place, large = false) {
  return '<span aria-hidden="true" class="food-art ' + (large ? 'large' : '') + ' art-' + place.price + '"><span>' + food[place.cuisine] + '</span></span>';
}

function feed() {
  const friends = [
    { name: 'Jamie', letter: 'J', id: '14', time: '今天 12:30', text: '找到新的週末基地了。拿鐵很順口，窗邊的位置可以坐一整個下午。', tag: '咖啡口袋名單' },
    { name: 'Alex', letter: 'A', id: '10', time: '昨天 10:15', text: '睡晚一點也不怕，這份早午餐值得專程來。下次一起？', tag: '週末早午餐' },
  ];
  return '<div class="page-heading"><div><p class="eyebrow">YOUR DAILY BITES</p><h2 id="view-title">跟著喜歡的人，吃點好的。</h2></div><span class="avatar">Y</span></div>'
    + '<section class="welcome"><div><span class="demo-badge">我的美食日常</span><h3>下一頓，值得期待。</h3><p>從一次心動收藏，到只屬於你的餐廳排行。</p><button class="primary" data-rate="14">＋ 記錄一頓好吃的</button></div><span class="welcome-art" aria-hidden="true">🍜</span></section>'
    + socialFeed(state.social)
    + '<div class="section-heading"><h3>朋友的餐桌</h3><span class="muted">示範動態 · 2 位朋友</span></div>'
    + friends.map(friend => { const place = restaurants.get(friend.id); return '<article class="feed-card"><header><span class="avatar">' + friend.letter + '</span><div><strong>' + friend.name + '</strong><small>' + friend.time + ' · 新增了用餐紀錄</small></div><span class="friend-score">喜歡 ♡</span></header><button class="feed-image" data-detail="' + place.id + '" aria-label="查看 ' + place.name + '">' + artwork(place, true) + '<span class="image-caption">' + friend.tag + '</span></button><div class="feed-body"><button class="text-button" data-detail="' + place.id + '"><h3>' + place.name + ' ↗</h3></button><p class="muted">' + place.district + ' · ' + place.cuisine + ' · ' + '＄'.repeat(place.price) + '</p><p>' + friend.text + '</p><button class="bookmark" data-bookmark="' + place.id + '" aria-pressed="' + state.saved.includes(place.id) + '">' + (state.saved.includes(place.id) ? '✓ 已加入想去' : '＋ 存為想去') + '</button></div></article>'; }).join('')
    + '<div class="section-heading"><h3>我的最近紀錄</h3><button data-page="lists">全部清單 ↗</button></div>'
    + rows(state.ranked.filter(row => !row.hiddenFromActivity).sort((a,b) => (b.ratedAt ?? 0) - (a.ratedAt ?? 0)).slice(0,3).map(row => restaurants.get(row.id)));
}

function rows(places) {
  if (!places.length) return '<p class="muted">這裡目前沒有店家。</p>';
  return '<ul class="rows">' + places.map(place => {
    const ranked = state.ranked.find(entry => entry.id === place.id);
    const pos = ranked ? state.ranked.findIndex(entry => entry.value === ranked.value) : -1;
    const isSaved = state.saved.includes(place.id);
    const rating = score(place.id, state.ranked);
    const rank = pos === -1 ? '' : ' · 第 ' + (pos + 1) + ' 名' + (rating ? ' · ' + rating + ' 分' : '');
    return '<li class="row">' + artwork(place) + '<button type="button" class="title" data-detail="' + place.id + '">'
      + '<strong>' + escape(place.name) + '</strong><small>' + place.district + ' · ' + place.cuisine + rank + '</small></button>'
      + (rating ? '<span class="score">' + rating + '</span>' : '')
      + '<button type="button" data-rate="' + place.id + '" aria-label="' + escape((pos < 0 ? '評價 ' : '重評 ') + place.name) + '">'
      + (pos < 0 ? '＋' : '重評') + '</button>'
      + '<button type="button" class="bookmark" data-bookmark="' + place.id + '" aria-pressed="' + isSaved + '" aria-label="' + escape('想去 ' + place.name) + '">想去</button></li>';
  }).join('') + '</ul>';
}

function drawResults() {
  const term = query.trim().toLowerCase();
  const places = term ? all.filter(place => [place.name, place.cuisine, place.district]
    .some(value => value.toLowerCase().includes(term))) : all;
  const recent = state.recent.map(id => restaurants.get(id));
  document.querySelector('#results').innerHTML = (!term && recent.length
    ? '<h3>最近搜尋</h3>' + rows(recent) : '')
    + '<h3>' + (term ? '搜尋結果' : '附近範例店家') + '</h3>' + rows(places);
}

function detail(place) {
  const row = state.ranked.find(entry => entry.id === place.id);
  const rank = row ? state.ranked.findIndex(entry => entry.value === row.value) + 1 : null;
  const rating = score(place.id, state.ranked);
  const image = row?.photo && typeof row.photo === 'string' && /^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(row.photo)
    ? '<img src="' + row.photo + '" alt="此餐紀錄的照片">' : '';
  const isSaved = state.saved.includes(place.id);
  return '<button type="button" data-back>← 返回</button>'
    + '<article class="place detail-place">' + artwork(place, true) + '<p class="eyebrow">A PLACE TO REMEMBER</p><h2 id="view-title">' + place.name + '</h2>'
    + '<p class="muted">' + place.city + ' · ' + place.district + ' · ' + place.cuisine + '</p>'
    + (row ? '<p><strong>第 ' + rank + ' 名</strong> · ' + labels[row.mood]
      + (rating ? ' · ' + rating + ' 分' : ' · 排滿 10 家顯示分數') + '</p>' : '')
    + '<div class="place-actions"><button type="button" class="primary" data-rate="' + place.id + '">' + (row ? '重新評價' : '加入吃過') + '</button> '
    + '<button type="button" class="bookmark" aria-pressed="' + isSaved + '" data-bookmark="' + place.id + '">' + (isSaved ? '已收藏' : '存為想去') + '</button></div>'
    + '<p><a class="map-link" href="' + escape(mapsUrl('台南市 ' + place.cuisine)) + '" target="_blank" rel="noopener noreferrer">Google Maps 找同類餐廳 ↗</a></p><p class="muted">此店為虛構示範，連結搜尋真實同類餐廳，不是此店的地址。</p>'
    + '<p class="detail-description">' + ({ 咖啡: '留一點時間給咖啡香，和不趕時間的自己。', 早餐: '從一份用心的早餐，開始今天的小旅行。', 麵食: '熱騰騰的一碗，收好日常裡最踏實的幸福。' }[place.cuisine] || '把生活的滋味，留在這一餐。') + '</p>'
    + (row?.dish ? '<p>喜歡的菜　' + escape(row.dish) + '</p>' : '')
    + (row?.date ? '<p>用餐日期　' + escape(row.date) + '</p>' : '')
    + (row?.companions ? '<p>同行者　' + escape(row.companions) + '</p>' : '')
    + (row?.tags.length ? '<p>標籤　' + escape(row.tags.join('、')) + '</p>' : '')
    + (row?.note ? '<p>' + escape(row.note) + '</p>' : '') + image
    + (row && state.ranked.length === 1 ? '<section class="first-rank"><h3>你記下第一家店了</h3>'
      + '<p>再評一家，就能開始累積自己的口味排行。</p>'
      + '<button type="button" data-next>再評一家</button></section>' : '')
    + '</article>';
}

function drawMap(places) {
  // shortcut: schematic coordinates only; replace with geocoded places when a real catalog is available.
  const pins = places.map(place => {
    const i = Number(place.id) - 1;
    const x = 17 + Math.floor(i / 6) * 33 + (i % 2 ? 7 : -7);
    const y = 31 + Math.floor(i % 6 / 2) * 24 + (i % 2 ? 7 : 0);
    return '<button type="button" class="map-pin" data-detail="' + place.id
      + '" aria-label="地圖上的 ' + escape(place.name) + '" style="--x:' + x + '%;--y:' + y + '%">'
      + (score(place.id, state.ranked) || place.id) + '</button>';
  }).join('');
  return '<div class="map" aria-label="虛構街區示意圖">'
    + '<svg aria-hidden="true" viewBox="0 0 480 230" preserveAspectRatio="none">'
    + '<path d="M0 146Q145 185 257 128T480 154" fill="none" stroke="#c5dcdf" stroke-width="28"/>'
    + '<path d="M143 0v230M338 0v230M0 76h480M0 198h480M86 0v115M404 92v138" fill="none" stroke="#fff" stroke-width="9"/>'
    + '<rect x="163" y="14" width="110" height="40" rx="8" fill="#d3e0bc"/></svg>'
    + '<div class="map-labels"><span>北巷</span><span>中街</span><span>南埕</span></div>' + pins + '</div>';
}

function mapPanel(places) {
  const destination = mapQuery.trim() || '台中市 餐廳';
  const route = destination !== '台中市 餐廳';
  return '<section class="map-workspace"><div class="map-canvas-panel"><div class="section-heading"><h3>我的美食地圖</h3><span class="demo-badge">Google Maps · 台中</span></div><div class="google-map-frame"><iframe src="' + escape(googleExploreEmbedUrl) + '" title="我的美食地圖：Google Maps 台中市區" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>'
    + '<div class="google-map-card"><span class="eyebrow">EXPLORE WITH GOOGLE MAPS</span><h3>把下一餐，放到真實地圖上。</h3><form id="maps-form" action="https://www.google.com/maps/search/" method="get" target="_blank" rel="noopener noreferrer"><input type="hidden" name="api" value="1"><label for="map-query">真實店名、地址或地區＋料理</label><input id="map-query" name="query" value="' + escape(mapQuery) + '" required maxlength="180" placeholder="例如：台中市西區 咖啡"><div class="action-row"><button class="primary" type="submit">在 Google Maps 搜尋 ↗</button><a class="map-link" id="map-directions" href="' + escape(mapsUrl(destination, route ? 'directions' : 'search')) + '" target="_blank" rel="noopener noreferrer">' + (route ? '規劃前往此地的路線 ↗' : '開啟 Google Maps ↗') + '</a></div><p class="muted">可直接拖曳、縮放上方 Google 地圖。搜尋與路線另開 Google Maps；下方示範店家未標示於真實地圖。</p></form></div></div><aside class="map-place-list"><h3>清單中的店家 · ' + places.length + '</h3><p class="muted">點店名查看紀錄 · 以下為示範店家</p>' + rows(places) + '</aside></section>';
}

function filterSelect(key, label) {
  const options = [...new Set(all.map(place => String(place[key])))];
  return '<label>' + label + '<select data-filter="' + key + '"><option value="">全部</option>'
    + options.map(value => '<option value="' + escape(value) + '"' + (filters[key] === value ? ' selected' : '')
      + '>' + (key === 'price' ? '＄'.repeat(Number(value)) : escape(value)) + '</option>').join('')
    + '</select></label>';
}

function exploration() {
  const { count, target, unlocked } = progress(state.ranked);
  const completed = Math.min(count, target);
  const favorite = state.ranked.find(row => row.mood === 'liked')?.cuisine;
  const matches = place => Object.entries(filters).every(([key, value]) => !value || String(place[key]) === value);
  const unseen = all.filter(place => matches(place) && !state.ranked.some(row => row.id === place.id));
  const suggestions = unseen.filter(place => place.cuisine === favorite);
  return '<p class="eyebrow">YOUR NEXT FOOD ADVENTURE</p><h2 id="view-title">探索美食地圖</h2><p class="muted">整理口袋名單，再到 Google Maps 探索真實餐廳。</p>'
    + '<div class="filters">' + filterSelect('district', '街區') + filterSelect('cuisine', '料理')
    + filterSelect('price', '價位') + '</div>' + mapPanel(all.filter(matches))
    + '<section class="progress-box"><h3>個人化推薦進度</h3>'
    + '<progress aria-label="個人化推薦進度" value="' + completed + '" max="' + target + '"></progress>'
    + '<p><strong>' + completed + ' / ' + target + '</strong></p>'
    + (unlocked ? '<p>根據你喜歡的料理，挑選下一家想去的店。</p>' + rows((suggestions.length ? suggestions : unseen).slice(0, 4))
      : '<p>評價 ' + target + ' 家就能解鎖。</p><button type="button" class="primary" data-next>繼續評價</button>')
    + '</section>';
}

function drawTour() {
  const step = tour[tourStep];
  return '<section class="place tour-card"><p class="eyebrow">' + (tourStep + 1) + ' / ' + tour.length + '</p>'
    + '<h2 id="view-title">' + step.title + '</h2><p>' + step.summary + '</p>'
    + '<div class="tour-visual" aria-hidden="true">' + ['🤝', '🍲', '🐣'][tourStep] + '</div><div class="tour-actions">'
    + '<button type="button" data-tour-step="-1"' + (tourStep === 0 ? ' disabled' : '') + '>上一張</button>'
    + '<button type="button" data-tour-step="1"' + (tourStep === tour.length - 1 ? ' disabled' : '') + '>下一張</button>'
    + '<button type="button" class="primary" data-page="' + step.page + '">' + step.action + '</button></div></section>';
}

function render() {
  for (const button of document.querySelectorAll('nav [data-page]')) {
    if (button.dataset.page === page) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (selected) view.innerHTML = detail(restaurants.get(selected));
  else if (page === 'search') {
    view.innerHTML = '<p class="eyebrow">FIND YOUR NEXT FAVORITE</p><h2 id="view-title">今天，想吃點什麼？</h2><p class="muted">搜尋 18 家示範店家，找到下一個喜歡。</p><input type="search" id="search" aria-label="搜尋店名或料理" placeholder="搜尋店名或料理"><div id="results"></div>';
    document.querySelector('#search').value = query;
    drawResults();
  } else if (page === 'lists') {
    const been = state.ranked.map(row => restaurants.get(row.id));
    const saved = state.saved.map(id => restaurants.get(id));
    view.innerHTML = '<p class="eyebrow">CURATED BY YOUR TASTE</p><h2 id="view-title">我的口袋名單</h2><p class="muted">吃過 ' + been.length + ' 家 · 想去 ' + saved.length + ' 家 · 分數由個人比較產生</p><div class="switcher">'
      + '<button type="button" data-list-view="list" aria-pressed="' + !listMap + '">清單</button>'
      + '<button type="button" data-list-view="map" aria-pressed="' + listMap + '">地圖</button></div>'
      + (listMap ? mapPanel([...been, ...saved.filter(place => !been.some(row => row.id === place.id))])
        : '<h3>吃過</h3>' + rows(been) + '<h3>想去</h3>' + rows(saved));
  } else if (page === 'activity') {
    view.innerHTML = feed();
  } else if (page === 'community') {
    view.innerHTML = community(state.social);
  } else if (page === 'gatherings') {
    view.innerHTML = gatherings(state.social);
  } else if (page === 'pets') {
    view.innerHTML = pets(state.social);
  } else if (page === 'profile') {
    view.innerHTML = '<h2 id="view-title">我的美食護照</h2><section class="place profile-card"><span class="avatar">Y</span><h3>You / 今天也要好好吃飯</h3><p class="muted">一餐一餐，收集自己的城市。</p>'
      + '<p>吃過 <strong>' + state.ranked.length + '</strong> 家 · 想去 <strong>' + state.saved.length + '</strong> 家</p>'
      + '<button type="button" data-page="lists">查看我的清單</button></section>';
  } else view.innerHTML = page === 'tour' ? drawTour() : exploration();
}

function openRating(id) {
  ratingId = id;
  ratingSession += 1;
  draft = null;
  error.textContent = '';
  form.reset();
  const existing = state.ranked.find(row => row.id === id);
  if (existing) {
    form.elements.mood.value = existing.mood;
    for (const name of ['companions', 'dish', 'date', 'note']) form.elements[name].value = existing[name] ?? '';
    form.elements.tags.value = existing.tags.join('、');
    form.elements.hiddenFromActivity.checked = Boolean(existing.hiddenFromActivity);
  }
  fields.hidden = false;
  comparison.hidden = true;
  extras.open = Boolean(form.elements.mood.value);
  for (const field of extras.querySelectorAll('details')) field.open = false;
  extras.hidden = submit.disabled = !form.elements.mood.value;
  document.querySelector('#dialog-title').textContent = restaurants.get(id).name;
  const place = restaurants.get(id);
  document.querySelector('#dialog-meta').textContent = '＄'.repeat(place.price) + ' · ' + place.cuisine + ' · ' + place.district;
  dialog.showModal();
}

async function thumbnail(file) {
  if (!file.size) return '';
  if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) throw new Error('請選擇 10 MB 以內的圖片。');
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 540 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .72);
  } finally {
    image.close();
  }
}

function nextComparison() {
  const pair = opponent(draft);
  if (pair) {
    fields.hidden = true;
    comparison.hidden = false;
    document.querySelector('#comparison-mood').innerHTML = moods.map(mood =>
      '<span class="mini-choice mood-' + mood + (mood === draft.entry.mood ? ' chosen' : '') + '">'
      + '<span class="mood-circle" aria-hidden="true">' + (mood === draft.entry.mood ? '✓' : '') + '</span>'
      + '<small>' + labels[mood] + (mood === draft.entry.mood ? '（已選）' : '') + '</small></span>').join('');
    comparison.querySelector('.pair').innerHTML = '<button type="button" data-choice="new" aria-label="' + escape(draft.entry.name) + '">'
      + escape(draft.entry.name) + '<small>' + escape(draft.entry.district) + '</small></button><button type="button" data-choice="existing" aria-label="' + escape(pair.name) + '">'
      + escape(pair.name) + '<small>' + escape(pair.district) + '</small></button>';
    document.querySelector('#comparison-info').innerHTML = [draft.entry, pair].map(place =>
      '<p><strong>' + escape(place.name) + '</strong><br>' + escape(place.city) + ' · ' + escape(place.district)
      + ' · ' + escape(place.cuisine) + ' · ' + '＄'.repeat(place.price) + '</p>').join('');
    comparison.querySelector('details').open = false;
    document.querySelector('#compare-title').focus();
    return;
  }
  const ranked = finishRanking(draft);
  const result = ranked.find(entry => entry.id === ratingId);
  const rank = ranked.findIndex(entry => entry.value === result.value) + 1;
  if (!save({ ...state, ranked, saved: state.saved.filter(id => id !== ratingId) },
    result.name + '已加入吃過 · 第 ' + rank + ' 名')) return;
  dialog.close();
  selected = ratingId;
  navigate();
}

document.addEventListener('input', event => {
  if (event.target.id === 'map-query') {
    mapQuery = event.target.value;
    const link = document.querySelector('#map-directions');
    if (mapQuery.trim()) {
      link.href = mapsUrl(mapQuery, 'directions');
      link.textContent = '規劃前往此地的路線 ↗';
      link.removeAttribute('aria-disabled');
    } else {
      link.removeAttribute('href'); link.setAttribute('aria-disabled','true');
    }
  } else if (event.target.id === 'search') {
    query = event.target.value;
    drawResults();
  } else if (event.target.name === 'mood') {
    extras.hidden = submit.disabled = false;
    extras.open = true;
  }
});

document.addEventListener('change', event => {
  if (event.target.id === 'demo-actor') {
    applySocial({ type: 'actor', id: event.target.value });
    return;
  }
  const key = event.target.dataset.filter;
  if (!Object.hasOwn(filters, key)) return;
  filters[key] = event.target.value;
  render();
  document.querySelector('[data-filter="' + key + '"]').focus();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const values = new FormData(form);
  const id = ratingId;
  const session = ratingSession;
  const photo = values.get('photo');
  error.textContent = '';
  submit.disabled = true;
  try {
    const image = photo?.size ? await thumbnail(photo) : state.ranked.find(row => row.id === id)?.photo;
    if (!dialog.open || ratingSession !== session) return;
    draft = beginRanking(state.ranked, {
      ...restaurants.get(id), mood: values.get('mood'), photo: image,
      companions: values.get('companions').trim(), dish: values.get('dish').trim(),
      tags: [...new Set(values.get('tags').split(/[、,，]/).map(tag => tag.trim()).filter(Boolean))],
      date: values.get('date'), note: values.get('note').trim(), ratedAt: Date.now(),
      hiddenFromActivity: values.has('hiddenFromActivity'),
    });
    nextComparison();
  } catch {
    if (dialog.open && ratingSession === session) {
      error.textContent = '照片無法讀取。請選擇 10 MB 以內的 JPEG、PNG 或 WebP，或略過照片。';
    }
  } finally {
    if (dialog.open && ratingSession === session) submit.disabled = false;
  }
});

function navigate() {
  render();
  const title = document.querySelector('#view-title');
  title.tabIndex = -1;
  title.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function applySocial(action) {
  try {
    const social = transition(state.social, action);
    const messages = { message: '訊息已送出。', petPlay: '兩隻糰子開心地一起玩！雙方各獲得 5 XP。', request: '好友邀請已送出，切換對方角色接受。', accept: '已成為好友！', joinGroup: '已加入群組。', createEvent: '聚餐已建立，可以開始邀請朋友。', invite: '邀請已送出，等待朋友回覆。', joinEvent: '報名成功，餐桌上有你的位子！', leaveEvent: '已退出聚餐。', post: '貼文已發布，寵物成長與金幣已更新。', skin: '造型已穿戴！', nextDay: '已模擬隔天，可以再次發文領取獎勵。', actor: '已切換示範角色（餐廳排行仍為原本的個人展示資料）。' };
    if (save({ ...state, social }, messages[action.type])) {
      render();
      if (action.type === 'post') {
        const anchor = view.querySelector('.role-bar');
        if (anchor) {
          anchor.insertAdjacentHTML('afterend', growthReceipt(social.posts[0].growth));
          const receipt = view.querySelector('.growth-receipt');
          receipt.focus({ preventScroll:true });
          receipt.scrollIntoView({ block:'center' });
        }
      } else if (action.type === 'message') {
        const chat = [...view.querySelectorAll('[data-chat-group]')].find(el => el.dataset.chatGroup === action.group);
        if (chat) {
          const log = chat.querySelector('.chat-history'); log.scrollTop = log.scrollHeight;
          chat.querySelector('[name="text"]').focus({ preventScroll:true });
        }
      }
    }
  } catch (err) { notify(err.message); }
}

document.addEventListener('submit', event => {
  if (event.target.id === 'maps-form' && !mapQuery.trim()) {
    event.preventDefault(); notify('請輸入地點或地址。'); return;
  }
  const type = event.target.dataset.socialForm;
  if (!type) return;
  event.preventDefault();
  applySocial({ ...Object.fromEntries(new FormData(event.target)), type });
});

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const data = button.dataset;
  if (data.dismissGrowth !== undefined) {
    button.closest('.growth-receipt').remove();
  } else if (data.social) {
    applySocial({ type: data.social, id: data.id, target: data.target });
  } else if (data.reset !== undefined) {
    if (!window.confirm('還原全部展示資料？將重設評價、收藏、好友、群組、聚餐、貼文與寵物。原版紀錄不受影響。')) return;
    if (!save({ ...createDemoState(), social: createSocialState() }, '展示資料已還原，可以開始下一輪 Demo。')) return;
    query = ''; selected = null; page = 'activity'; listMap = false; tourStep = 0;
    Object.keys(filters).forEach(key => { filters[key] = ''; });
    navigate();
  } else if (data.close !== undefined) dialog.close();
  else if (data.choice) {
    if (data.choice === 'undo' && !draft.history.length) {
      comparison.hidden = true;
      fields.hidden = false;
      submit.focus();
    } else {
      draft = compare(draft, data.choice);
      nextComparison();
    }
  } else if (data.rate) openRating(data.rate);
  else if (data.detail) {
    selected = data.detail;
    if (page === 'search') save({ ...state, recent: [selected, ...state.recent.filter(id => id !== selected)].slice(0, 4) });
    navigate();
  } else if (data.bookmark) {
    const id = data.bookmark;
    const saved = state.saved.includes(id) ? state.saved.filter(value => value !== id) : [...state.saved, id];
    if (save({ ...state, saved }, saved.includes(id) ? '已存為想去' : '已移除收藏')) render();
  } else if (data.listView) {
    listMap = data.listView === 'map';
    render();
  } else if (data.tourStep) {
    tourStep = Math.max(0, Math.min(tour.length - 1, tourStep + Number(data.tourStep)));
    navigate();
  } else if (data.next !== undefined) {
    query = '';
    page = 'search';
    selected = null;
    navigate();
  } else if (data.page || data.back !== undefined) {
    if (data.page) page = data.page;
    if (page === 'tour') tourStep = 0;
    selected = null;
    navigate();
  }
});

render();
