"""Read source documents without changing them; preserve original cells and stable IDs."""
import hashlib
import json
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    sheet_path = SOURCE / 'Таймменеджмент.xlsx'
    workbook = openpyxl.load_workbook(sheet_path, data_only=False)
    cards = []
    for sheet in workbook:
        for row_number, values in enumerate(sheet.values, 1):
            number, description, practice = (list(values) + [None] * 3)[:3]
            if not isinstance(number, (int, float)) or not description:
                continue
            identifier = f'card-{int(number):03d}'
            if any(card['id'] == identifier for card in cards):
                raise ValueError(f'Duplicate source number: {number}')
            if not isinstance(practice, str) or not practice:
                raise ValueError(f'Missing practice for card {number}')
            # The two authored columns are authoritative; preserve their cells verbatim.
            raw = {'description': description, 'practice': practice}
            title = description.split('\n')[0].strip()
            cards.append({'id': identifier, 'number': int(number), 'title': title,
                          **raw, 'source': {'file': sheet_path.name, 'sheet': sheet.title, 'row': row_number}})
    if [card['number'] for card in cards] != list(range(2, 76)):
        raise ValueError('Expected 74 ordered cards numbered 2–75')
    (ROOT / 'data/cards.json').write_text(json.dumps(cards, ensure_ascii=False, indent=2) + '\n')
    manifest_path = ROOT / 'data/materials-manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['cards'] = {'file': sheet_path.name, 'sha256': digest(sheet_path), 'count': len(cards),
                         'source_numbers': [c['number'] for c in cards], 'text_columns': 2}
    (ROOT / 'data/materials-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(cards)} authored cards; source file unchanged.')

if __name__ == '__main__':
    main()
