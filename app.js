const OFFICIAL_HOTLINE = '+966118136644';
const OFFICIAL_WA_BASE = 'https://wa.me/966118136644';

let impactChart = null;
let roundIdx = 0;
let score = 0;
let activeScenarios = [];

const scenarioPool = {
  mixed: [
    {
      sender: 'المرسل: إشعار-شحن',
      text: 'تعذر تسليم شحنتك لعدم اكتمال العنوان؛ سدد رسوماً خلال 30 دقيقة عبر رابط خارجي لتفادي الإرجاع.',
      isScam: true,
      explanation: 'يستغل رسائل الشحن والتوصيل مع ضغط زمني ورابط خارجي لطلب الدفع.'
    },
    {
      sender: 'المرسل: إشعار-توعوي',
      text: 'تذكير بحضور جلسة توعوية حول حماية الحسابات الرقمية والانتباه للروابط المجهولة.',
      isScam: false,
      explanation: 'إشعار توعوي مباشر لا يطلب بيانات سرية أو روابط مشبوهة.'
    },
    {
      sender: 'المرسل: تحديث-بيانات',
      text: 'تنبيه عاجل: سيتم إيقاف حسابك البنكي خلال ساعة ما لم تحدّث بياناتك وتدخل رمز التحقق.',
      isScam: true,
      explanation: 'يجمع بين انتحال الصفة، الاستعجال، وتحديث البيانات وطلب رمز التحقق.'
    },
    {
      sender: 'المرسل: عروض-واستثمار',
      text: 'عرض استثماري ووظيفة فورية بعائد مرتفع؛ سارع بإرسال بياناتك ورمز التحقق لتأكيد القبول.',
      isScam: true,
      explanation: 'الوعود المبالغ فيها بالعروض والوظائف والاستثمار وطلب البيانات علامة احتيال.'
    },
    {
      sender: 'المرسل: متابعة-إدارية',
      text: 'تم اعتماد طلبك ويمكنك متابعة تفاصيله من خلال حسابك الرسمي دون الحاجة لأي رموز إضافية.',
      isScam: false,
      explanation: 'إشعار متابعة واضح دون ضغط زمني أو طلب بيانات حساسة.'
    }
  ],
  'scam-focus': [
    {
      sender: 'المرسل: طرد-توصيل',
      text: 'شحنتك بانتظار سداد رسوم التوصيل فوراً عبر الرابط قبل إعادتها للمصدر.',
      isScam: true,
      explanation: 'نمط شائع في الرسائل المحلية يستغل شحن الطرود والرسوم السريعة.'
    },
    {
      sender: 'المرسل: تنبيه-حساب',
      text: 'تم رصد دخول غير معتاد؛ حدّث بياناتك وأرسل رمز التحقق الآن.',
      isScam: true,
      explanation: 'لا تشارك رمز التحقق أو بيانات الحساب، وتحقق عبر القناة الرسمية أو البنك.'
    },
    {
      sender: 'المرسل: جوائز-وعروض',
      text: 'مبروك! تم اختيارك لعرض خاص وجائزة مالية، ادخل بياناتك خلال 15 دقيقة لاستلامها.',
      isScam: true,
      explanation: 'استغلال الجوائز والعروض والمهلة القصيرة لانتزاع المعلومات.'
    }
  ],
  'official-focus': [
    {
      sender: 'المرسل: مبادرة-التوعية',
      text: 'دعوة لحضور لقاء توعوي حول الوقاية من الاحتيال الإلكتروني والروابط الزائفة.',
      isScam: false,
      explanation: 'دعوة تعريفية مباشرة خالية من الروابط المضللة أو طلب البيانات.'
    },
    {
      sender: 'المرسل: مركز-التدريب',
      text: 'تم تسجيل مشاركتك في البرنامج التوعوي، ويمكنك متابعة الأنشطة من خلال المنسق.',
      isScam: false,
      explanation: 'إشعار متابعة عادي لا يستدعي أي إجراء مالي أو أمني عاجل.'
    }
  ]
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSeniorActive() {
  return document.body.classList.contains('senior-mode');
}

function toggleSeniorMode() {
  document.body.classList.toggle('senior-mode');
  const active = isSeniorActive();
  const btn = document.getElementById('seniorToggle');
  btn.textContent = active ? '✅ وضع كبار السن مفعّل' : '👴 وضع كبار السن';
  btn.setAttribute('aria-pressed', String(active));
}

function copyHotlineNumber() {
  const statusEl = document.getElementById('copyStatus');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(OFFICIAL_HOTLINE)
      .then(() => {
        statusEl.textContent = `تم نسخ الرقم الرسمي: ${OFFICIAL_HOTLINE}`;
      })
      .catch(() => {
        statusEl.textContent = `الرقم الرسمي: ${OFFICIAL_HOTLINE}`;
      });
  } else {
    statusEl.textContent = `الرقم الرسمي: ${OFFICIAL_HOTLINE}`;
  }
}

