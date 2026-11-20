require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Tenant, User, MenuItem, Order } = require('./models');

const DEMO_SEED_KEY = 'storecraft-demo-v1';
const DEMO_PASSWORD = 'Demo123!';
const imageRoot = path.resolve(__dirname, '../../frontend/public/demo');
const product = (name, category, price, description, art) => ({ name, category, price, description, art });

const stores = [
  {
    name: 'Karachi Kabab House', slug: 'kabab-house', city: 'Karachi',
    tagline: 'Fire-kissed Karachi BBQ, made for sharing.', brandColor: '#913b2d', kind: 'restaurant',
    deliveryAreas: [
      { name: 'DHA', deliveryFee: 180, minimumOrder: 800 },
      { name: 'Clifton', deliveryFee: 150, minimumOrder: 700 },
      { name: 'Gulshan-e-Iqbal', deliveryFee: 220, minimumOrder: 900 },
      { name: 'Gulistan-e-Johar', deliveryFee: 240, minimumOrder: 900 },
      { name: 'North Nazimabad', deliveryFee: 250, minimumOrder: 1000 },
      { name: 'PECHS', deliveryFee: 180, minimumOrder: 800 },
    ],
    pickupBranches: [
      { name: 'Kabab House Clifton', address: 'Shop 4, Block 5, Clifton, Karachi', phone: '021-35870001', openingHours: '12:00 PM – 12:00 AM' },
      { name: 'Kabab House Gulshan', address: 'Main University Road, Gulshan-e-Iqbal, Karachi', phone: '021-34970002', openingHours: '12:00 PM – 11:30 PM' },
      { name: 'Kabab House DHA', address: 'Commercial Avenue, DHA Phase 6, Karachi', phone: '021-35870003', openingHours: '1:00 PM – 12:00 AM' },
    ],
    palette: { dark: '#421f1c', mid: '#913b2d', light: '#f8eade', accent: '#e3a545', cream: '#fff8ef' },
    customers: [
      ['Ayesha Khan', '03001234001', 'Block 5, Gulshan-e-Iqbal, Karachi'],
      ['Hamza Ali', '03001234002', 'PECHS Block 2, Karachi'],
      ['Sana Ahmed', '03001234003', 'North Nazimabad, Karachi'],
      ['Bilal Raza', '03001234004', 'Clifton Block 4, Karachi'],
      ['Mariam Shah', '03001234005', 'Gulistan-e-Jauhar, Karachi'],
      ['Usman Tariq', '03001234006', 'DHA Phase 6, Karachi'],
    ],
    products: [
      product('Chicken Malai Boti', 'BBQ', 850, 'Creamy, tender chicken grilled over charcoal.', 'bbq'),
      product('Beef Seekh Kebabs', 'BBQ', 690, 'Two spiced beef kebabs with mint chutney.', 'bbq'),
      product('Chicken Tikka Leg', 'BBQ', 780, 'Smoky leg quarter marinated in house spices.', 'bbq'),
      product('Paratha Chicken Roll', 'Rolls', 450, 'Chargrilled chicken wrapped in a flaky paratha.', 'roll'),
      product('Beef Chapli Roll', 'Rolls', 520, 'Chapli kebab, salad and chutney in a warm roll.', 'roll'),
      product('Malai Boti Roll', 'Rolls', 500, 'Soft malai boti with crunchy onions and chutney.', 'roll'),
      product('Chicken Karahi (Half)', 'Karahi', 1850, 'Tomato-rich karahi finished with ginger and green chilli.', 'karahi'),
      product('Mutton Karahi (Half)', 'Karahi', 3150, 'Slow-cooked mutton in a bold, traditional masala.', 'karahi'),
      product('White Chicken Karahi', 'Karahi', 2050, 'Creamy white karahi with pepper and fresh ginger.', 'karahi'),
      product('Mint Lemonade', 'Drinks', 220, 'Fresh lemon, mint and a little sparkle.', 'drink'),
      product('Sweet Lassi', 'Drinks', 250, 'Chilled yogurt drink, whisked smooth.', 'drink'),
      product('Chilled Cola', 'Drinks', 120, 'A cold 345 ml can served with your meal.', 'drink'),
      product('Family BBQ Deal', 'Deals', 3490, 'Mixed BBQ, four naans, salad and two chutneys.', 'combo'),
      product('Roll & Drink Combo', 'Deals', 620, 'Any chicken roll with a chilled drink.', 'combo'),
      product('Karachi Feast Box', 'Deals', 2190, 'Tikka, kebab, naan, raita and a sweet treat.', 'combo'),
    ],
  },
  {
    name: 'Sweet Crumbs Bakery', slug: 'sweet-crumbs', city: 'Lahore',
    tagline: 'Small-batch bakes, made fresh every morning.', brandColor: '#8d4166', kind: 'bakery',
    deliveryAreas: [
      { name: 'DHA', deliveryFee: 170, minimumOrder: 600 },
      { name: 'Clifton', deliveryFee: 160, minimumOrder: 600 },
      { name: 'PECHS', deliveryFee: 190, minimumOrder: 650 },
      { name: 'Bahadurabad', deliveryFee: 210, minimumOrder: 700 },
      { name: 'Saddar', deliveryFee: 220, minimumOrder: 700 },
    ],
    pickupBranches: [
      { name: 'Sweet Crumbs Clifton', address: 'Shop 8, Zamzama Commercial, Clifton, Karachi', phone: '021-35880001', openingHours: '8:00 AM – 10:00 PM' },
      { name: 'Sweet Crumbs PECHS', address: 'Shahrah-e-Quaideen, PECHS, Karachi', phone: '021-34380002', openingHours: '8:00 AM – 9:30 PM' },
    ],
    palette: { dark: '#4b263a', mid: '#8d4166', light: '#faeaf0', accent: '#e79ab4', cream: '#fff8f1' },
    customers: [
      ['Hira Malik', '03011234001', 'Johar Town, Lahore'],
      ['Daniyal Iqbal', '03011234002', 'Model Town, Lahore'],
      ['Maha Zafar', '03011234003', 'Gulberg III, Lahore'],
      ['Saad Qureshi', '03011234004', 'Bahria Town, Lahore'],
      ['Eman Rafiq', '03011234005', 'Wapda Town, Lahore'],
      ['Fahad Noor', '03011234006', 'DHA Phase 5, Lahore'],
    ],
    products: [
      product('Chocolate Fudge Cake Slice', 'Cakes', 420, 'Moist cocoa sponge with a smooth fudge finish.', 'cake'),
      product('Vanilla Berry Cake (500g)', 'Cakes', 2100, 'Soft vanilla layers with berry cream and fresh fruit.', 'cake'),
      product('Lotus Cheesecake Slice', 'Cakes', 620, 'Creamy baked cheesecake with a biscuit crumb base.', 'cheesecake'),
      product('Chicken Patties', 'Pastries', 180, 'Flaky pastry filled with seasoned chicken.', 'pastry'),
      product('Almond Croissant', 'Pastries', 420, 'Buttery croissant topped with toasted almonds.', 'croissant'),
      product('Chocolate Éclair', 'Pastries', 360, 'Light choux pastry filled with vanilla cream.', 'pastry'),
      product('Chocolate Chip Cookies (6)', 'Cookies', 780, 'A box of six soft cookies with chocolate chunks.', 'cookie'),
      product('Nan Khatai (8)', 'Cookies', 520, 'Traditional cardamom biscuits, baked until golden.', 'cookie'),
      product('Double Cocoa Cookie', 'Cookies', 190, 'Rich cocoa cookie with a crisp edge and soft centre.', 'cookie'),
      product('Milk Bread Loaf', 'Bread', 230, 'Soft, lightly sweet loaf for breakfast and toast.', 'bread'),
      product('Sourdough Loaf', 'Bread', 650, 'Slow-fermented loaf with a crisp crust.', 'bread'),
      product('Garlic Bread Twists', 'Bread', 390, 'Warm bread twists with garlic butter and herbs.', 'bread'),
      product('Cinnamon Roll', 'Pastries', 350, 'Soft spiral bun with cinnamon sugar glaze.', 'pastry'),
      product('Classic Brownies (4)', 'Cakes', 700, 'Four dense chocolate brownies with a crackly top.', 'cake'),
      product('Butter Croissant', 'Pastries', 300, 'Golden, flaky layers made with real butter.', 'croissant'),
    ],
  },
  {
    name: 'Daily Fresh Mart', slug: 'daily-fresh', city: 'Islamabad',
    tagline: 'Fresh picks and everyday essentials for your home.', brandColor: '#326a49', kind: 'grocery',
    deliveryAreas: [
      { name: 'Gulshan-e-Iqbal', deliveryFee: 140, minimumOrder: 1000 },
      { name: 'Gulistan-e-Johar', deliveryFee: 160, minimumOrder: 1000 },
      { name: 'North Nazimabad', deliveryFee: 180, minimumOrder: 1000 },
      { name: 'Nazimabad', deliveryFee: 170, minimumOrder: 1100 },
      { name: 'FB Area', deliveryFee: 190, minimumOrder: 1200 },
    ],
    pickupBranches: [
      { name: 'Daily Fresh Gulshan', address: 'Block 13-D, Gulshan-e-Iqbal, Karachi', phone: '021-34990001', openingHours: '7:00 AM – 11:00 PM' },
      { name: 'Daily Fresh North Nazimabad', address: 'Hyderi Market, North Nazimabad, Karachi', phone: '021-36690002', openingHours: '7:00 AM – 10:30 PM' },
    ],
    palette: { dark: '#1d4632', mid: '#326a49', light: '#edf4e7', accent: '#e5b74a', cream: '#fbfff5' },
    customers: [
      ['Noor Fatima', '03021234001', 'F-7 Markaz, Islamabad'],
      ['Ahmed Rauf', '03021234002', 'G-11/3, Islamabad'],
      ['Iqra Javed', '03021234003', 'E-11, Islamabad'],
      ['Zain Abbas', '03021234004', 'I-8/2, Islamabad'],
      ['Laiba Anwar', '03021234005', 'F-10/4, Islamabad'],
      ['Taha Siddiqui', '03021234006', 'G-10/1, Islamabad'],
    ],
    products: [
      product('Farm Bananas (1 kg)', 'Fruits & Vegetables', 260, 'Ripe bananas selected for everyday snacking.', 'fruit'),
      product('Red Apples (1 kg)', 'Fruits & Vegetables', 480, 'Crisp, hand-checked apples from the season.', 'fruit'),
      product('Seasonal Vegetable Bag', 'Fruits & Vegetables', 520, 'A fresh mix of potatoes, tomatoes and onions.', 'vegetable'),
      product('Fresh Milk (1 litre)', 'Dairy', 290, 'Pasteurized full-cream milk, kept chilled.', 'milk'),
      product('Plain Yogurt (500 g)', 'Dairy', 210, 'Thick, creamy yogurt for meals and snacks.', 'yogurt'),
      product('Cheddar Cheese (200 g)', 'Dairy', 680, 'Mild cheddar slices for sandwiches and toast.', 'cheese'),
      product('Farm Eggs (Dozen)', 'Dairy', 390, 'A dozen clean, carefully packed eggs.', 'egg'),
      product('Salted Potato Chips', 'Snacks', 140, 'Crunchy salted chips in a sharing-size pack.', 'snack'),
      product('Chocolate Biscuits', 'Snacks', 180, 'Crisp biscuits with a chocolate coating.', 'snack'),
      product('Roasted Mixed Nuts (200 g)', 'Snacks', 740, 'A savoury mix of roasted nuts for a quick bite.', 'snack'),
      product('Dishwashing Liquid (500 ml)', 'Household', 320, 'Everyday dish liquid with a fresh lemon scent.', 'household'),
      product('Laundry Detergent (1 kg)', 'Household', 590, 'A family-size pack for bright, clean laundry.', 'household'),
      product('Kitchen Tissue Roll (2 pack)', 'Household', 250, 'Absorbent rolls for kitchen clean-ups.', 'household'),
      product('Spring Water (1.5 litre)', 'Household', 110, 'Sealed drinking water bottle for the family.', 'bottle'),
      product('Orange Juice (1 litre)', 'Dairy', 360, 'Chilled, smooth orange juice for breakfast.', 'drink'),
    ],
  },
];

