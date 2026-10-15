#!/usr/bin/env python3
"""Apply concise game copy while retaining source material and stable card IDs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rows = {}
for line in (ROOT / 'tools/cards-editorial.tsv').read_text().splitlines():
    number, title, situation, action = line.split('|', 3)
    number = int(number)
    if number in rows or not all((title, situation, action)):
        raise ValueError(f'Invalid editorial card {number}')
    rows[number] = (title, situation, action)
if set(rows) != set(range(2, 76)):
    raise ValueError('Editorial must cover all 74 cards')

path = ROOT / 'data/cards.json'
cards = json.loads(path.read_text())
if len(cards) != 74 or {card['number'] for card in cards} != set(rows):
    raise ValueError('Card catalog changed; review before applying editorial')
for card in cards:
    title, situation, action = rows[card['number']]
    card.update(title=title, situation=situation, action=action,
                description=situation, practice=action)
    # The full source copy remains in "original" for provenance and review.
    card['engagement'] = card['original']['engagement'].replace('ё', 'е').replace('Ё', 'Е')
path.write_text(json.dumps(cards, ensure_ascii=False, indent=2) + '\n')
print(f'Updated {len(cards)} cards; original copy and IDs retained')