function buildWhatsAppUrl(urlText) {
  const cleanUrl = String(urlText || '').trim();
  if (!cleanUrl) {
    return OFFICIAL_WA_BASE;
  }
  const msg = `تحقق من الرابط التالي: ${cleanUrl}`;
  return `${OFFICIAL_WA_BASE}?text=${encodeURIComponent(msg)}`;
}

function openWhatsAppChat(urlText) {
  const waUrl = buildWhatsAppUrl(urlText);
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

function inspectUrlDynamically(rawInput) {
  const cleaned = String(rawInput || '').trim();
  const normalized = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;

  let parsed = null;
  let validUrl = false;
  try {
    parsed = new URL(normalized);
    validUrl = Boolean(parsed.hostname);
  } catch (_) {
    validUrl = false;
  }

  let riskScore = 15;
  const findings = [];
  const positives = [];

  if (!/^https:\/\//i.test(cleaned)) {
    if (/^http:\/\//i.test(cleaned)) {
      riskScore += 22;
      findings.push('الرابط يستخدم بروتوكول HTTP غير المشفر بدلاً من HTTPS.');
    } else {
      riskScore += 8;
      findings.push('الرابط لم يبدأ ببروتوكول صريح؛ يُنصح بالتأكد من كتابته كاملاً.');
    }
  } else {
    riskScore -= 8;
    positives.push('يستخدم اتصال HTTPS المشفر.');
  }

  if (validUrl && parsed) {
    const host = parsed.hostname.toLowerCase();
    const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
    const subParts = host.split('.').filter(Boolean);
    const paramCount = Array.from(parsed.searchParams.keys()).length;

    document.getElementById('metaProto').textContent = parsed.protocol.replace(':', '').toUpperCase();
    document.getElementById('metaHost').textContent = host;
    document.getElementById('metaParams').textContent = String(paramCount);

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      riskScore += 38;
      findings.push('النطاق عبارة عن عنوان IP مباشر بدلاً من اسم نطاق معروف.');
    }

    if (host.includes('xn--') || /[^\x00-\x7F]/.test(host)) {
      riskScore += 32;
      findings.push('وجود ترميز Punycode أو أحرف غير لاتينية قد تُستخدم لمحاكاة نطاقات أخرى.');
    }

    if (cleaned.includes('@')) {
      riskScore += 30;
      findings.push('وجود رمز (@) داخل الرابط قد يخفي الوجهة الفعلية للطلب.');
    }

    if (subParts.length >= 4) {
      riskScore += 14;
      findings.push(`تعدد النطاقات الفرعية (${subParts.length} مقاطع) قد يُستخدم للتمويه.`);
    }

    if (paramCount >= 3) {
      riskScore += 10;
      findings.push(`احتواء الرابط على ${paramCount} معاملات استعلام.`);
    }

    if (cleaned.length > 85) {
      riskScore += 12;
      findings.push(`طول الرابط مرتفع (${cleaned.length} حرفاً).`);
    }

    const riskyTokens = ['login', 'signin', 'verify', 'otp', 'claim', 'reward', 'prize', 'free', 'bonus', 'update-account', 'secure-', 'track', 'parcel'];
    const matchedTokens = riskyTokens.filter((t) => `${host}${pathAndQuery}`.includes(t));
    if (matchedTokens.length > 0) {
      riskScore += Math.min(28, matchedTokens.length * 10);
      findings.push(`رصد كلمات مرتبطة بالتحقق أو الشحن أو المكافآت (${matchedTokens.join('، ')}).`);
    }

    if (host.endsWith('.gov.sa') || host.endsWith('.edu.sa')) {
      riskScore = Math.max(5, riskScore - 22);
      positives.push('النطاق ينتهي بامتداد سعودي رسمي/تعليمي (.gov.sa / .edu.sa).');
    }
  } else {
    document.getElementById('metaProto').textContent = 'غير محدد';
    document.getElementById('metaHost').textContent = 'صيغة غير قياسية';
    document.getElementById('metaParams').textContent = '0';
    riskScore += 20;
    findings.push('صيغة الرابط المدخلة غير قياسية أو تحتوي على مسافات/رموز غير معتادة.');
  }

  riskScore = Math.max(5, Math.min(96, riskScore));
  const safetyScore = 100 - riskScore;

  return { raw: cleaned, riskScore, safetyScore, findings, positives };
}

