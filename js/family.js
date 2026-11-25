// Vepuri family preset: members, chores, a rotating two-week meal plan and a grouped grocery list.
import { uid, ymd, addDays, startOfWeek, startOfDay, DAY_MS } from './util.js';

export const FAMILY_NAME = 'Vepuri family';
export const WEEKLY_LIST_NAME = 'Weekly groceries';
export const GROCERY_GROUPS = ['Produce', 'Protein', 'Dairy', 'Pantry/Spices', 'Grains/Legumes', 'Frozen'];

const DAILY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export const MEMBER_SEEDS = [
  { name: 'Karthik', kid: false, color: '#1c7ed6', emoji: '🧢' },
  { name: 'Navya', kid: false, color: '#ae3ec9', emoji: '🌸' },
  { name: 'Nivaan', kid: true, color: '#f08c00', emoji: '🦁' },
  { name: 'Myra', kid: true, color: '#e64980', emoji: '🦋' },
];

export const CHORE_SEEDS = [
  { title: 'Bath', emoji: '🛁', memberName: 'Nivaan', area: 'Personal care', routine: 'evening', days: DAILY, stars: 1 },
  { title: 'Deo', emoji: '💨', memberName: 'Nivaan', area: 'Personal care', routine: 'morning', days: DAILY, stars: 1 },
  { title: 'Moisturiser', emoji: '🧴', memberName: 'Nivaan', area: 'Personal care', routine: 'evening', days: DAILY, stars: 1 },
  { title: 'Put toys away', emoji: '🧸', memberName: 'Myra', area: 'Cleanup', routine: 'afternoon', days: DAILY, stars: 1 },
  { title: 'Clean up after play/meals', emoji: '🍽️', memberName: 'Myra', area: 'Cleanup', routine: 'evening', days: DAILY, stars: 1 },
  { title: 'Tidy room', emoji: '🧹', memberName: 'Myra', area: 'Cleanup', routine: 'evening', days: DAILY, stars: 2 },
];

export const REWARD_SEEDS = [
  { title: 'Extra screen time (30 min)', emoji: '📺', cost: 10 },
  { title: 'Pick dinner', emoji: '🍕', cost: 15 },
  { title: 'Choose the family movie', emoji: '🎬', cost: 20 },
];

