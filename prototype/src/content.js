// 《光之踪迹》序章的内容数据 · Content for the Prologue of "Footprints of Light"（诗 77:19）
// 这些数据以后会搬进 content/episodes/*.json（见 docs/PROMPTS.md 的 M0、M2）。

/* ============================================================================
   双语规则 Bilingual rules
   - 每一段给玩家看的文字都写成 { en, zh } 两份。游戏有两种模式：
       English（只显示 en）和 English + 中文（en 在上，zh 在下）。
   - 经文 scripture：en 用 ESV（English Standard Version），zh 用和合本（新标点和合本，神版）。
     两种都一个字都不改，标点也照抄。
   - ESV 有版权（Crossway）。按 Crossway 的标准使用指引：整个作品引用 ESV 不超过 500 节，
     不超过任何一卷书的一半，也不超过作品全部文字的 25%；必须带版权声明（见下面 UI.esvNotice）。
     完整游戏会超过 500 节，正式发布前要向 Crossway 申请书面许可。
   - 考据、想象、思考这几类文字：en 和 zh 意思一致即可，不需要逐字对译。
   - 每一行文字都有 k（kind）：
       scripture 经文（金）| history 历史·考古（蓝）| imagination 游戏想象（灰）| reflection 思考（绿）
   - 经文出处 ref 用统一写法 'Gen 1:3'，显示时再换成 Genesis 1:3 / 创 1:3（见 refText）。
   ========================================================================== */

export const BOOKS = {
  Gen: { en: 'Genesis', zh: '创', zhFull: '创世记' },
  Ps: { en: 'Psalm', zh: '诗', zhFull: '诗篇' },
};
// refText('Gen 1:3') → { en: 'Genesis 1:3', zh: '创 1:3' }
// mode 'full' → 中文用书卷全名（创世记 1:3）；mode 'name' → 中文只显示书卷名（创世记）
export function refText(ref, mode) {
  const i = ref.indexOf(' '), b = BOOKS[ref.slice(0, i)], rest = ref.slice(i + 1);
  return { en: `${b.en} ${rest}`, zh: mode === 'name' ? b.zhFull : `${mode === 'full' ? b.zhFull : b.zh} ${rest}` };
}

export const KIND_LABEL = {
  scripture: { en: 'Scripture', zh: '经文' },
  history: { en: 'History & archaeology', zh: '考据' },
  imagination: { en: 'Imagined for the game', zh: '游戏想象' },
  reflection: { en: 'Think about it', zh: '思考' },
};

export const EPISODES = {
  creation: { n: 1, book: 'Gen 1:1–2:3', title: { en: 'Seven Days of Creation', zh: '创造七日' } },
  eden: { n: 2, book: 'Gen 2', title: { en: 'The Garden of Eden', zh: '伊甸园' } },
};