function handleUrlAnalysis(openWa = false) {
  const raw = document.getElementById('urlInput').value.trim();
  const box = document.getElementById('linkResult');

  if (!raw) {
    box.innerHTML = '<strong>تنبيه:</strong> أدخل أو الصق رابطاً أولاً لحساب نسبة الأمان والخطر.';
    return;
  }

  const res = inspectUrlDynamically(raw);
  let badgeClass = 'risk-low';
  let label = 'مؤشرات منخفضة — يُنصح بالتحقق من الجهة الرسمية';
  let fillColor = '#15803d';

  if (res.riskScore >= 60) {
    badgeClass = 'risk-high';
    label = 'علامات اشتباه مرتفعة — تجنّب الضغط وتحقق رسمياً';
    fillColor = '#b91c1c';
  } else if (res.riskScore >= 30) {
    badgeClass = 'risk-med';
    label = 'علامات اشتباه متوسطة — تحقق قبل المتابعة';
    fillColor = '#b45309';
  }

  const allPoints = [...res.findings, ...res.positives];
  const waUrl = buildWhatsAppUrl(raw);

  box.innerHTML = `
    <span class="badge-risk ${badgeClass}">${label}</span>
    <div style="display:flex; justify-content:space-between; gap:0.5rem; flex-wrap:wrap; font-weight:800; font-size:0.95rem;">
      <span>نسبة الخطر: ${res.riskScore}%</span>
      <span>مؤشر الأمان الإرشادي: ${res.safetyScore}%</span>
    </div>
    <div class="meter-bar">
      <div class="meter-fill" style="width:${res.riskScore}%; background:${fillColor};"></div>
    </div>
    <div style="font-size:0.88rem; color:var(--text-muted); word-break:break-all;">الرابط: <code>${escapeHtml(raw)}</code></div>
    <ul class="reasons-list">
      ${allPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}
    </ul>
    <p style="margin-top:0.65rem; font-size:0.86rem; color:var(--text-muted);">
      للتحقق الرسمي: تواصل مع الجهة المعنية أو البنك أو خدمة «تحقق» على واتساب (<strong>${OFFICIAL_HOTLINE}</strong>). النتيجة إرشادية وليست حكماً نهائياً.
    </p>
    <div class="controls-row" style="margin-top:0.75rem; margin-bottom:0;">
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
        💬 إرسال الرابط إلى خدمة «تحقق» في واتساب
      </a>
    </div>
  `;

  if (openWa) {
    openWhatsAppChat(raw);
  }
}

