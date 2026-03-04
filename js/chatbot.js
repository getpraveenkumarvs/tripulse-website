/* ========================================
   TRIPULSE TRAVEL ASSISTANT CHATBOT
   Simplified flow: Greet → Name → Mobile → Destination → Dates → Travelers → Summary → Done
   ======================================== */

(function () {
  'use strict';

  // ── STATE ──
  let step = 'GREET';
  let idleTimer = null;
  let leadSent = false;
  let chatOpened = false;

  const lead = {
    name: '',
    phone: '',
    destination: '',
    dates: { flexible: true, notes: '' },
    travelers: { adults: 0, children: 0, seniors: 0, notes: '' },
    notes: '',
    source: window.location.pathname
  };

  // ── POPULAR DESTINATIONS ──
  const POPULAR = ['Maldives', 'Bali', 'Dubai', 'Europe', 'Japan', 'Bangkok', 'Singapore', 'Malaysia'];

  // ── VISA LIKELY COUNTRIES ──
  const VISA_LIKELY = [
    'europe', 'uk', 'usa', 'canada', 'australia', 'japan', 'south korea',
    'new zealand', 'schengen', 'london', 'paris', 'switzerland', 'amsterdam',
    'germany', 'france', 'italy', 'spain', 'greece'
  ];

  // ── INJECT HTML ──
  function injectWidget() {
    const html = `
      <button class="cb-toggle" id="cbToggle" aria-label="Chat with us">
        <span class="cb-chat-icon">💬</span>
        <span class="cb-close-icon">✕</span>
      </button>
      <div class="cb-window" id="cbWindow">
        <div class="cb-header">
          <div class="cb-avatar">✈️</div>
          <div class="cb-header-info">
            <h4>Tripulse Travel Assistant</h4>
            <p>Usually replies instantly</p>
          </div>
        </div>
        <div class="cb-messages" id="cbMessages"></div>
        <div class="cb-quick-replies" id="cbQuickReplies"></div>
        <div class="cb-input-area">
          <input class="cb-input" id="cbInput" type="text" placeholder="Type a message…" autocomplete="off" />
          <button class="cb-send-btn" id="cbSend" aria-label="Send">➤</button>
        </div>
      </div>`;
    const wrapper = document.createElement('div');
    wrapper.id = 'cbWidget';
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);
  }

  // ── DOM REFS ──
  let msgArea, quickArea, input, sendBtn, toggle, window_;

  function bindDOM() {
    msgArea = document.getElementById('cbMessages');
    quickArea = document.getElementById('cbQuickReplies');
    input = document.getElementById('cbInput');
    sendBtn = document.getElementById('cbSend');
    toggle = document.getElementById('cbToggle');
    window_ = document.getElementById('cbWindow');
  }

  // ── HELPERS ──
  function scrollBottom() {
    setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 60);
  }

  function addMsg(text, sender) {
    const div = document.createElement('div');
    div.className = 'cb-msg cb-msg--' + sender;
    div.innerHTML = text;
    msgArea.appendChild(div);
    scrollBottom();
  }

  function addSummaryBox(html) {
    const div = document.createElement('div');
    div.className = 'cb-msg cb-msg--bot cb-summary';
    div.innerHTML = html;
    msgArea.appendChild(div);
    scrollBottom();
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'cb-typing';
    div.id = 'cbTyping';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgArea.appendChild(div);
    scrollBottom();
  }

  function hideTyping() {
    const el = document.getElementById('cbTyping');
    if (el) el.remove();
  }

  function botSay(text, delay) {
    delay = delay || 600;
    showTyping();
    return new Promise(resolve => {
      setTimeout(() => {
        hideTyping();
        addMsg(text, 'bot');
        resolve();
      }, delay);
    });
  }

  function showQuickReplies(options) {
    quickArea.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'cb-quick-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        handleUserInput(opt);
      });
      quickArea.appendChild(btn);
    });
  }

  function clearQuickReplies() {
    quickArea.innerHTML = '';
  }

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (step !== 'DONE') {
        botSay("Still there? 😊 Share your travel plans or I can connect you with an agent.");
        showQuickReplies(['Continue', 'Talk to an agent']);
      }
    }, 120000);
  }

  // ── VALIDATION ──
  function isValidPhone(str) {
    const cleaned = str.replace(/[\s\-().]/g, '');
    return /^\+?\d{10,15}$/.test(cleaned);
  }

  // ── CHECK IF LEAD HAS ANY DATA ──
  function hasLeadData() {
    return lead.name || lead.phone || lead.destination;
  }

  // ── CONVERSATION ENGINE ──
  async function processStep(userText) {
    const txt = (userText || '').trim();
    const lower = txt.toLowerCase();

    // Handle FAQ interruptions at any step
    if (handleFAQ(lower)) return;

    // Handle agent request at any step
    if (lower.includes('talk to') && lower.includes('agent') || lower === 'talk to an agent') {
      await botSay("Sure! You can reach our team directly:");
      await botSay("📞 <a href='tel:+919886478035'>+91-9886478035</a><br>📧 <a href='mailto:support@tripulse.in'>support@tripulse.in</a><br>We'll get back to you within 1 hour! 🙂");
      return;
    }

    switch (step) {

      case 'GREET':
        await botSay("Hi! I'm your Tripulse travel assistant 👋");
        await botSay("Before we plan your dream trip, may I know your name?", 800);
        step = 'NAME';
        break;

      case 'NAME':
        if (!txt || txt.length < 2) { await botSay("Please share your name so I can assist you better."); return; }
        lead.name = txt;
        await botSay("Nice to meet you, " + lead.name + "! 😊");
        await botSay("What's your mobile number so our team can reach you?", 600);
        step = 'MOBILE';
        break;

      case 'MOBILE':
        if (!isValidPhone(txt)) {
          await botSay("That doesn't look right. Please enter a valid mobile number, e.g., +91 98864 78035");
          return;
        }
        lead.phone = txt;
        await botSay("Perfect! Now let's plan your trip ✈️");
        await botSay("Where are you thinking of traveling?", 600);
        showQuickReplies(POPULAR);
        step = 'DESTINATION';
        break;

      case 'DESTINATION':
        if (!txt) { await botSay("Please share a destination — a city, country, or region."); return; }
        lead.destination = txt;
        clearQuickReplies();

        // Visa heads-up
        const destLower = lead.destination.toLowerCase();
        const needsVisa = VISA_LIKELY.some(v => destLower.includes(v));
        if (needsVisa) {
          await botSay("Heads-up: " + lead.destination + " may require a visa for Indian passport holders. Our team can help with that! 🛂");
        }

        await botSay("Great choice! When would you like to travel?");
        showQuickReplies(['Specific dates', 'Flexible dates', 'Not sure yet']);
        step = 'DATES';
        break;

      case 'DATES':
        if (!txt) { await botSay("When are you planning? Even a rough month works!"); return; }
        clearQuickReplies();

        if (lower.includes('flexible')) {
          lead.dates.flexible = true;
          lead.dates.notes = txt;
        } else if (lower.includes('not sure')) {
          lead.dates.flexible = true;
          lead.dates.notes = 'Undecided';
        } else {
          lead.dates.flexible = false;
          lead.dates.notes = txt;
        }

        await botSay("Got it! How many people are traveling?");
        await botSay("E.g., \"2 adults, 1 child\" or just a number.", 500);
        step = 'TRAVELERS';
        break;

      case 'TRAVELERS':
        if (!txt) { await botSay("How many travelers? E.g., \"2 adults\" or \"4\""); return; }
        parseTravelers(txt);
        clearQuickReplies();
        await showSummary();
        step = 'SUMMARY';
        break;

      case 'SUMMARY':
        clearQuickReplies();
        if (lower.includes('yes') || lower.includes('send') || lower.includes('correct') || lower.includes('looks good') || lower.includes('confirm') || lower.includes('submit')) {
          await botSay("Submitting your inquiry… ⏳");
          await submitLead(false);
        } else if (lower.includes('no') || lower.includes('change') || lower.includes('edit')) {
          await botSay("No worries! What would you like to change?");
          showQuickReplies(['Destination', 'Dates', 'Travelers']);
          step = 'EDIT_FIELD';
        } else {
          await botSay("Shall I send this to our team? They'll call you within 1 hour!");
          showQuickReplies(['Yes, send it!', 'I want to change something']);
        }
        break;

      case 'EDIT_FIELD':
        clearQuickReplies();
        if (lower.includes('destination')) { step = 'DESTINATION'; await botSay("Where would you like to go instead?"); showQuickReplies(POPULAR); }
        else if (lower.includes('date')) { step = 'DATES'; await botSay("When would you like to travel?"); showQuickReplies(['Specific dates', 'Flexible dates', 'Not sure yet']); }
        else if (lower.includes('travel') || lower.includes('people') || lower.includes('number')) { step = 'TRAVELERS'; await botSay("How many people are traveling?"); }
        else { await botSay("You can change: destination, dates, or travelers."); showQuickReplies(['Destination', 'Dates', 'Travelers']); }
        break;

      case 'DONE':
        await botSay("Thanks for chatting, " + (lead.name || 'there') + "! Feel free to reach us anytime at 📞 <a href='tel:+919886478035'>+91-9886478035</a>. Have a great day! 🌟");
        break;

      default:
        await botSay("Let me help you plan. Where would you like to travel?");
        step = 'DESTINATION';
        showQuickReplies(POPULAR);
        break;
    }
  }

  // ── FAQ HANDLER ──
  function handleFAQ(lower) {
    if (lower.includes('arrange flights') || lower.includes('arrange hotel') || lower.includes('book flights')) {
      botSay("Yes! We arrange flights, hotels, transfers, and activities — all in one package. 🏨✈️");
      return true;
    }
    if (lower.includes('customize') || lower.includes('custom itinerar')) {
      botSay("Absolutely! Every itinerary is fully customizable to your preferences. 🗺️");
      return true;
    }
    if (lower.includes('refund') || lower.includes('cancellation') || lower.includes('cancel')) {
      botSay("Cancellation policies vary by package. Generally, free cancellation up to 15 days before travel. Our team can share specifics — want me to connect you?");
      showQuickReplies(['Connect me', 'Continue']);
      return true;
    }
    if (lower.includes('visa') && step !== 'DESTINATION') {
      botSay("We provide visa guidance and can connect you with specialists. Want me to connect you with an agent?");
      showQuickReplies(['Yes, connect me', 'Continue']);
      return true;
    }
    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
      if (lead.destination) {
        botSay("Prices for " + lead.destination + " vary based on dates, flights, and hotels. Share your details and our team will get you an accurate quote within 1 hour! 💰");
      } else {
        botSay("Prices vary by destination and preferences. Share your details and we'll get you an accurate quote! 💰");
      }
      return true;
    }
    if (lower.includes('card number') || lower.includes('credit card') || lower.includes('cvv') || lower.includes('password') || lower.includes('aadhaar') || lower.includes('passport number')) {
      botSay("🔒 Please don't share sensitive information here. Our team will guide you through secure channels for payments.");
      return true;
    }
    return false;
  }

  // ── PARSERS ──
  function parseTravelers(txt) {
    const lower = txt.toLowerCase();
    const adultMatch = lower.match(/(\d+)\s*adult/);
    const childMatch = lower.match(/(\d+)\s*child/) || lower.match(/(\d+)\s*kid/);
    const seniorMatch = lower.match(/(\d+)\s*senior/) || lower.match(/(\d+)\s*elder/);

    lead.travelers.adults = adultMatch ? parseInt(adultMatch[1]) : 0;
    lead.travelers.children = childMatch ? parseInt(childMatch[1]) : 0;
    lead.travelers.seniors = seniorMatch ? parseInt(seniorMatch[1]) : 0;

    // If only a number is given, assume adults
    if (lead.travelers.adults === 0 && lead.travelers.children === 0 && lead.travelers.seniors === 0) {
      const numMatch = txt.match(/\d+/);
      if (numMatch) lead.travelers.adults = parseInt(numMatch[0]);
      else lead.travelers.notes = txt;
    }

    if (lead.travelers.adults === 0 && lead.travelers.children === 0 && lead.travelers.seniors === 0) {
      lead.travelers.notes = txt;
    }
  }

  // ── SUMMARY ──
  async function showSummary() {
    const travelersStr = formatTravelers();
    const datesStr = lead.dates.notes || 'Not specified';

    const html = `<strong>🗺️ Trip Summary</strong>
<ul>
<li><b>Name:</b> ${lead.name}</li>
<li><b>Mobile:</b> ${lead.phone}</li>
<li><b>Destination:</b> ${lead.destination}</li>
<li><b>Travel dates:</b> ${datesStr} ${lead.dates.flexible ? '(Flexible)' : '(Fixed)'}</li>
<li><b>Travelers:</b> ${travelersStr}</li>
</ul>`;

    addSummaryBox(html);
    await botSay("Does this look correct? I'll share this with our team and they'll call you within 1 hour! 📞", 400);
    showQuickReplies(['Yes, send it!', 'I want to change something']);
  }

  function formatTravelers() {
    const parts = [];
    if (lead.travelers.adults > 0) parts.push(lead.travelers.adults + ' adult' + (lead.travelers.adults > 1 ? 's' : ''));
    if (lead.travelers.children > 0) parts.push(lead.travelers.children + ' child' + (lead.travelers.children > 1 ? 'ren' : ''));
    if (lead.travelers.seniors > 0) parts.push(lead.travelers.seniors + ' senior' + (lead.travelers.seniors > 1 ? 's' : ''));
    if (parts.length === 0 && lead.travelers.notes) return lead.travelers.notes;
    return parts.length ? parts.join(', ') : 'Not specified';
  }

  // ── BUILD LEAD JSON ──
  function buildLeadPayload(isPartial) {
    const travelersStr = formatTravelers();
    const datesStr = lead.dates.notes || '';

    return {
      _subject: (isPartial ? '[Partial] ' : '') + 'Tripulse Chatbot Lead — ' + (lead.name || 'Unknown'),
      _template: 'table',
      _captcha: 'false',
      'Name': lead.name || '—',
      'Mobile': lead.phone || '—',
      'Destination': lead.destination || '—',
      'Travel Dates': datesStr ? datesStr + (lead.dates.flexible ? ' (Flexible)' : ' (Fixed)') : '—',
      'Travelers': travelersStr || '—',
      'Lead Type': isPartial ? 'Partial (customer left early)' : 'Complete',
      'Page': lead.source || '—',
      'Timestamp': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    };
  }

  // ── SUBMIT LEAD ──
  async function submitLead(isPartial) {
    if (leadSent) return;
    if (!hasLeadData()) return;

    leadSent = true;
    const body = buildLeadPayload(isPartial);

    try {
      // FormSubmit AJAX doesn't work with unverified emails, use regular form submission
      const formData = new FormData();
      Object.keys(body).forEach(key => {
        formData.append(key, body[key]);
      });

      const response = await fetch('https://formsubmit.co/support@tripulse.in', {
        method: 'POST',
        body: formData
      });

      if (!isPartial) {
        if (response.ok) {
          await botSay("Done! ✅ Your inquiry has been sent to our team.");
          await botSay("We'll call you on " + lead.phone + " within 1 hour. Talk soon, " + lead.name + "! 🌟");
        } else {
          const errorText = await response.text();
          console.error('FormSubmit error:', response.status, errorText);
          throw new Error('Submission failed: ' + response.status);
        }
      }
    } catch (err) {
      console.error('Chatbot submission error:', err);
      if (!isPartial) {
        await botSay("There was a small hiccup, but don't worry! Our team will still reach you.");
        await botSay("📞 <a href='tel:+919886478035'>+91-9886478035</a>");
      }
    }

    step = 'DONE';
  }

  // ── SEND PARTIAL LEAD ON EXIT ──
  function sendPartialOnExit() {
    if (leadSent || !hasLeadData()) return;
    leadSent = true;

    const body = buildLeadPayload(true);

    // Use sendBeacon for reliable delivery on page unload
    if (navigator.sendBeacon) {
      const formData = new FormData();
      Object.keys(body).forEach(key => {
        formData.append(key, body[key]);
      });
      navigator.sendBeacon('https://formsubmit.co/support@tripulse.in', formData);
    } else {
      // Fallback: synchronous XHR
      const formData = new FormData();
      Object.keys(body).forEach(key => {
        formData.append(key, body[key]);
      });
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://formsubmit.co/support@tripulse.in', false);
      xhr.send(formData);
    }
  }

  // ── USER INPUT HANDLER ──
  async function handleUserInput(text) {
    if (!text || !text.trim()) return;
    addMsg(text, 'user');
    clearQuickReplies();
    input.value = '';
    input.focus();
    resetIdleTimer();
    await processStep(text);
  }

  // ── EVENT BINDINGS ──
  function bindEvents() {
    // Toggle chat
    toggle.addEventListener('click', () => {
      const isOpen = window_.classList.toggle('open');
      toggle.classList.toggle('active');
      if (isOpen) {
        input.focus();
        if (step === 'GREET' && !chatOpened) {
          chatOpened = true;
          processStep('');
        }
        resetIdleTimer();
      } else {
        clearTimeout(idleTimer);
      }
    });

    // Send button
    sendBtn.addEventListener('click', () => {
      handleUserInput(input.value);
    });

    // Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUserInput(input.value);
      }
    });

    // Send partial lead when user leaves the page
    window.addEventListener('beforeunload', sendPartialOnExit);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !leadSent && hasLeadData()) {
        sendPartialOnExit();
      }
    });
  }

  // ── INIT ──
  function init() {
    injectWidget();
    bindDOM();
    bindEvents();
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
