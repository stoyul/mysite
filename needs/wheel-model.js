/* Pure, editable correspondence model. Never infers diagnoses from wording. */
window.NeedsWheelModel = {
  analyze(config, book, draft) {
    const valid = new Set(book.needs.map(n => n.id));
    const available = new Set(config.sectors.map(s => s.needId).filter(Boolean));
    const scored = new Map();
    function add(ids, weight, reason) {
      for (const id of ids || []) {
        if (!valid.has(id) || !available.has(id)) continue;
        const item = scored.get(id) || { id, score: 0, reasons: [] };
        item.score += weight;
        if (!item.reasons.includes(reason)) item.reasons.push(reason);
        scored.set(id, item);
      }
    }
    const emotion = config.emotions.find(e => e.id === draft.emotion);
    if (emotion) add(emotion.needs, 3, `Вы выбрали состояние «${emotion.label}»`);
    for (const id of draft.manifestations || []) {
      const m = config.manifestations.find(m => m.id === id);
      if (m) add(m.needs, 4, `Вы отметили проявление «${m.label}»`);
    }
    const context = config.contexts.find(c => c.id === draft.context);
    if (context && context.id !== 'unsure') add(context.needs, 2, `Ваш контекст: ${context.label.toLowerCase()}`);
    const sorted = [...scored.values()].sort((a, b) => b.score - a.score);
    // Keep the strongest supported option in every represented chakra before filling the shortlist.
    const selected = [], groups = new Set();
    for (const item of sorted) {
      const chakra = book.needs.find(n => n.id === item.id).chakra;
      if (!groups.has(chakra)) { selected.push(item); groups.add(chakra); }
    }
    for (const item of sorted) if (!selected.includes(item) && selected.length < 8) selected.push(item);
    return selected.slice(0, 8);
  },
  normalize(config, draft = {}) {
    const good = (list, items) => [...new Set(Array.isArray(list) ? list.filter(id => items.some(x => x.id === id)) : [])];
    return {
      emotion: config.emotions.some(x => x.id === draft.emotion) ? draft.emotion : null,
      manifestations: good(draft.manifestations, config.manifestations),
      sectors: good(draft.sectors, config.sectors),
      context: config.contexts.some(x => x.id === draft.context) ? draft.context : 'unsure',
      note: typeof draft.note === 'string' ? draft.note.slice(0, 5000) : '',
      skipped: !!draft.skipped
    };
  },
  uniqueSectors(config, draft) {
    const seen = new Set();
    return (draft.sectors || []).map(id => config.sectors.find(s => s.id === id)).filter(s => {
      if (!s) return false;
      const key = s.needId || s.id;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  },
  selectedWays(config, book, draft, wayStates) {
    const ids = new Set(this.uniqueSectors(config, draft).flatMap(s => s.needId ? [s.needId] : s.alternatives || []));
    return book.needs.filter(n => ids.has(n.id)).flatMap(n => n.ways.filter(w => wayStates[w.id]?.selected).map(w => ({ id: w.id, done: !!wayStates[w.id].done, note: wayStates[w.id].note || '' })));
  }
};
