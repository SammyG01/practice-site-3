/**
 * Ember & Thyme chat widget ("Ember AI") with lead capture.
 * Loads via: <script src="/widget.js"></script>
 * Chat talks to /.netlify/functions/chat. The "Leave your details" form posts to
 * Netlify Forms (needs the hidden "chat-leads" form in index.html, see the lesson).
 */
(function () {
  const ENDPOINT = "/.netlify/functions/chat";
  const FORM_NAME = "chat-leads"; // must match the name of the hidden form in index.html
  let conversation = [];

  const style = document.createElement("style");
  style.textContent = `
    #etchat-root { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: "Work Sans", -apple-system, sans-serif; }
    #etchat-toggle {
      width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
      background: #C65D3B; color: white; font-size: 24px; box-shadow: 0 4px 14px rgba(23,23,23,0.35);
      display: flex; align-items: center; justify-content: center;
    }
    #etchat-panel {
      position: absolute; bottom: 76px; right: 0; width: 330px; max-width: 88vw; height: 460px;
      background: #F7F1E7; border-radius: 6px; box-shadow: 0 10px 40px rgba(23,23,23,0.3);
      display: none; flex-direction: column; overflow: hidden; border: 1px solid #E6DCC9;
    }
    #etchat-panel.open { display: flex; }
    #etchat-header { background: #171717; color: #F7F1E7; padding: 14px 16px; font-weight: 600; font-size: 15px; }
    #etchat-messages { flex: 1; overflow-y: auto; padding: 14px; }
    .etchat-msg { margin-bottom: 10px; display: flex; }
    .etchat-msg.user { justify-content: flex-end; }
    .etchat-bubble { max-width: 80%; padding: 10px 14px; border-radius: 4px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; }
    .etchat-msg.user .etchat-bubble { background: #C65D3B; color: white; }
    .etchat-msg.assistant .etchat-bubble { background: #fff; color: #171717; border: 1px solid #E6DCC9; }
    #etchat-leadbar { padding: 6px 12px; border-top: 1px solid #E6DCC9; background: #fff; text-align: center; }
    #etchat-leadbtn { background: none; border: none; color: #C65D3B; font-weight: 600; font-size: 13px; cursor: pointer; text-decoration: underline; font-family: inherit; }
    #etchat-inputbar { display: flex; border-top: 1px solid #E6DCC9; padding: 8px; gap: 6px; background: #fff; }
    #etchat-input { flex: 1; border: 1px solid #E6DCC9; border-radius: 4px; padding: 9px 14px; font-size: 14px; outline: none; }
    #etchat-input:focus { border-color: #C65D3B; }
    #etchat-send { background: #C65D3B; color: white; border: none; border-radius: 4px; width: 40px; height: 40px; cursor: pointer; font-size: 16px; flex-shrink: 0; }
    #etchat-send:disabled { opacity: 0.5; }
    .etchat-typing { font-size: 13px; color: #6B6155; padding: 4px 0 0 4px; }

    #etchat-lead { position: absolute; inset: 0; background: #F7F1E7; display: none; flex-direction: column; gap: 10px; padding: 18px; z-index: 2; overflow-y: auto; }
    #etchat-lead.open { display: flex; }
    #etchat-lead h4 { font-size: 16px; color: #171717; margin: 0; }
    #etchat-lead p { font-size: 13px; color: #6B6155; margin: 0; }
    #etchat-lead label { font-size: 13px; font-weight: 600; color: #171717; display: flex; flex-direction: column; gap: 4px; }
    #etchat-lead input[type="text"], #etchat-lead input[type="tel"], #etchat-lead textarea {
      border: 1px solid #E6DCC9; border-radius: 4px; padding: 10px 12px; font-size: 14px; font-family: inherit; background: #fff; outline: none;
    }
    #etchat-lead input:focus, #etchat-lead textarea:focus { border-color: #C65D3B; }
    #etchat-lead textarea { resize: none; height: 70px; }
    .etchat-lead-actions { display: flex; gap: 8px; margin-top: 4px; }
    .etchat-lead-actions button { flex: 1; min-height: 42px; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
    #etchat-lead-submit { background: #C65D3B; color: #fff; border: none; }
    #etchat-lead-submit:disabled { opacity: 0.5; }
    #etchat-lead-cancel { background: transparent; color: #171717; border: 1px solid #171717; }
    #etchat-lead-error { color: #B3261E; font-size: 13px; min-height: 16px; }
    .etchat-hp { position: absolute; left: -9999px; height: 0; overflow: hidden; }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "etchat-root";
  root.innerHTML = `
    <div id="etchat-panel">
      <div id="etchat-header">Ember AI — Ember &amp; Thyme</div>
      <div id="etchat-messages"></div>
      <div id="etchat-leadbar"><button id="etchat-leadbtn" type="button">Leave your details for a callback</button></div>
      <div id="etchat-inputbar">
        <input id="etchat-input" type="text" placeholder="Ask about the menu, hours, delivery..." />
        <button id="etchat-send">➤</button>
      </div>

      <form id="etchat-lead" name="${FORM_NAME}" method="POST">
        <h4>Leave your details</h4>
        <p>Share your name and number and the team will get back to you.</p>
        <div class="etchat-hp" aria-hidden="true"><label>Don't fill this in <input name="bot-field" tabindex="-1" autocomplete="off"></label></div>
        <label>Name <input type="text" name="name" required maxlength="80" autocomplete="name"></label>
        <label>Phone / WhatsApp <input type="tel" name="phone" required maxlength="25" autocomplete="tel"></label>
        <label>What do you need? (optional) <textarea name="message" maxlength="400"></textarea></label>
        <div id="etchat-lead-error" role="alert"></div>
        <div class="etchat-lead-actions">
          <button type="button" id="etchat-lead-cancel">Back to chat</button>
          <button type="submit" id="etchat-lead-submit">Send</button>
        </div>
      </form>
    </div>
    <button id="etchat-toggle" aria-label="Open chat">💬</button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector("#etchat-panel");
  const toggle = root.querySelector("#etchat-toggle");
  const messagesEl = root.querySelector("#etchat-messages");
  const input = root.querySelector("#etchat-input");
  const sendBtn = root.querySelector("#etchat-send");
  const leadBtn = root.querySelector("#etchat-leadbtn");
  const leadForm = root.querySelector("#etchat-lead");
  const leadCancel = root.querySelector("#etchat-lead-cancel");
  const leadSubmit = root.querySelector("#etchat-lead-submit");
  const leadError = root.querySelector("#etchat-lead-error");

  toggle.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open") && conversation.length === 0) {
      addMessage("assistant", "Hi, I'm Ember AI. Ask me about our menu, hours, or delivery areas.");
    }
  });

  leadBtn.addEventListener("click", () => {
    leadError.textContent = "";
    leadForm.classList.add("open");
  });
  leadCancel.addEventListener("click", () => leadForm.classList.remove("open"));

  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    leadError.textContent = "";
    leadSubmit.disabled = true;

    const data = new FormData(leadForm);
    data.append("form-name", FORM_NAME);

    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data).toString(),
      });
      if (!res.ok) throw new Error("Form submit failed");
      leadForm.reset();
      leadForm.classList.remove("open");
      addMessage("assistant", "Thanks, we've received your details and the team will be in touch.");
    } catch (err) {
      leadError.textContent = "Couldn't send that. Please try again, or message us on WhatsApp.";
    } finally {
      leadSubmit.disabled = false;
    }
  });

  function addMessage(role, text) {
    const wrap = document.createElement("div");
    wrap.className = `etchat-msg ${role}`;
    wrap.innerHTML = `<div class="etchat-bubble"></div>`;
    wrap.querySelector(".etchat-bubble").textContent = text;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setTyping(on) {
    let el = messagesEl.querySelector(".etchat-typing");
    if (on && !el) {
      el = document.createElement("div");
      el.className = "etchat-typing";
      el.textContent = "Typing...";
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else if (!on && el) {
      el.remove();
    }
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage("user", text);
    conversation.push({ role: "user", content: text });
    input.value = "";
    sendBtn.disabled = true;
    setTyping(true);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: conversation.slice(0, -1) }),
      });
      const data = await res.json();
      setTyping(false);

      if (!res.ok || data.error) {
        addMessage("assistant", "Sorry, something went wrong. Please try again, or message us on WhatsApp.");
        return;
      }

      addMessage("assistant", data.reply);
      conversation.push({ role: "assistant", content: data.reply });
    } catch (err) {
      setTyping(false);
      addMessage("assistant", "Sorry, I couldn't connect. Please try again.");
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
})();