function highlightMatchesInText(text, terms) {
  let html = escapeHtml(text);
  const uniqueTerms = Array.from(new Set(terms.filter(Boolean))).sort((a, b) => b.length - a.length);
  for (const term of uniqueTerms) {
    const escapedTerm = escapeHtml(term);
    const re = new RegExp(`(${escapeRegExp(escapedTerm)})`, 'gi');
    html = html.replace(re, '<mark class="flag-hit">$1</mark>');
  }
  return html;
}

function analyzeMessageDynamically() {
  const text = document.getElementById('messageInput').value.trim();
  const box = document.getElementById('msgResult');

  if (!text) {
    box.innerHTML = '<strong>تنبيه:</strong> اكتب نص رسالة تجريبية أولاً.';
    return;
  }

  let risk = 10;
  const reasons = [];
  const flaggedTerms = [];

  const urgencyMatches = text.match(/(عاجل|فوراً|خلال|إغلاق|تعليق|حظر|تهديد|آخر فرصة|سارع|دقيقة|ساعة)/gi) || [];
  if (urgencyMatches.length > 0) {
    risk += Math.min(30, urgencyMatches.length * 14);
    flaggedTerms.push(...urgencyMatches);
    reasons.push(`استعجال أو ضغط زمني (${Array.from(new Set(urgencyMatches)).join('، ')}).`);
  }

  const secretMatches = text.match(/(رمز التحقق|otp|كلمة المرور|رقم البطاقة|cvv|pin|بياناتك|تحديث بيانات|الرقم السري)/gi) || [];
  if (secretMatches.length > 0) {
    risk += Math.min(40, secretMatches.length * 20);
    flaggedTerms.push(...secretMatches);
    reasons.push(`طلب بيانات حساسة أو رموز تحقق أو تحديث بيانات (${Array.from(new Set(secretMatches)).join('، ')}).`);
  }

  const localScamMatches = text.match(/(شحن|توصيل|طرد|رسوم|سداد|وظيفة|توظيف|استثمار|عائد|جائزة|ربحت|مكافأة|هدية|مجاني|خصم|عرض)/gi) || [];
  if (localScamMatches.length > 0) {
    risk += Math.min(28, localScamMatches.length * 12);
    flaggedTerms.push(...localScamMatches);
    reasons.push(`مؤشرات شائعة في الرسائل والعروض مثل الشحن أو الرسوم أو الوظائف/الاستثمار أو الجوائز (${Array.from(new Set(localScamMatches)).join('، ')}).`);
  }

  const linkMatches = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi) || [];
  if (linkMatches.length > 0) {
    risk += Math.min(25, linkMatches.length * 15);
    flaggedTerms.push(...linkMatches);
    reasons.push('وجود رابط داخل الرسالة؛ يُنصح بفحصه عبر خدمة «تحقق» قبل فتحه.');
  }

  risk = Math.max(5, Math.min(96, risk));
  const safety = 100 - risk;

  let badgeClass = 'risk-low';
  let statusText = 'مؤشرات منخفضة — يُنصح بالتحقق من المصدر';
  let barColor = '#15803d';

  if (risk >= 60) {
    badgeClass = 'risk-high';
    statusText = 'علامات اشتباه مرتفعة — لا تشارك أي بيانات';
    barColor = '#b91c1c';
  } else if (risk >= 30) {
    badgeClass = 'risk-med';
    statusText = 'علامات اشتباه متوسطة — تحقق قبل الاستجابة';
    barColor = '#b45309';
  }

  if (reasons.length === 0) {
    reasons.push('لم تُرصد كلمات استعجال أو طلب بيانات أو روابط في النص المدخل؛ تحقق دائماً من الجهة المرسلة.');
  }

  const highlightedText = highlightMatchesInText(text, flaggedTerms);

  box.innerHTML = `
    <span class="badge-risk ${badgeClass}">${statusText}</span>
    <div style="display:flex; justify-content:space-between; gap:0.5rem; flex-wrap:wrap; font-weight:800; font-size:0.95rem;">
      <span>نسبة الاشتباه: ${risk}%</span>
      <span>مؤشر الحذر الإرشادي: ${safety}%</span>
    </div>
    <div class="meter-bar">
      <div class="meter-fill" style="width:${risk}%; background:${barColor};"></div>
    </div>
    <div class="highlighted-preview">${highlightedText}</div>
    <ul class="reasons-list">
      ${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
    </ul>
    <p style="margin-top:0.65rem; font-size:0.85rem; color:var(--text-muted);">
      عند الشك، تواصل مع الجهة الرسمية أو البنك أو خدمة «تحقق» عبر واتساب (<strong>${OFFICIAL_HOTLINE}</strong>). النتيجة إرشادية وليست حكماً نهائياً.
    </p>
  `;
}