const scenarios = [
  { status: 'new', customer: 0, items: [[0, 2], [9, 1]], fulfillmentType: 'delivery', areaIndex: 0 },
  { status: 'preparing', customer: 1, items: [[3, 1], [6, 1]], fulfillmentType: 'pickup', branchIndex: 0 },
  { status: 'ready', customer: 2, items: [[1, 1], [10, 2]], fulfillmentType: 'delivery', areaIndex: 2 },
  { status: 'out_for_delivery', customer: 3, items: [[4, 1], [11, 1]], fulfillmentType: 'delivery', areaIndex: 1 },
  { status: 'delivered', customer: 4, items: [[2, 1], [7, 1]], fulfillmentType: 'pickup', branchIndex: 1 },
  { status: 'cancelled', customer: 5, items: [[5, 1]], fulfillmentType: 'pickup', branchIndex: 0 },
];

const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const safeFileName = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function logoSvg(store) {
  const initials = store.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="44" fill="${store.palette.dark}"/><circle cx="100" cy="100" r="67" fill="${store.palette.mid}" stroke="${store.palette.accent}" stroke-width="5"/><text x="100" y="121" text-anchor="middle" fill="${store.palette.cream}" font-family="Arial,sans-serif" font-size="58" font-weight="700">${escapeXml(initials)}</text><circle cx="154" cy="47" r="9" fill="${store.palette.accent}"/></svg>`;
}

function heroSvg(store) {
  let scene = '';
  if (store.kind === 'restaurant') {
    scene = `<ellipse cx="920" cy="250" rx="235" ry="79" fill="#fff8ef"/><ellipse cx="920" cy="238" rx="198" ry="58" fill="#dfaa65"/><path d="M766 231h305M784 253h270M806 275h232" stroke="${store.palette.dark}" stroke-width="13" stroke-linecap="round"/><path d="M807 193l29-25 30 25-29 25zm84 0 29-25 30 25-29 25zm84 0 29-25 30 25-29 25z" fill="${store.palette.mid}"/><path d="M722 197l245-97M742 224l266-105" stroke="${store.palette.accent}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (store.kind === 'bakery') {
    scene = `<ellipse cx="925" cy="285" rx="235" ry="22" fill="#4b263a" opacity=".16"/><path d="M745 267h360l-32-42H777z" fill="#fff8f1"/><path d="M773 226h304l-30-63H803z" fill="#e79ab4"/><path d="M803 164c0-54 25-89 60-89 29 0 45 25 52 52 10-40 32-63 61-57 39 8 48 49 39 94z" fill="#fff8f1"/><circle cx="864" cy="116" r="12" fill="#cb4566"/><circle cx="952" cy="102" r="12" fill="#cb4566"/><path d="M822 198c40 24 177 28 222 0" fill="none" stroke="#fff4f5" stroke-width="13"/>`;
  } else {
    scene = `<path d="M720 260c84-122 149-145 231-101 74-87 173-68 254 22v100H720z" fill="#8caf6b"/><path d="M730 255h445v50H730z" fill="#d8a451"/><path d="M760 213h166v55H760zm188 0h166v55H948z" fill="#f1d28a" stroke="#fff2cc" stroke-width="8"/><circle cx="800" cy="203" r="35" fill="#e15e4b"/><circle cx="861" cy="204" r="34" fill="#f2bd43"/><circle cx="1004" cy="200" r="33" fill="#6e9d48"/><circle cx="1063" cy="201" r="32" fill="#e35a4a"/><path d="M800 167q8-20 24-18m37 20q4-21 22-23m121 22q5-22 22-22m37 24q6-23 23-22" fill="none" stroke="${store.palette.dark}" stroke-width="8" stroke-linecap="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${store.palette.dark}"/><stop offset="1" stop-color="${store.palette.mid}"/></linearGradient></defs><rect width="1200" height="360" fill="${store.palette.light}"/><path d="M0 0h1200v360H0z" fill="url(#bg)"/><circle cx="1040" cy="20" r="210" fill="${store.palette.accent}" opacity=".16"/><circle cx="1100" cy="300" r="170" fill="${store.palette.cream}" opacity=".1"/><text x="58" y="128" fill="${store.palette.cream}" font-family="Arial,sans-serif" font-size="21" font-weight="700" letter-spacing="4">${escapeXml(store.city.toUpperCase())} · MADE WITH CARE</text><text x="58" y="198" fill="${store.palette.cream}" font-family="Arial,sans-serif" font-size="48" font-weight="700">${escapeXml(store.name)}</text><text x="58" y="244" fill="${store.palette.cream}" font-family="Arial,sans-serif" font-size="23">${escapeXml(store.tagline)}</text>${scene}</svg>`;
}