export const RECIPE_SEEDS = [
  {
    key: 'dal-tadka',
    title: 'Dal Tadka with Chickpeas',
    source: 'Inspired by Chutney Life',
    url: 'https://thechutneylife.com/dal-tadka-with-chickpeas/',
    tags: ['Sunday batch', 'Indian', 'high fibre', 'kids'],
    ingredients: [
      'Red lentils (split masoor dal), 2 cups (big batch)',
      'Canned chickpeas, 2 cans',
      'Baby spinach, 1 large bag',
      'Garlic, 1 head',
      'Fresh ginger',
      'Cilantro, 1 bunch',
      'Ghee',
      'Cumin seeds',
      'Turmeric',
      'Garam masala',
      'Coriander powder',
      'Red chili powder',
      'Dried red chilies',
      'Curry leaves',
      'Hing (asafoetida)',
      'Lemons',
      'Basmati rice (for lunches and kids’ dinners)',
    ],
    steps: 'Batch this on Sunday for weekday work lunches and the kids’ dinners. Follow the linked Chutney Life recipe and double it. Stir spinach in at the end for extra fibre. Kids eat it with rice; adults can have it at lunch, or at night with a salad and no rice.',
  },
  {
    key: 'gravy-chicken',
    title: 'Gravy Chicken',
    source: 'Inspired by Chutney Life',
    url: 'https://thechutneylife.com/gravy-chicken/',
    tags: ['Sunday batch', 'Indian', 'chicken curry'],
    ingredients: [
      'Boneless chicken thighs or breasts, 4 lb (big batch)',
      'Shan Nihari seasoning mix',
      'Yellow onions, 4 large',
      'Garlic, 1 head',
      'Tomato paste',
      'Cumin seeds',
      'Turmeric',
      'Cilantro, 1 bunch',
      'Neutral oil',
      'Plain yogurt (optional, to mellow spice)',
    ],
    steps: 'The family’s Sunday chicken curry. Follow the linked Chutney Life recipe and scale it up for lunches plus the kids’ dinners. Kids get it with rice; at night, adults can have the curry with a salad or roasted vegetables instead of rice.',
  },
  {
    key: 'chana-masala',
    title: 'Creamy Chana Masala',
    source: 'Inspired by Chutney Life',
    url: 'https://thechutneylife.com/creamy-chana-masala/',
    tags: ['Sunday batch', 'Indian', 'high fibre', 'vegetarian'],
    ingredients: [
      'Canned chickpeas, 4 cans (big batch)',
      'Full-fat coconut milk, 2 cans',
      'Yellow onions, 2 large',
      'Garlic, 1 head',
      'Tomato paste (double concentrated if possible)',
      'Thai green chilies',
      'Cumin seeds',
      'Bay leaves',
      'Garam masala',
      'Chole masala (e.g. Badshah Punjabi Chana Masala)',
      'Cilantro, 1 bunch',
      'Lemons',
    ],
    steps: 'A high-fibre chickpea curry for the Sunday pot. Follow the linked Chutney Life recipe and make a double batch. Good with rice for the kids, or with salad and roasted vegetables for a rice-free adult plate at night.',
  },
  {
    key: 'masoor-dal',
    title: 'Masoor Dal (Brown Lentils)',
    source: 'Inspired by Chutney Life',
    url: 'https://thechutneylife.com/masoor-dal-brown-lentils/',
    tags: ['Sunday batch', 'Indian', 'high fibre', 'kids'],
    ingredients: [
      'Whole masoor dal (brown lentils), 2 cups (big batch)',
      'Yellow onions, 2',
      'Red bell peppers, 2',
      'Zucchini, 2',
      'Carrots, 4 (finely diced, blends into the dal)',
      'Garlic, 1 head',
      'Thai green chilies',
      'Ghee',
      'Cumin seeds',
      'Hing (asafoetida)',
      'Garam masala',
      'Coriander powder',
      'Red chili powder',
      'Cilantro, 1 bunch',
      'Lemons',
      'Basmati rice (for lunches and kids’ dinners)',
    ],
    steps: 'Week-2 Sunday dal. Follow the linked Chutney Life recipe and double it. Dice carrots in small so they cook down into the lentils — a gentle fibre boost the kids already accept. Serve with rice for lunches and kids’ dinners.',
  },
  {
    key: 'sweet-potato-lentil-soup',
    title: 'Coconut Curry and Sweet Potato Lentil Soup',
    source: 'Inspired by Chutney Life',
    url: 'https://thechutneylife.com/coconut-curry-and-sweet-potato-lentil-soup/',
    tags: ['Sunday batch', 'Indian', 'high fibre'],
    ingredients: [
      'Brown or green lentils, 2 cups (big batch)',
      'Sweet potatoes, 3 medium',
      'Yellow onions, 2',
      'Red bell peppers, 2',
      'Garlic, 1 head',
      'Baby spinach or kale, 1 bag',
      'Coconut milk, 2 cans',
      'Vegetable broth, 2 cartons',
      'Curry powder',
      'Garam masala',
      'Cumin powder',
      'Coriander powder',
      'Turmeric',
      'Brown sugar',
    ],
    steps: 'A fibre-rich Sunday pot with sweet potato and lentils. Follow the linked Chutney Life recipe and scale it up. Soft sweet potato and blended lentils hide extra fibre. Kids can have it with rice; adults can have a bowl on its own at night.',
  },
  {
    key: 'lentil-spinach-rice',
    title: 'Lentil Spinach Rice',
    source: 'Inspired by Chutney Life',
    url: 'https://thechutneylife.com/lentil-spinach-rice/',
    tags: ['kids', 'high fibre', 'side'],
    ingredients: [
      'Green lentils, 1 cup dry',
      'Basmati rice, 2 cups cooked (or leftover rice)',
      'Chopped spinach or kale, 2 cups',
      'Garlic',
      'Butter or ghee',
      'Turmeric',
      'Garam masala',
    ],
    steps: 'A kids-friendly way to add lentils and spinach to rice. Follow the linked Chutney Life recipe. Nice next to dal or gravy chicken on the kids’ plates.',
  },
  {
    key: 'chicken-biryani',
    title: 'Chicken Biryani (family favorite)',
    source: 'Family favorite',
    url: '',
    tags: ['Sunday batch', 'Indian', 'kids'],
    ingredients: [
      'Chicken thighs, 3–4 lb (big batch)',
      'Basmati rice, 4 cups dry',
      'Plain yogurt',
      'Yellow onions, 4 large',
      'Garlic, 1 head',
      'Fresh ginger',
      'Cilantro, 1 bunch',
      'Fresh mint, 1 bunch',
      'Biryani masala or garam masala',
      'Turmeric',
      'Cumin seeds',
      'Ghee',
      'Saffron (optional)',
    ],
    steps: 'A Sunday batch the kids already like, used for weekday work lunches and their dinners. Adults can enjoy it at lunch (rice is fine then). At night, pair a non-rice dinner from the weeknight list.',
  },
  {
    key: 'columbie-bath',
    title: 'Columbie Bath (cilantro-mint shrimp and rice)',
    source: 'Family favorite',
    url: '',
    tags: ['kids', 'shrimp'],
    ingredients: [
      'Shrimp, 2 lb',
      'Cilantro, 1 bunch',
      'Fresh mint, 1 bunch',
      'Garlic',
      'Fresh ginger',
      'Green chilies',
      'Basmati rice (kids’ plates)',
      'Lemon or lime',
    ],
    steps: 'The kids’ favorite shrimp cooked with cilantro and mint, served with rice. A nice Friday treat. Adults can have the shrimp over salad greens or with roasted vegetables instead of rice.',
  },
  {
    key: 'mac-cheese-broccoli',
    title: 'Mac and cheese with hidden broccoli',
    source: 'Family favorite',
    url: '',
    tags: ['kids', 'high fibre'],
    ingredients: [
      'Chickpea or lentil pasta (for extra fibre)',
      'Cheddar cheese',
      'Milk',
      'Butter',
      'Broccoli, finely chopped or blended into the sauce',
    ],
    steps: 'Use chickpea or lentil pasta and blend cooked broccoli into the cheese sauce so the kids get more fibre without a new vegetable on the plate.',
  },
  {
    key: 'turkey-rice',
    title: 'Ground turkey and rice',
    source: 'Family favorite',
    url: '',
    tags: ['kids'],
    ingredients: [
      'Ground turkey, 2 lb',
      'Basmati rice (kids’ plates)',
      'Carrots, finely diced',
      'Broccoli, finely chopped',
      'Yellow onion',
      'Garlic',
      'Taco seasoning or garam masala',
    ],
    steps: 'A kids’ staple. Cook the turkey with onion, garlic and finely diced carrots and broccoli so more fibre makes it onto the plate. Adults can skip the rice and wrap the turkey in lettuce cups or tortillas.',
  },
  {
    key: 'smoked-salmon-salad',
    title: 'Smoked Salmon Salad',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/smoked-salmon-salad/',
    tags: ['dinner', 'rice-free', 'quick', 'salmon'],
    ingredients: [
      'Smoked salmon, 8 oz',
      'Mixed greens, 8 oz',
      'Avocado',
      'Persian cucumbers',
      'Red onion',
      'Eggs',
      'Lemons',
      'Fresh dill',
      'Dijon mustard',
      'Extra-virgin olive oil',
    ],
    steps: 'A 10-minute, rice-free adult dinner. Follow the linked Feel Good Foodie recipe. Kids can have Sunday-batch leftovers with rice.',
  },
  {
    key: 'salmon-salad',
    title: 'Salmon Salad',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/salmon-salad/',
    tags: ['dinner', 'rice-free', 'quick', 'salmon'],
    ingredients: [
      'Salmon fillets, 4 (or canned salmon)',
      'Whole-milk Greek yogurt',
      'Lemons',
      'Fresh dill',
      'Capers',
      'Celery',
      'Green onions',
      'Olive oil',
      'Mixed greens or lettuce, for serving',
    ],
    steps: 'Ready in about 30 minutes. Follow the linked Feel Good Foodie recipe and serve the adults over greens (no rice). Kids get leftover Sunday food with rice.',
  },
  {
    key: 'baked-salmon',
    title: 'Baked Salmon with roasted broccoli and carrots',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/baked-salmon/',
    tags: ['dinner', 'rice-free', 'quick', 'salmon'],
    ingredients: [
      'Salmon fillets, 4–6',
      'Broccoli, 2 heads',
      'Carrots, 1 bag',
      'Lemons',
      'Garlic',
      'Olive oil',
      'Salt and black pepper',
    ],
    steps: 'Bake the salmon from the linked Feel Good Foodie recipe and roast broccoli and carrots on the same sheet. Rice-free for the adults; the kids already like both vegetables and can add leftover rice or dal on the side.',
  },
  {
    key: 'salmon-lettuce-wraps',
    title: 'Salmon Lettuce Wraps',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/salmon-lettuce-wraps/',
    tags: ['dinner', 'rice-free', 'quick', 'salmon'],
    ingredients: [
      'Salmon fillets',
      'Bibb or butter lettuce',
      'Honey',
      'Garlic',
      'Soy sauce or tamari',
      'Green onions',
      'Sesame oil (optional)',
    ],
    steps: 'A low-carb, rice-free dinner in well under 30 minutes. Follow the linked Feel Good Foodie recipe. Kids can have leftover Sunday batch with rice, or the salmon with rice on the side.',
  },
  {
    key: 'baked-chicken-tacos',
    title: 'Baked Chicken Tacos',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/baked-chicken-tacos/',
    tags: ['dinner', 'rice-free', 'quick', 'tacos'],
    ingredients: [
      'Shredded or rotisserie chicken, 3 cups',
      'Stand-and-stuff taco shells',
      'Butter or romaine lettuce (lettuce cups for adults)',
      'Canned black beans, 1–2 cans (extra fibre)',
      'Diced green chiles, 1 can',
      'Taco seasoning',
      'Limes',
      'Shredded Mexican cheese blend',
      'Cilantro',
      'Sour cream or Greek yogurt',
      'Salsa or guacamole',
    ],
    steps: 'About 25 minutes. Follow the linked Feel Good Foodie recipe and stir black beans into the filling for fibre. Adults: lettuce cups or a taco salad (no rice). Kids: hard shells, and leftover dal or rice if they want it.',
  },
  {
    key: 'chicken-quinoa-bowl',
    title: 'Chicken & Quinoa Bowl',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/chicken-quinoa-bowl/',
    tags: ['dinner', 'rice-free', 'quick', 'high fibre'],
    ingredients: [
      'Chicken tenders, 1.5 lb',
      'Quinoa, 1 cup dry',
      'Chopped kale, 6 cups',
      'Cherry tomatoes, 1 pint',
      'Slivered almonds',
      'Paprika',
      'Coriander',
      'Onion powder',
      'Turmeric',
      'Olive oil',
      'Fresh parsley',
    ],
    steps: 'A 30-minute rice-free bowl (quinoa is the adult side). Follow the linked Feel Good Foodie recipe. Kids can have leftover Sunday curry or dal with rice instead of quinoa.',
  },
  {
    key: 'chicken-lentil-soup',
    title: 'Chicken Lentil Soup',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/red-lentil-chicken-soup/',
    tags: ['dinner', 'rice-free', 'quick', 'high fibre'],
    ingredients: [
      'Dry red lentils, 1–2 cups',
      'Shredded chicken, 2 cups',
      'Carrots, 4',
      'Yellow onion, 1 large',
      'Garlic',
      'Tomato paste',
      'Chicken broth, 6 cups',
      'Smoked paprika',
      'Cumin',
      'Turmeric',
      'Olive oil',
      'Cilantro',
    ],
    steps: 'Ready in 30 minutes and naturally rice-free. Follow the linked Feel Good Foodie recipe. Lentils melt into the broth — an easy fibre boost. Kids can have a bowl with leftover rice on the side, or Sunday-batch leftovers.',
  },
  {
    key: 'chicken-fajitas',
    title: 'Sheet Pan Chicken Fajitas',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/sheet-pan-chicken-fajitas/',
    tags: ['dinner', 'rice-free', 'quick', 'tacos'],
    ingredients: [
      'Chicken breasts or thighs, 2 lb',
      'Bell peppers, 3–4 (mixed colors)',
      'Yellow onions, 2',
      'Fajita or taco seasoning',
      'Limes',
      'Olive oil',
      'Flour or corn tortillas (kids)',
      'Romaine or butter lettuce (lettuce wraps for adults)',
      'Canned black beans (extra fibre)',
      'Shredded cheese, salsa, sour cream',
    ],
    steps: 'A 25-minute sheet-pan dinner. Follow the linked Feel Good Foodie recipe. Adults wrap in lettuce (rice-free); kids can have tortillas. Add black beans on the side for fibre.',
  },
  {
    key: 'med-chicken-salad',
    title: 'Mediterranean Chicken Salad',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/mediterranean-chicken-salad/',
    tags: ['dinner', 'rice-free', 'quick', 'salad'],
    ingredients: [
      'Cooked or rotisserie chicken',
      'Mixed greens or romaine',
      'Cucumber',
      'Tomatoes',
      'Red onion',
      'Kalamata olives',
      'Feta cheese',
      'Lemons',
      'Olive oil',
      'Dried oregano',
    ],
    steps: 'A quick, rice-free adult dinner. Follow the linked Feel Good Foodie recipe. Use leftover or rotisserie chicken to stay under 30 minutes. Kids: Sunday-batch leftovers with rice.',
  },
  {
    key: 'yogurt-chicken-salad',
    title: 'Greek Yogurt Chicken Salad',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/yogurt-chicken-salad/',
    tags: ['dinner', 'rice-free', 'quick', 'salad'],
    ingredients: [
      'Diced cooked chicken',
      'Plain Greek yogurt',
      'Apples',
      'Celery',
      'Red onion or green onions',
      'Lemons',
      'Lettuce leaves or mixed greens, for serving',
    ],
    steps: 'A rice-free dinner you can make in minutes with leftover or rotisserie chicken. Follow the linked Feel Good Foodie recipe and serve in lettuce cups or over greens.',
  },
  {
    key: 'turkey-poblanos',
    title: 'Turkey Stuffed Poblano Peppers',
    source: 'Inspired by Chutney Life',
    url: 'https://thechutneylife.com/turkey-stuffed-poblano-peppers/',
    tags: ['dinner', 'rice-free', 'quick', 'turkey'],
    ingredients: [
      'Ground turkey, 1.3–2 lb',
      'Poblano peppers, 8–10 (or bell peppers)',
      'Red and green bell peppers',
      'Red onion',
      'Frozen corn',
      'Garlic',
      'Serrano chilies',
      'Cumin powder',
      'Coriander powder',
      'Chili powder',
      'Taco seasoning',
      'Shredded Mexican cheese',
      'Cilantro',
      'Sour cream or Greek yogurt',
    ],
    steps: 'A rice-free, low-carb dinner that uses the ground turkey the kids already like. Follow the linked Chutney Life recipe. Kids can have the turkey filling with rice, or in a soft tortilla.',
  },
  {
    key: 'chili-lime-quesadillas',
    title: 'Chili Lime Corn & Poblano Quesadillas with Avocado Chutney',
    source: 'Inspired by Chutney Life',
    url: 'https://thechutneylife.com/chili-lime-corn-poblano-quesadillas-with-avocado-chutney/',
    tags: ['dinner', 'rice-free', 'quick', 'quesadillas'],
    ingredients: [
      'Flour tortillas',
      'Poblano peppers',
      'Corn (fresh or frozen)',
      'Yellow onion',
      'Limes',
      'Monterey Jack or pepper jack cheese',
      'Avocados, 2',
      'Cilantro',
      'Cumin',
      'Garlic',
      'Serrano chilies',
      'Canned black or pinto beans (extra fibre, optional)',
    ],
    steps: 'A fast, rice-free quesadilla night. Follow the linked Chutney Life recipe. Add a handful of beans inside for fibre. Kids usually love these as-is.',
  },
  {
    key: 'cheese-quesadilla',
    title: 'Cheese Quesadilla',
    source: 'Inspired by Feel Good Foodie',
    url: 'https://feelgoodfoodie.net/recipe/cheese-quesadilla/',
    tags: ['dinner', 'rice-free', 'quick', 'quesadillas', 'kids'],
    ingredients: [
      'Flour tortillas',
      'Shredded cheese',
      'Butter or oil',
      'Canned black beans (mash some inside for fibre)',
      'Salsa, guacamole or sour cream, for serving',
    ],
    steps: 'A 10-minute fallback everyone will eat. Follow the linked Feel Good Foodie recipe and mash in black beans for fibre. Adults can add a side salad.',
  },
];

