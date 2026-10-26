(function () {
  var S = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Имя и город из config.js
  if (S.name) {
    $$("[data-name]").forEach(function (el) { el.textContent = S.name; });
    document.title = S.name + " — боты записи и сайты для бизнеса";
  }
  if (S.city) $$("[data-city]").forEach(function (el) { el.textContent = S.city; });
  $("#year").textContent = new Date().getFullYear();

  // Кнопки связи: показываем только заполненные
  var tg = S.telegram ? "https://t.me/" + S.telegram.replace(/^@/, "") : "";
  var links = [
    tg && { href: tg, ico: "✈️", bg: "#229ED9", t: "Telegram", s: "@" + S.telegram.replace(/^@/, "") },
    S.max && { href: S.max, ico: "💬", bg: "#7c3aed", t: "MAX", s: "написать в MAX" },
    S.phone && { href: "tel:" + S.phone.replace(/[^\d+]/g, ""), ico: "📞", bg: "#16a34a", t: "Позвонить", s: S.phone },
    S.email && { href: "mailto:" + S.email, ico: "✉️", bg: "#475569", t: "Почта", s: S.email }
  ].filter(Boolean);
  var box = $("#links");
  links.forEach(function (l) {
    var a = document.createElement("a");
    a.href = l.href;
    if (/^https?:/.test(l.href)) { a.target = "_blank"; a.rel = "noopener"; }
    a.innerHTML = '<span class="ico" style="background:' + l.bg + '">' + l.ico + "</span><span>" + l.t + "<small></small></span>";
    a.querySelector("small").textContent = l.s;
    box.appendChild(a);
  });

  var plats = [["Kwork", S.kwork], ["FL.ru", S.fl], ["Авито", S.avito]].filter(function (p) { return p[1]; });
  $("#platforms").innerHTML = plats.map(function (p) {
    return '<a href="' + encodeURI(p[1]) + '" target="_blank" rel="noopener">' + p[0] + "</a>";
  }).join(" · ");

  // Мобильное меню
  var burger = $(".burger"), nav = $("#nav");
  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
  });
  $$("#nav a").forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", false); }); });

  // Фильтр работ
  $$(".chip").forEach(function (c) {
    c.addEventListener("click", function () {
      $$(".chip").forEach(function (x) { x.classList.toggle("is-on", x === c); });
      var f = c.dataset.f;
      $$(".case").forEach(function (el) {
        el.hidden = f !== "all" && el.dataset.tags.split(" ").indexOf(f) < 0;
      });
    });
  });

  // Увеличение скриншотов
  var lb = $("#lb"), lbImg = $("img", lb);
  $$(".case__gallery img").forEach(function (img) {
    img.addEventListener("click", function () { lbImg.src = img.src; lbImg.alt = img.alt; lb.hidden = false; });
  });
  lb.addEventListener("click", function () { lb.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") lb.hidden = true; });

  // Форма заявки
  var form = $("#form"), note = $("#formNote");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form._gotcha.value) return;
    var d = { name: form.name.value.trim(), contact: form.contact.value.trim(), msg: form.msg.value.trim() };
    var text = "Заявка с сайта\nИмя: " + d.name + "\nКонтакт: " + d.contact + "\nЗадача: " + d.msg;

    if (S.formEndpoint) {
      note.textContent = "Отправляю…";
      fetch(S.formEndpoint, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ "Имя": d.name, "Контакт": d.contact, "Задача": d.msg, _subject: "Заявка с сайта-портфолио", _gotcha: form._gotcha.value }) })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw (j.errors || []).map(function (e) { return e.message; }).join(", ") || 0; });
          form.reset();
          note.textContent = "Спасибо! Заявка отправлена, отвечу в течение дня.";
        })
        .catch(function (err) { note.textContent = "Не получилось отправить" + (err ? " (" + err + ")" : "") + ". Напишите, пожалуйста, в мессенджер слева."; });
      return;
    }
    if (tg) {
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
      note.textContent = "Текст заявки скопирован. Откроется Telegram: вставьте его в чат и отправьте.";
      window.open(tg, "_blank", "noopener");
    } else if (S.email) {
      location.href = "mailto:" + S.email + "?subject=" + encodeURIComponent("Заявка с сайта") + "&body=" + encodeURIComponent(text);
    } else {
      note.textContent = "Форма пока не подключена: заполните контакты в config.js.";
    }
  });
})();
