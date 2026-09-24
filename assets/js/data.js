/* ============================================================
   Данные продуктов. Добавление нового продукта = один объект.
   cat: game | deck | book | course | meditation
   Цены намеренно не хранятся и не показываются.
   ============================================================ */
window.PRODUCTS = [
  {
    slug:"ten-sila", cat:"deck", img:"assets/img/c07.jpg", featured:true,
    type:{ru:"Колода", en:"Deck"},
    title:{ru:"Тень — Сила", en:"Shadow — Power"},
    desc:{ru:"60 двусторонних карт: увидеть Тень и вернуть скрытый за ней ресурс.",
          en:"60 double-sided cards: see the Shadow and reclaim the strength hidden behind it."},
    long:{ru:"Трансформационная колода из 60 двусторонних карт. Одна сторона — Тень, автоматическая стратегия, которая управляет вами. Вторая — Сила, ресурс, который в ней скрыт. Инструмент для рефлексии и исследования собственных стратегий, а не гадание.",
          en:"A transformational deck of 60 double-sided cards. One side is the Shadow — an automatic strategy that runs you. The other is the Power hidden within it. A tool for reflection and self-inquiry, not fortune-telling."}
  },
  {
    slug:"tochka-sily", cat:"game", img:"assets/img/c05.jpg", featured:true,
    type:{ru:"Игра", en:"Game"},
    title:{ru:"Точка силы", en:"Point of Power"},
    desc:{ru:"Трансформационная игра и система пяти шагов для работы с запросом.",
          en:"A transformational game and a five-step system for working with your request."},
    long:{ru:"Авторская трансформационная игра на основе системы пяти шагов: где я, что мне нужно, что я отрицаю, где моя энергия, что я создаю. Помогает увидеть ситуацию целиком и выбрать следующий шаг.",
          en:"An original transformational game built on the five-step system: where am I, what do I need, what do I deny, where is my energy, what do I create. It helps you see the whole picture and choose the next step."}
  },
  {
    slug:"potrebnosti", cat:"deck", img:"assets/img/c09.jpg", featured:true,
    type:{ru:"Колода", en:"Deck"},
    title:{ru:"Потребности", en:"Needs"},
    desc:{ru:"Диагностический инструмент, чтобы понять, что стоит за реакцией.",
          en:"A diagnostic tool to understand what stands behind a reaction."},
    long:{ru:"Колода-инструмент для работы с потребностями: помогает назвать то, чего вам сейчас не хватает, и увидеть настоящую потребность за эмоцией или реакцией.",
          en:"A tool deck for working with needs: it helps you name what you are missing right now and see the real need behind an emotion or reaction."}
  },
  {
    slug:"kristall-7d", cat:"game", img:"assets/img/c10.jpg", featured:true,
    type:{ru:"Игра", en:"Game"},
    title:{ru:"Кристалл намерения 7D", en:"Intention Crystal 7D"},
    desc:{ru:"Собрать намерение через семь уровней и создать целостный образ.",
          en:"Assemble an intention through seven levels and shape a whole image."},
    long:{ru:"Инструмент для формирования намерения через семь уровней. Помогает собрать целостный образ желаемого и перевести его в конкретное действие.",
          en:"A tool for shaping intention across seven levels. It helps you build a whole image of what you want and translate it into concrete action."}
  },
  {
    slug:"istinnye-zhelaniya", cat:"course", img:"assets/img/c02.jpg",
    type:{ru:"Курс", en:"Course"},
    title:{ru:"Истинные желания", en:"True Desires"},
    desc:{ru:"Программа, чтобы отделить свое желание от навязанного и услышать себя.",
          en:"A programme to separate your own desire from imposed ones and hear yourself."},
    long:{ru:"Курс-программа о том, как отличить собственное желание от ожиданий, привычного «надо» и социальных сценариев, и как перевести желание в направление.",
          en:"A course-programme on telling your own desire apart from expectations and social scripts, and turning desire into direction."}
  },
  {
    slug:"sostoyanie-bogini", cat:"deck", img:"assets/img/c06.jpg",
    type:{ru:"Колода", en:"Deck"},
    title:{ru:"Состояние богини", en:"State of the Goddess"},
    desc:{ru:"Работа с женскими архетипами и внутренними состояниями через образы.",
          en:"Working with feminine archetypes and inner states through imagery."},
    long:{ru:"Колода архетипов и символов для исследования внутренних состояний и ресурсов через язык образов.",
          en:"A deck of archetypes and symbols to explore inner states and resources through the language of images."}
  },
  {
    slug:"vozvraschenie-energii", cat:"deck", img:"assets/img/c04.jpg",
    type:{ru:"Колода", en:"Deck"},
    title:{ru:"Возвращение энергии", en:"Return of Energy"},
    desc:{ru:"Увидеть утечки энергии и собрать ресурс для действия.",
          en:"See where energy leaks and gather the resource to act."},
    long:{ru:"Инструмент, чтобы увидеть, куда уходит энергия, и найти то, что действительно поддерживает и возвращает ресурс.",
          en:"A tool to see where your energy goes and find what truly supports you and restores the resource."}
  },
  {
    slug:"disciplina-uma", cat:"book", img:"assets/img/c08.jpg",
    type:{ru:"Книга", en:"Book"},
    title:{ru:"Дисциплина ума", en:"Discipline of Mind"},
    desc:{ru:"Книга о ясности мышления и внутренней опоре.",
          en:"A book about clarity of thinking and inner support."},
    long:{ru:"Книга о том, как выстроить ясность мышления, вернуть внутреннюю опору и превратить понимание в устойчивую практику.",
          en:"A book on building clarity of mind, restoring inner support, and turning understanding into a steady practice."}
  },
  {
    slug:"meditacii-vozvrascheniya", cat:"meditation", img:"assets/img/c11.jpg",
    type:{ru:"Медитации", en:"Meditations"},
    title:{ru:"Медитации возвращения", en:"Meditations of Return"},
    desc:{ru:"Мягкие практики, чтобы вернуться к себе и восстановить состояние.",
          en:"Gentle practices to return to yourself and restore your state."},
    long:{ru:"Набор медитаций и мягких практик для восстановления состояния, возвращения к себе и опоры на внутренний ресурс.",
          en:"A set of meditations and gentle practices to restore your state, return to yourself, and lean on your inner resource."}
  },
  {
    slug:"52-svidaniya", cat:"game", img:"assets/img/c03.jpg",
    type:{ru:"Игра", en:"Game"},
    title:{ru:"52 свидания", en:"52 Dates"},
    desc:{ru:"Игра для пары: близость, внимание и живой контакт.",
          en:"A game for couples: closeness, attention and living contact."},
    long:{ru:"Игра для пары, которая помогает вернуть внимание друг к другу, укрепить близость и создать пространство живого контакта.",
          en:"A game for couples that helps bring attention back to each other, deepen closeness and create space for living contact."}
  }
];