const WEEK_PLANS = [
  {
    batch: ['dal-tadka', 'gravy-chicken', 'chana-masala'],
    batchNote: 'Cook these three on Sunday. Pack them for work lunches Monday–Friday, and serve them to the kids at dinner with rice. Adults skip rice at night and pick a rice-free dinner below.',
    lunch: 'Work lunches: Sunday batch (dal tadka, gravy chicken, chana masala)',
    days: {
      0: {
        kids: 'First plates of the Sunday batch — dal and rice, gravy chicken and rice, or chana masala with rice',
        suggestions: ['smoked-salmon-salad', 'turkey-poblanos', 'baked-chicken-tacos'],
        default: 'smoked-salmon-salad',
      },
      1: {
        kids: 'Leftover dal tadka with chickpeas and rice',
        suggestions: ['baked-salmon', 'chicken-lentil-soup', 'chili-lime-quesadillas'],
        default: 'baked-salmon',
      },
      2: {
        kids: 'Leftover gravy chicken and rice',
        suggestions: ['salmon-lettuce-wraps', 'chicken-quinoa-bowl', 'med-chicken-salad'],
        default: 'chicken-quinoa-bowl',
      },
      3: {
        kids: 'Leftover chana masala with rice (or lentil spinach rice)',
        suggestions: ['salmon-salad', 'chicken-fajitas', 'cheese-quesadilla'],
        default: 'salmon-salad',
      },
      4: {
        kids: 'Leftover dal and rice, or mac and cheese with hidden broccoli',
        suggestions: ['baked-chicken-tacos', 'yogurt-chicken-salad', 'turkey-poblanos'],
        default: 'baked-chicken-tacos',
      },
      5: {
        kids: 'Columbie bath (cilantro-mint shrimp and rice), or leftover curry',
        suggestions: ['salmon-lettuce-wraps', 'chicken-lentil-soup', 'columbie-bath'],
        default: 'salmon-lettuce-wraps',
      },
      6: {
        kids: 'Ground turkey and rice, or leftover Sunday batch',
        suggestions: ['chicken-fajitas', 'salmon-salad', 'turkey-rice'],
        default: 'chicken-fajitas',
      },
    },
  },
  {
    batch: ['masoor-dal', 'chicken-biryani', 'sweet-potato-lentil-soup'],
    batchNote: 'Week 2 Sunday cook: a brown-lentil dal, chicken biryani for lunches and the kids, and a sweet-potato lentil soup for extra fibre. Adults enjoy biryani at lunch; at night they pick a rice-free dinner below.',
    lunch: 'Work lunches: Sunday batch (masoor dal, chicken biryani, sweet potato lentil soup)',
    days: {
      0: {
        kids: 'First plates of the Sunday batch — masoor dal and rice, chicken biryani, or lentil soup with rice',
        suggestions: ['med-chicken-salad', 'turkey-poblanos', 'baked-salmon'],
        default: 'baked-salmon',
      },
      1: {
        kids: 'Leftover masoor dal and rice',
        suggestions: ['salmon-lettuce-wraps', 'chicken-quinoa-bowl', 'chili-lime-quesadillas'],
        default: 'salmon-lettuce-wraps',
      },
      2: {
        kids: 'Leftover chicken biryani',
        suggestions: ['chicken-lentil-soup', 'smoked-salmon-salad', 'chicken-fajitas'],
        default: 'chicken-lentil-soup',
      },
      3: {
        kids: 'Leftover sweet potato lentil soup with rice, or lentil spinach rice',
        suggestions: ['baked-chicken-tacos', 'yogurt-chicken-salad', 'cheese-quesadilla'],
        default: 'baked-chicken-tacos',
      },
      4: {
        kids: 'Leftover dal or biryani, or mac and cheese with hidden broccoli',
        suggestions: ['baked-salmon', 'med-chicken-salad', 'turkey-poblanos'],
        default: 'med-chicken-salad',
      },
      5: {
        kids: 'Columbie bath, or leftover Sunday batch',
        suggestions: ['salmon-salad', 'chicken-quinoa-bowl', 'columbie-bath'],
        default: 'salmon-salad',
      },
      6: {
        kids: 'Ground turkey and rice, or leftover batch',
        suggestions: ['chicken-fajitas', 'chili-lime-quesadillas', 'turkey-rice'],
        default: 'chili-lime-quesadillas',
      },
    },
  },
];

