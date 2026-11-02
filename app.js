// Сайт-мессенджер: бот рассказывает об услугах, показывает работы и принимает заявку прямо в чате.
// Весь текст берётся из скрытого блока #src (он же виден поисковикам и без JavaScript).
(function () {
  var S = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var feed = $("#feed"), replies = $("#replies"), statusEl = $("#status"), src = $("#src");
  var tg = S.telegram ? "https://t.me/" + S.telegram.replace(/^@/, "") : "";

  // ---------- профиль ----------
  if (S.name) $$("[data-name]").forEach(function (el) { el.textContent = S.name; });
  if (S.city) $$("[data-city]").forEach(function (el) { el.textContent = S.city; });
  $("#year").textContent = new Date().getFullYear();
  var contacts = [
    tg && { href: tg, ico: "✈️", t: "Telegram", s: "@" + S.telegram.replace(/^@/, "") },
    S.max && { href: S.max, ico: "💬", t: "MAX", s: "написать в MAX" },
    S.phone && { href: "tel:" + S.phone.replace(/[^\d+]/g, ""), ico: "📞", t: "Позвонить", s: S.phone },
    S.email && { href: "mailto:" + S.email, ico: "✉️", t: "Почта", s: S.email }
  ].filter(Boolean);
  function contactLinks(cls) {
    var box = document.createElement("div"); box.className = cls;
    contacts.forEach(function (l) {
      var a = document.createElement("a"); a.href = l.href;
      if (/^https?:/.test(l.href)) { a.target = "_blank"; a.rel = "noopener"; }
      a.innerHTML = '<span class="ico">' + l.ico + "</span><span><b></b><small></small></span>";
      a.querySelector("b").textContent = l.t; a.querySelector("small").textContent = l.s;
      box.appendChild(a);
    });
    return box;
  }
  $("#links").appendChild(contactLinks("links"));
  var plats = [["Kwork", S.kwork], ["FL.ru", S.fl], ["Авито", S.avito]].filter(function (p) { return p[1]; });
  $("#platforms").innerHTML = plats.map(function (p) { return '· <a href="' + encodeURI(p[1]) + '" target="_blank" rel="noopener">' + p[0] + "</a>"; }).join(" ");

  var side = $("#side");
  $("#sideOpen").addEventListener("click", function () { side.classList.add("is-open"); });
  $("#sideClose").addEventListener("click", function () { side.classList.remove("is-open"); });

  // ---------- данные из #src ----------
  var services = $$("#services .card").map(function (c) {
    return { title: $("h3", c).textContent, items: $$("li", c).map(function (li) { return li.textContent; }), accent: c.classList.contains("card--accent") };
  });
  var extras = $$("#services .extra > div").map(function (d) { return d.innerHTML; });
  var cases = $$("#cases .case").filter(function (c) { return $(".case__gallery", c); }).map(function (c) {
    var body = $(".case__body", c);
    var link = $("a.link", body);
    return {
      title: $("h3", body).textContent,
      imgs: $$("img", c).map(function (i) { return { src: i.getAttribute("src"), alt: i.alt }; }),
      paras: $$("p:not(.tags)", body).map(function (p) { return p.innerHTML; }),
      tags: ($(".tags", body) || {}).textContent || "",
      link: link ? { href: link.href, text: link.textContent } : null,
      dark: !!$(".case__gallery--dark", c), tall: !!$(".case__gallery--tall", c)
    };
  });
  var more = $$("#cases .more li").map(function (li) { return li.innerHTML; });
  var steps = $$("#how .steps li").map(function (li) { return { b: $("b", li).textContent, t: $("span", li).textContent }; });
  var faq = $$("#how .faq details").map(function (d) { return { q: $("summary", d).textContent, a: $("p", d).textContent }; });

  // ---------- вывод сообщений ----------
  function now() { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function scrollDown() {
    requestAnimationFrame(function () { feed.scrollTo({ top: feed.scrollHeight, behavior: reduce ? "auto" : "smooth" }); });
  }
  function bubble(who, content, opts) {
    opts = opts || {};
    var row = document.createElement("div");
    row.className = "row row--" + who + (opts.wide ? " row--wide" : "") + (opts.bare ? " row--bare" : "");
    var b = document.createElement("div"); b.className = "msg";
    if (typeof content === "string") b.innerHTML = content; else b.appendChild(content);
    if (!opts.bare) {
      var meta = document.createElement("span"); meta.className = "msg__meta";
      meta.innerHTML = now() + (who === "me" ? ' <i class="tick">✓</i>' : "");
      b.appendChild(meta);
    }
    row.appendChild(b);
    feed.appendChild(row);
    scrollDown();
    return row;
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // очередь ответов бота с «печатает…»
  var queue = Promise.resolve(), busy = 0;
  function setTyping(on) {
    busy += on ? 1 : -1;
    statusEl.textContent = busy > 0 ? "печатает…" : "в сети";
    statusEl.classList.toggle("is-typing", busy > 0);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? Math.min(ms, 80) : ms); }); }
  function say(content, opts) {
    queue = queue.then(function () {
      var len = typeof content === "string" ? content.replace(/<[^>]+>/g, "").length : 120;
      var dots = el("div", "row row--bot row--typing", '<div class="msg"><i></i><i></i><i></i></div>');
      setTyping(true); feed.appendChild(dots); scrollDown();
      return wait(Math.min(450 + len * 9, 1500)).then(function () {
        dots.remove(); setTyping(false);
        bubble("bot", content, opts);
        return wait(220);
      });
    });
    return queue;
  }
  function after(fn) { queue = queue.then(fn); return queue; }
  function userSays(text) {
    var sp = el("span"); sp.textContent = text;
    var row = bubble("me", sp);
    $$(".row--me .tick").forEach(function (t) { t.textContent = "✓✓"; t.classList.add("is-read"); });
    setTimeout(function () { var t = $(".tick", row); if (t) { t.textContent = "✓✓"; t.classList.add("is-read"); } }, 600);
    return row;
  }

  // ---------- быстрые ответы ----------
  var TOPICS = [
    ["services", "Что ты делаешь?"],
    ["cases", "Покажи работы"],
    ["how", "Как ты работаешь?"],
    ["price", "Сколько стоит?"],
    ["faq", "Частые вопросы"],
    ["contact", "Оставить заявку ✍️"]
  ];
  var seen = {};
  function showReplies(list) {
    replies.innerHTML = "";
    var items = list || TOPICS.filter(function (t) { return !seen[t[0]]; }).concat(TOPICS.filter(function (t) { return seen[t[0]] && t[0] === "contact"; }));
    if (!list && items.length < 3) items = TOPICS.slice();
    items.forEach(function (t, i) {
      var b = el("button", "qr" + (t[0] === "contact" ? " qr--main" : ""), "");
      b.type = "button"; b.textContent = t[1];
      b.style.setProperty("--i", i);
      b.addEventListener("click", function () { go(t[0], t[1]); });
      replies.appendChild(b);
    });
  }
  function hideReplies() { replies.innerHTML = ""; }

  function go(topic, label) {
    hideReplies();
    if (label) userSays(label);
    seen[topic] = 1;
    (H[topic] || H.unknown)();
    after(function () { showReplies(); });
  }

  // ---------- сценарии ----------
  var H = {};
  H.hello = function () {
    say('<span class="sticker" aria-hidden="true">👋</span>', { bare: true });
    say("Привет! Я <b>" + (S.name || "Данила") + "</b>, делаю ботов онлайн-записи и сайты для бизнеса.");
    say("Кстати, этот сайт тоже бот 🙂 Так же просто ваши клиенты будут записываться к вам: нажал кнопку, получил ответ. С чего начнём?");
  };
  H.services = function () {
    say("Вот три основных продукта. Листайте вбок 👉");
    var row = el("div", "carousel");
    services.forEach(function (s) {
      var c = el("div", "svc" + (s.accent ? " svc--accent" : ""));
      c.appendChild(el("b", "svc__t", s.title));
      var ul = el("ul"); s.items.forEach(function (t) { ul.appendChild(el("li", null, t)); });
      c.appendChild(ul);
      row.appendChild(c);
    });
    say(row, { wide: true, bare: true });
    if (extras.length) say("А ещё:<br>" + extras.map(function (x) { return "• " + x; }).join("<br>"));
    say("Хотите посмотреть, как это будет у вас? Демо под ваш бизнес делаю бесплатно.");
  };
  H.cases = function () {
    say("Вот что уже сделал. Нажмите на карточку, расскажу подробнее.");
    var row = el("div", "carousel");
    cases.forEach(function (c, i) {
      var card = el("button", "case");
      card.type = "button";
      card.innerHTML = '<span class="case__img' + (c.dark ? " is-dark" : "") + '"><img loading="lazy" alt=""></span><b></b><small></small>';
      $("img", card).src = c.imgs[0].src; $("img", card).alt = c.imgs[0].alt;
      $("b", card).textContent = c.title.split(" — ")[0];
      $("small", card).textContent = c.title.split(" — ")[1] || c.tags;
      card.addEventListener("click", function () { hideReplies(); userSays("Подробнее про " + c.title.split(" — ")[0]); H.caseOne(i); after(function () { showReplies(); }); });
      row.appendChild(card);
    });
    say(row, { wide: true, bare: true });
    if (more.length) say("<b>Ещё проекты</b><ul class='more'>" + more.map(function (m) { return "<li>" + m + "</li>"; }).join("") + "</ul>");
  };
  H.caseOne = function (i) {
    var c = cases[i];
    var g = el("div", "gal" + (c.tall ? " gal--tall" : "") + (c.dark ? " gal--dark" : ""));
    c.imgs.forEach(function (im) {
      var img = el("img"); img.src = im.src; img.alt = im.alt; img.loading = "lazy";
      img.addEventListener("click", function () { openLb(im); });
      g.appendChild(img);
    });
    say(g, { wide: true, bare: true });
    var html = "<b>" + c.title + "</b>" + c.paras.map(function (p) { return "<p>" + p + "</p>"; }).join("") +
      (c.tags ? '<p class="tags">' + c.tags + "</p>" : "") +
      (c.link ? '<a class="btnlink" href="' + c.link.href + '" target="_blank" rel="noopener">' + c.link.text + "</a>" : "");
    say(html);
  };
  H.how = function () {
    say("Работаю так, чтобы вы ничем не рисковали:");
    var ol = el("ol", "steps");
    steps.forEach(function (s, i) { var li = el("li", null, "<b></b><span></span>"); $("b", li).textContent = s.b; $("span", li).textContent = s.t; li.style.setProperty("--i", i); ol.appendChild(li); });
    say(ol);
    say("Срок обычно 3–5 дней от заявки до запуска.");
  };
  H.price = function () {
    say("Цену считаю под вашу задачу и фиксирую до начала работы, без сюрпризов потом.");
    say("Демо бесплатно. Платите, только если понравилось: 50% после демо и 50% после запуска.");
    say("Опишите задачу в паре слов, и я назову точную сумму 👇");
  };
  H.faq = function () {
    var box = el("div", "faq");
    faq.forEach(function (f) {
      var d = el("details"); var s = el("summary"); s.textContent = f.q; var p = el("p"); p.textContent = f.a;
      d.appendChild(s); d.appendChild(p); box.appendChild(d);
    });
    say("Что спрашивают чаще всего:");
    say(box);
  };
  H.contact = function (prefill) {
    say("Оставьте контакт, отвечу в течение дня. Или напишите напрямую:");
    say(contactLinks("links links--chat"));
    say(buildForm(prefill), { wide: true });
  };
  H.all = function () { ["services", "cases", "how", "contact"].forEach(function (t) { seen[t] = 1; H[t](); }); };
  H.unknown = function (text) {
    say("Я пока простой бот и понимаю не всё 🙈 Но могу передать ваше сообщение Даниле, он ответит сам.");
    H.contact(text);
  };

  // ---------- свободный ввод ----------
  var RULES = [
    [/цен|стоим|сколько|прайс|деньг|бюджет|₽|руб/i, "price"],
    [/работ|кейс|портф|пример|покаж|проект/i, "cases"],
    [/как .*работа|этап|процесс|срок|долго|дн[еяи]/i, "how"],
    [/вопрос|whatsapp|ватсап|самозан|юрлиц|настраива/i, "faq"],
    [/заявк|связ|контакт|телефон|номер|телег|напис|позвон|почт/i, "contact"],
    [/услуг|делаешь|умеешь|бот|сайт|ленд|плагин|minecraft|майн/i, "services"],
    [/всё|все сразу/i, "all"]
  ];
  $("#composer").addEventListener("submit", function (e) {
    e.preventDefault();
    var inp = $("#say"), text = inp.value.trim();
    if (!text) return;
    inp.value = ""; hideReplies(); userSays(text);
    if (/^(привет|здравств|добр|хай|hi|hello)/i.test(text)) {
      say("Здравствуйте! 😊 Спрашивайте про услуги, работы, сроки или цену.");
    } else {
      var hit = null;
      for (var i = 0; i < RULES.length && !hit; i++) if (RULES[i][0].test(text)) hit = RULES[i][1];
      if (hit) { seen[hit] = 1; H[hit](); } else H.unknown(text);
    }
    after(function () { showReplies(); });
  });
  $("#headCta").addEventListener("click", function (e) { e.preventDefault(); side.classList.remove("is-open"); go("contact", "Хочу оставить заявку"); });

  // ---------- форма заявки в чате ----------
  function buildForm(prefill) {
    var f = el("form", "form");
    f.innerHTML =
      '<b class="form__t">Заявка</b>' +
      '<label>Как вас зовут<input name="name" required autocomplete="name"></label>' +
      '<label>Телефон или ник в мессенджере<input name="contact" required></label>' +
      '<label>Что нужно сделать<textarea name="msg" rows="3" placeholder="Например: бот записи для салона, 3 мастера"></textarea></label>' +
      '<input type="text" name="_gotcha" class="hp" tabindex="-1" autocomplete="off">' +
      '<button class="send" type="submit">Отправить заявку</button><p class="form__note"></p>';
    if (prefill) f.msg.value = prefill;
    var note = $(".form__note", f);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (f._gotcha.value) return;
      var d = { name: f.name.value.trim(), contact: f.contact.value.trim(), msg: f.msg.value.trim() };
      var text = "Заявка с сайта\nИмя: " + d.name + "\nКонтакт: " + d.contact + "\nЗадача: " + d.msg;
      function done() {
        f.classList.add("is-sent");
        $$("input,textarea,button", f).forEach(function (x) { x.disabled = true; });
        say("Получил! 🎉 " + d.name + ", отвечу в течение дня.");
        after(function () { showReplies(); });
      }
      if (S.formEndpoint) {
        note.textContent = "Отправляю…";
        fetch(S.formEndpoint, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ "Имя": d.name, "Контакт": d.contact, "Задача": d.msg, _subject: "Заявка с сайта-портфолио", _gotcha: "" }) })
          .then(function (r) { if (!r.ok) throw 0; note.textContent = ""; done(); })
          .catch(function () {
            note.textContent = "Не получилось отправить. Напишите, пожалуйста, в Telegram.";
            if (tg) { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); window.open(tg, "_blank", "noopener"); }
          });
      } else if (tg) {
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        note.textContent = "Текст скопирован, вставьте его в Telegram.";
        window.open(tg, "_blank", "noopener");
      } else if (S.email) {
        location.href = "mailto:" + S.email + "?subject=" + encodeURIComponent("Заявка с сайта") + "&body=" + encodeURIComponent(text);
      }
    });
    return f;
  }

  // ---------- просмотр картинок ----------
  var lb = $("#lb"), lbImg = $("img", lb);
  function openLb(im) { lbImg.src = im.src; lbImg.alt = im.alt; lb.hidden = false; }
  lb.addEventListener("click", function () { lb.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { lb.hidden = true; side.classList.remove("is-open"); } });

  // ---------- старт ----------
  src.setAttribute("aria-hidden", "true");
  var startTopic = (location.hash || "").replace("#", "");
  H.hello();
  if (H[startTopic] && startTopic !== "hello") { after(function () { go(startTopic, (TOPICS.filter(function (t) { return t[0] === startTopic; })[0] || [0, ""])[1]); }); }
  else after(function () { showReplies(); });
})();