// 剧情节点（beat）：走到 at 附近就会触发，必须按顺序完成
export const BEATS = [
  { id: 'begin', ep: 'creation', at: [0, 47.5], r: 3,
    hud: { label: { en: 'In the Beginning', zh: '起初' }, sub: { en: 'Before the first day', zh: '创世之初' } },
    lines: [
      { k: 'scripture', ref: 'Gen 1:1', t: {
        en: 'In the beginning, God created the heavens and the earth.',
        zh: '起初，神创造天地。' } },
      { k: 'scripture', ref: 'Gen 1:2', fx: 'wind', t: {
        en: 'The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters.',
        zh: '地是空虚混沌，渊面黑暗；神的灵运行在水面上。' } },
      { k: 'imagination', t: {
        en: 'In the darkness, there is a faint light far away. Follow it.',
        zh: '黑暗里，远处有一点微光。跟着它走吧。' } },
    ],
    rewards: [{ type: 'verse', ref: 'Gen 1:1' }] },

  { id: 'day1', ep: 'creation', at: [0, 40], day: 1,
    hud: { label: { en: 'Day One', zh: '第一日' }, sub: { en: 'Light', zh: '光' } },
    lines: [
      { k: 'scripture', ref: 'Gen 1:3', fx: 'light', t: {
        en: 'And God said, “Let there be light,” and there was light.',
        zh: '神说：“要有光”，就有了光。' } },
      { k: 'scripture', ref: 'Gen 1:4', t: {
        en: 'And God saw that the light was good. And God separated the light from the darkness.',
        zh: '神看光是好的，就把光暗分开了。' } },
      { k: 'scripture', ref: 'Gen 1:5', t: {
        en: 'God called the light Day, and the darkness he called Night. And there was evening and there was morning, the first day.',
        zh: '神称光为“昼”，称暗为“夜”。有晚上，有早晨，这是头一日。' } },
      { k: 'imagination', t: {
        en: 'The lamp in your hand has been lit by this first light.',
        zh: '你手中的灯，被这第一道光点亮了。' } },
    ],
    rewards: [{ type: 'relic', id: 'first-light' }, { type: 'piece', win: 'creation', i: 0 }, { type: 'verse', ref: 'Gen 1:3' }],
    after: 'evening' },

  { id: 'day2', ep: 'creation', at: [6, 28.5], day: 2,
    hud: { label: { en: 'Day Two', zh: '第二日' }, sub: { en: 'Sky', zh: '天' } },
    lines: [
      { k: 'scripture', ref: 'Gen 1:6', fx: 'sky', t: {
        en: 'And God said, “Let there be an expanse in the midst of the waters, and let it separate the waters from the waters.”',
        zh: '神说：“诸水之间要有空气，将水分为上下。”' } },
      { k: 'scripture', ref: 'Gen 1:7', t: {
        en: 'And God made the expanse and separated the waters that were under the expanse from the waters that were above the expanse. And it was so.',
        zh: '神就造出空气，将空气以下的水、空气以上的水分开了。事就这样成了。' } },
      { k: 'scripture', ref: 'Gen 1:8', t: {
        en: 'And God called the expanse Heaven. And there was evening and there was morning, the second day.',
        zh: '神称空气为“天”。有晚上，有早晨，是第二日。' } },
    ],
    rewards: [{ type: 'piece', win: 'creation', i: 1 }], after: 'evening' },

  { id: 'day3', ep: 'creation', at: [-4, 16.5], day: 3,
    hud: { label: { en: 'Day Three', zh: '第三日' }, sub: { en: 'Land, Seas & Plants', zh: '地、海与植物' } },
    lines: [
      { k: 'scripture', ref: 'Gen 1:9', fx: 'land', t: {
        en: 'And God said, “Let the waters under the heavens be gathered together into one place, and let the dry land appear.” And it was so.',
        zh: '神说：“天下的水要聚在一处，使旱地露出来。”事就这样成了。' } },
      { k: 'scripture', ref: 'Gen 1:10', t: {
        en: 'God called the dry land Earth, and the waters that were gathered together he called Seas. And God saw that it was good.',
        zh: '神称旱地为“地”，称水的聚处为“海”。神看着是好的。' } },
      { k: 'scripture', ref: 'Gen 1:11', fx: 'plants', t: {
        en: 'And God said, “Let the earth sprout vegetation, plants yielding seed, and fruit trees bearing fruit in which is their seed, each according to its kind, on the earth.” And it was so.',
        zh: '神说：“地要发生青草和结种子的菜蔬，并结果子的树木，各从其类，果子都包着核。”事就这样成了。' } },
      { k: 'scripture', ref: 'Gen 1:13', t: {
        en: 'And there was evening and there was morning, the third day.',
        zh: '有晚上，有早晨，是第三日。' } },
    ],
    rewards: [{ type: 'piece', win: 'creation', i: 2 }], after: 'evening' },

  { id: 'day4', ep: 'creation', at: [5, 4.5], day: 4,
    hud: { label: { en: 'Day Four', zh: '第四日' }, sub: { en: 'Sun, Moon & Stars', zh: '日、月、星' } },
    lines: [
      { k: 'scripture', ref: 'Gen 1:14–15', fx: 'lights', t: {
        en: 'And God said, “Let there be lights in the expanse of the heavens to separate the day from the night. And let them be for signs and for seasons, and for days and years, and let them be lights in the expanse of the heavens to give light upon the earth.” And it was so.',
        zh: '神说：“天上要有光体，可以分昼夜，作记号，定节令、日子、年岁，并要发光在天空，普照在地上。”事就这样成了。' } },
      { k: 'scripture', ref: 'Gen 1:16–18', t: {
        en: 'And God made the two great lights—the greater light to rule the day and the lesser light to rule the night—and the stars. And God set them in the expanse of the heavens to give light on the earth, to rule over the day and over the night, and to separate the light from the darkness. And God saw that it was good.',
        zh: '于是神造了两个大光，大的管昼，小的管夜，又造众星，就把这些光摆列在天空，普照在地上，管理昼夜，分别明暗。神看着是好的。' } },
      { k: 'scripture', ref: 'Gen 1:19', t: {
        en: 'And there was evening and there was morning, the fourth day.',
        zh: '有晚上，有早晨，是第四日。' } },
    ],
    rewards: [{ type: 'piece', win: 'creation', i: 3 }], after: 'evening' },

  { id: 'day5', ep: 'creation', at: [-7, -5], day: 5,
    hud: { label: { en: 'Day Five', zh: '第五日' }, sub: { en: 'Fish & Birds', zh: '鱼与飞鸟' } },
    lines: [
      { k: 'scripture', ref: 'Gen 1:20', fx: 'creatures', t: {
        en: 'And God said, “Let the waters swarm with swarms of living creatures, and let birds fly above the earth across the expanse of the heavens.”',
        zh: '神说：“水要多多滋生有生命的物；要有雀鸟飞在地面以上，天空之中。”' } },
      { k: 'scripture', ref: 'Gen 1:21', t: {
        en: 'So God created the great sea creatures and every living creature that moves, with which the waters swarm, according to their kinds, and every winged bird according to its kind. And God saw that it was good.',
        zh: '神就造出大鱼和水中所滋生各样有生命的动物，各从其类；又造出各样飞鸟，各从其类。神看着是好的。' } },
      { k: 'scripture', ref: 'Gen 1:22', t: {
        en: 'And God blessed them, saying, “Be fruitful and multiply and fill the waters in the seas, and let birds multiply on the earth.”',
        zh: '神就赐福给这一切，说：“滋生繁多，充满海中的水；雀鸟也要多生在地上。”' } },
      { k: 'scripture', ref: 'Gen 1:23', t: {
        en: 'And there was evening and there was morning, the fifth day.',
        zh: '有晚上，有早晨，是第五日。' } },
    ],
    rewards: [{ type: 'piece', win: 'creation', i: 4 }], after: 'evening' },

  { id: 'day6', ep: 'creation', at: [3, -16.5], day: 6,
    hud: { label: { en: 'Day Six', zh: '第六日' }, sub: { en: 'Animals & People', zh: '走兽与人' } },
    lines: [
      { k: 'scripture', ref: 'Gen 1:24', fx: 'animals', t: {
        en: 'And God said, “Let the earth bring forth living creatures according to their kinds—livestock and creeping things and beasts of the earth according to their kinds.” And it was so.',
        zh: '神说：“地要生出活物来，各从其类；牲畜、昆虫、野兽，各从其类。”事就这样成了。' } },
      { k: 'scripture', ref: 'Gen 1:27', fx: 'humans', t: {
        en: 'So God created man in his own image, in the image of God he created him; male and female he created them.',
        zh: '神就照着自己的形像造人，乃是照着他的形像造男造女。' } },
      { k: 'scripture', ref: 'Gen 1:31', t: {
        en: 'And God saw everything that he had made, and behold, it was very good. And there was evening and there was morning, the sixth day.',
        zh: '神看着一切所造的都甚好。有晚上，有早晨，是第六日。' } },
    ],
    rewards: [{ type: 'piece', win: 'creation', i: 5 }, { type: 'verse', ref: 'Gen 1:31' }], after: 'evening' },

  { id: 'day7', ep: 'creation', at: [-3.5, -28.5], r: 3, day: 7,
    hud: { label: { en: 'Day Seven', zh: '第七日' }, sub: { en: 'Rest', zh: '安息' } },
    lines: [
      { k: 'scripture', ref: 'Gen 2:1', fx: 'rest', t: {
        en: 'Thus the heavens and the earth were finished, and all the host of them.',
        zh: '天地万物都造齐了。' } },
      { k: 'scripture', ref: 'Gen 2:2', t: {
        en: 'And on the seventh day God finished his work that he had done, and he rested on the seventh day from all his work that he had done.',
        zh: '到第七日，神造物的工已经完毕，就在第七日歇了他一切的工，安息了。' } },
      { k: 'scripture', ref: 'Gen 2:3', t: {
        en: 'So God blessed the seventh day and made it holy, because on it God rested from all his work that he had done in creation.',
        zh: '神赐福给第七日，定为圣日；因为在这日神歇了他一切创造的工，就安息了。' } },
      { k: 'imagination', t: {
        en: 'You learned a gesture: Rest. Press R (or tap “Rest”) to sit down and be still for a moment.',
        zh: '你学会了一个姿态：安息。按 R 键（或点“安息”按钮）坐下来，安静片刻。' } },
    ],
    rewards: [{ type: 'piece', win: 'creation', i: 6 }, { type: 'gesture', id: 'rest' }, { type: 'verse', ref: 'Gen 2:3' }],
    after: 'openEden' },

  // ---------------- 第 2 章 伊甸园 · Chapter 2: The Garden of Eden ----------------
  { id: 'e1', ep: 'eden', at: [42, -15], r: 3,
    hud: { label: { en: 'Eden', zh: '伊甸园' }, sub: { en: 'A garden in the east', zh: '东方的园子' } },
    lines: [
      { k: 'scripture', ref: 'Gen 2:8', fx: 'eden', t: {
        en: 'And the LORD God planted a garden in Eden, in the east, and there he put the man whom he had formed.',
        zh: '耶和华神在东方的伊甸立了一个园子，把所造的人安置在那里。' } },
      { k: 'scripture', ref: 'Gen 2:9', t: {
        en: 'And out of the ground the LORD God made to spring up every tree that is pleasant to the sight and good for food. The tree of life was in the midst of the garden, and the tree of the knowledge of good and evil.',
        zh: '耶和华神使各样的树从地里长出来，可以悦人的眼目，其上的果子好作食物。园子当中又有生命树和分别善恶的树。' } },
    ],
    rewards: [{ type: 'piece', win: 'eden', i: 0 }, { type: 'verse', ref: 'Gen 2:9' }] },

  { id: 'e2', ep: 'eden', at: [62, -18], r: 5.2,
    hud: { label: { en: 'Four Rivers', zh: '四道河' }, sub: { en: 'The spring of Eden', zh: '伊甸的泉源' } },
    lines: [
      { k: 'scripture', ref: 'Gen 2:10', t: {
        en: 'A river flowed out of Eden to water the garden, and there it divided and became four rivers.',
        zh: '有河从伊甸流出来滋润那园子，从那里分为四道：' } },
      { k: 'history', fx: 'rivers', t: {
        en: 'The first river is the Pishon, the second the Gihon, the third the Tigris, and the fourth the Euphrates (Genesis 2:11–14). The Tigris and the Euphrates still flow today, through Turkey, Syria and Iraq.',
        zh: '第一道叫比逊，第二道叫基训，第三道叫希底结，第四道就是伯拉河（创 2:11–14）。希底结就是底格里斯河，伯拉河就是幼发拉底河，今天仍在流淌。' } },
      { k: 'imagination', t: {
        en: 'They say a treasure is hidden by the Pishon (Genesis 2:12). The Pishon flows away to the northeast.',
        zh: '听说比逊河边藏着一样宝物（创 2:12）。比逊河往东北方流去。' } },
    ],
    rewards: [{ type: 'piece', win: 'eden', i: 1 }] },

  { id: 'e3', ep: 'eden', at: [68.5, -18], r: 3.2,
    hud: { label: { en: 'In the Midst of the Garden', zh: '园子当中' }, sub: { en: 'God’s command', zh: '神的吩咐' } },
    lines: [
      { k: 'scripture', ref: 'Gen 2:15', t: {
        en: 'The LORD God took the man and put him in the garden of Eden to work it and keep it.',
        zh: '耶和华神将那人安置在伊甸园，使他修理看守。' } },
      { k: 'scripture', ref: 'Gen 2:16–17', t: {
        en: 'And the LORD God commanded the man, saying, “You may surely eat of every tree of the garden, but of the tree of the knowledge of good and evil you shall not eat, for in the day that you eat of it you shall surely die.”',
        zh: '耶和华神吩咐他说：“园中各样树上的果子，你可以随意吃，只是分别善恶树上的果子，你不可吃，因为你吃的日子必定死。”' } },
    ],
    rewards: [{ type: 'piece', win: 'eden', i: 2 }, { type: 'verse', ref: 'Gen 2:15' }] },

  { id: 'e4', ep: 'eden', at: [48.5, -20], r: 3.2,
    hud: { label: { en: 'Naming', zh: '命名' }, sub: { en: 'The man names the animals', zh: '那人给活物起名' } },
    lines: [
      { k: 'scripture', ref: 'Gen 2:18', t: {
        en: 'Then the LORD God said, “It is not good that the man should be alone; I will make him a helper fit for him.”',
        zh: '耶和华神说：“那人独居不好，我要为他造一个配偶帮助他。”' } },
      { k: 'scripture', ref: 'Gen 2:19', fx: 'naming', t: {
        en: 'Now out of the ground the LORD God had formed every beast of the field and every bird of the heavens and brought them to the man to see what he would call them. And whatever the man called every living creature, that was its name.',
        zh: '耶和华神用土所造成的野地各样走兽和空中各样飞鸟都带到那人面前，看他叫什么。那人怎样叫各样的活物，那就是它的名字。' } },
      { k: 'scripture', ref: 'Gen 2:20', t: {
        en: 'The man gave names to all livestock and to the birds of the heavens and to every beast of the field. But for Adam there was not found a helper fit for him.',
        zh: '那人便给一切牲畜和空中飞鸟、野地走兽都起了名；只是那人没有遇见配偶帮助他。' } },
      { k: 'history', t: {
        en: 'We don’t know what language Adam spoke. The names above the animals are their names in biblical Hebrew.',
        zh: '我们不知道亚当说的是什么语言。动物头上显示的，是它们在圣经希伯来文里的名字。' } },
    ],
    rewards: [{ type: 'piece', win: 'eden', i: 3 }, { type: 'gesture', id: 'name' }] },

  { id: 'e5', ep: 'eden', at: [55.5, -21], r: 3,
    hud: { label: { en: 'Bone of My Bones', zh: '骨中的骨' }, sub: { en: 'Eve', zh: '夏娃' } },
    lines: [
      { k: 'scripture', ref: 'Gen 2:21', fx: 'sleep', t: {
        en: 'So the LORD God caused a deep sleep to fall upon the man, and while he slept took one of his ribs and closed up its place with flesh.',
        zh: '耶和华神使他沉睡，他就睡了；于是取下他的一条肋骨，又把肉合起来。' } },
      { k: 'scripture', ref: 'Gen 2:22', fx: 'eve', t: {
        en: 'And the rib that the LORD God had taken from the man he made into a woman and brought her to the man.',
        zh: '耶和华神就用那人身上所取的肋骨造成一个女人，领她到那人跟前。' } },
      { k: 'scripture', ref: 'Gen 2:23', t: {
        en: 'Then the man said, “This at last is bone of my bones and flesh of my flesh; she shall be called Woman, because she was taken out of Man.”',
        zh: '那人说：“这是我骨中的骨，肉中的肉，可以称她为女人，因为她是从男人身上取出来的。”' } },
    ],
    rewards: [{ type: 'piece', win: 'eden', i: 4 }] },

  { id: 'e6', ep: 'eden', at: [68.5, -18], r: 3.2,
    hud: { label: { en: 'In the Midst of the Garden', zh: '园子当中' }, sub: { en: 'Coming next', zh: '下一章预告' } },
    lines: [
      { k: 'scripture', ref: 'Gen 3:1', fx: 'serpent', t: {
        en: 'Now the serpent was more crafty than any other beast of the field that the LORD God had made. He said to the woman, “Did God actually say, ‘You shall not eat of any tree in the garden’?”',
        zh: '耶和华神所造的，惟有蛇比田野一切的活物更狡猾。蛇对女人说：“神岂是真说不许你们吃园中所有树上的果子吗？”' } },
      { k: 'imagination', fx: 'end', t: {
        en: 'This is the end of the prologue. The next chapter, “Where Are You?” (Genesis 3), is being made by all of us together.',
        zh: '序章到这里结束。下一章《你在哪里？》（创世记 3 章），正在由我们一起制作。' } },
    ],
    rewards: [] },
];