const RECIPE_BY_KEY = Object.fromEntries(RECIPE_SEEDS.map((r) => [r.key, r]));

const norm = (s) => String(s || '').trim().toLowerCase();

export function weekPlanIndex(weekStartDate) {
  const epoch = startOfWeek(new Date(2026, 10, 22), 0);
  const a = startOfWeek(weekStartDate, 0);
  const n = Math.round((a.getTime() - epoch.getTime()) / (7 * DAY_MS));
  return ((n % 2) + 2) % 2;
}

export function sundayInWeek(weekStartDate) {
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStartDate, i);
    if (d.getDay() === 0) return d;
  }
  return addDays(weekStartDate, -((weekStartDate.getDay() + 7) % 7));
}

export function recipeByKey(state, key) {
  return (state.recipes || []).find((r) => r.presetKey === key) || null;
}

export function weekMenu(weekStartDate) {
  const idx = weekPlanIndex(weekStartDate);
  const plan = WEEK_PLANS[idx];
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStartDate, i);
    const spec = plan.days[date.getDay()];
    const suggestions = spec.suggestions.map((key) => suggestionView(key, spec.kids));
    return {
      date,
      kids: spec.kids,
      suggestions,
      defaultKey: spec.default,
    };
  });
  return {
    weekIndex: idx,
    label: idx === 0 ? 'Week 1' : 'Week 2',
    batch: plan.batch.map((key) => RECIPE_BY_KEY[key]),
    batchNote: plan.batchNote,
    lunch: plan.lunch,
    days,
  };
}