function productArt(art, accent, palette) {
  const dark = palette.dark;
  const base = `<ellipse cx="200" cy="226" rx="142" ry="18" fill="${dark}" opacity=".12"/>`;
  const artShapes = {
    bbq: `<ellipse cx="200" cy="175" rx="137" ry="60" fill="#fff"/><ellipse cx="200" cy="170" rx="112" ry="43" fill="#f0d8bb"/><path d="M108 162l34-22 31 22 32-22 31 22 33-22 35 22" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="M108 188l34-22 31 22 32-22 31 22 33-22 35 22" fill="none" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>`,
    roll: `<path d="M119 118q73-42 162 0l-24 119q-62 24-118 0z" fill="#e7bd7f"/><path d="M136 133q56-28 128 0l-18 85q-47 18-92 0z" fill="${accent}"/><path d="M134 165q61-21 112 3m-107 24q57-16 99 2" fill="none" stroke="#76904d" stroke-width="11" stroke-linecap="round"/><path d="M120 118q83-43 162 0" fill="none" stroke="#fff0ce" stroke-width="12"/>`,
    karahi: `<ellipse cx="200" cy="185" rx="138" ry="52" fill="#fff"/><path d="M79 174q121-106 242 0l-24 55q-99 49-194 0z" fill="${dark}"/><ellipse cx="200" cy="171" rx="109" ry="38" fill="${accent}"/><circle cx="159" cy="163" r="17" fill="#9c3b2e"/><circle cx="219" cy="179" r="19" fill="#b94c36"/><circle cx="249" cy="156" r="12" fill="#66884d"/><path d="M152 119q-18-23 0-41m45 41q-18-23 0-41m44 41q-18-23 0-41" fill="none" stroke="#fff8ef" stroke-width="7" stroke-linecap="round"/>`,
    drink: `<path d="M132 102h136l-16 141q-52 34-104 0z" fill="#fff" opacity=".9"/><path d="M141 163h116l-9 77q-49 28-98 0z" fill="${accent}"/><path d="M221 104l44-42" stroke="${dark}" stroke-width="10" stroke-linecap="round"/><circle cx="177" cy="178" r="10" fill="#fff8ef"/><circle cx="219" cy="211" r="8" fill="#fff8ef"/><path d="M157 118h88" stroke="#fff" stroke-width="7"/>`,
    combo: `<ellipse cx="200" cy="185" rx="145" ry="58" fill="#fff"/><circle cx="146" cy="174" r="39" fill="${accent}"/><ellipse cx="225" cy="169" rx="49" ry="38" fill="#e8c590"/><rect x="239" y="192" width="63" height="27" rx="12" fill="#8c5435"/><path d="M215 154q10-31 37-22m-121 32q-14-24 7-41" fill="none" stroke="#728b50" stroke-width="9" stroke-linecap="round"/>`,
    cake: `<path d="M94 204h212v30H94z" fill="#fff"/><path d="M112 147h176v57H112z" fill="${accent}"/><path d="M130 103h140v44H130z" fill="#fff7ee"/><path d="M130 147h140" stroke="${dark}" stroke-width="12"/><path d="M117 203q32 20 64 0t64 0 44 0" fill="none" stroke="#fff" stroke-width="10"/><circle cx="200" cy="96" r="16" fill="#d84e5e"/><path d="M200 77v-25" stroke="#587b47" stroke-width="6"/>`,
    cheesecake: `<path d="M88 205l110-122 114 122z" fill="#fff7ed"/><path d="M111 180l87-97 91 97z" fill="${accent}"/><path d="M93 207h216v26H93z" fill="#bd8651"/><circle cx="194" cy="103" r="11" fill="#c53f5a"/><circle cx="218" cy="120" r="8" fill="#6e934d"/>`,
    pastry: `<path d="M91 194q8-73 67-78 29-58 78-8 57-7 73 86-91 56-218 0" fill="${accent}"/><path d="M123 177q5-42 43-56m3 74q7-54 49-82m-1 97q8-58 48-72m-2 84q7-32 30-38" fill="none" stroke="#fff2d8" stroke-width="13" stroke-linecap="round"/>`,
    croissant: `<path d="M72 185q34-100 104-40 26 21 48 0 70-60 104 40-43 67-114 21-17-11-29 0-70 46-113-21" fill="${accent}"/><path d="M105 183q25-57 72-31m-36 54q28-54 75-36m-30 56q22-37 59-37m-24-29q42-28 69 24" fill="none" stroke="#fff0d5" stroke-width="11" stroke-linecap="round"/>`,
    cookie: `<circle cx="150" cy="175" r="68" fill="${accent}"/><circle cx="247" cy="185" r="54" fill="#d7ad7f"/><g fill="${dark}"><circle cx="129" cy="145" r="8"/><circle cx="170" cy="172" r="9"/><circle cx="140" cy="202" r="7"/><circle cx="254" cy="166" r="7"/><circle cx="230" cy="196" r="8"/><circle cx="273" cy="207" r="6"/></g>`,
    bread: `<path d="M82 199q0-89 87-89 20-47 67-20 53-2 66 109v32H82z" fill="${accent}"/><path d="M146 127q-21 27-12 61m67-91q-16 30-9 66m66-46q-16 27-12 55" fill="none" stroke="#fff0d5" stroke-width="14" stroke-linecap="round"/><path d="M84 213h217" stroke="#a86a42" stroke-width="9" stroke-linecap="round"/>`,
    fruit: `<circle cx="142" cy="174" r="57" fill="${accent}"/><circle cx="242" cy="184" r="48" fill="#e2b941"/><path d="M141 114q-4-26 19-33m81 52q-5-22 14-28" fill="none" stroke="${dark}" stroke-width="8" stroke-linecap="round"/><path d="M155 110q35-31 59-11-18 31-59 11m76 18q28-29 52-10-17 31-52 10" fill="#6f9e53"/>`,
    vegetable: `<path d="M125 225q-18-93 35-125 47 42 24 125z" fill="${accent}"/><path d="M186 230q-7-72 48-94 41 48 3 94z" fill="#85a95b"/><path d="M131 113q-30-46-12-61 34 13 51 46m4 2q12-46 45-43 11 30-26 56" fill="#51814a"/>`,
    milk: `<path d="M134 94h112l26 34v120H128V128z" fill="#fff"/><path d="M134 94l45-37h65v37" fill="${accent}"/><path d="M179 57v37m-45 0h112" stroke="#d3d8d0" stroke-width="7"/><path d="M153 164h93v41h-93z" fill="#e7f1ff"/><text x="199" y="190" text-anchor="middle" fill="${dark}" font-family="Arial,sans-serif" font-size="19" font-weight="700">MILK</text>`,
    yogurt: `<path d="M122 121h156l-17 118q-60 23-122 0z" fill="#fff"/><path d="M122 121h156v28H122z" fill="${accent}"/><path d="M144 173h112" stroke="#dce8f0" stroke-width="13" stroke-linecap="round"/><circle cx="184" cy="198" r="8" fill="#91ae73"/><circle cx="211" cy="198" r="8" fill="#d6a74a"/>`,
    cheese: `<path d="M90 204l94-104 125 47v72H90z" fill="${accent}"/><path d="M184 100v118m53-98v98" stroke="#fff0c4" stroke-width="9"/><circle cx="155" cy="167" r="10" fill="#d79a36"/><circle cx="223" cy="153" r="9" fill="#d79a36"/><circle cx="267" cy="191" r="8" fill="#d79a36"/>`,
    egg: `<ellipse cx="151" cy="180" rx="43" ry="57" fill="#fff"/><ellipse cx="249" cy="180" rx="43" ry="57" fill="#fff"/><path d="M105 217q95 39 190 0" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round"/><circle cx="200" cy="191" r="36" fill="#f2c44f"/>`,
    snack: `<path d="M116 86h168l-18 150H133z" fill="${accent}"/><path d="M116 86h168v34H116zm-4 116h169" fill="none" stroke="#fff4da" stroke-width="10"/><circle cx="174" cy="167" r="24" fill="#fff1cf"/><path d="M217 150q26 14 0 31m17-31q26 14 0 31" fill="none" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>`,
    household: `<path d="M162 82h76v28l23 21v109H139V131l23-21z" fill="#fff"/><path d="M162 82h76v28h-76zm-23 81h122v28H139z" fill="${accent}"/><path d="M179 201h42" stroke="${dark}" stroke-width="9" stroke-linecap="round"/><circle cx="199" cy="145" r="11" fill="#dcebd3"/>`,
    bottle: `<path d="M171 76h58v33l22 20v114H149V129l22-20z" fill="#d8edf2"/><path d="M171 76h58v28h-58z" fill="${accent}"/><path d="M151 171h98v50h-98z" fill="#fff"/><path d="M184 189h31" stroke="#6594a2" stroke-width="8" stroke-linecap="round"/>`,
  };
  return `${base}${artShapes[art] || artShapes.snack}`;
}

