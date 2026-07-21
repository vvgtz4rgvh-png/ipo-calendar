(() => {
  "use strict";

  const DATA_URL = "data/ipos.json";

  const els = {
    todayGrid: document.getElementById("today-grid"),
    activeList: document.getElementById("active-list"),
    activeEmpty: document.getElementById("active-empty"),
    activeCount: document.getElementById("active-count"),
    pastList: document.getElementById("past-list"),
    pastToggle: document.getElementById("past-toggle"),
    statsGrid: document.getElementById("stats-grid"),
    themeToggle: document.getElementById("theme-toggle"),
    toast: document.getElementById("toast"),
  };

  // ---------- Theme ----------
  function initTheme() {
    const saved = localStorage.getItem("ipo-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }
  els.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ipo-theme", next);
  });
  initTheme();

  // ---------- Helpers ----------
  function toDate(str) {
    // "YYYY-MM-DD" -> local Date at midnight
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function todayDate() {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }
  function fmtMD(str) {
    const d = toDate(str);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  function fmtYen(n) {
    return n.toLocaleString("ja-JP") + "円";
  }
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  // ---------- Phase logic ----------
  function getPhase(ipo, today) {
    const bbStart = toDate(ipo.bbStart);
    const bbEnd = toDate(ipo.bbEnd);
    const lot = toDate(ipo.lotteryDate);
    const pStart = toDate(ipo.purchaseStart);
    const pEnd = toDate(ipo.purchaseEnd);

    if (today < bbStart) return { key: "before", label: "募集前", pill: "gray", step: -1 };
    if (today <= bbEnd) return { key: "bb", label: "BB受付中", pill: "green", step: 0 };
    if (today < lot) return { key: "waiting-lottery", label: "抽選待ち", pill: "amber", step: 1 };
    if (today.getTime() === lot.getTime()) return { key: "lottery", label: "抽選日", pill: "amber", step: 1 };
    if (today < pStart) return { key: "waiting-purchase", label: "購入待ち", pill: "gray", step: 2 };
    if (today <= pEnd) return { key: "purchase", label: "購入期間中", pill: "blue", step: 2 };
    return { key: "done", label: "手続き完了", pill: "gray", step: 3 };
  }

  // ---------- Rendering ----------
  function renderToday(ipos, today) {
    let bbCount = 0, lotteryCount = 0, purchaseCount = 0;
    ipos.forEach((ipo) => {
      if (ipo.listed) return;
      const phase = getPhase(ipo, today);
      if (phase.key === "bb") bbCount++;
      if (phase.key === "lottery") lotteryCount++;
      if (phase.key === "purchase") purchaseCount++;
    });

    els.todayGrid.innerHTML = `
      <div class="today-card dot-green">
        <div class="today-count">${bbCount}</div>
        <div class="today-label">BB開始</div>
      </div>
      <div class="today-card dot-amber">
        <div class="today-count">${lotteryCount}</div>
        <div class="today-label">抽選確認</div>
      </div>
      <div class="today-card dot-blue">
        <div class="today-count">${purchaseCount}</div>
        <div class="today-label">購入申込</div>
      </div>
    `;
  }

  function timelineHTML(ipo, phase) {
    const steps = [
      { label: "BB", date: `${fmtMD(ipo.bbStart)}〜${fmtMD(ipo.bbEnd)}` },
      { label: "抽選", date: fmtMD(ipo.lotteryDate) },
      { label: "購入", date: `${fmtMD(ipo.purchaseStart)}〜${fmtMD(ipo.purchaseEnd)}` },
    ];
    const currentStep = phase.step;
    const fillPct = currentStep < 0 ? 0 : Math.min(currentStep, 2) / 2 * 100;

    const stepsHTML = steps
      .map((s, i) => {
        const state = i < currentStep ? "done" : i === currentStep ? "current" : "";
        return `
          <div class="timeline-step ${state}">
            <div class="timeline-dot"></div>
            <div class="timeline-label">${s.label}</div>
            <div class="timeline-date">${s.date}</div>
          </div>`;
      })
      .join("");

    return `
      <div class="timeline">
        <div class="timeline-track"></div>
        <div class="timeline-track-fill" style="width:${fillPct}%"></div>
        ${stepsHTML}
      </div>`;
  }

  // ---------- Broker links ----------
  const BROKER_LINKS = {
    "SBI証券": "https://www.sbisec.co.jp/",
    "楽天証券": "https://www.rakuten-sec.co.jp/",
    "マネックス証券": "https://www.monex.co.jp/",
    "松井証券": "https://www.matsui.co.jp/",
    "SMBC日興証券": "https://www.smbcnikko.co.jp/",
    "auカブコム証券": "https://kabu.com/",
    "三菱UFJ eスマート証券": "https://www.sc.mufg.jp/",
    "みずほ証券": "https://www.mizuho-sc.com/",
    "野村證券": "https://www.nomura.co.jp/",
    "DMM株": "https://kabu.dmm.com/",
    "SBIネオトレード証券": "https://www.sbineotrade.co.jp/",
  };

  function brokerNameHTML(name) {
    const url = BROKER_LINKS[name];
    if (!url) return name;
    return `<a class="broker-link" href="${url}" target="_blank" rel="noopener">${name}</a>`;
  }

  // ---------- Auto profit/pct calculation (issuePrice -> firstDayPrice) ----------
  function computeResult(ipo) {
    const hasAuto = typeof ipo.issuePrice === "number" && typeof ipo.firstDayPrice === "number";
    if (hasAuto) {
      const winningShares = (ipo.brokers || [])
        .filter((b) => b.status === "当選")
        .reduce((sum, b) => sum + (b.shares || 0), 0);
      const pct = ((ipo.firstDayPrice - ipo.issuePrice) / ipo.issuePrice) * 100;
      const profit = winningShares * (ipo.firstDayPrice - ipo.issuePrice);
      return { pct: Math.round(pct * 10) / 10, profit, winningShares, auto: true };
    }
    const pct = typeof ipo.firstDayChangePct === "number" ? ipo.firstDayChangePct : null;
    const profit = typeof ipo.profit === "number" ? ipo.profit : null;
    return { pct, profit, winningShares: null, auto: false };
  }

  function brokerStatusClass(status) {
    if (status === "当選") return "win";
    if (status === "落選") return "lose";
    return "";
  }

  function brokerRowHTML(ipo, b, idx) {
    const isPending = b.status === "抽選待ち";
    const statusEl = isPending
      ? `<button type="button" class="broker-status tappable"
           data-code="${ipo.code}" data-name="${ipo.name}"
           data-broker="${b.name}" data-shares="${b.shares}" data-idx="${idx}">
           ${b.status}
         </button>`
      : `<span class="broker-status ${brokerStatusClass(b.status)}">${b.status}</span>`;

    return `
      <div class="broker-row">
        <span><span class="broker-name">${brokerNameHTML(b.name)}</span><span class="broker-shares">${b.shares}株・${b.account}</span></span>
        ${statusEl}
      </div>`;
  }

  function activeCardHTML(ipo, phase) {
    const brokersHTML = ipo.brokers.map((b, idx) => brokerRowHTML(ipo, b, idx)).join("");

    return `
      <article class="ipo-card">
        <div class="ipo-card-top">
          <div class="ipo-name-block">
            <div class="ipo-code">${ipo.code}</div>
            <div class="ipo-name">${ipo.name}</div>
            <div class="ipo-market">${ipo.market || ""}</div>
          </div>
          <span class="status-pill status-${phase.pill}">${phase.label}</span>
        </div>
        ${timelineHTML(ipo, phase)}
        <div class="brokers">${brokersHTML}</div>
        <div class="card-actions">
          <a class="btn-calendar" href="ics/${ipo.code}.ics" download>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            カレンダーへ追加
          </a>
        </div>
      </article>`;
  }

  function pastCardHTML(ipo) {
    const result = computeResult(ipo);
    const hasPct = typeof result.pct === "number";
    const pctClass = hasPct ? (result.pct >= 0 ? "pos" : "neg") : "";
    const pctText = hasPct ? `${result.pct >= 0 ? "+" : ""}${result.pct}%` : "―";
    const profitText = typeof result.profit === "number" ? fmtYen(result.profit) : "―";
    const priceLine =
      result.auto ? `<div class="result-price">${ipo.issuePrice}円 → ${ipo.firstDayPrice}円</div>` : "";

    return `
      <div class="result-card">
        <div class="ipo-name-block">
          <div class="ipo-code">${ipo.code}</div>
          <div class="ipo-name">${ipo.name}</div>
          ${priceLine}
        </div>
        <div class="result-figures">
          <div class="result-pct ${pctClass}">${pctText}</div>
          <div class="result-profit">${profitText}</div>
        </div>
      </div>`;
  }

  function renderActive(ipos, today) {
    const active = ipos.filter((ipo) => !ipo.listed);
    els.activeCount.textContent = `${active.length}件`;

    if (active.length === 0) {
      els.activeList.innerHTML = "";
      els.activeEmpty.hidden = false;
      return;
    }
    els.activeEmpty.hidden = true;

    els.activeList.innerHTML = active
      .map((ipo) => activeCardHTML(ipo, getPhase(ipo, today)))
      .join("");
  }

  function renderPast(ipos) {
    const past = ipos.filter((ipo) => ipo.listed);
    els.pastList.innerHTML = past.length
      ? past.map(pastCardHTML).join("")
      : `<p class="empty-state">まだ上場済みのIPOはありません。</p>`;
  }

  function renderStats(summary) {
    if (!summary) {
      els.statsGrid.innerHTML = "";
      return;
    }
    els.statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${summary.applications}件</div>
        <div class="stat-label">申込 (${summary.year})</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${summary.wins}件</div>
        <div class="stat-label">当選</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${fmtYen(summary.profit)}</div>
        <div class="stat-label">利益</div>
      </div>
    `;
  }

  // ---------- Monthly profit chart ----------
  function renderMonthlyChart(ipos, year) {
    const section = document.getElementById("monthly-section");
    const container = document.getElementById("monthly-chart");
    const past = ipos.filter((ipo) => {
      if (!ipo.listed || !ipo.listingDate) return false;
      return toDate(ipo.listingDate).getFullYear() === year;
    });

    if (past.length === 0) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    const monthTotals = Array(12).fill(0);
    past.forEach((ipo) => {
      const m = toDate(ipo.listingDate).getMonth();
      const result = computeResult(ipo);
      monthTotals[m] += typeof result.profit === "number" ? result.profit : 0;
    });

    const maxAbs = Math.max(1, ...monthTotals.map((v) => Math.abs(v)));
    const barMaxHeight = 90;
    const barWidth = 20;
    const gap = (320 - barWidth * 12) / 13;
    const svgHeight = 150;
    const zeroY = 30 + barMaxHeight;

    let bars = "";
    monthTotals.forEach((v, i) => {
      const x = gap + i * (barWidth + gap);
      const h = maxAbs === 0 ? 0 : (Math.abs(v) / maxAbs) * barMaxHeight;
      const y = v >= 0 ? zeroY - h : zeroY;
      const color = v > 0 ? "var(--green)" : v < 0 ? "var(--red)" : "var(--border)";
      bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(h, 1)}" rx="4" fill="${color}"></rect>`;
      bars += `<text x="${x + barWidth / 2}" y="${svgHeight - 6}" text-anchor="middle" class="chart-month-label">${i + 1}</text>`;
    });

    container.innerHTML = `
      <svg viewBox="0 0 320 ${svgHeight}" width="100%" role="img" aria-label="${year}年の月別損益グラフ">
        <line x1="0" y1="${zeroY}" x2="320" y2="${zeroY}" class="chart-baseline" />
        ${bars}
      </svg>`;
  }

  // ---------- Secondary trades ----------
  function computeSecondaryProfit(trade) {
    const shares = Math.min(trade.buyShares, trade.sellShares);
    return (trade.sellPrice - trade.buyPrice) * shares;
  }

  function secondaryCardHTML(trade) {
    const profit = computeSecondaryProfit(trade);
    const pctChange = ((trade.sellPrice - trade.buyPrice) / trade.buyPrice) * 100;
    const pctClass = profit >= 0 ? "pos" : "neg";
    const pctText = `${profit >= 0 ? "+" : ""}${Math.round(pctChange * 10) / 10}%`;

    return `
      <div class="result-card">
        <div class="ipo-name-block">
          <div class="ipo-code">${trade.code}</div>
          <div class="ipo-name">${trade.name}</div>
          <div class="result-price">${trade.buyPrice}円×${trade.buyShares} → ${trade.sellPrice}円×${trade.sellShares}</div>
        </div>
        <div class="result-figures">
          <div class="result-pct ${pctClass}">${pctText}</div>
          <div class="result-profit">${fmtYen(profit)}</div>
        </div>
      </div>`;
  }

  function renderSecondary(trades) {
    const section = document.getElementById("secondary-section");
    if (!trades || trades.length === 0) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    document.getElementById("secondary-count").textContent = `${trades.length}件`;
    document.getElementById("secondary-list").innerHTML = trades.map(secondaryCardHTML).join("");

    const total = trades.reduce((sum, t) => sum + computeSecondaryProfit(t), 0);
    const totalClass = total >= 0 ? "pos" : "neg";
    document.getElementById("secondary-total").innerHTML = `
      <span class="secondary-total-label">セカンダリー損益合計</span>
      <span class="secondary-total-value ${totalClass}">${total >= 0 ? "+" : ""}${fmtYen(total)}</span>
    `;
  }


  els.pastToggle.addEventListener("click", () => {
    const expanded = els.pastToggle.getAttribute("aria-expanded") === "true";
    els.pastToggle.setAttribute("aria-expanded", String(!expanded));
    els.pastList.hidden = expanded;
  });

  // ---------- Calendar link feedback ----------
  document.addEventListener("click", (e) => {
    const link = e.target.closest(".btn-calendar");
    if (link) showToast("カレンダーファイルをダウンロードしました");
  });

  // ---------- Win/Lose tap-to-report ----------
  const reportLines = [];
  let reportPanel = null;

  function buildReportPanel() {
    reportPanel = document.createElement("div");
    reportPanel.id = "report-panel";
    reportPanel.innerHTML = `
      <div class="report-head">
        <span class="report-title">報告メモ（<span id="report-count">0</span>件）</span>
        <button type="button" class="report-clear" id="report-clear">クリア</button>
      </div>
      <textarea id="report-text" readonly></textarea>
      <button type="button" class="report-copy" id="report-copy">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/></svg>
        コピーしてClaudeに貼り付ける
      </button>
    `;
    document.body.appendChild(reportPanel);

    reportPanel.querySelector("#report-clear").addEventListener("click", () => {
      reportLines.length = 0;
      updateReportPanel();
    });
    reportPanel.querySelector("#report-copy").addEventListener("click", async () => {
      const text = reportLines.join("\n");
      try {
        await navigator.clipboard.writeText(text);
        showToast("コピーしました。チャットに貼り付けてください");
      } catch {
        const ta = reportPanel.querySelector("#report-text");
        ta.select();
        document.execCommand("copy");
        showToast("コピーしました。チャットに貼り付けてください");
      }
    });
  }

  function updateReportPanel() {
    if (!reportPanel) {
      if (reportLines.length === 0) return;
      buildReportPanel();
    }
    reportPanel.hidden = reportLines.length === 0;
    reportPanel.querySelector("#report-count").textContent = reportLines.length;
    reportPanel.querySelector("#report-text").value = reportLines.join("\n");
  }

  document.addEventListener("click", (e) => {
    // Step 1: tap a pending status -> reveal 当選/落選 choice buttons
    const tapBtn = e.target.closest(".broker-status.tappable");
    if (tapBtn && !tapBtn.classList.contains("choosing")) {
      tapBtn.classList.add("choosing");
      tapBtn.innerHTML = `
        <span class="broker-choice-group">
          <button type="button" class="broker-choice win" data-result="当選">当選</button>
          <button type="button" class="broker-choice lose" data-result="落選">落選</button>
        </span>`;
      return;
    }

    // Step 2: tap 当選/落選 -> record
    const choice = e.target.closest(".broker-choice");
    if (choice) {
      const wrapper = choice.closest(".broker-status");
      const result = choice.dataset.result;
      const { code, name, broker, shares } = wrapper.dataset;
      reportLines.push(`${code} ${name} / ${broker}${shares}株 → ${result}`);
      updateReportPanel();

      wrapper.classList.remove("tappable", "choosing");
      wrapper.classList.add(result === "当選" ? "win" : "lose");
      wrapper.outerHTML = `<span class="broker-status ${result === "当選" ? "win" : "lose"} pending-sync">${result}<span class="pending-dot" title="未反映（Pushするまではこの端末だけの表示）"></span></span>`;
      showToast(`${broker} を「${result}」として記録しました`);
    }
  });

  // ---------- Load data ----------
  async function init() {
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("data fetch failed");
      const data = await res.json();
      const today = todayDate();

      renderToday(data.ipos, today);
      renderActive(data.ipos, today);
      renderPast(data.ipos);
      renderStats(data.annualSummary);
      renderMonthlyChart(data.ipos, today.getFullYear());
      renderSecondary(data.secondaryTrades);
    } catch (err) {
      els.activeList.innerHTML = "";
      els.activeEmpty.hidden = false;
      els.activeEmpty.textContent = "データを読み込めませんでした。data/ipos.json を確認してください。";
      console.error(err);
    }
  }

  init();
})();