function suggestionView(key, kids) {
  const r = RECIPE_BY_KEY[key];
  return {
    key,
    title: r.title,
    source: r.source,
    url: r.url,
    mins: /quick|Sunday batch/.test((r.tags || []).join(' ')) && !r.tags.includes('Sunday batch') ? 'under 30 min' : (r.tags || []).includes('quick') ? 'under 30 min' : '',
    riceFree: (r.tags || []).includes('rice-free'),
    kids,
  };
}

export function dinnerLabel(suggestion) {
  return `${suggestion.title} · Kids: ${suggestion.kids}`;
}

function findMember(state, name) {
  return (state.members || []).find((m) => norm(m.name) === norm(name));
}

function addMembers(state) {
  let added = 0;
  const ids = {};
  for (const seed of MEMBER_SEEDS) {
    let m = findMember(state, seed.name);
    if (!m) {
      m = Object.assign({ id: uid() }, seed);
      state.members.push(m);
      added++;
    }
    ids[seed.name] = m.id;
  }
  return { added, ids };
}

function addChores(state, ids) {
  let added = 0;
  if (!state.chores) state.chores = [];
  for (const seed of CHORE_SEEDS) {
    const memberId = ids[seed.memberName];
    if (!memberId) continue;
    const exists = state.chores.some((c) => norm(c.title) === norm(seed.title) && (c.memberIds || []).includes(memberId));
    if (exists) continue;
    state.chores.push({
      id: uid(),
      title: seed.title,
      emoji: seed.emoji,
      memberIds: [memberId],
      area: seed.area,
      routine: seed.routine,
      days: seed.days.slice(),
      stars: seed.stars,
    });
    added++;
  }
  return added;
}