// 知识陶片：藏在地图各处，走近就能捡到 · Potsherds hidden around the map
export const CARDS = [
  { id: 'bereshit', ep: 'creation', k: 'history', at: [-1.2, 34.5], onPath: true,
    title: { en: '“In the Beginning” in Hebrew', zh: '“起初”的希伯来文' },
    text: {
      en: 'In the Hebrew Bible, the book of Genesis is named after its very first word, בְּרֵאשִׁית (Bereshit), which means “in the beginning.” The name “Genesis” comes from the title used in the Greek Septuagint, and means “origin.”',
      zh: '《创世记》在希伯来圣经里的书名，就是它的第一个词 בְּרֵאשִׁית（Bereshit），意思是“起初”。中文“创世记”和英文 Genesis，来自希腊文七十士译本的书名，意思是“起源”。' } },
  { id: 'ruach', ep: 'creation', k: 'history', at: [4.4, 23.8], onPath: true,
    title: { en: 'Spirit · Wind · Breath', zh: '灵 · 风 · 气息' },
    text: {
      en: 'Genesis 1:2 says “the Spirit of God was hovering over the face of the waters.” The Hebrew word for “Spirit” is רוּחַ (ruach), which can also mean “wind” or “breath.” The verb translated “hovering” is used again in Deuteronomy 32:11, for an eagle fluttering over its young.',
      zh: '创 1:2“神的灵运行在水面上”。“灵”的希伯来文是 רוּחַ（ruach），这个词也可以指“风”或“气息”。“运行”这个动词，在申命记 32:11 用来形容鹰在雏鹰上方展翅。' } },
  { id: 'first-light', ep: 'creation', k: 'reflection', at: [-22, 13],
    title: { en: 'Light before the sun', zh: '先有光，后有太阳' },
    text: {
      en: 'Light appears on the first day, but the sun and moon are not made until the fourth day. Revelation 22:5 says that in the new creation “they will need no light of lamp or sun, for the Lord God will be their light.” Think about it: what is “light” in your life?',
      zh: '光在第一日出现，太阳和月亮却在第四日才被造。启示录 22:5 说，新天新地“也不用灯光、日光，因为主神要光照他们”。想一想：在你的生活中，什么是“光”？' } },
  { id: 'evening', ep: 'creation', k: 'history', at: [23, 19],
    title: { en: '“There was evening and there was morning”', zh: '“有晚上，有早晨”' },
    text: {
      en: 'Each day in Genesis 1 ends with “there was evening and there was morning.” To this day, the Jewish day begins at sunset, so the Sabbath begins on Friday evening.',
      zh: '创世记第 1 章的每一日，都以“有晚上，有早晨”结束。直到今天，犹太人的一天仍从日落开始算起，所以安息日是从星期五傍晚开始的。' } },
  { id: 'kinds', ep: 'creation', k: 'history', at: [-21, -13],
    title: { en: '“According to its kind”', zh: '“各从其类”' },
    text: {
      en: 'In Genesis 1, “according to its kind” (or “their kinds”) appears 10 times. Count them in verses 11, 12, 21, 24 and 25. It reminds us that the world God made has order and distinctions.',
      zh: '在和合本创世记第 1 章里，“各从其类”一共出现了 10 次。数一数第 11、12、21、24、25 节。它提醒我们：神创造的世界有秩序、有分别。' } },
  { id: 'image', ep: 'creation', k: 'history', at: [13, -12],
    title: { en: 'The “image” of God', zh: '神的“形像”' },
    text: {
      en: 'In the ancient Near East, kings often set up images of themselves in the lands they ruled, to show “this belongs to me.” Many scholars think that being made in God’s image also means representing God and caring for his world (see Genesis 1:26–28).',
      zh: '在古代近东，君王常在自己统治的地方立起自己的像，表明“这里归我管”。许多学者认为，人按神的形像被造，也带着“代表神照管这个世界”的意思（参创 1:26–28）。' } },
  { id: 'very-good', ep: 'creation', k: 'reflection', at: [-3, -21],
    title: { en: '“Good” and “very good”', zh: '“好”和“甚好”' },
    text: {
      en: 'Six times in Genesis 1, God saw that what he had made was “good.” The seventh time, after making people on the sixth day, God saw everything he had made, and it was “very good” (Genesis 1:31). What do you think is the difference between “good” and “very good”?',
      zh: '创世记第 1 章里，神六次看着所造的是“好的”；第七次，是在第六日造了人以后，神看着一切所造的都“甚好”（创 1:31）。你觉得“甚好”和“好”有什么不同？' } },
  { id: 'sabbath', ep: 'creation', k: 'history', at: [-8.5, -33],
    title: { en: 'Sabbath', zh: '安息日' },
    text: {
      en: 'The Hebrew word שַׁבָּת (Shabbat) comes from a word meaning “to stop” or “to rest.” The fourth commandment, “Remember the Sabbath day, to keep it holy,” points back to the seventh day of creation (Exodus 20:8–11).',
      zh: '“安息日”的希伯来文 שַׁבָּת（Shabbat）来自“停止、歇息”的意思。十诫第四条“当记念安息日，守为圣日”，就回到了创造的第七日（出 20:8–11）。' } },
  { id: 'eden-name', ep: 'eden', k: 'history', at: [45, -11],
    title: { en: 'What does “Eden” mean?', zh: '“伊甸”是什么意思？' },
    text: {
      en: 'The Hebrew עֵדֶן (Eden) carries the idea of “delight.” Some scholars connect it with the Sumerian word edin, meaning “plain” or “steppe.” The Greek Septuagint translated “garden” as paradeisos, which is where the English word “paradise” comes from.',
      zh: '希伯来文 עֵדֶן（Eden）有“喜乐、愉悦”的意思；也有学者认为它和苏美尔文 edin（平原、旷野）有关。“园子”在希腊文七十士译本里译作 paradeisos，英文“乐园”（paradise）就是从这里来的。' } },
  { id: 'tree-of-life', ep: 'eden', k: 'history', at: [53, -14.5],
    title: { en: 'From tree of life to tree of life', zh: '从生命树到生命树' },
    text: {
      en: 'The tree of life appears in the first book of the Bible (Genesis 2:9) and in the last (Revelation 22:2). The Bible’s story begins in a garden with a river and the tree of life, and ends in a city with the river of the water of life and the tree of life.',
      zh: '生命树出现在圣经的第一卷（创 2:9），也出现在最后一卷（启 22:2）。圣经的故事从一个有河、有生命树的园子开始，也在一座有生命水的河、有生命树的城结束。' } },
  { id: 'not-good', ep: 'eden', k: 'reflection', at: [45.5, -25.5],
    title: { en: 'The first “not good”', zh: '第一个“不好”' },
    text: {
      en: 'After so many “good”s, “not good” appears for the first time: “It is not good that the man should be alone” (Genesis 2:18). God made us to love and help one another. Who around you needs a companion?',
      zh: '在一连串的“好”之后，第一次出现了“不好”：“那人独居不好”（创 2:18）。神造我们，是要我们彼此相爱、彼此帮助。你身边有谁需要一个同伴？' } },
  { id: 'zoom', ep: 'eden', k: 'history', at: [50.5, -9.5],
    title: { en: 'Wide shot and close-up', zh: '全景和特写' },
    text: {
      en: 'Genesis 1 is like a wide shot: it tells the whole of creation in seven days. Genesis 2 is like a close-up: it slows down and tells how people were made on the sixth day in more detail. This is a common way many Bible readers understand the two chapters.',
      zh: '创世记第 1 章像“全景镜头”，按七日讲完整个创造；第 2 章像“特写镜头”，把第六日造人的经过讲得更仔细。这是许多读经者常见的理解。' } },
  { id: 'not-apple', ep: 'eden', k: 'history', at: [71.5, -22],
    title: { en: 'Was it an apple?', zh: '是苹果吗？' },
    text: {
      en: 'The Bible only speaks of fruit from “the tree of the knowledge of good and evil.” It never says it was an apple. The apple came later, from traditions in Western art. So in this game, it is simply a golden fruit.',
      zh: '圣经只说“分别善恶树上的果子”，从来没有说是苹果。“禁果是苹果”是后来西方绘画里的传统。所以在这个游戏里，它只是一种金色的果子。' } },
];

