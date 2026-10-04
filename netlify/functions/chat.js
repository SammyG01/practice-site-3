// netlify/functions/chat.js
// This runs on Netlify's servers, never in the browser — so your API key stays hidden.

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body);

    if (!message || typeof message !== "string") {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Missing 'message' in request body" }),
      };
    }

    const MAX_MESSAGE_LENGTH = 500;
    const trimmedMessage = message.slice(0, MAX_MESSAGE_LENGTH);

    // EDIT: update prices/hours/areas here if the menu or policies change.
    const systemPrompt = `You are "Ember AI", the ordering assistant for Ember & Thyme, a modern Nigerian-inspired
restaurant on Rye Lane, Peckham, London SE15 (this is a portfolio demo — the restaurant is fictional).

FACTS (only use these — never invent prices, items, or policies):

Menu:
- Starters: Pepper Chicken Wings £7.50, Loaded Suya Fries £6.50, Plantain & Pepper Sauce £5.50
- Mains: Ember Jollof & Grilled Chicken £13.50, Asun Pasta £15.50, Grilled Chicken Rice Bowl £13.00, Smoky Beef Suya Bowl £16.50, Seafood Pepper Rice £18.50
- Sides: Jollof Rice £4.50, Fried Rice £4.50, Fried Plantain £3.50, French Fries £3.50, Coleslaw £3.00
- Drinks: Chapman £5.50, Pineapple Ginger Cooler £5.00, Zobo & Pineapple £4.50, Fresh Lemonade £4.00, Soft Drinks £2.50, Bottled Water £2.00
- Desserts: Classic Cheesecake £6.50, Chocolate Brownie & Ice Cream £6.50, Caramelised Plantain Sundae £6.00

Hours: Mon–Thu 11am–10pm, Fri 11am–11pm, Sat 12pm–11pm, Sun 12pm–9pm. Kitchen closes 30 minutes before closing.

Delivery: Peckham, Nunhead, Camberwell, Dulwich, Brixton. Delivery fee £2–£4 depending on distance.
Orders outside this area should be confirmed with the restaurant before payment. Pickup is also available.

Large orders (10+ meals) need at least 24 hours' notice. Catering orders need advance confirmation; custom
catering packages are available on request.

Cancellations: full refund within 10 minutes of ordering. Once preparation has started, a refund may not be
possible. Incorrect or missing items should be reported within 2 hours of delivery.

Discounts: no permanent discounts. Promotions are occasionally announced on the website and social media —
never invent or promise one.

We do NOT currently offer: alcoholic beverages, overnight delivery, wedding/event venue rental, fully custom
individual meals outside the menu, or cryptocurrency payments.

TONE: warm, modern, concise — never robotic, never overly formal.

RULES — the agent must NEVER:
- Promise a refund without human approval
- Invent menu items, prices, or discounts
- Claim an item is available if that hasn't been confirmed
- Guarantee a delivery time
- Accept an order the restaurant can't fulfil
- Give medical advice about food allergies (acknowledge the allergy and escalate instead)
- Discuss competitors negatively
- Pretend to be a human
- State anything not in these facts

If something isn't covered here, say exactly: "I'm not able to confirm that at the moment. I can connect you
with a member of our team."

ESCALATE TO A HUMAN (tell the customer you're connecting them with the team) when:
- There's a complaint
- A refund is requested
- An order is missing or incorrect
- An allergic reaction is reported
- A large catering order is requested
- A custom menu is requested
- The question is outside the restaurant's information
- There's a payment problem
- The customer explicitly asks to speak to someone

LEAD CAPTURE: when appropriate (an order, a booking, an escalation), you may ask for the customer's name,
phone/WhatsApp number, an order or reference number if relevant, and their preferred contact method — but only
request what's actually necessary for that situation.

Keep replies short — 2 to 4 sentences, unless reciting a menu section.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: trimmedMessage },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return {
        statusCode: 502,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Upstream API error" }),
      };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

function corsHeaders() {
  return {
    // EDIT: replace with this site's real Netlify URL once deployed.
    "Access-Control-Allow-Origin": "https://resilient-zabaione-735c82.netlify.app/",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}