function addRecipes(state) {
  let added = 0;
  if (!state.recipes) state.recipes = [];
  for (const seed of RECIPE_SEEDS) {
    const exists = state.recipes.find((r) => r.presetKey === seed.key || norm(r.title) === norm(seed.title));
    if (exists) {
      if (!exists.presetKey) exists.presetKey = seed.key;
      if (seed.url && !exists.url) exists.url = seed.url;
      continue;
    }
    state.recipes.push({
      id: uid(),
      presetKey: seed.key,
      title: seed.title,
      ingredients: seed.ingredients.slice(),
      steps: seed.steps,
      url: seed.url,
      tags: seed.tags.slice(),
      lastCooked: '',
      image: '',
      source: seed.source,
    });
    added++;
  }
  return added;
}

function addRewards(state) {
  let added = 0;
  if (!state.rewards) state.rewards = [];
  for (const seed of REWARD_SEEDS) {
    if (state.rewards.some((r) => norm(r.title) === norm(seed.title))) continue;
    state.rewards.push(Object.assign({ id: uid() }, seed));
    added++;
  }
  return added;
}

function addSundayEvent(state, ids, overwrite) {
  const title = 'Sunday batch cook';
  if (!state.events) state.events = [];
  if (state.events.some((e) => norm(e.title) === norm(title))) return 0;
  const sun = sundayInWeek(startOfWeek(new Date(), 0));
  sun.setHours(10, 0, 0, 0);
  const end = new Date(sun);
  end.setHours(13, 0, 0, 0);
  const toLocal = (d) => `${ymd(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  state.events.push({
    id: uid(),
    title,
    start: toLocal(sun),
    end: toLocal(end),
    memberIds: MEMBER_SEEDS.map((m) => ids[m.name]).filter(Boolean),
    repeat: 'weekly',
    location: '',
    notes: 'Indian batch cook for weekday work lunches and the kids’ dinners. Adults pick a rice-free dinner at night.',
    exdates: [],
  });
  return 1;
}

function fillMeals(state, { overwrite } = {}) {
  let filled = 0;
  if (!state.meals) state.meals = {};
  const todayWeek = startOfWeek(new Date(), state.settings && state.settings.weekStart != null ? state.settings.weekStart : 0);
  for (const offset of [0, 7]) {
    const weekStart = addDays(todayWeek, offset);
    const menu = weekMenu(weekStart);
    for (const day of menu.days) {
      const key = ymd(day.date);
      const slot = state.meals[key] || (state.meals[key] = {});
      const isSunday = day.date.getDay() === 0;
      const isWeekday = WEEKDAYS.includes(day.date.getDay());
      if (isWeekday && (overwrite || !slot.lunch)) {
        slot.lunch = { text: menu.lunch, recipeId: '' };
        filled++;
      }
      if (isSunday && (overwrite || !slot.lunch)) {
        slot.lunch = { text: 'Sunday batch-cook day — eat from the pot', recipeId: '' };
        filled++;
      }
      const pick = day.suggestions.find((s) => s.key === day.defaultKey) || day.suggestions[0];
      if (pick && (overwrite || !slot.dinner)) {
        const rec = recipeByKey(state, pick.key);
        slot.dinner = { text: dinnerLabel(pick), recipeId: rec ? rec.id : '', suggestionKey: pick.key };
        filled++;
      }
    }
  }
  return filled;
}

export function groceryGroup(text) {
  const t = String(text || '');
  if (/\bfrozen\b/i.test(t)) return 'Frozen';
  if (/\b(broth|stock|coconut milk|olive oil|neutral oil|sesame oil|soy sauce|tamari|tomato paste|seasoning|cumin|turmeric|garam|masala|chole|chili powder|paprika|oregano|onion powder|coriander|hing|asafoetida|curry leaves|curry powder|bay leaves|saffron|brown sugar|honey|capers|dijon|salsa|guacamole|ghee(?! )|biryani masala|fajita|taco seasoning|salt and black pepper)\b/i.test(t)
    && !/\b(chicken thighs|chicken breasts|chicken tenders|salmon|turkey|shrimp|yogurt|cheese|milk|butter)\b/i.test(t)) {
    return 'Pantry/Spices';
  }
  if (/\b(lentil|chickpea|chana|dal|masoor|quinoa|basmati|rice|black beans|pinto beans|bean|tortilla|taco shell|pasta|paratha|naan|pita)\b/i.test(t)) return 'Grains/Legumes';
  if (/\b(yogurt|cheese|cheddar|feta|ghee|butter|milk|sour cream)\b/i.test(t)) return 'Dairy';
  if (/\b(chicken|salmon|turkey|shrimp|rotisserie|eggs?)\b/i.test(t)) return 'Protein';
  if (/\b(spinach|kale|onion|garlic|ginger|cilantro|mint|lemon|lime|avocado|cucumber|celery|carrot|broccoli|pepper|poblano|tomato|lettuce|greens|apple|corn|zucchini|sweet potato|basil|chili|chiles?|parsley|dill|cabbage|romaine|bibb)\b/i.test(t)) return 'Produce';
  if (/\b(oil|paste|powder|seed|sauce|spice|sugar|honey|broth|stock|coconut|seasoning|masala|mustard|capers|salsa)\b/i.test(t)) return 'Pantry/Spices';
  return 'Pantry/Spices';
}

export function shoppingItemsForWeek(state, weekStartDate) {
  const menu = weekMenu(weekStartDate);
  const keys = new Set(menu.batch.map((r) => r.key));
  for (const day of menu.days) {
    const meal = ((state.meals || {})[ymd(day.date)] || {}).dinner;
    if (meal && meal.suggestionKey) keys.add(meal.suggestionKey);
    else if (meal && meal.recipeId) {
      const rec = (state.recipes || []).find((r) => r.id === meal.recipeId);
      if (rec && rec.presetKey) keys.add(rec.presetKey);
      else if (rec) rec.ingredients.forEach((ing) => keys.add('adhoc:' + ing));
    }
  }
  const items = [];
  const seen = new Set();
  const push = (text) => {
    const t = String(text).trim();
    if (!t) return;
    const n = norm(t);
    if (seen.has(n)) return;
    seen.add(n);
    items.push({ text: t, group: groceryGroup(t) });
  };
  for (const key of keys) {
    if (String(key).startsWith('adhoc:')) { push(String(key).slice(6)); continue; }
    const rec = RECIPE_BY_KEY[key] || (state.recipes || []).find((r) => r.presetKey === key);
    if (rec) (rec.ingredients || []).forEach(push);
  }
  // Staples that help sneak in fibre and keep a Frozen section on the list
  push('Frozen corn');
  push('Frozen spinach');
  const order = Object.fromEntries(GROCERY_GROUPS.map((g, i) => [g, i]));
  items.sort((a, b) => (order[a.group] - order[b.group]) || a.text.localeCompare(b.text));
  return items;
}

export function writeWeeklyGroceries(state, weekStartDate, { replace = true } = {}) {
  if (!state.lists) state.lists = [];
  let list = state.lists.find((l) => norm(l.name) === norm(WEEKLY_LIST_NAME));
  if (!list) {
    list = { id: uid(), name: WEEKLY_LIST_NAME, kind: 'shopping', items: [] };
    state.lists.unshift(list);
  }
  const incoming = shoppingItemsForWeek(state, weekStartDate);
  if (replace) {
    list.items = incoming.map((i) => ({ id: uid(), text: i.text, done: false, group: i.group }));
    return incoming.length;
  }
  const have = new Set(list.items.filter((i) => !i.done).map((i) => norm(i.text)));
  let added = 0;
  for (const i of incoming) {
    if (have.has(norm(i.text))) continue;
    list.items.push({ id: uid(), text: i.text, done: false, group: i.group });
    have.add(norm(i.text));
    added++;
  }
  return added;
}

function setFamilyName(state, overwrite) {
  const cur = (state.settings && state.settings.familyName) || '';
  if (overwrite || !cur || norm(cur) === 'our family') {
    state.settings.familyName = FAMILY_NAME;
    return true;
  }
  return false;
}

/** Apply the full preset to a blank state (fresh device or after reset). */
export function applyFamilyPreset(state) {
  state.sample = false;
  setFamilyName(state, true);
  const { ids } = addMembers(state);
  addChores(state, ids);
  addRecipes(state);
  addRewards(state);
  addSundayEvent(state, ids);
  fillMeals(state, { overwrite: true });
  writeWeeklyGroceries(state, startOfWeek(new Date(), state.settings.weekStart || 0), { replace: true });
  return state;
}

/** Merge the preset into existing data. Never deletes. Dedupes by name. */
export function mergeFamilySetup(state) {
  const before = {
    members: (state.members || []).length,
    chores: (state.chores || []).length,
    recipes: (state.recipes || []).length,
    rewards: (state.rewards || []).length,
    events: (state.events || []).length,
  };
  state.sample = false;
  setFamilyName(state, false);
  const { added: members, ids } = addMembers(state);
  const chores = addChores(state, ids);
  const recipes = addRecipes(state);
  const rewards = addRewards(state);
  const events = addSundayEvent(state, ids);
  const meals = fillMeals(state, { overwrite: false });
  const groceries = writeWeeklyGroceries(state, startOfWeek(new Date(), (state.settings && state.settings.weekStart) || 0), { replace: false });
  return { members, chores, recipes, rewards, events, meals, groceries, already: members + chores + recipes + rewards + events + meals + groceries === 0, before };
}

export function summarizeMerge(r) {
  if (r.already) return 'Everything in the family setup is already on this device.';
  const bits = [];
  if (r.members) bits.push(`${r.members} family member${r.members > 1 ? 's' : ''}`);
  if (r.chores) bits.push(`${r.chores} chore${r.chores > 1 ? 's' : ''}`);
  if (r.recipes) bits.push(`${r.recipes} recipe${r.recipes > 1 ? 's' : ''}`);
  if (r.meals) bits.push('the meal plan for empty days');
  if (r.groceries) bits.push(`${r.groceries} grocery item${r.groceries > 1 ? 's' : ''}`);
  if (r.rewards) bits.push(`${r.rewards} reward${r.rewards > 1 ? 's' : ''}`);
  if (r.events) bits.push('the Sunday batch-cook reminder');
  return 'Added ' + bits.join(', ') + '. Nothing already on this device was removed.';
}

export { WEEK_PLANS, RECIPE_BY_KEY };