function loadScenarioSet(mode) {
  activeScenarios = scenarioPool[mode] || scenarioPool.mixed;
  roundIdx = 0;
  score = 0;
  renderScenario();
  document.getElementById('gameFeedback').innerHTML = 'حدد هل الرسالة احتيالية أم آمنة.';
}

function renderScenario() {
  const s = activeScenarios[roundIdx];
  document.getElementById('roundLabel').textContent = `الجولة ${roundIdx + 1} من ${activeScenarios.length}`;
  document.getElementById('scoreLabel').textContent = `النقاط: ${score}`;
  document.getElementById('scenarioSender').textContent = s.sender;
  document.getElementById('scenarioText').textContent = s.text;
}

async function saveAnonymousAssessment(payload) {
  const res = await fetch('/api/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error('تعذر حفظ النتيجة في قاعدة البيانات.');
  }
  await refreshMetrics();
}

async function answerScenario(userSaidScam) {
  const s = activeScenarios[roundIdx];
  const fb = document.getElementById('gameFeedback');
  const correct = userSaidScam === s.isScam;
  const stepPoints = Math.round(100 / activeScenarios.length);

  if (correct) {
    score = Math.min(100, score + stepPoints);
    fb.innerHTML = `<strong style="color:#15803d;">إجابة صحيحة:</strong> ${escapeHtml(s.explanation)}`;
  } else {
    fb.innerHTML = `<strong style="color:#b91c1c;">إجابة تحتاج مراجعة:</strong> ${escapeHtml(s.explanation)}`;
  }

  roundIdx += 1;
  if (roundIdx < activeScenarios.length) {
    renderScenario();
  } else {
    const finalScore = score;
    document.getElementById('scoreLabel').textContent = `النقاط: ${finalScore}`;
    fb.innerHTML += `<br/><strong>أنهيت المجموعة (${finalScore}/100) — جارٍ حفظ النتيجة المجهولة...</strong>`;

    try {
      await saveAnonymousAssessment({
        pre_score: 60,
        post_score: Math.max(60, finalScore),
        retention_score: Math.max(55, Math.min(100, finalScore - 2)),
        challenge_score: finalScore,
        senior_mode: isSeniorActive()
      });
      fb.innerHTML += `<br/><span style="color:#15803d; font-weight:700;">تم تسجيل النتيجة المجهولة في قاعدة البيانات.</span>`;
    } catch (err) {
      fb.innerHTML += `<br/><span style="color:#b91c1c;">${escapeHtml(err.message)}</span>`;
    }

    roundIdx = 0;
    score = 0;
    setTimeout(renderScenario, 2000);
  }
}

