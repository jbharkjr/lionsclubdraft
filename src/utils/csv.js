export function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = '';
      }
      if (char === '\r' && next === '\n') i += 1;
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter((item) => item.some(Boolean));
}

export function importMembersFromCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];

  const headers = rows[0].map((header) => header.toLowerCase().trim());
  const hasHeader = headers.some((header) => ['name', 'member', 'rating', 'score', 'photo', 'tags'].includes(header));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const indexFor = (...names) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? index : null;
  };

  const nameIndex = hasHeader ? indexFor('name', 'member', 'member name', 'full name') : 0;
  const ratingIndex = hasHeader ? indexFor('rating', 'score') : 1;
  const photoIndex = hasHeader ? indexFor('photo', 'photo url', 'image', 'image url') : 2;
  const tagsIndex = hasHeader ? indexFor('tags', 'tag') : 3;

  return dataRows
    .map((row, index) => ({
      id: crypto.randomUUID?.() || `member-import-${Date.now()}-${index}`,
      name: row[nameIndex ?? 0]?.trim() || '',
      rating: row[ratingIndex ?? -1] || '',
      note: '',
      photo: row[photoIndex ?? -1] || '',
      tags: row[tagsIndex ?? -1] || '',
      draftedTeamId: null,
      pickNumber: null,
      draftedRound: null,
    }))
    .filter((member) => member.name);
}

export function toCsvValue(value) {
  const stringValue = String(value ?? '');
  return /[",\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