// 信物 · Keepsakes
export const RELICS = {
  'first-light': { name: { en: 'The First Light', zh: '第一道光' }, ref: 'Gen 1:3', k: 'imagination',
    desc: {
      en: '“And God said, ‘Let there be light,’ and there was light.” In this game, your lamp was lit by this first light (imagined for the game).',
      zh: '“神说：要有光，就有了光。”在这个游戏里，你的灯就是被这第一道光点亮的（游戏想象）。' } },
  onyx: { name: { en: 'Onyx Stone', zh: '红玛瑙' }, ref: 'Gen 2:12', k: 'history',
    desc: {
      en: 'The Pishon flows around the land of Havilah, “where there is gold… bdellium and onyx stone are there” (Genesis 2:11–12). Later, each shoulder piece of the high priest’s ephod held an onyx stone engraved with the names of the sons of Israel (Exodus 28:9–12).',
      zh: '比逊河环绕的哈腓拉地，“在那里有金子……又有珍珠和红玛瑙”（创 2:11–12）。后来大祭司以弗得的两条肩带上，也各镶着一块红玛瑙，上面刻着以色列儿子的名字（出 28:9–12）。' } },
};

// 彩窗 · Stained-glass windows
export const WINDOWS = {
  creation: { name: { en: 'Window of Creation', zh: '创造之窗' }, ref: 'Gen 1:1–2:3', pieces: [
    { en: 'Day 1 · Light', zh: '第一日 · 光' },
    { en: 'Day 2 · Sky', zh: '第二日 · 天' },
    { en: 'Day 3 · Land & Plants', zh: '第三日 · 地与植物' },
    { en: 'Day 4 · Sun, Moon & Stars', zh: '第四日 · 日月星' },
    { en: 'Day 5 · Fish & Birds', zh: '第五日 · 鱼与鸟' },
    { en: 'Day 6 · Animals & People', zh: '第六日 · 走兽与人' },
    { en: 'Day 7 · Rest', zh: '第七日 · 安息' },
  ] },
  eden: { name: { en: 'Window of Eden', zh: '伊甸之窗' }, ref: 'Gen 2:8–23', pieces: [
    { en: 'A Garden in the East', zh: '东方的园子' },
    { en: 'Four Rivers', zh: '四道河' },
    { en: 'Two Trees in the Midst', zh: '园子当中的两棵树' },
    { en: 'Naming the Animals', zh: '给活物起名' },
    { en: 'Bone of My Bones', zh: '骨中的骨' },
  ] },
};

