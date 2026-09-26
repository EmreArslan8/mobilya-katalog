/* E-Katalog motoru — tüm firmalar için ortak.
   Firma verisi: tenants/<id>/config.json + catalog.json
   Firma seçimi: ?firma=<id>  (yoksa tenants/index.json → default) */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');

  const ICON = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 016 0"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    list: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="5" height="5" rx="1"/><rect x="4" y="14" width="5" height="5" rx="1"/><path d="M12 7.5h8M12 16.5h8"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    insta: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17" cy="7" r=".6"/></svg>',
    wa: '<svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><path d="M12 3a9 9 0 00-7.8 13.5L3 21l4.6-1.2A9 9 0 1012 3zm0 16.4a7.4 7.4 0 01-3.8-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.4 7.4 0 1112 19.4zm4-5.5c-.2-.1-1.3-.7-1.5-.7s-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6 6 0 01-3-2.6c-.2-.4.2-.4.7-1.3v-.5l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.5a.9.9 0 00-.6.3 2.7 2.7 0 00-.9 2 4.7 4.7 0 001 2.5 10.7 10.7 0 004.1 3.6c1.5.7 2.1.7 2.9.6.5-.1 1.3-.6 1.5-1.1a1.9 1.9 0 00.1-1.1c0-.1-.2-.2-.4-.3z"/></svg>'
  };

  /* ---------------- State ---------------- */
  let T, CAT, TENANTS, TID;
  const S = { hero: null, list: { facet: 'all', sort: 'rec', view: 'grid' }, pdp: { color: 0, qty: 1 }, scroll: {}, byClick: false };
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(`ek:${TID}:${k}`)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(`ek:${TID}:${k}`, JSON.stringify(v)); } catch {} }
  };
  const favs = () => store.get('fav', []);
  const quote = () => store.get('quote', []);
  const P = id => CAT.products.find(p => p.id === id);
  const catOf = slug => CAT.categories.find(c => c.slug === slug);
  const collOf = slug => CAT.collections.find(c => c.slug === slug);
  const isB2B = () => T.mode === 'b2b';

  /* ---------------- Yardımcılar ---------------- */
  const money = n => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: T.currency || 'TRY', maximumFractionDigits: 0 }).format(n);
  const img = (name, { sizes = '50vw', eager = false, alt = '' } = {}) =>
    `<div class="ph"><img src="assets/img/sm/${name}.jpg" srcset="assets/img/sm/${name}.jpg 520w, assets/img/${name}.jpg 900w" sizes="${sizes}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onload="this.classList.add('loaded')"></div>`;
  const TAG = { yeni: 'Yeni', 'cok-satan': 'Çok satan', indirim: 'İndirim' };
  const STOCK = { stokta: 'Stokta', az: 'Son ürünler', siparis: 'Siparişe özel', uretim: 'Üretime alınır' };

  function priceHTML(p, big) {
    if (!T.showPrices || p.price == null) return `<div class="price"><span class="ask">${big ? '' : 'Fiyat için teklif alın'}</span></div>`;
    const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    return `<div class="price"><b>${money(p.price)}</b>${p.oldPrice ? `<s>${money(p.oldPrice)}</s>${big ? `<span class="off">%${off}</span>` : ''}` : ''}</div>`;
  }

  function card(p) {
    const on = favs().includes(p.id);
    const meta = isB2B() ? `${esc(p.sku)} · Min. ${p.moq} adet` : esc(catOf(p.category)?.name);
    return `<a class="card" href="#/urun/${p.id}">
      ${img(p.images[0], { sizes: '(min-width:1100px) 25vw, (min-width:700px) 33vw, 50vw', alt: p.name })}
      <div class="tags">${p.tags.map(t => `<span class="tag ${t}">${TAG[t]}</span>`).join('')}</div>
      <button class="fav-btn ${on ? 'on' : ''}" data-action="fav" data-id="${p.id}" aria-label="Favori">${ICON.heart}</button>
      <div class="card-body">
        <span class="card-meta">${meta}</span>
        <span class="card-name">${esc(p.name)}</span>
        <div class="swatches">${p.colors.map(c => `<i style="background:${c.hex}" title="${esc(c.name)}"></i>`).join('')}</div>
        ${priceHTML(p)}
      </div>
    </a>`;
  }

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000);
  }

  function badges(pop) {
    const q = quote().reduce((a, i) => a + i.qty, 0), f = favs().length;
    $$('[data-badge="quote"]').forEach(b => { b.hidden = !q; b.textContent = q; if (pop === 'quote') { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } });
    $$('[data-badge="fav"]').forEach(b => { b.hidden = !f; b.textContent = f; if (pop === 'fav') { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } });
  }

  /* ---------------- Views ---------------- */
  const V = {};

  V.home = () => {
    const newest = CAT.products.filter(p => p.tags.includes('yeni'));
    const best = CAT.products.filter(p => p.tags.includes('cok-satan'));
    const perkIco = ICON.check;
    return `
    <section class="hero" aria-roledescription="carousel">
      <div class="hero-track" id="heroTrack">
        ${T.hero.map((h, i) => `<div class="slide">${img(h.image, { sizes: '100vw', eager: i === 0 })}
          <div class="slide-copy"><span class="eyebrow">${esc(h.eyebrow)}</span><h2>${esc(h.title)}</h2><p>${esc(h.text)}</p>
          <a class="btn btn-light" href="${h.link}">${esc(h.cta)}</a></div></div>`).join('')}
      </div>
      <div class="hero-dots" id="heroDots">${T.hero.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
    </section>
    <div class="perks">${T.perks.map(p => `<span class="perk">${perkIco}${esc(p)}</span>`).join('')}</div>

    <section class="section">
      <div class="wrap sec-head"><h2>Kategoriler</h2><a href="#/kategoriler">Tümü</a></div>
      <div class="cat-rail">${CAT.categories.map(c => `<a class="cat-tile" href="#/kategori/${c.slug}">${img(c.image, { sizes: '(min-width:700px) 14vw, 34vw', alt: c.name })}${esc(c.name)}</a>`).join('')}</div>
    </section>

    <section class="section">
      <div class="wrap sec-head"><h2>Yeni gelenler</h2><a href="#/liste/yeni">Tümünü gör</a></div>
      <div class="rail">${newest.map(card).join('')}</div>
    </section>

    <section class="section">
      <div class="wrap sec-head"><h2>${isB2B() ? 'Seriler' : 'Koleksiyonlar'}</h2></div>
      <div class="coll-rail">${CAT.collections.map(c => `<a class="coll" href="#/koleksiyon/${c.slug}">${img(c.image, { sizes: '(min-width:700px) 50vw, 82vw', alt: c.name })}
        <span class="count">${CAT.products.filter(p => p.collection === c.slug).length} ürün</span><div><h3>${esc(c.name)}</h3><p>${esc(c.text)}</p></div></a>`).join('')}</div>
    </section>

    <section class="section">
      <div class="wrap sec-head"><h2>${isB2B() ? 'Bayilerin favorileri' : 'Çok satanlar'}</h2><a href="#/liste/cok-satan">Tümünü gör</a></div>
      <div class="wrap"><div class="grid">${best.map(card).join('')}</div></div>
    </section>

    <section class="story"><div class="wrap">
      ${img(isB2B() ? 'scene-office' : 'scene-reading', { sizes: '(min-width:800px) 55vw, 100vw' })}
      <div>
        <span class="eyebrow">${isB2B() ? 'Üretici' : 'Showroom'}</span>
        <h2>${isB2B() ? 'Kendi fabrikamızda, kendi ustalarımızla' : 'Görün, dokunun, oturun'}</h2>
        <p>${isB2B() ? 'İnegöl’deki 12.000 m² tesisimizde masif ahşap iskeletten döşemeye kadar tüm süreç tek çatı altında. Bayilerimize özel ölçü, kumaş ve termin esnekliği sunuyoruz.' : 'Kataloğumuzdaki tüm ürünleri showroom’umuzda deneyebilir, kumaş ve renk kartelalarını yerinde inceleyebilirsiniz.'}</p>
        <div class="stats">${(isB2B() ? [['12.000', 'm² üretim'], ['380+', 'bayi'], ['38', 'yıllık tecrübe']] : [['300+', 'ürün'], ['12', 'taksit'], ['24 ay', 'garanti']]).map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div>
        <a class="btn btn-primary" href="#/iletisim">${isB2B() ? 'Bayimiz olun' : 'Showroom bilgisi'}</a>
      </div>
    </div></section>
    ${footer()}`;
  };

  const footer = () => `<footer class="footer"><div class="wrap"><span>© 2026 ${esc(T.name)} · ${esc(CAT.catalogTitle)}</span><span>${esc(T.contact.phone)}</span></div></footer>`;

  V.categories = () => `
    <div class="wrap page-head"><span class="eyebrow">${esc(CAT.catalogTitle)}</span><h1>Kategoriler</h1><p>${CAT.products.length} ürün, ${CAT.categories.length} kategori</p></div>
    <div class="wrap"><div class="cat-grid">${CAT.categories.map(c => `<a class="cat-card" href="#/kategori/${c.slug}">${img(c.image, { sizes: '(min-width:700px) 33vw, 50vw', alt: c.name })}
      <div><h3>${esc(c.name)}</h3><span>${CAT.products.filter(p => p.category === c.slug).length} ürün</span></div></a>`).join('')}</div></div>
    ${footer()}`;

  /* Liste: kategori / koleksiyon / etiket sayfaları aynı motoru kullanır.
     facet = sayfanın "diğer boyutu" (kategori sayfasında koleksiyon, koleksiyonda kategori). */
  function listing({ title, sub, cover, items, facetKey, facetOf }) {
    const L = S.list;
    const facetVals = [...new Set(items.map(p => p[facetKey]))];
    let out = L.facet === 'all' ? items
      : L.facet === 'stokta' ? items.filter(p => p.stock === 'stokta')
      : L.facet === 'indirim' ? items.filter(p => p.oldPrice)
      : items.filter(p => p[facetKey] === L.facet);
    const sorters = { rec: null, new: (a, b) => b.createdAt.localeCompare(a.createdAt), asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price, az: (a, b) => a.name.localeCompare(b.name, 'tr') };
    if (sorters[L.sort]) out = [...out].sort(sorters[L.sort]);
    const chip = (v, label) => `<button class="chip ${L.facet === v ? 'on' : ''}" data-action="facet" data-v="${v}">${label}</button>`;
    return `
      ${cover ? `<div class="cover">${img(cover, { sizes: '100vw', eager: true })}<div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div></div>` : `<div class="wrap page-head"><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>`}
      <div class="filterbar"><div class="chips">
        ${chip('all', 'Tümü')}${chip('stokta', 'Hemen teslim')}${T.showPrices && items.some(p => p.oldPrice) ? chip('indirim', 'İndirimde') : ''}
        ${facetVals.length > 1 ? facetVals.map(v => chip(v, esc(facetOf(v)?.name || v))).join('') : ''}
      </div></div>
      <div class="wrap">
        <div class="toolbar"><span class="count">${out.length} ürün</span>
          <select class="select" data-action="sort" aria-label="Sırala">
            ${[['rec', 'Önerilen'], ['new', 'En yeniler'], ...(T.showPrices ? [['asc', 'Fiyat: artan'], ['desc', 'Fiyat: azalan']] : []), ['az', 'A → Z']].map(([v, l]) => `<option value="${v}" ${L.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <div class="seg"><button class="${L.view === 'grid' ? 'on' : ''}" data-action="view" data-v="grid" aria-label="Izgara">${ICON.grid}</button><button class="${L.view === 'list' ? 'on' : ''}" data-action="view" data-v="list" aria-label="Liste">${ICON.list}</button></div>
        </div>
        <div class="grid ${L.view === 'list' ? 'list' : ''}">${out.map(card).join('') || '<p class="muted">Bu filtrede ürün yok.</p>'}</div>
      </div>
      ${footer()}`;
  }

  V.category = slug => {
    const c = catOf(slug); if (!c) return V.notFound();
    const items = CAT.products.filter(p => p.category === slug);
    return listing({ title: c.name, sub: `${items.length} ürün`, cover: c.image, items, facetKey: 'collection', facetOf: collOf });
  };
  V.collection = slug => {
    const c = collOf(slug); if (!c) return V.notFound();
    return listing({ title: c.name, sub: c.text, cover: c.image, items: CAT.products.filter(p => p.collection === slug), facetKey: 'category', facetOf: catOf });
  };
  V.tagList = tag => listing({ title: TAG[tag] === 'Yeni' ? 'Yeni gelenler' : (isB2B() && tag === 'cok-satan' ? 'Bayilerin favorileri' : TAG[tag]), sub: CAT.catalogTitle, items: CAT.products.filter(p => p.tags.includes(tag)), facetKey: 'category', facetOf: catOf });

  const dimsSVG = d => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <path d="M20 30 L70 30 L100 18 L50 18 Z M20 30 L20 70 L70 70 L70 30 M70 70 L100 58 L100 18" />
    <path d="M20 80 L70 80" stroke-dasharray="2 3"/><text x="45" y="89" text-anchor="middle">G ${d.w}</text>
    <path d="M108 58 L108 18" stroke-dasharray="2 3"/><text x="112" y="42">Y</text>
    <text x="88" y="12" text-anchor="middle">D ${d.d}</text></svg>`;

  V.product = id => {
    const p = P(id); if (!p) return V.notFound();
    const c = catOf(p.category), col = collOf(p.collection);
    const on = favs().includes(p.id);
    const sel = S.pdp.color = Math.min(S.pdp.color, p.colors.length - 1);
    const facts = isB2B()
      ? [['Minimum sipariş', `${p.moq} adet`], ['Üretim süresi', p.leadTime], ['Durum', `<span class="stock ${p.stock}">${STOCK[p.stock]}</span>`], ['Seri', esc(col?.name)]]
      : [['Durum', `<span class="stock ${p.stock}">${STOCK[p.stock]}</span>`], ['Teslimat', p.stock === 'siparis' ? '3–4 hafta' : '3–5 iş günü'], ['Garanti', '24 ay'], ['Koleksiyon', esc(col?.name)]];
    const similar = CAT.products.filter(x => x.id !== p.id && (x.category === p.category || x.collection === p.collection)).slice(0, 8);
    const addLabel = isB2B() ? 'Teklif listesine ekle' : 'Listeye ekle';
    return `
    <div class="wrap"><div class="pdp">
      <div class="gallery">
        <div class="g-track" id="gTrack">${p.images.map((im, i) => img(im, { sizes: '(min-width:900px) 55vw, 100vw', eager: i === 0, alt: p.name })).join('')}</div>
        <div class="g-dots" id="gDots">${p.images.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
        <div class="g-actions">
          <button class="fav-btn ${on ? 'on' : ''}" data-action="fav" data-id="${p.id}" aria-label="Favori">${ICON.heart}</button>
          <button class="fav-btn" data-action="share" aria-label="Paylaş">${ICON.share}</button>
        </div>
        <div class="g-thumbs">${p.images.map((im, i) => `<button class="${i ? '' : 'on'}" data-action="thumb" data-i="${i}"><img src="assets/img/sm/${im}.jpg" alt=""></button>`).join('')}</div>
      </div>
      <div class="info">
        <div class="crumbs"><a href="#/kategoriler">Katalog</a>/<a href="#/kategori/${c.slug}">${esc(c.name)}</a></div>
        <h1>${esc(p.name)}</h1>
        <span class="sku">Ürün kodu: ${esc(p.sku)}</span>
        ${T.showPrices && p.price != null
          ? `${priceHTML(p, true)}<p class="installment">12 aya varan taksitle ${money(Math.ceil(p.price / 12))}/ay</p>`
          : `<div class="ask-box"><b>${esc(T.priceLabel || 'Fiyat için teklif alın')}</b>Adet ve seçeneklerinize göre bayi fiyatı iletilir.</div>`}

        <div class="opt"><div class="opt-label">Renk: <span id="colorName">${esc(p.colors[sel].name)}</span></div>
          <div class="color-opts">${p.colors.map((cc, i) => `<button class="${i === sel ? 'on' : ''}" style="background:${cc.hex}" data-action="color" data-i="${i}" aria-label="${esc(cc.name)}"></button>`).join('')}</div></div>

        <div class="opt"><div class="opt-label">Adet${isB2B() ? ` <span>(min. ${p.moq})</span>` : ''}</div>
          <div class="qty"><button data-action="qty" data-d="-1" aria-label="Azalt">−</button><input id="qtyIn" type="number" inputmode="numeric" min="1" value="${Math.max(S.pdp.qty, isB2B() ? p.moq : 1)}"><button data-action="qty" data-d="1" aria-label="Arttır">+</button></div></div>

        <div class="cta-desk"><button class="btn btn-primary" data-action="add" data-id="${p.id}">${ICON.bag}${addLabel}</button><button class="btn btn-wa" data-action="ask" data-id="${p.id}">${ICON.wa}WhatsApp’tan sor</button></div>

        <div class="facts">${facts.map(([a, b]) => `<div class="fact"><span>${a}</span><b>${b}</b></div>`).join('')}</div>

        <div class="dims">${dimsSVG(p.dimensions)}<dl><dt>Genişlik</dt><dd>${p.dimensions.w} cm</dd><dt>Derinlik</dt><dd>${p.dimensions.d} cm</dd><dt>Yükseklik</dt><dd>${p.dimensions.h} cm</dd></dl></div>

        <div class="desc"><p>${esc(p.description)}</p><p><b style="color:var(--ink)">Malzeme:</b> ${esc(p.material)}</p>
          ${p.custom ? `<b style="color:var(--ink)">Özelleştirme</b><div class="custom-list">${p.custom.map(x => `<span>✓ ${esc(x)}</span>`).join('')}</div>` : ''}</div>
      </div>
    </div></div>
    ${similar.length ? `<section class="section"><div class="wrap sec-head"><h2>Benzer ürünler</h2></div><div class="rail">${similar.map(card).join('')}</div></section>` : ''}
    <div style="height:32px"></div>
    <div class="cta-bar"><button class="btn btn-wa" data-action="ask" data-id="${p.id}" aria-label="WhatsApp’tan sor">${ICON.wa}</button><button class="btn btn-primary" data-action="add" data-id="${p.id}">${ICON.bag}${addLabel}</button></div>`;
  };

  const empty = (icon, h, p, cta) => `<div class="wrap empty"><div class="big">${icon}</div><h2>${h}</h2><p>${p}</p><a class="btn btn-primary" href="${cta[1]}">${cta[0]}</a></div>`;

  V.favorites = () => {
    const items = favs().map(P).filter(Boolean);
    if (!items.length) return empty(ICON.heart, 'Favori listeniz boş', 'Beğendiğiniz ürünlerdeki kalbe dokunun, burada toplansın.', ['Kataloğa göz at', '#/kategoriler']);
    return `<div class="wrap page-head"><h1>Favoriler</h1><p>${items.length} ürün</p></div><div class="wrap"><div class="grid">${items.map(card).join('')}</div></div>`;
  };

  V.quote = () => {
    const q = quote().map(i => ({ ...i, p: P(i.id) })).filter(i => i.p);
    if (!q.length) return empty(ICON.bag, 'Listeniz boş', isB2B() ? 'Ürünleri teklif listesine ekleyin, tek mesajla fiyat isteyin.' : 'Ürünleri listeye ekleyin, siparişinizi WhatsApp’tan tek mesajla iletin.', ['Ürünleri keşfet', '#/kategoriler']);
    const total = q.reduce((a, i) => a + (i.p.price || 0) * i.qty, 0);
    const saved = store.get('customer', {});
    return `<div class="wrap page-head"><h1>${isB2B() ? 'Teklif listesi' : 'Sipariş listesi'}</h1><p>${q.length} kalem · ${q.reduce((a, i) => a + i.qty, 0)} adet</p></div>
    <div class="wrap q-layout">
      <div class="q-list">${q.map((i, n) => `<div class="q-item">
        <a href="#/urun/${i.p.id}">${img(i.p.images[0], { sizes: '84px' })}</a>
        <div><h3>${esc(i.p.name)}</h3><span class="card-meta">${esc(i.p.sku)} · ${esc(i.p.colors[i.color]?.name)}</span>
          ${T.showPrices && i.p.price ? `<div class="price"><b>${money(i.p.price * i.qty)}</b></div>` : ''}
          <div class="q-row"><div class="qty"><button data-action="qqty" data-n="${n}" data-d="-1">−</button><input value="${i.qty}" readonly><button data-action="qqty" data-n="${n}" data-d="1">+</button></div>
          <button class="q-remove" data-action="qdel" data-n="${n}">Kaldır</button></div></div></div>`).join('')}</div>
      <div class="q-summary">
        ${T.showPrices ? `<div class="q-total"><span>Tahmini toplam</span><b>${money(total)}</b></div><span class="card-meta">Montaj ve teslimat dahil değildir. Kesin fiyat onayla iletilir.</span>` : `<span class="card-meta">Fiyatlar adet, kumaş ve termin seçimlerinize göre hazırlanıp size iletilir.</span>`}
        <label class="field">${isB2B() ? 'Firma / Mağaza adı' : 'Ad Soyad'}<input id="cName" value="${esc(saved.name || '')}" autocomplete="${isB2B() ? 'organization' : 'name'}"></label>
        <label class="field">Şehir<input id="cCity" value="${esc(saved.city || '')}" autocomplete="address-level2"></label>
        <label class="field">Not (isteğe bağlı)<textarea id="cNote" rows="2" placeholder="${isB2B() ? 'Özel ölçü, kumaş kodu, termin…' : 'Teslimat tarihi, kat bilgisi…'}">${esc(saved.note || '')}</textarea></label>
        <button class="btn btn-wa btn-block" data-action="send">${ICON.wa}${isB2B() ? 'Teklifi WhatsApp’tan iste' : 'Siparişi WhatsApp’tan gönder'}</button>
        <button class="btn btn-ghost btn-block" data-action="share">${ICON.share}Kataloğu paylaş</button>
      </div>
    </div>`;
  };

  V.contact = () => {
    const c = T.contact;
    const items = [[ICON.wa, 'WhatsApp', '+' + c.whatsapp, `https://wa.me/${c.whatsapp}`], [ICON.phone, 'Telefon', c.phone, `tel:${c.phone.replace(/\s/g, '')}`], [ICON.mail, 'E-posta', c.email, `mailto:${c.email}`], [ICON.pin, isB2B() ? 'Fabrika' : 'Showroom', c.address, `https://maps.google.com/?q=${encodeURIComponent(c.address)}`], [ICON.clock, 'Çalışma saatleri', c.hours, null], [ICON.insta, 'Instagram', '@' + c.instagram, `https://instagram.com/${c.instagram}`]];
    return `<div class="wrap page-head"><span class="eyebrow">${esc(T.tagline)}</span><h1>İletişim</h1></div>
    <div class="wrap"><div class="contact-grid">${items.map(([i, l, v, h]) => `<${h ? `a href="${h}" target="_blank" rel="noopener"` : 'div'} class="c-item"><span class="ico">${i}</span><div><span>${l}</span><b>${esc(v)}</b></div></${h ? 'a' : 'div'}>`).join('')}</div>
    ${TENANTS.tenants.length > 1 ? `<div class="demo-switch"><span class="eyebrow">Demo · Firma değiştir</span><p class="muted" style="margin:6px 0 0;font-size:var(--fs-small)">Aynı altyapı, farklı firma config’i.</p><div class="chips">${TENANTS.tenants.map(t => `<a class="chip ${t.id === TID ? 'on' : ''}" href="?firma=${t.id}">${esc(t.name)} · ${esc(t.type)}</a>`).join('')}</div></div>` : ''}
    </div>${footer()}`;
  };

  V.notFound = () => empty(ICON.close, 'Sayfa bulunamadı', 'Aradığınız ürün kaldırılmış olabilir.', ['Ana sayfaya dön', '#/']);

  /* ---------------- Router ---------------- */
  const ROUTES = [
    [/^#?\/?$/, () => V.home(), 'home'],
    [/^#\/kategoriler$/, () => V.categories(), 'cats'],
    [/^#\/kategori\/([\w-]+)$/, m => V.category(m[1]), 'cats'],
    [/^#\/koleksiyon\/([\w-]+)$/, m => V.collection(m[1]), 'home'],
    [/^#\/liste\/([\w-]+)$/, m => V.tagList(m[1]), 'home'],
    [/^#\/urun\/([\w-]+)$/, m => V.product(m[1]), 'pdp'],
    [/^#\/favoriler$/, () => V.favorites(), 'favs'],
    [/^#\/teklif$/, () => V.quote(), 'quote'],
    [/^#\/iletisim$/, () => V.contact(), 'contact']
  ];
  let lastHash = null;

  function render(soft) {
    const h = location.hash || '#/';
    if (lastHash && !soft) S.scroll[lastHash] = scrollY;
    const [re, fn, tab] = ROUTES.find(([re]) => re.test(h)) || [null, V.notFound, ''];
    if (!soft && h !== lastHash) {
      if (/^#\/(kategori|koleksiyon|liste)\//.test(h) && S.listHash !== h) { S.list.facet = 'all'; S.listHash = h; }
      if (h.startsWith('#/urun/')) S.pdp = { color: 0, qty: 1 };
    }
    const html = fn(re ? h.match(re) : null);
    const swap = () => {
      $('#view').innerHTML = html;
      document.body.classList.toggle('pdp', tab === 'pdp');
      $$('.tabbar a, .desk-nav a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
      $('.back').hidden = tab === 'home' && h.length <= 2;
      badges(); mount(tab);
      if (!soft) scrollTo({ top: S.byClick ? 0 : (S.scroll[h] || 0), behavior: 'instant' });
      S.byClick = false; lastHash = h;
    };
    if (!soft && document.startViewTransition && lastHash) document.startViewTransition(swap); else swap();
  }

  /* View'e özel davranışlar (karusel, galeri) */
  function mount(tab) {
    clearInterval(S.hero);
    const ht = $('#heroTrack');
    if (ht) {
      const dots = $$('#heroDots i'); let idx = 0, paused = false;
      const setDot = i => { if (i === idx) return; idx = i; dots.forEach((d, j) => { d.classList.remove('on'); if (j === i) { void d.offsetWidth; d.classList.add('on'); } }); };
      ht.addEventListener('scroll', () => setDot(Math.round(ht.scrollLeft / ht.clientWidth)), { passive: true });
      ht.addEventListener('pointerdown', () => { paused = true; }, { passive: true });
      S.hero = setInterval(() => { if (paused || document.hidden) return; ht.scrollTo({ left: ((idx + 1) % dots.length) * ht.clientWidth, behavior: 'smooth' }); }, 5000);
    }
    const gt = $('#gTrack');
    if (gt) {
      const dots = $$('#gDots i'), th = $$('.g-thumbs button');
      gt.addEventListener('scroll', () => { const i = Math.round(gt.scrollLeft / gt.clientWidth); dots.forEach((d, j) => d.classList.toggle('on', j === i)); th.forEach((d, j) => d.classList.toggle('on', j === i)); }, { passive: true });
      gt.addEventListener('click', e => { const im = e.target.closest('img'); if (im) openLightbox(im.currentSrc.replace('/sm/', '/')); });
    }
  }

  function openLightbox(src) {
    const lb = $('#lightbox');
    lb.innerHTML = `<img src="${src}" alt=""><button data-action="close-lb" aria-label="Kapat">${ICON.close}</button>`;
    lb.hidden = false; document.body.style.overflow = 'hidden';
  }

  /* ---------------- Aksiyonlar ---------------- */
  function addToQuote(id) {
    const p = P(id), qty = Math.max(1, parseInt($('#qtyIn')?.value) || 1);
    if (isB2B() && qty < p.moq) { toast(`Minimum sipariş ${p.moq} adet`); $('#qtyIn').value = p.moq; return; }
    const q = quote(), ex = q.find(i => i.id === id && i.color === S.pdp.color);
    ex ? ex.qty += qty : q.push({ id, color: S.pdp.color, qty });
    store.set('quote', q); badges('quote');
    toast(`Listeye eklendi · ${p.colors[S.pdp.color].name}`);
  }

  function waLink(text) { return `https://wa.me/${T.contact.whatsapp}?text=${encodeURIComponent(text)}`; }
  function productURL(id) { return `${location.origin}${location.pathname}?firma=${TID}#/urun/${id}`; }

  function sendQuote() {
    const cust = { name: $('#cName').value.trim(), city: $('#cCity').value.trim(), note: $('#cNote').value.trim() };
    store.set('customer', cust);
    const q = quote().map(i => ({ ...i, p: P(i.id) })).filter(i => i.p);
    const lines = q.map((i, n) => `${n + 1}) ${i.p.name} [${i.p.sku}]\n   Renk: ${i.p.colors[i.color]?.name} · ${i.qty} adet${T.showPrices && i.p.price ? ` · ${money(i.p.price * i.qty)}` : ''}`);
    const total = T.showPrices ? `\n\nTahmini toplam: ${money(q.reduce((a, i) => a + (i.p.price || 0) * i.qty, 0))}` : '';
    const msg = `Merhaba ${T.name}, ${CAT.catalogTitle} üzerinden ${isB2B() ? 'fiyat teklifi almak' : 'sipariş vermek'} istiyorum:\n\n${lines.join('\n')}${total}${cust.name ? `\n\n${isB2B() ? 'Firma' : 'Ad'}: ${cust.name}` : ''}${cust.city ? `\nŞehir: ${cust.city}` : ''}${cust.note ? `\nNot: ${cust.note}` : ''}`;
    window.open(waLink(msg), '_blank', 'noopener');
  }

  async function share() {
    const pid = (location.hash.match(/^#\/urun\/([\w-]+)/) || [])[1];
    const url = pid ? productURL(pid) : `${location.origin}${location.pathname}?firma=${TID}`;
    const title = pid ? `${P(pid).name} · ${T.name}` : `${T.name} · ${CAT.catalogTitle}`;
    if (navigator.share) { try { await navigator.share({ title, url }); } catch {} return; }
    try { await navigator.clipboard.writeText(url); toast('Bağlantı kopyalandı'); } catch { prompt('Bağlantı', url); }
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (a) S.byClick = true;
    const el = e.target.closest('[data-action]'); if (!el) return;
    const act = el.dataset.action, id = el.dataset.id;
    if (['fav', 'share'].includes(act) || el.closest('a')) e.preventDefault();
    switch (act) {
      case 'back': history.length > 1 ? history.back() : (location.hash = '#/'); break;
      case 'search': openSearch(); break;
      case 'close-search': closeSearch(); break;
      case 'close-lb': $('#lightbox').hidden = true; document.body.style.overflow = ''; break;
      case 'fav': {
        let f = favs(); const on = !f.includes(id);
        f = on ? [...f, id] : f.filter(x => x !== id); store.set('fav', f);
        $$(`[data-action="fav"][data-id="${id}"]`).forEach(b => b.classList.toggle('on', on));
        badges('fav'); toast(on ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı');
        if (!on && location.hash === '#/favoriler') render(true);
        break;
      }
      case 'share': share(); break;
      case 'facet': S.list.facet = el.dataset.v; render(true); break;
      case 'view': S.list.view = el.dataset.v; render(true); break;
      case 'color': {
        S.pdp.color = +el.dataset.i;
        $$('.color-opts button').forEach((b, i) => b.classList.toggle('on', i === S.pdp.color));
        $('#colorName').textContent = P(location.hash.split('/').pop()).colors[S.pdp.color].name; break;
      }
      case 'qty': { const i = $('#qtyIn'); i.value = Math.max(1, (parseInt(i.value) || 1) + +el.dataset.d); break; }
      case 'thumb': { const gt = $('#gTrack'); gt.scrollTo({ left: +el.dataset.i * gt.clientWidth, behavior: 'smooth' }); break; }
      case 'add': addToQuote(id); break;
      case 'ask': { const p = P(id); window.open(waLink(`Merhaba, ${p.name} (${p.sku}) hakkında bilgi almak istiyorum.\n${productURL(id)}`), '_blank', 'noopener'); break; }
      case 'qqty': case 'qdel': {
        const q = quote(), n = +el.dataset.n;
        if (act === 'qdel') q.splice(n, 1); else q[n].qty = Math.max(1, q[n].qty + +el.dataset.d);
        store.set('quote', q); render(true); break;
      }
      case 'send': sendQuote(); break;
    }
  });
  document.addEventListener('change', e => { if (e.target.dataset.action === 'sort') { S.list.sort = e.target.value; render(true); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSearch(); $('#lightbox').hidden = true; document.body.style.overflow = ''; } });
  addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', scrollY > 4), { passive: true });

  /* ---------------- Arama ---------------- */
  function openSearch() {
    $('#searchSheet').hidden = false; document.body.style.overflow = 'hidden';
    const i = $('#searchInput'); i.value = ''; runSearch(''); setTimeout(() => i.focus(), 50);
  }
  function closeSearch() { $('#searchSheet').hidden = true; document.body.style.overflow = ''; }
  function hit(p, q) {
    let name = esc(p.name);
    if (q) { const i = norm(p.name).indexOf(q); if (i > -1) name = esc(p.name.slice(0, i)) + '<mark>' + esc(p.name.slice(i, i + q.length)) + '</mark>' + esc(p.name.slice(i + q.length)); }
    return `<a class="s-hit" href="#/urun/${p.id}">${img(p.images[0], { sizes: '56px' })}<div><b>${name}</b><span>${esc(p.sku)} · ${esc(catOf(p.category).name)}${T.showPrices && p.price ? ' · ' + money(p.price) : ''}</span></div></a>`;
  }
  function runSearch(raw) {
    const q = norm(raw.trim()), body = $('#searchBody');
    if (!q) {
      body.innerHTML = `<div class="wrap"><p>Kategoriler</p><div class="chips" style="padding:0;flex-wrap:wrap">${CAT.categories.map(c => `<a class="chip" href="#/kategori/${c.slug}">${esc(c.name)}</a>`).join('')}</div>
        <p style="margin-top:24px">Popüler</p>${CAT.products.filter(p => p.tags.includes('cok-satan')).map(p => hit(p)).join('')}</div>`;
      return;
    }
    const res = CAT.products.map(p => {
      const hay = norm([p.name, p.sku, p.material, catOf(p.category)?.name, collOf(p.collection)?.name, ...p.colors.map(c => c.name)].join(' '));
      const score = q.split(/\s+/).every(w => hay.includes(w)) ? (norm(p.name).startsWith(q) ? 3 : norm(p.name).includes(q) ? 2 : 1) : 0;
      return [score, p];
    }).filter(([s]) => s).sort((a, b) => b[0] - a[0]).map(([, p]) => p);
    body.innerHTML = `<div class="wrap"><p>${res.length} sonuç</p>${res.map(p => hit(p, q)).join('') || '<span class="muted">Sonuç yok. Farklı bir kelime deneyin.</span>'}</div>`;
  }
  $('#searchInput').addEventListener('input', e => runSearch(e.target.value));
  $('#searchBody').addEventListener('click', e => { if (e.target.closest('a')) { S.byClick = true; closeSearch(); } });

  /* ---------------- Tema + açılış ---------------- */
  function applyTheme() {
    const t = T.theme, r = document.documentElement.style;
    const map = { bg: '--bg', surface: '--surface', surface2: '--surface2', ink: '--ink', muted: '--muted', line: '--line', accent: '--accent', accentInk: '--accent-ink', sale: '--sale', radius: '--radius' };
    Object.entries(map).forEach(([k, v]) => t[k] && r.setProperty(v, t[k]));
    r.setProperty('--font-display', `"${t.fontDisplay}", Georgia, serif`);
    r.setProperty('--font-body', `"${t.fontBody}", system-ui, sans-serif`);
    r.colorScheme = t.scheme || 'light';
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = t.fontsUrl; document.head.append(l);
    $('meta[name="theme-color"]').content = t.bg;
    document.title = `${T.name} · ${CAT.catalogTitle}`;
    const ico = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${t.accent}"/><text x="32" y="43" font-family="Georgia" font-size="32" font-weight="700" text-anchor="middle" fill="${t.accentInk}">${T.name[0]}</text></svg>`;
    const f = document.createElement('link'); f.rel = 'icon'; f.href = 'data:image/svg+xml,' + encodeURIComponent(ico); document.head.append(f);
    $('#brand').innerHTML = `<span class="mark">${esc(T.name[0])}</span>${esc(T.shortName || T.name)}`;
    $('#deskNav').innerHTML = [['#/', 'home', 'Ana sayfa'], ['#/kategoriler', 'cats', 'Kategoriler'], ['#/favoriler', 'favs', 'Favoriler'], ['#/iletisim', 'contact', 'İletişim']].map(([h, t, l]) => `<a href="${h}" data-tab="${t}">${l}</a>`).join('');
  }

  async function boot() {
    const j = u => fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
    TENANTS = await j('tenants/index.json');
    const want = new URLSearchParams(location.search).get('firma');
    TID = TENANTS.tenants.some(t => t.id === want) ? want : TENANTS.default;
    [T, CAT] = await Promise.all([j(`tenants/${TID}/config.json`), j(`tenants/${TID}/catalog.json`)]);
    applyTheme();
    addEventListener('hashchange', () => render());
    render();
  }
  boot().catch(err => { $('#view').innerHTML = `<div class="wrap empty"><h2>Katalog yüklenemedi</h2><p>${esc(err.message)}</p></div>`; });
})();
