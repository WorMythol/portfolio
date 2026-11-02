// Анимации сайта: появление блоков, смена слов, чат в телефоне, наклон карточек, свечение за курсором.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // --- Бегущая строка: дублируем ленту для бесшовной прокрутки ---
  var track = $(".marquee__track");
  if (track) $$("span", track).forEach(function (s) { var c = s.cloneNode(true); c.setAttribute("aria-hidden", "true"); track.appendChild(c); });

  // --- Фильтр работ: плавное появление ---
  $$(".chip").forEach(function (c) {
    c.addEventListener("click", function () {
      $$(".case").forEach(function (el) {
        el.classList.remove("is-filter-in");
        if (!el.hidden) { void el.offsetWidth; el.classList.add("is-filter-in", "is-in"); }
      });
    });
  });

  // --- Заголовки по словам ---
  $$("[data-split]").forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map(function (w, i) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + w + "</span></span>";
    }).join(" ");
  });

  // --- Появление при прокрутке (с лесенкой для соседей) ---
  var revealEls = $$("[data-reveal],[data-split]");
  revealEls.forEach(function (el) {
    var p = el.parentElement, sibs = $$(":scope > [data-reveal]", p);
    var i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty("--d", Math.min(i, 6) * 0.09 + "s");
  });
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // --- Счётчики в цифрах ---
  function countUp(el) {
    var to = +el.dataset.count, t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!reduce) {
    var counters = $$("[data-count]");
    counters.forEach(function (el) { el.textContent = "0"; });
    setTimeout(function () { counters.forEach(countUp); }, 700);
  }

  // --- Смена слов в заголовке ---
  var words = $$(".rotator__word"), wi = 0;
  if (words.length > 1 && !reduce) {
    setInterval(function () {
      var cur = words[wi]; wi = (wi + 1) % words.length;
      cur.classList.remove("is-on"); cur.classList.add("is-out");
      setTimeout(function () { cur.classList.remove("is-out"); }, 700);
      words[wi].classList.add("is-on");
    }, 2600);
  }

  // --- Живой чат в телефоне ---
  var chat = $("#chat");
  var script = [
    { who: "me", text: "Здравствуйте! Хочу на маникюр 💅" },
    { who: "bot", text: "Выберите мастера:", btns: ["Анна", "Ольга", "Любой"], pick: 0 },
    { who: "me", text: "Анна" },
    { who: "bot", text: "Свободное время в пятницу:", btns: ["10:00", "11:00", "14:30", "17:00"], pick: 1 },
    { who: "me", text: "11:00" },
    { who: "ok", text: "✅ Готово! Пятница, 11:00, мастер Анна. Напомню за день." }
  ];
  function add(node) {
    chat.appendChild(node);
    while (chat.children.length > 6) chat.removeChild(chat.firstChild);
  }
  function bubble(m) {
    var d = document.createElement("div");
    d.className = "msg msg--" + m.who;
    d.textContent = m.text;
    if (m.btns) {
      var b = document.createElement("div"); b.className = "msg__btns";
      m.btns.forEach(function (t) { var s = document.createElement("span"); s.textContent = t; b.appendChild(s); });
      d.appendChild(b);
    }
    return d;
  }
  function play() {
    chat.innerHTML = "";
    var i = 0, lastBtns = null;
    (function next() {
      if (i >= script.length) { setTimeout(play, 4200); return; }
      var m = script[i++];
      if (m.who === "me") {
        if (lastBtns) {
          var pk = lastBtns.el.querySelectorAll(".msg__btns span")[lastBtns.pick];
          if (pk) pk.classList.add("is-pick");
        }
        setTimeout(function () { add(bubble(m)); setTimeout(next, 900); }, lastBtns ? 500 : 300);
      } else {
        var t = document.createElement("div"); t.className = "typing"; t.innerHTML = "<i></i><i></i><i></i>";
        add(t);
        setTimeout(function () {
          if (t.parentNode) t.parentNode.removeChild(t);
          var el = bubble(m); add(el);
          lastBtns = m.btns ? { el: el, pick: m.pick } : null;
          setTimeout(next, m.btns ? 1200 : 1000);
        }, 900);
      }
    })();
  }
  if (chat) {
    if (reduce) { script.forEach(function (m) { add(bubble(m)); }); }
    else setTimeout(play, 600);
  }

  // --- Полоса прогресса и шапка ---
  var bar = $(".progress"), top = $(".top"), stepsBox = $("[data-steps]"), ticking = false;
  var stepItems = stepsBox ? $$("li", stepsBox) : [];
  function onScroll() {
    ticking = false;
    var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    var y = h.scrollTop || document.body.scrollTop;
    bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    top.classList.toggle("is-scrolled", y > 10);
    if (stepsBox) {
      var r = stepsBox.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      stepsBox.style.setProperty("--p", p.toFixed(3));
      stepItems.forEach(function (li, k) { li.classList.toggle("is-lit", p >= k / stepItems.length + 0.02); });
    }
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if (reduce || !finePointer) return;

  // --- Свечение за курсором ---
  var glow = $(".glow"), gx = 0, gy = 0, tx = 0, ty = 0, glowOn = false;
  window.addEventListener("pointermove", function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!glowOn) { glowOn = true; gx = tx; gy = ty; document.body.classList.add("has-pointer"); loop(); }
  }, { passive: true });
  function loop() {
    gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
    glow.style.transform = "translate(" + gx + "px," + gy + "px)";
    requestAnimationFrame(loop);
  }

  // --- Наклон карточек и телефона, подсветка под курсором ---
  $$("[data-tilt]").forEach(function (el) {
    var isStage = el.classList.contains("hero__stage");
    var target = isStage ? $(".phone", el) : el;
    var max = isStage ? 14 : 7;
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", x * 100 + "%");
      el.style.setProperty("--my", y * 100 + "%");
      var rx = (0.5 - y) * max, ry = (x - 0.5) * max;
      target.style.transform = isStage
        ? "rotateY(" + (ry - 8) + "deg) rotateX(" + (rx + 4) + "deg)"
        : "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-4px)";
    });
    el.addEventListener("pointerleave", function () { target.style.transform = ""; });
  });

  // --- «Магнитные» кнопки ---
  $$("[data-magnetic]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      el.style.transform = "translate(" + x * 0.18 + "px," + y * 0.28 + "px)";
    });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  });

  // --- Лёгкий параллакс фоновых пятен ---
  var blobs = $$(".blob");
  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    blobs.forEach(function (b, i) { b.style.translate = "0 " + (y * (0.08 + i * 0.05)) + "px"; });
  }, { passive: true });
})();