// 姿态 · Gestures
export const GESTURES = {
  rest: { name: { en: 'Rest', zh: '安息' }, key: 'R',
    desc: { en: 'Sit down and be still for a moment. Learned from: the seventh day of creation (Genesis 2:2–3).', zh: '坐下来，安静片刻。学自：创造的第七日（创 2:2–3）。' } },
  name: { name: { en: 'Name', zh: '命名' }, key: 'F',
    desc: { en: 'Raise your hand and point ahead, like the man naming the animals. Learned from: Genesis 2:19–20.', zh: '抬手指向前方，像那人给活物起名。学自：创 2:19–20。' } },
};

// 给活物起名：英文 + 中文 + 圣经希伯来文 + 拼读 · Animal names
export const ANIMAL_NAMES = {
  sheep: { en: 'Sheep', zh: '绵羊', he: 'שֶׂה', tr: 'seh' },
  deer: { en: 'Deer', zh: '鹿', he: 'אַיָּל', tr: 'ayyal' },
  lion: { en: 'Lion', zh: '狮子', he: 'אַרְיֵה', tr: 'aryeh' },
  dove: { en: 'Dove', zh: '鸽子', he: 'יוֹנָה', tr: 'yonah' },
};

// 四道河（创 2:11–14）· The four rivers
export const RIVER_NAMES = [
  { en: 'Pishon', zh: '比逊' }, { en: 'Gihon', zh: '基训' }, { en: 'Tigris', zh: '希底结' }, { en: 'Euphrates', zh: '伯拉河' },
];