function productSvg(store, item, index) {
  const accents = [store.palette.accent, store.palette.mid, '#d6a36a', '#7c9a61', '#d66e58'];
  const accent = accents[index % accents.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" rx="20" fill="${store.palette.light}"/><circle cx="331" cy="64" r="43" fill="${store.palette.cream}"/><text x="22" y="34" fill="${store.palette.dark}" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="1">${escapeXml(item.category.toUpperCase())}</text>${productArt(item.art, accent, store.palette)}</svg>`;
}

function writeDemoImages() {
  for (const store of stores) {
    const storeDir = path.join(imageRoot, store.slug);
    const productDir = path.join(storeDir, 'products');
    fs.mkdirSync(productDir, { recursive: true });
    fs.writeFileSync(path.join(storeDir, 'logo.svg'), logoSvg(store), 'utf8');
    fs.writeFileSync(path.join(storeDir, 'hero.svg'), heroSvg(store), 'utf8');
    store.products.forEach((item, index) => {
      const fileName = `${String(index + 1).padStart(2, '0')}-${safeFileName(item.name)}.svg`;
      fs.writeFileSync(path.join(productDir, fileName), productSvg(store, item, index), 'utf8');
      item.imageUrl = `/demo/${store.slug}/products/${fileName}`;
    });
    store.logoUrl = `/demo/${store.slug}/logo.svg`;
    store.heroImageUrl = `/demo/${store.slug}/hero.svg`;
  }
}

async function findExistingDemoTenants() {
  const slugs = stores.map(store => store.slug);
  const existing = await Tenant.find({ slug: { $in: slugs } }).select('+demoSeedKey');
  const bySlug = new Map(existing.map(tenant => [tenant.slug, tenant]));
  for (const slug of slugs) {
    const tenant = bySlug.get(slug);
    if (tenant && tenant.demoSeedKey !== DEMO_SEED_KEY) {
      throw new Error(`Refusing to replace /${slug}: it is not marked as a Storecraft demo store.`);
    }
  }

  const demoIds = new Set(existing.map(tenant => String(tenant._id)));
  const expectedEmails = stores.flatMap(store => [
    { email: `owner@${store.slug}.demo`, slug: store.slug },
    { email: `cashier@${store.slug}.demo`, slug: store.slug },
  ]);
  const accounts = await User.find({ email: { $in: expectedEmails.map(account => account.email) } }).select('email tenantId +demoSeedKey');
  for (const expected of expectedEmails) {
    const account = accounts.find(user => user.email === expected.email);
    if (!account) continue;
    const tenant = bySlug.get(expected.slug);
    if (!tenant || !demoIds.has(String(account.tenantId)) || String(account.tenantId) !== String(tenant._id) || account.demoSeedKey !== DEMO_SEED_KEY) {
      throw new Error(`Refusing to replace ${expected.email}: it is not a demo account managed by this script.`);
    }
  }
  return bySlug;
}

function makeOrders(store, tenantId) {
  return scenarios.map((scenario, index) => {
    const lines = scenario.items.map(([productIndex, qty]) => {
      const item = store.products[productIndex];
      return { name: item.name, price: item.price, qty };
    });
    const customer = store.customers[scenario.customer];
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
    const isDelivery = scenario.fulfillmentType === 'delivery';
    const area = isDelivery ? store.deliveryAreas[scenario.areaIndex] : null;
    const branch = isDelivery ? null : store.pickupBranches[scenario.branchIndex];
    const createdAt = new Date(Date.now() - (index * 37 + 8) * 60 * 1000);
    return {
      tenantId,
      demoSeedKey: DEMO_SEED_KEY,
      items: lines,
      total: subtotal + (area?.deliveryFee || 0),
      customer: { name: customer[0], phone: customer[1], address: isDelivery ? customer[2] : '' },
      paymentMethod: 'cod',
      fulfillmentType: scenario.fulfillmentType,
      ...(area && { deliveryArea: { name: area.name } }),
      ...(branch && { pickupBranch: { name: branch.name, address: branch.address, phone: branch.phone, openingHours: branch.openingHours } }),
      deliveryFee: area?.deliveryFee || 0,
      status: scenario.status,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

async function seedStore(store, existingTenant) {
  const tenantFields = {
    name: store.name,
    slug: store.slug,
    active: true,
    logoUrl: store.logoUrl,
    heroImageUrl: store.heroImageUrl,
    brandColor: store.brandColor,
    tagline: store.tagline,
    city: store.city,
    deliveryAreas: store.deliveryAreas.map(area => ({ ...area, enabled: true })),
    pickupBranches: store.pickupBranches.map(branch => ({ ...branch, enabled: true })),
    features: { onlineOrdering: true, cod: true, cardPayments: false, coupons: false, loyalty: false, reviews: false, tableQr: false, delivery: true, pickup: true },
    demoSeedKey: DEMO_SEED_KEY,
  };
  let tenantId;
  if (existingTenant) {
    await Tenant.updateOne({ _id: existingTenant._id, demoSeedKey: DEMO_SEED_KEY }, { $set: tenantFields }, { runValidators: true });
    tenantId = existingTenant._id;
  } else {
    const tenant = await Tenant.create(tenantFields);
    tenantId = tenant._id;
  }

  // Remove only records previously created by this demo script for this tenant.
  await Promise.all([
    User.deleteMany({ tenantId, demoSeedKey: DEMO_SEED_KEY }),
    MenuItem.deleteMany({ tenantId, demoSeedKey: DEMO_SEED_KEY }),
    Order.deleteMany({ tenantId, demoSeedKey: DEMO_SEED_KEY }),
  ]);

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.create([
    { tenantId, name: `${store.name} Owner`, email: `owner@${store.slug}.demo`, role: 'owner', password, demoSeedKey: DEMO_SEED_KEY },
    { tenantId, name: `${store.name} Cashier`, email: `cashier@${store.slug}.demo`, role: 'cashier', password, demoSeedKey: DEMO_SEED_KEY },
  ]);
  await MenuItem.insertMany(store.products.map(item => ({ ...item, tenantId, available: true, demoSeedKey: DEMO_SEED_KEY })));
  await Order.insertMany(makeOrders(store, tenantId));
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const existingBySlug = await findExistingDemoTenants();
    writeDemoImages();
    for (const store of stores) await seedStore(store, existingBySlug.get(store.slug));
    console.log('Demo stores are ready. Storefront URLs:');
    for (const store of stores) console.log(`  ${store.name}: http://localhost:3000/${store.slug}`);
    console.log('\nStore admin portals:');
    for (const store of stores) console.log(`  ${store.name}: http://localhost:3001/${store.slug}`);
    console.log(`Demo password for every account: ${DEMO_PASSWORD}`);
    for (const store of stores) {
      console.log(`  ${store.name} owner: owner@${store.slug}.demo / ${DEMO_PASSWORD}`);
      console.log(`  ${store.name} cashier: cashier@${store.slug}.demo / ${DEMO_PASSWORD}`);
    }
    console.log('\nImages are lightweight local SVG illustrations in frontend/public/demo/.');
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv.includes('--assets-only')) {
  writeDemoImages();
  console.log('Generated the local demo SVG illustrations.');
} else {
  main().catch(error => {
    const message = error.message?.startsWith('Refusing to replace') ? error.message : 'Demo seed failed. Check the backend MongoDB connection and try again.';
    console.error(message);
    mongoose.disconnect().finally(() => { process.exitCode = 1; });
  });
}