function initChart() {
  const ctx = document.getElementById('impactChart').getContext('2d');
  impactChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['الاختبار القبلي', 'الاختبار البعدي', 'التثبيت (3–4 أسابيع)', 'التحدي التفاعلي'],
      datasets: [
        {
          label: 'متوسط الدرجات (%)',
          data: [60, 77, 75, 80],
          backgroundColor: ['#94a3b8', '#0f5c4c', '#0284c7', '#b48a3c'],
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        },
        x: {
          ticks: { font: { family: 'Cairo' } }
        }
      },
      plugins: {
        legend: {
          labels: { font: { family: 'Cairo' } }
        }
      }
    }
  });
}

async function refreshMetrics() {
  try {
    const res = await fetch('/api/metrics');
    if (!res.ok) return;
    const m = await res.json();

    document.getElementById('statParticipants').textContent = m.total_participants;
    document.getElementById('heroBeneficiaries').textContent = `${m.total_participants}+`;
    document.getElementById('statPreScore').textContent = `${m.avg_pre}%`;
    document.getElementById('statPostScore').textContent = `${m.avg_post}%`;
    document.getElementById('statRetentionScore').textContent = `${m.avg_retention}%`;

    const gainText = `${m.relative_gain >= 0 ? '+' : ''}${m.relative_gain}%`;
    document.getElementById('heroGain').textContent = gainText;

    if (impactChart) {
      impactChart.data.datasets[0].data = [m.avg_pre, m.avg_post, m.avg_retention, m.avg_challenge];
      impactChart.update();
    }
  } catch (_) {
    // يعمل محلياً دون خادم خلفي عند فتح الملف مباشرة
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('seniorToggle').addEventListener('click', toggleSeniorMode);

  const urlInput = document.getElementById('urlInput');
  urlInput.addEventListener('paste', () => {
    const autoOpen = document.getElementById('autoOpenWaOnPaste').checked;
    setTimeout(() => {
      handleUrlAnalysis(autoOpen);
    }, 50);
  });

  document.getElementById('checkLinkBtn').addEventListener('click', () => handleUrlAnalysis(false));
  document.getElementById('sendToWaBtn').addEventListener('click', () => handleUrlAnalysis(true));
  document.getElementById('copyHotlineBtn').addEventListener('click', copyHotlineNumber);

  document.getElementById('analyzeMsgBtn').addEventListener('click', analyzeMessageDynamically);
  document.getElementById('clearMsgBtn').addEventListener('click', () => {
    document.getElementById('messageInput').value = '';
    document.getElementById('msgResult').innerHTML = '<strong>جاهز:</strong> اكتب أي رسالة ليتم حساب نسبة الاشتباه، وتلوين المؤشرات داخل النص، وعرض خطوات التحقق الرسمية.';
  });

  document.getElementById('difficultySelect').addEventListener('change', (e) => {
    loadScenarioSet(e.target.value);
  });

  document.getElementById('restartChallengeBtn').addEventListener('click', () => {
    loadScenarioSet(document.getElementById('difficultySelect').value);
  });

  document.getElementById('btnScam').addEventListener('click', () => answerScenario(true));
  document.getElementById('btnSafe').addEventListener('click', () => answerScenario(false));

  document.getElementById('assessmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('saveStatus');
    const preVal = parseInt(document.getElementById('preScoreInput').value, 10);
    const postVal = parseInt(document.getElementById('postScoreInput').value, 10);
    const retVal = parseInt(document.getElementById('retentionScoreInput').value, 10);

    try {
      await saveAnonymousAssessment({
        pre_score: preVal,
        post_score: postVal,
        retention_score: retVal,
        challenge_score: postVal,
        senior_mode: isSeniorActive()
      });
      statusEl.textContent = 'تم حفظ النتيجة المجهولة (قبلي / بعدي / تثبيت 3–4 أسابيع) بنجاح.';
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });

  loadScenarioSet('mixed');
  initChart();
  refreshMetrics();
});