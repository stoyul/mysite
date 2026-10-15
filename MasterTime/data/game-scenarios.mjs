// Original event text and time/energy/crystal rules, with explicit additional game-resource rules.
export default [
  {
    "id": "source-0",
    "title": "📱 Скроллик зовет",
    "description": "Ты выделила час на важный проект, а телефон предлагает «пять минут развлечений».",
    "source": {
      "file": "Мастер_времени_полный_прототип.html",
      "array": "EVENTS",
      "index": 0
    },
    "choices": [
      {
        "label": "Открыть ленту на час",
        "cost": 60,
        "energy": -12,
        "crystals": -1,
        "explanation": "Отдых в телефоне иногда нужен, но сейчас ты потратила час своей цели.",
        "attention": -18,
        "joy": 3,
        "freedom": -8,
        "overload": 1
      },
      {
        "label": "Убрать телефон и начать 15 минут",
        "cost": 0,
        "energy": 7,
        "crystals": 2,
        "explanation": "Ты сохранила фокус и сделала первый шаг.",
        "attention": 12,
        "joy": 1,
        "freedom": 7,
        "overload": 0
      },
      {
        "label": "Выделить 10 минут на осознанный перерыв",
        "cost": 10,
        "energy": 4,
        "crystals": 1,
        "explanation": "Ты выбрала ограниченный перерыв вместо автоматического скроллинга.",
        "attention": 5,
        "joy": 5,
        "freedom": 3,
        "overload": 0
      }
    ]
  },
  {
    "id": "source-1",
    "title": "☎️ Срочная просьба",
    "description": "В твой защищенный час работы звонит знакомая и просит поговорить без конкретной срочности.",
    "source": {
      "file": "Мастер_времени_полный_прототип.html",
      "array": "EVENTS",
      "index": 1
    },
    "choices": [
      {
        "label": "Разговаривать, сколько потребуется",
        "cost": 60,
        "energy": -9,
        "crystals": 1,
        "explanation": "Отношения важны, но твой час исчез.",
        "attention": -10,
        "joy": 4,
        "freedom": -10,
        "overload": 1
      },
      {
        "label": "Уточнить срочность и согласовать другое время",
        "cost": 0,
        "energy": 8,
        "crystals": 2,
        "explanation": "Ты проявила заботу и обозначила границы.",
        "attention": 5,
        "joy": 0,
        "freedom": 10,
        "overload": 0
      },
      {
        "label": "Выслушать 15 минут, предупредив об ограничении",
        "cost": 15,
        "energy": 3,
        "crystals": 1,
        "explanation": "Ты нашла промежуточное решение.",
        "attention": 0,
        "joy": 4,
        "freedom": 4,
        "overload": 0
      }
    ]
  },
  {
    "id": "source-2",
    "title": "🏛️ Визит в инстанцию",
    "description": "Неожиданно назначена важная встреча в учреждении. Она займет два часа с дорогой.",
    "source": {
      "file": "Мастер_времени_полный_прототип.html",
      "array": "EVENTS",
      "index": 2
    },
    "choices": [
      {
        "label": "Игнорировать встречу",
        "cost": 0,
        "energy": -15,
        "crystals": -2,
        "explanation": "Не все обязательства можно просто отменить.",
        "attention": -8,
        "joy": -4,
        "freedom": -8,
        "overload": 1
      },
      {
        "label": "Перенести менее важное дело и оставить запас",
        "cost": 120,
        "energy": 7,
        "crystals": 2,
        "explanation": "Ты гибко перестроила день.",
        "attention": 5,
        "joy": 0,
        "freedom": 4,
        "overload": 0
      },
      {
        "label": "Попытаться сделать все без изменения плана",
        "cost": 120,
        "energy": -18,
        "crystals": 0,
        "explanation": "Слишком плотное расписание увеличивает напряжение.",
        "attention": -12,
        "joy": -5,
        "freedom": -8,
        "overload": 1
      }
    ]
  },
  {
    "id": "source-3",
    "title": "🌴 Отпуск или проект?",
    "description": "Появилась возможность взять неделю отпуска, но параллельно предлагают дополнительный проект.",
    "source": {
      "file": "Мастер_времени_полный_прототип.html",
      "array": "EVENTS",
      "index": 3
    },
    "choices": [
      {
        "label": "Согласиться на все сразу",
        "cost": 240,
        "energy": -20,
        "crystals": 1,
        "explanation": "Нагрузка выросла, восстановление оказалось под угрозой.",
        "attention": -10,
        "joy": -5,
        "freedom": -10,
        "overload": 1
      },
      {
        "label": "Защитить отпуск и обсудить другие сроки",
        "cost": 0,
        "energy": 12,
        "crystals": 2,
        "explanation": "Ты учла долгосрочную ценность отдыха.",
        "attention": 6,
        "joy": 10,
        "freedom": 10,
        "overload": 0
      },
      {
        "label": "Отказаться от всего",
        "cost": 0,
        "energy": 2,
        "crystals": 0,
        "explanation": "Иногда это подходит, но можно было обсудить условия.",
        "attention": 0,
        "joy": 0,
        "freedom": 2,
        "overload": 0
      }
    ]
  },
  {
    "id": "source-4",
    "title": "📚 Новый курс",
    "description": "Тебе предложили интересное обучение по иностранному языку, 3 часа в неделю.",
    "source": {
      "file": "Мастер_времени_полный_прототип.html",
      "array": "EVENTS",
      "index": 4
    },
    "choices": [
      {
        "label": "Записаться и не менять расписание",
        "cost": 180,
        "energy": -10,
        "crystals": 0,
        "explanation": "Обучение полезно, но время нужно откуда-то взять.",
        "attention": -8,
        "joy": 2,
        "freedom": -8,
        "overload": 1
      },
      {
        "label": "Проверить календарь и освободить три часа",
        "cost": 180,
        "energy": 9,
        "crystals": 2,
        "explanation": "Ты выделила развитие как приоритет.",
        "attention": 7,
        "joy": 4,
        "freedom": 5,
        "overload": 0
      },
      {
        "label": "Оставить на неопределенное потом",
        "cost": 0,
        "energy": -2,
        "crystals": -1,
        "explanation": "Желание осталось без следующего шага.",
        "attention": 0,
        "joy": -2,
        "freedom": 0,
        "overload": 0
      }
    ]
  },
  {
    "id": "source-5",
    "title": "🛌 Недостаток сна",
    "description": "Ты не выспалась, а на день запланировано шесть сложных задач.",
    "source": {
      "file": "Мастер_времени_полный_прототип.html",
      "array": "EVENTS",
      "index": 5
    },
    "choices": [
      {
        "label": "Выполнить все без пауз",
        "cost": 0,
        "energy": -20,
        "crystals": 0,
        "explanation": "Ресурс не бесконечен.",
        "attention": -12,
        "joy": -6,
        "freedom": -6,
        "overload": 1
      },
      {
        "label": "Выделить главное и добавить восстановление",
        "cost": 45,
        "energy": 15,
        "crystals": 2,
        "explanation": "Ты адаптировала план под реальность.",
        "attention": 8,
        "joy": 4,
        "freedom": 6,
        "overload": 0
      },
      {
        "label": "Бросить все без оценки срочности",
        "cost": 0,
        "energy": 0,
        "crystals": 0,
        "explanation": "Полезно сначала определить обязательства и доступный ресурс.",
        "attention": -4,
        "joy": -2,
        "freedom": -2,
        "overload": 0
      }
    ]
  },
  {
    "id": "source-6",
    "title": "🎉 Неожиданная радость",
    "description": "Друг зовет тебя на прогулку, и это может стать приятным воспоминанием.",
    "source": {
      "file": "Мастер_времени_полный_прототип.html",
      "array": "EVENTS",
      "index": 6
    },
    "choices": [
      {
        "label": "Всегда отказывать ради эффективности",
        "cost": 0,
        "energy": -5,
        "crystals": 0,
        "explanation": "В планировании должно оставаться место жизни.",
        "attention": 1,
        "joy": -6,
        "freedom": -3,
        "overload": 0
      },
      {
        "label": "Проверить приоритеты и выделить час, если можешь",
        "cost": 60,
        "energy": 13,
        "crystals": 2,
        "explanation": "Ты нашла место для радости без отказа от важного.",
        "attention": 4,
        "joy": 12,
        "freedom": 5,
        "overload": 0
      },
      {
        "label": "Немедленно отменить все обязательства",
        "cost": 120,
        "energy": 1,
        "crystals": 0,
        "explanation": "Спонтанность прекрасна, но иногда стоит согласовать дела.",
        "attention": -5,
        "joy": 8,
        "freedom": -5,
        "overload": 1
      }
    ]
  },
  {
    "id": "source-7",
    "title": "👑 Госпожа Идеальность",
    "description": "Ты закончила задачу, но хочется еще два часа ее полировать.",
    "source": {
      "file": "Мастер_времени_полный_прототип.html",
      "array": "EVENTS",
      "index": 7
    },
    "choices": [
      {
        "label": "Переделывать снова",
        "cost": 120,
        "energy": -13,
        "crystals": 0,
        "explanation": "Дополнительные часы не всегда добавляют ценность.",
        "attention": -8,
        "joy": -4,
        "freedom": -6,
        "overload": 1
      },
      {
        "label": "Проверить критерии качества и завершить",
        "cost": 0,
        "energy": 10,
        "crystals": 2,
        "explanation": "Ты остановилась на достаточном результате.",
        "attention": 9,
        "joy": 5,
        "freedom": 8,
        "overload": 0
      },
      {
        "label": "Удалить всю работу",
        "cost": 0,
        "energy": -15,
        "crystals": -1,
        "explanation": "Результат можно оценить без крайностей.",
        "attention": -5,
        "joy": -7,
        "freedom": -4,
        "overload": 0
      }
    ]
  }
];