// 操作提示：剧情结束后出现 · Hints after a beat (touch = 手机, desk = 电脑)
export const HINTS = {
  begin: {
    touch: { en: 'Use the joystick at the bottom left to move. Follow the faint light.', zh: '用左下角的摇杆移动，跟着远处的微光走' },
    desk: { en: 'Press W or ↑ to walk. Follow the faint light in the distance.', zh: '按 W 或 ↑ 往前走，跟着远处的微光' } },
  day1: {
    touch: { en: 'Your lamp is lit. Hold the button at the bottom right to jump and glide.', zh: '灯亮了。按住右下角的按钮，可以跳起来滑翔' },
    desk: { en: 'Your lamp is lit. Press Space to jump; hold Space in the air to glide.', zh: '灯亮了。按空格跳跃，在空中按住空格可以滑翔' } },
  day3: { en: 'The land has risen! Explore freely — glowing potsherds are hidden around the map.', zh: '陆地升起来了！可以自由探索。地图上藏着发光的陶片' },
  day7: { en: 'The garden in the east is open. Follow the light east.', zh: '东方的园子开启了。跟着光，往东走' },
  e2: { en: 'Stone bridges cross the four rivers, so you can walk all the way around the spring.', zh: '四道河上有石桥，可以绕着泉源走一圈' },
  e4: {
    touch: { en: 'You learned “Name”: tap the “Name” button.', zh: '你学会了“命名”：点“命名”按钮' },
    desk: { en: 'You learned “Name”: press F.', zh: '你学会了“命名”：按 F 键' } },
};

