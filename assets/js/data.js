/* ============================================================
   Данные продуктов. Добавление нового продукта = один объект.
   cat: game | deck | book | course | meditation
   Цены намеренно не хранятся и не показываются.
   ============================================================ */
window.PRODUCTS = [
  {
    slug:"ten-sila", cat:"deck", img:"assets/img/c07.jpg", featured:true,
    type:{ru:"Колода", en:"Deck", de:"Kartenset"},
    title:{ru:"Тень — Сила", en:"Shadow — Power", de:"Schatten — Kraft"},
    desc:{ru:"60 двусторонних карт: увидеть Тень и вернуть скрытый за ней ресурс.",
          en:"60 double-sided cards: see the Shadow and reclaim the strength hidden behind it.",
          de:"60 doppelseitige Karten: den Schatten sehen und die dahinter verborgene Ressource zurückgewinnen."},
    long:{ru:"Трансформационная колода из 60 двусторонних карт. Одна сторона — Тень, автоматическая стратегия, которая управляет вами. Вторая — Сила, ресурс, который в ней скрыт. Инструмент для рефлексии и исследования собственных стратегий, а не гадание.",
          en:"A transformational deck of 60 double-sided cards. One side is the Shadow — an automatic strategy that runs you. The other is the Power hidden within it. A tool for reflection and self-inquiry, not fortune-telling.",
          de:"Ein transformatives Kartenset aus 60 doppelseitigen Karten. Eine Seite ist der Schatten — eine automatische Strategie, die dich lenkt. Die andere ist die darin verborgene Kraft. Ein Werkzeug zur Reflexion und Selbsterforschung, kein Wahrsagen."}
  },
  {
    slug:"tochka-sily", cat:"game", img:"assets/img/c05.jpg", featured:true,
    type:{ru:"Игра", en:"Game", de:"Spiel"},
    title:{ru:"Точка силы", en:"Point of Power", de:"Punkt der Kraft"},
    desc:{ru:"Трансформационная игра и система пяти шагов для работы с запросом.",
          en:"A transformational game and a five-step system for working with your request.",
          de:"Ein transformatives Spiel und ein Fünf-Schritte-System für die Arbeit an deinem Anliegen."},
    long:{ru:"Авторская трансформационная игра на основе системы пяти шагов: где я, что мне нужно, что я отрицаю, где моя энергия, что я создаю. Помогает увидеть ситуацию целиком и выбрать следующий шаг.",
          en:"An original transformational game built on the five-step system: where am I, what do I need, what do I deny, where is my energy, what do I create. It helps you see the whole picture and choose the next step.",
          de:"Ein eigenes transformatives Spiel auf Basis des Fünf-Schritte-Systems: wo bin ich, was brauche ich, was verleugne ich, wo ist meine Energie, was erschaffe ich. Es hilft, die Situation als Ganzes zu sehen und den nächsten Schritt zu wählen."}
  },
  {
    slug:"potrebnosti", cat:"deck", img:"assets/img/c09.jpg", featured:true,
    type:{ru:"Колода", en:"Deck", de:"Kartenset"},
    title:{ru:"Потребности", en:"Needs", de:"Bedürfnisse"},
    desc:{ru:"Диагностический инструмент, чтобы понять, что стоит за реакцией.",
          en:"A diagnostic tool to understand what stands behind a reaction.",
          de:"Ein diagnostisches Werkzeug, um zu verstehen, was hinter einer Reaktion steht."},
    long:{ru:"Колода-инструмент для работы с потребностями: помогает назвать то, чего вам сейчас не хватает, и увидеть настоящую потребность за эмоцией или реакцией.",
          en:"A tool deck for working with needs: it helps you name what you are missing right now and see the real need behind an emotion or reaction.",
          de:"Ein Werkzeug-Kartenset für die Arbeit mit Bedürfnissen: es hilft dir zu benennen, was dir gerade fehlt, und das wahre Bedürfnis hinter einer Emotion oder Reaktion zu sehen."}
  },
  {
    slug:"kristall-7d", cat:"game", img:"assets/img/c10.jpg", featured:true,
    type:{ru:"Игра", en:"Game", de:"Spiel"},
    title:{ru:"Кристалл намерения 7D", en:"Intention Crystal 7D", de:"Absichtskristall 7D"},
    desc:{ru:"Собрать намерение через семь уровней и создать целостный образ.",
          en:"Assemble an intention through seven levels and shape a whole image.",
          de:"Eine Absicht über sieben Ebenen zusammenfügen und ein ganzheitliches Bild formen."},
    long:{ru:"Инструмент для формирования намерения через семь уровней. Помогает собрать целостный образ желаемого и перевести его в конкретное действие.",
          en:"A tool for shaping intention across seven levels. It helps you build a whole image of what you want and translate it into concrete action.",
          de:"Ein Werkzeug, um eine Absicht über sieben Ebenen zu formen. Es hilft dir, ein ganzheitliches Bild des Gewünschten zu bauen und es in konkretes Handeln zu übersetzen."}
  },
  {
    slug:"istinnye-zhelaniya", cat:"course", img:"assets/img/c02.jpg",
    type:{ru:"Курс", en:"Course", de:"Kurs"},
    title:{ru:"Истинные желания", en:"True Desires", de:"Wahre Wünsche"},
    desc:{ru:"Программа, чтобы отделить свое желание от навязанного и услышать себя.",
          en:"A programme to separate your own desire from imposed ones and hear yourself.",
          de:"Ein Programm, um deinen eigenen Wunsch von aufgezwungenen zu trennen und dich zu hören."},
    long:{ru:"Курс-программа о том, как отличить собственное желание от ожиданий, привычного «надо» и социальных сценариев, и как перевести желание в направление.",
          en:"A course-programme on telling your own desire apart from expectations and social scripts, and turning desire into direction.",
          de:"Ein Kursprogramm darüber, wie du deinen eigenen Wunsch von Erwartungen, dem gewohnten „muss“ und sozialen Skripten unterscheidest und den Wunsch in eine Richtung übersetzt."}
  },
  {
    slug:"sostoyanie-bogini", cat:"deck", img:"assets/img/c06.jpg",
    type:{ru:"Колода", en:"Deck", de:"Kartenset"},
    title:{ru:"Состояние богини", en:"State of the Goddess", de:"Zustand der Göttin"},
    desc:{ru:"Работа с женскими архетипами и внутренними состояниями через образы.",
          en:"Working with feminine archetypes and inner states through imagery.",
          de:"Arbeit mit weiblichen Archetypen und inneren Zuständen durch Bilder."},
    long:{ru:"Колода архетипов и символов для исследования внутренних состояний и ресурсов через язык образов.",
          en:"A deck of archetypes and symbols to explore inner states and resources through the language of images.",
          de:"Ein Kartenset aus Archetypen und Symbolen, um innere Zustände und Ressourcen durch die Sprache der Bilder zu erkunden."}
  },
  {
    slug:"vozvraschenie-energii", cat:"deck", img:"assets/img/c04.jpg",
    type:{ru:"Колода", en:"Deck", de:"Kartenset"},
    title:{ru:"Возвращение энергии", en:"Return of Energy", de:"Rückkehr der Energie"},
    desc:{ru:"Увидеть утечки энергии и собрать ресурс для действия.",
          en:"See where energy leaks and gather the resource to act.",
          de:"Sehen, wo Energie verloren geht, und die Ressource zum Handeln sammeln."},
    long:{ru:"Инструмент, чтобы увидеть, куда уходит энергия, и найти то, что действительно поддерживает и возвращает ресурс.",
          en:"A tool to see where your energy goes and find what truly supports you and restores the resource.",
          de:"Ein Werkzeug, um zu sehen, wohin deine Energie geht, und zu finden, was dich wirklich unterstützt und die Ressource zurückbringt."}
  },
  {
    slug:"disciplina-uma", cat:"book", img:"assets/img/c08.jpg",
    type:{ru:"Книга", en:"Book", de:"Buch"},
    title:{ru:"Дисциплина ума", en:"Discipline of Mind", de:"Disziplin des Geistes"},
    desc:{ru:"Книга о ясности мышления и внутренней опоре.",
          en:"A book about clarity of thinking and inner support.",
          de:"Ein Buch über Klarheit des Denkens und inneren Halt."},
    long:{ru:"Книга о том, как выстроить ясность мышления, вернуть внутреннюю опору и превратить понимание в устойчивую практику.",
          en:"A book on building clarity of mind, restoring inner support, and turning understanding into a steady practice.",
          de:"Ein Buch darüber, wie du Klarheit des Denkens aufbaust, inneren Halt zurückgewinnst und Verstehen in eine beständige Praxis verwandelst."}
  },
  {
    slug:"meditacii-vozvrascheniya", cat:"meditation", img:"assets/img/c11.jpg",
    type:{ru:"Медитации", en:"Meditations", de:"Meditationen"},
    title:{ru:"Медитации возвращения", en:"Meditations of Return", de:"Meditationen der Rückkehr"},
    desc:{ru:"Мягкие практики, чтобы вернуться к себе и восстановить состояние.",
          en:"Gentle practices to return to yourself and restore your state.",
          de:"Sanfte Praktiken, um zu dir zurückzukehren und deinen Zustand wiederherzustellen."},
    long:{ru:"Набор медитаций и мягких практик для восстановления состояния, возвращения к себе и опоры на внутренний ресурс.",
          en:"A set of meditations and gentle practices to restore your state, return to yourself, and lean on your inner resource.",
          de:"Eine Reihe von Meditationen und sanften Praktiken, um deinen Zustand wiederherzustellen, zu dir zurückzukehren und dich auf deine innere Ressource zu stützen."}
  },
  {
    slug:"52-svidaniya", cat:"game", img:"assets/img/c03.jpg",
    type:{ru:"Игра", en:"Game", de:"Spiel"},
    title:{ru:"52 свидания", en:"52 Dates", de:"52 Dates"},
    desc:{ru:"Игра для пары: близость, внимание и живой контакт.",
          en:"A game for couples: closeness, attention and living contact.",
          de:"Ein Spiel für Paare: Nähe, Aufmerksamkeit und lebendiger Kontakt."},
    long:{ru:"Игра для пары, которая помогает вернуть внимание друг к другу, укрепить близость и создать пространство живого контакта.",
          en:"A game for couples that helps bring attention back to each other, deepen closeness and create space for living contact.",
          de:"Ein Spiel für Paare, das hilft, die Aufmerksamkeit füreinander zurückzugewinnen, die Nähe zu vertiefen und Raum für lebendigen Kontakt zu schaffen."}
  }
];
