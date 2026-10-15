"""Read source documents without changing them; preserve original cells and stable IDs."""
import hashlib
import json
from pathlib import Path
from docx import Document
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    sheet_path = SOURCE / 'Таймменеджмент.xlsx'
    doc_path = SOURCE / 'zeit.docx'
    workbook = openpyxl.load_workbook(sheet_path, data_only=False)
    cards = []
    for sheet in workbook:
        for row_number, values in enumerate(sheet.values, 1):
            number, description, practice, engagement = (list(values) + [None] * 4)[:4]
            if not isinstance(number, (int, float)) or not description:
                continue
            identifier = f'card-{int(number):03d}'
            if any(card['id'] == identifier for card in cards):
                raise ValueError(f'Duplicate source number: {number}')
            raw = {'description': str(description), 'practice': str(practice or ''), 'engagement': str(engagement or '')}
            normalized = {key: value.replace('ё', 'е').replace('Ё', 'Е') for key, value in raw.items()}
            # Title is an excerpt of the source, never invented content.
            title = normalized['description'].split('\n')[0].strip()
            cards.append({'id': identifier, 'number': int(number), 'title': title,
                          **normalized, 'source': {'file': sheet_path.name, 'sheet': sheet.title, 'row': row_number}, 'original': raw})
    paragraphs = [p.text for p in Document(doc_path).paragraphs if p.text.strip()]
    (ROOT / 'data/cards.json').write_text(json.dumps(cards, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'docs/ZEIT_EXTRACT.md').write_text('# Методическая база: извлечение zeit.docx\n\n' + '\n\n'.join(paragraphs) + '\n')
    manifest = {'cards': {'file': sheet_path.name, 'sha256': digest(sheet_path), 'count': len(cards),
                           'source_numbers': [c['number'] for c in cards]},
                'methodology': {'file': doc_path.name, 'sha256': digest(doc_path), 'paragraphs': len(paragraphs),
                                'is_full_transcript': False}}
    (ROOT / 'data/materials-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(cards)} cards and {len(paragraphs)} methodology paragraphs; source files unchanged.')

if __name__ == '__main__':
    main()