// 界面上的其他文字 · Other interface text ({w} {n} 会被替换)
export const UI = {
  version: { en: 'ESV', zh: '和合本' },
  toast: {
    relic: { en: 'Keepsake', zh: '信物' },
    piece: { en: 'Window piece', zh: '彩窗碎片' },
    done: { en: 'Complete', zh: '完成' },
    verse: { en: 'Verse lit', zh: '经文之光' },
    gesture: { en: 'New gesture', zh: '新姿态' },
  },
  windowDone: { en: '{w} is complete. Open your journal to see it.', zh: '{w}已经拼好，打开图鉴看看' },
  counts: { windows: { en: 'Windows', zh: '彩窗' }, cards: { en: 'Potsherds', zh: '陶片' }, relics: { en: 'Keepsakes', zh: '信物' } },
  potsherd: { en: 'Potsherd', zh: '知识陶片' },
  tabs: {
    windows: { en: 'Windows', zh: '彩窗' }, relics: { en: 'Keepsakes', zh: '信物' }, cards: { en: 'Potsherds', zh: '陶片' },
    verses: { en: 'Verses', zh: '经文' }, gestures: { en: 'Gestures', zh: '姿态' },
  },
  collected: { en: '{n} collected', zh: '已收集 {n}' },
  notFound: { en: 'Not found yet', zh: '尚未找到' },
  relicHint: {
    onyx: { en: 'Hint: it has something to do with one of Eden’s rivers.', zh: '提示：它和伊甸的一道河有关。' },
    'first-light': { en: 'Hint: follow the light.', zh: '提示：跟着光走。' },
  },
  legend: {
    scripture: { en: 'Scripture', zh: '经文' },
    history: { en: 'History & archaeology', zh: '考据（历史·地理·考古）' },
    imagination: { en: 'Imagined for the game', zh: '游戏想象' },
    reflection: { en: 'Think about it', zh: '思考' },
  },
  undiscovered: { en: 'Undiscovered potsherd', zh: '未发现的陶片' },
  chapter: { en: 'Chapter {n} · {t}', zh: '第 {n} 章 {t}' },
  noVerses: { en: 'No verses lit yet. Follow the light and witness each moment.', zh: '还没有点亮经文。跟着光走，见证每一个时刻。' },
  tap: { en: 'Tap', zh: '按钮' },
  notLearned: { en: 'Not learned yet', zh: '尚未学会' },
  learnHint: { en: 'Learn new gestures from people in the Bible.', zh: '向圣经人物学习新的姿态。' },
  resting: { en: 'Resting… (press again or move to get up)', zh: '安息……（再按一次或走动就会起来）' },
  barrier: { en: 'The garden in the east isn’t open yet. First follow the light through all seven days.', zh: '东方的园子还没有开启。先跟着光走完七日。' },
  endStats: [
    { en: 'Window pieces', zh: '彩窗碎片' }, { en: 'Potsherds', zh: '知识陶片' },
    { en: 'Keepsakes', zh: '信物' }, { en: 'Verses lit', zh: '经文之光' },
  ],
  sound: { en: 'Sound', zh: '声音' },
  muted: { en: 'Muted', zh: '静音' },
  startOver: { en: 'Start Over', zh: '从头开始' },
  day: { en: 'Day {n}', zh: '第{n}日' },
  dayNums: '一二三四五六七',
  langShort: { en: 'EN', bi: 'EN + 中' },
  langNote: { en: 'Scripture: ESV', bi: 'Scripture: ESV · 中文经文：和合本' },
  title: { en: 'Footprints of Light · Prologue', bi: 'Footprints of Light 光之踪迹 · Prologue 序章' },
  // Crossway 要求的版权声明（同时引用两种译本时，用 “marked (ESV)” 的写法）
  esvNotice: 'Scripture quotations marked (ESV) are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.',
  cuvNotice: '中文经文引自和合本（新标点和合本，神版）。',
};
