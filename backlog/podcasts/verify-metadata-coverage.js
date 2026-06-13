const fs = require('node:fs/promises');
const path = require('node:path');

const METADATA_SUFFIX = ' metadata.json';
const READY_STATUS = 'ARTIFACT_STATUS_READY';

const BOOKS = [
  { fileName: 'Soosei-ki', metadataName: 'Gênesis', chapterCount: 50 },
  { fileName: 'Shutsu-Ejiputo-ki', metadataName: 'Êxodo', chapterCount: 40 },
  { fileName: 'Rebi-ki', metadataName: 'Levítico', chapterCount: 27 },
  { fileName: 'Minsuu-ki', metadataName: 'Números', chapterCount: 36 },
  { fileName: 'Shimmei-ki', metadataName: 'Deuteronômio', chapterCount: 34 },
  { fileName: 'Yoshua', metadataName: 'Josué', chapterCount: 24 },
  { fileName: 'Shishiki', metadataName: 'Juízes', chapterCount: 21 },
  { fileName: 'Rutsu', metadataName: 'Rute', chapterCount: 4 },
  { fileName: 'Samueru-daiichi', metadataName: '1 Samuel', chapterCount: 31 },
  { fileName: 'Samueru-daini', metadataName: '2 Samuel', chapterCount: 24 },
  { fileName: 'Retsuoo-daiichi', metadataName: '1 Reis', chapterCount: 22 },
  { fileName: 'Retsuoo-daini', metadataName: '2 Reis', chapterCount: 25 },
  { fileName: 'Rekidai-daiichi', metadataName: '1 Crônicas', chapterCount: 29 },
  { fileName: 'Rekidai-daini', metadataName: '2 Crônicas', chapterCount: 36 },
  { fileName: 'Ezura', metadataName: 'Esdras', chapterCount: 10 },
  { fileName: 'Nehemiya', metadataName: 'Neemias', chapterCount: 13 },
  { fileName: 'Esuteru', metadataName: 'Ester', chapterCount: 10 },
  { fileName: 'Yobu', metadataName: 'Jó', chapterCount: 42 },
  { fileName: 'Shihen', metadataName: 'Salmos', chapterCount: 150 },
  { fileName: 'Shingen', metadataName: 'Provérbios', chapterCount: 31 },
  { fileName: 'Dendoo-no-sho', metadataName: 'Eclesiastes', chapterCount: 12 },
  { fileName: 'Gaka', metadataName: 'Cantares', chapterCount: 8 },
  { fileName: 'Izaya', metadataName: 'Isaías', chapterCount: 66 },
  { fileName: 'Eremiya', metadataName: 'Jeremias', chapterCount: 52 },
  { fileName: 'Aika', metadataName: 'Lamentações', chapterCount: 5 },
  { fileName: 'Ezekieru', metadataName: 'Ezequiel', chapterCount: 48 },
  { fileName: 'Danieru', metadataName: 'Daniel', chapterCount: 12 },
  { fileName: 'Hosea', metadataName: 'Oséias', chapterCount: 14 },
  { fileName: 'Yoeru', metadataName: 'Joel', chapterCount: 3 },
  { fileName: 'Amosu', metadataName: 'Amós', chapterCount: 9 },
  { fileName: 'Obadeya', metadataName: 'Obadias', chapterCount: 1 },
  { fileName: 'Yona', metadataName: 'Jonas', chapterCount: 4 },
  { fileName: 'Mika', metadataName: 'Miquéias', chapterCount: 7 },
  { fileName: 'Nahomu', metadataName: 'Naum', chapterCount: 3 },
  { fileName: 'Habakuku', metadataName: 'Habacuque', chapterCount: 3 },
  { fileName: 'Zepaniya', metadataName: 'Sofonias', chapterCount: 3 },
  { fileName: 'Hagai', metadataName: 'Ageu', chapterCount: 2 },
  { fileName: 'Zekariya', metadataName: 'Zacarias', chapterCount: 14 },
  { fileName: 'Maraki', metadataName: 'Malaquias', chapterCount: 4 },
  { fileName: 'Matai', metadataName: 'Mateus', chapterCount: 28 },
  { fileName: 'Maruko', metadataName: 'Marcos', chapterCount: 16 },
  { fileName: 'Ruka', metadataName: 'Lucas', chapterCount: 24 },
  { fileName: 'Yohane', metadataName: 'João', chapterCount: 21 },
  { fileName: 'Shito', metadataName: 'Atos', chapterCount: 28 },
  { fileName: 'Rooma', metadataName: 'Romanos', chapterCount: 16 },
  { fileName: 'Korinto-daiichi', metadataName: '1 Coríntios', chapterCount: 16 },
  { fileName: 'Korinto-daini', metadataName: '2 Coríntios', chapterCount: 13 },
  { fileName: 'Garateya', metadataName: 'Gálatas', chapterCount: 6 },
  { fileName: 'Efesosu', metadataName: 'Efésios', chapterCount: 6 },
  { fileName: 'Firipi', metadataName: 'Filipenses', chapterCount: 4 },
  { fileName: 'Korosai', metadataName: 'Colossenses', chapterCount: 4 },
  { fileName: 'Tesaronike-daiichi', metadataName: '1 Tessalonicenses', chapterCount: 5 },
  { fileName: 'Tesaronike-daini', metadataName: '2 Tessalonicenses', chapterCount: 3 },
  { fileName: 'Temote-daiichi', metadataName: '1 Timóteo', chapterCount: 6 },
  { fileName: 'Temote-daini', metadataName: '2 Timóteo', chapterCount: 4 },
  { fileName: 'Tetosu', metadataName: 'Tito', chapterCount: 3 },
  { fileName: 'Firemon', metadataName: 'Filemon', chapterCount: 1 },
  { fileName: 'Heburai', metadataName: 'Hebreus', chapterCount: 13 },
  { fileName: 'Yakobu', metadataName: 'Tiago', chapterCount: 5 },
  { fileName: 'Petero-daiichi', metadataName: '1 Pedro', chapterCount: 5 },
  { fileName: 'Petero-daini', metadataName: '2 Pedro', chapterCount: 3 },
  { fileName: 'Yohane-daiichi', metadataName: '1 João', chapterCount: 5 },
  { fileName: 'Yohane-daini', metadataName: '2 João', chapterCount: 1 },
  { fileName: 'Yohane-daisan', metadataName: '3 João', chapterCount: 1 },
  { fileName: 'Yuda', metadataName: 'Judas', chapterCount: 1 },
  { fileName: 'Mokushiroku', metadataName: 'Apocalipse', chapterCount: 22 }
];

const PROVERBS_FILE_BOOK = 'Shingen';
const PROVERBS_DISPLAY_BOOK = 'Provérbios';

const PROVERBS_SEGMENTS = [
  '1',
  '2',
  '3:1-10',
  '3:11-20',
  '3:21-35',
  '4:1-9',
  '4:10-19',
  '4:20-27',
  '5',
  '6:1-11',
  '6:12-19',
  '6:20-35',
  '7:1-9',
  '7:10-20',
  '7:21-27',
  '8',
  '9',
  '10:1-10',
  '10:11-21',
  '10:22-32',
  '11:1-10',
  '11:11-20',
  '11:21-31',
  '12:1-10',
  '12:11-20',
  '12:21-28',
  '13:1-10',
  '13:11-19',
  '13:20-25',
  '14:1-10',
  '14:11-21',
  '14:22-35',
  '15:1-10',
  '15:11-20',
  '15:21-33',
  '16:1-10',
  '16:11-20',
  '16:21-33',
  '17:1-10',
  '17:11-20',
  '17:21-28',
  '18:1-10',
  '18:11-24',
  '19:1-10',
  '19:11-20',
  '19:21-29',
  '20:1-10',
  '20:11-20',
  '20:21-30',
  '21:1-10',
  '21:11-20',
  '21:21-28',
  '22:1-10',
  '22:11-16',
  '22:17-29',
  '23:1-11',
  '23:12-18',
  '23:19-35',
  '24:1-9',
  '24:10-22',
  '24:23-34',
  '25:1-10',
  '25:11-17',
  '25:18-28',
  '26:1-10',
  '26:11-20',
  '26:21-28',
  '27:1-10',
  '27:11-19',
  '27:20-27',
  '28:1-10',
  '28:11-20',
  '28:21-28',
  '29:1-10',
  '29:11-20',
  '29:21-27',
  '30:1-10',
  '30:11-20',
  '30:21-33',
  '31:1-9',
  '31:10-31'
];

const BOOKS_BY_FILE_NAME = new Map(BOOKS.map((book) => [book.fileName, book]));
const CHAPTER_COUNTS = new Map(BOOKS.map((book) => [book.fileName, book.chapterCount]));
const FILE_BOOK_NAMES_DESC = BOOKS.map((book) => book.fileName).sort((left, right) => right.length - left.length);
const METADATA_BOOKS_DESC = BOOKS
  .map((book) => ({
    ...book,
    normalizedMetadataName: normalizeSearchText(book.metadataName)
  }))
  .sort((left, right) => right.normalizedMetadataName.length - left.normalizedMetadataName.length);
const PROVERBS_SEGMENT_SET = new Set(PROVERBS_SEGMENTS);

function normalizeSearchText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBookDefinition(book) {
  return BOOKS_BY_FILE_NAME.get(book) || null;
}

function getMetadataBookName(book) {
  return getBookDefinition(book)?.metadataName || book;
}

function isParsedReference(reference) {
  return Boolean(reference && !reference.error);
}

function listExpectedUnits(book) {
  if (book === PROVERBS_FILE_BOOK) {
    return PROVERBS_SEGMENTS;
  }

  const chapterCount = CHAPTER_COUNTS.get(book);
  return Array.from({ length: chapterCount }, (_, index) => String(index + 1));
}

function buildReferenceKey(reference) {
  return `${reference.book}|${reference.unit}`;
}

function formatReference(book, unit, nameStyle = 'metadata') {
  const bookDefinition = getBookDefinition(book);
  const bookName = !bookDefinition
    ? book
    : nameStyle === 'file'
      ? bookDefinition.fileName
      : bookDefinition.metadataName;

  return `${bookName} ${unit}`;
}

function parseCanonicalReference(book, rawUnit, sourceLabel, rawReference) {
  const unit = typeof rawUnit === 'string' ? rawUnit.replace(/_/g, ':').trim() : '';
  const chapterCount = CHAPTER_COUNTS.get(book);
  const displayBook = getMetadataBookName(book);

  if (book === PROVERBS_FILE_BOOK) {
    if (!unit) {
      return { error: `Referência ausente para ${displayBook} em ${sourceLabel}: ${rawReference}` };
    }

    if (/^\d+$/.test(unit)) {
      return {
        book,
        kind: 'proverbs',
        unit: String(Number(unit)),
        form: 'chapter'
      };
    }

    if (/^\d+:\d+-\d+$/.test(unit)) {
      return {
        book,
        kind: 'proverbs',
        unit,
        form: 'segment'
      };
    }

    return { error: `Segmento inválido de ${displayBook} em ${sourceLabel}: ${rawReference}` };
  }

  if (!unit) {
    if (chapterCount === 1) {
      return {
        book,
        kind: 'chapter',
        chapter: 1,
        unit: '1',
        form: 'book-only'
      };
    }

    return { error: `Capítulo ausente em ${sourceLabel}: ${rawReference}` };
  }

  if (!/^\d+$/.test(unit)) {
    return { error: `Capítulo inválido em ${sourceLabel}: ${rawReference}` };
  }

  const chapter = Number(unit);

  return {
    book,
    kind: 'chapter',
    chapter,
    unit: String(chapter),
    form: 'numbered'
  };
}

function matchFileBook(rawReference) {
  for (const book of FILE_BOOK_NAMES_DESC) {
    if (rawReference === book) {
      return { book, remainder: '' };
    }

    const prefix = `${book} `;
    if (rawReference.startsWith(prefix)) {
      return { book, remainder: rawReference.slice(prefix.length) };
    }
  }

  return null;
}

function parseFilenameReference(rawReference, sourceLabel) {
  const trimmed = rawReference.trim();
  const match = matchFileBook(trimmed);

  if (!match) {
    return { error: `Livro não reconhecido em ${sourceLabel}: ${rawReference}` };
  }

  return parseCanonicalReference(match.book, match.remainder, sourceLabel, rawReference);
}

function buildUnitFromCapture(chapterPart, directVerseRange, labeledVerseRange) {
  const verseRange = directVerseRange || labeledVerseRange || '';
  if (!verseRange) {
    return chapterPart;
  }

  return `${chapterPart}:${verseRange.replace(/\s+/g, '')}`;
}

function extractEpisodeFocusReference(rawEpisodeFocus, sourceLabel) {
  const normalizedFocus = normalizeSearchText(rawEpisodeFocus);

  if (!normalizedFocus) {
    return { error: `Campo "audioOverview.generationOptions.episodeFocus" ausente ou inválido em ${sourceLabel}` };
  }

  const candidates = [];
  const parseErrors = [];

  for (const bookDefinition of METADATA_BOOKS_DESC) {
    const escapedBookName = escapeRegExp(bookDefinition.normalizedMetadataName);
    const patterns = [
      new RegExp(`(?:capitulo|capitulos|cap|trecho|segmento)\\s+(\\d+)(?:\\s*[:_]\\s*(\\d+-\\d+)|\\s*,?\\s*(?:versiculos?|versos?)\\s+(\\d+-\\d+))?\\s+(?:de|do|da)\\s+(?:livro\\s+de\\s+)?${escapedBookName}(?=$|\\W)`, 'g'),
      new RegExp(`(?:capitulo|capitulos|cap)\\s+(\\d+)\\s+(?:de|do|da)\\s+(?:livro\\s+de\\s+)?${escapedBookName}\\s*,?\\s*(?:versiculos?|versos?)\\s+(\\d+-\\d+)(?=$|\\W)`, 'g'),
      new RegExp(`(?:^|\\W)(?:livro\\s+de\\s+)?${escapedBookName}\\s+(\\d+)(?:\\s*[:_]\\s*(\\d+-\\d+))?\\b`, 'g'),
      new RegExp(`(?:^|\\W)(?:livro\\s+de\\s+)?${escapedBookName}(?:\\s*,)?\\s+capitulo\\s+(\\d+)(?:\\s*[:_]\\s*(\\d+-\\d+)|\\s*,?\\s*(?:versiculos?|versos?)\\s+(\\d+-\\d+))?\\b`, 'g')
    ];

    for (const pattern of patterns) {
      for (const match of normalizedFocus.matchAll(pattern)) {
        const unit = buildUnitFromCapture(match[1], match[2], match[3]);
        const parsedReference = parseCanonicalReference(bookDefinition.fileName, unit, sourceLabel, rawEpisodeFocus);
        if (isParsedReference(parsedReference)) {
          candidates.push(parsedReference);
        } else {
          parseErrors.push(parsedReference.error);
        }
      }
    }

    if (bookDefinition.chapterCount !== 1) {
      continue;
    }

    const bookOnlyPattern = new RegExp(`(?:^|\\W)(?:livro\\s+de\\s+)?${escapedBookName}(?=$|\\W)`);
    if (!bookOnlyPattern.test(normalizedFocus)) {
      continue;
    }

    const parsedReference = parseCanonicalReference(bookDefinition.fileName, '', sourceLabel, rawEpisodeFocus);
    if (isParsedReference(parsedReference)) {
      candidates.push(parsedReference);
    } else {
      parseErrors.push(parsedReference.error);
    }
  }

  const uniqueCandidates = [...new Map(candidates.map((candidate) => [buildReferenceKey(candidate), candidate])).values()];

  if (uniqueCandidates.length === 1) {
    return uniqueCandidates[0];
  }

  if (uniqueCandidates.length > 1) {
    const formattedCandidates = uniqueCandidates.map((candidate) => formatReference(candidate.book, candidate.unit));
    return { error: `Múltiplas referências reconhecidas em ${sourceLabel}: ${formattedCandidates.join('; ')}` };
  }

  if (parseErrors.length > 0) {
    return { error: parseErrors[0] };
  }

  return { error: `Referência bíblica não reconhecida em ${sourceLabel}: ${rawEpisodeFocus}` };
}

function isExpectedReference(reference) {
  if (reference.book === PROVERBS_FILE_BOOK) {
    return PROVERBS_SEGMENT_SET.has(reference.unit);
  }

  const chapterCount = CHAPTER_COUNTS.get(reference.book);
  return reference.chapter >= 1 && reference.chapter <= chapterCount;
}

function sortRecordsByFileName(records) {
  return [...records].sort((left, right) => left.fileName.localeCompare(right.fileName, 'pt-BR', { numeric: true }));
}

function classifyDuplicateGroup(book, records) {
  if (records.length <= 1) {
    return null;
  }

  if (CHAPTER_COUNTS.get(book) !== 1) {
    return { kind: 'duplicate' };
  }

  const countsByForm = new Map();

  for (const record of records) {
    const form = isParsedReference(record.filenameReference) ? record.filenameReference.form : 'unknown';
    countsByForm.set(form, (countsByForm.get(form) || 0) + 1);
  }

  const numberedCount = countsByForm.get('numbered') || 0;
  const bookOnlyCount = countsByForm.get('book-only') || 0;
  const otherCount = records.length - numberedCount - bookOnlyCount;

  if (numberedCount === 1 && bookOnlyCount === 1 && otherCount === 0 && records.length === 2) {
    return { kind: 'alias' };
  }

  return { kind: 'duplicate' };
}

async function loadRecord(directoryPath, fileName) {
  const filePath = path.join(directoryPath, fileName);
  const rawReference = fileName.slice(0, -METADATA_SUFFIX.length);
  const filenameReference = parseFilenameReference(rawReference, `filename ${fileName}`);

  let jsonData = null;
  let jsonError = null;

  try {
    const content = await fs.readFile(filePath, 'utf8');
    jsonData = JSON.parse(content);
  } catch (error) {
    jsonError = error instanceof Error ? error.message : String(error);
  }

  let episodeFocusReference = null;
  let episodeFocusError = null;
  let rawEpisodeFocus = null;

  if (jsonData) {
    rawEpisodeFocus = typeof jsonData?.audioOverview?.generationOptions?.episodeFocus === 'string'
      ? jsonData.audioOverview.generationOptions.episodeFocus.trim()
      : null;

    if (!rawEpisodeFocus) {
      episodeFocusError = 'Campo "audioOverview.generationOptions.episodeFocus" ausente ou inválido';
    } else {
      episodeFocusReference = extractEpisodeFocusReference(rawEpisodeFocus, `episodeFocus ${fileName}`);
    }
  }

  const chosenReference = isParsedReference(episodeFocusReference)
    ? episodeFocusReference
    : isParsedReference(filenameReference)
      ? filenameReference
      : null;

  const mismatch = isParsedReference(filenameReference)
    && isParsedReference(episodeFocusReference)
    && buildReferenceKey(filenameReference) !== buildReferenceKey(episodeFocusReference);

  return {
    fileName,
    filePath,
    rawReference,
    rawEpisodeFocus,
    filenameReference,
    episodeFocusReference,
    chosenReference,
    mismatch,
    jsonError,
    episodeFocusError,
    status: jsonData && typeof jsonData.status === 'string' ? jsonData.status : null
  };
}

async function collectRecords(directoryPath) {
  const directoryEntries = await fs.readdir(directoryPath, { withFileTypes: true });
  const metadataFiles = directoryEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(METADATA_SUFFIX))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'pt-BR', { numeric: true }));

  const records = await Promise.all(metadataFiles.map((fileName) => loadRecord(directoryPath, fileName)));
  return { metadataFiles, records };
}

function analyzeRecords(records) {
  const groupedRecords = new Map();
  const issues = {
    jsonParse: [],
    filenameParse: [],
    episodeFocusParse: [],
    status: [],
    mismatches: [],
    missing: [],
    unexpected: [],
    duplicates: [],
    aliasWarnings: []
  };

  for (const record of records) {
    if (record.jsonError) {
      issues.jsonParse.push({ fileName: record.fileName, message: record.jsonError });
    }

    if (!isParsedReference(record.filenameReference)) {
      issues.filenameParse.push({ fileName: record.fileName, message: record.filenameReference.error });
    }

    if (record.episodeFocusError) {
      issues.episodeFocusParse.push({ fileName: record.fileName, message: record.episodeFocusError });
    } else if (record.episodeFocusReference && !isParsedReference(record.episodeFocusReference)) {
      issues.episodeFocusParse.push({ fileName: record.fileName, message: record.episodeFocusReference.error });
    }

    if (record.status !== READY_STATUS) {
      issues.status.push({ fileName: record.fileName, status: record.status || '(ausente)' });
    }

    if (record.mismatch) {
      issues.mismatches.push({
        fileName: record.fileName,
        fileReference: formatReference(record.filenameReference.book, record.filenameReference.unit, 'file'),
        episodeFocusReference: formatReference(record.episodeFocusReference.book, record.episodeFocusReference.unit)
      });
    }

    if (!record.chosenReference) {
      continue;
    }

    const bookGroups = groupedRecords.get(record.chosenReference.book) || new Map();
    const referenceKey = record.chosenReference.unit;
    const referenceGroup = bookGroups.get(referenceKey) || [];

    referenceGroup.push(record);
    bookGroups.set(referenceKey, referenceGroup);
    groupedRecords.set(record.chosenReference.book, bookGroups);
  }

  const bookSummaries = [];

  for (const { fileName: book, chapterCount } of BOOKS) {
    const expectedUnits = listExpectedUnits(book);
    const expectedUnitSet = new Set(expectedUnits);
    const bookGroups = groupedRecords.get(book) || new Map();
    const missingUnits = [];
    const unexpectedUnits = [];
    const duplicateUnits = [];
    const aliasUnits = [];

    for (const expectedUnit of expectedUnits) {
      const group = bookGroups.get(expectedUnit) || [];

      if (group.length === 0) {
        missingUnits.push(expectedUnit);
        issues.missing.push({ book, unit: expectedUnit });
        continue;
      }

      const classification = classifyDuplicateGroup(book, group);
      if (!classification) {
        continue;
      }

      if (classification.kind === 'alias') {
        aliasUnits.push({ unit: expectedUnit, records: sortRecordsByFileName(group) });
        issues.aliasWarnings.push({ book, unit: expectedUnit, records: sortRecordsByFileName(group) });
      } else {
        duplicateUnits.push({ unit: expectedUnit, records: sortRecordsByFileName(group) });
        issues.duplicates.push({ book, unit: expectedUnit, records: sortRecordsByFileName(group) });
      }
    }

    for (const [actualUnit, group] of bookGroups.entries()) {
      if (expectedUnitSet.has(actualUnit)) {
        continue;
      }

      unexpectedUnits.push({ unit: actualUnit, records: sortRecordsByFileName(group) });
      issues.unexpected.push({ book, unit: actualUnit, records: sortRecordsByFileName(group) });
    }

    const hasCoverage = missingUnits.length === 0;
    const isClean = hasCoverage && unexpectedUnits.length === 0 && duplicateUnits.length === 0;

    bookSummaries.push({
      book,
      chapterCount,
      expectedCount: expectedUnits.length,
      foundCount: bookGroups.size,
      hasCoverage,
      isClean,
      missingUnits,
      unexpectedUnits,
      duplicateUnits,
      aliasUnits
    });
  }

  return { groupedRecords, issues, bookSummaries };
}

function printLine(text = '') {
  process.stdout.write(`${text}\n`);
}

function printIssueSection(title, rows, formatter) {
  printLine(title);

  if (rows.length === 0) {
    printLine('  - nenhum');
    printLine();
    return;
  }

  for (const row of rows) {
    printLine(`  - ${formatter(row)}`);
  }

  printLine();
}

function printSummary(metadataFiles, analysis) {
  const coverageComplete = analysis.bookSummaries.filter((summary) => summary.hasCoverage).length;
  const cleanBooks = analysis.bookSummaries.filter((summary) => summary.isClean).length;
  const proverbsSummary = analysis.bookSummaries.find((summary) => summary.book === PROVERBS_FILE_BOOK);

  printLine('Verificacao de cobertura dos metadata.json');
  printLine('=====================================');
  printLine(`Arquivos metadata.json lidos: ${metadataFiles.length}`);
  printLine(`Livros com cobertura completa: ${coverageComplete}/${BOOKS.length}`);
  printLine(`Livros sem extras/duplicatas: ${cleanBooks}/${BOOKS.length}`);
  printLine(`${PROVERBS_DISPLAY_BOOK} segmentos esperados: ${proverbsSummary ? proverbsSummary.expectedCount : 0}`);
  printLine(`${PROVERBS_DISPLAY_BOOK} segmentos encontrados: ${proverbsSummary ? proverbsSummary.foundCount : 0}`);
  printLine();

  const booksWithGaps = analysis.bookSummaries.filter((summary) => summary.missingUnits.length > 0);
  printIssueSection('Livros com faltantes', booksWithGaps, (summary) => {
    const units = summary.missingUnits.join(', ');
    return `${getMetadataBookName(summary.book)}: ${units}`;
  });

  const booksWithUnexpected = analysis.bookSummaries.filter((summary) => summary.unexpectedUnits.length > 0);
  printIssueSection('Capitulos ou segmentos extras', booksWithUnexpected, (summary) => {
    const units = summary.unexpectedUnits.map((item) => `${item.unit} [${item.records.map((record) => record.fileName).join(', ')}]`).join('; ');
    return `${getMetadataBookName(summary.book)}: ${units}`;
  });

  const booksWithDuplicates = analysis.bookSummaries.filter((summary) => summary.duplicateUnits.length > 0);
  printIssueSection('Duplicatas', booksWithDuplicates, (summary) => {
    const units = summary.duplicateUnits.map((item) => `${item.unit} [${item.records.map((record) => record.fileName).join(', ')}]`).join('; ');
    return `${getMetadataBookName(summary.book)}: ${units}`;
  });

  printIssueSection('Aliases tolerados', analysis.issues.aliasWarnings, (issue) => {
    const files = issue.records.map((record) => record.fileName).join(', ');
    return `${formatReference(issue.book, issue.unit)} [${files}]`;
  });

  printIssueSection('Inconsistencias filename x episodeFocus', analysis.issues.mismatches, (issue) => {
    return `${issue.fileName}: filename=${issue.fileReference}; episodeFocus=${issue.episodeFocusReference}`;
  });

  printIssueSection('Status diferente de READY', analysis.issues.status, (issue) => {
    return `${issue.fileName}: ${issue.status}`;
  });

  printIssueSection('Erros de parse de filename', analysis.issues.filenameParse, (issue) => {
    return `${issue.fileName}: ${issue.message}`;
  });

  printIssueSection('Erros de parse de episodeFocus', analysis.issues.episodeFocusParse, (issue) => {
    return `${issue.fileName}: ${issue.message}`;
  });

  printIssueSection('Erros de leitura ou JSON', analysis.issues.jsonParse, (issue) => {
    return `${issue.fileName}: ${issue.message}`;
  });
}

function hasBlockingIssues(analysis) {
  return analysis.issues.missing.length > 0
    || analysis.issues.unexpected.length > 0
    || analysis.issues.duplicates.length > 0
    || analysis.issues.mismatches.length > 0
    || analysis.issues.status.length > 0
    || analysis.issues.filenameParse.length > 0
    || analysis.issues.episodeFocusParse.length > 0
    || analysis.issues.jsonParse.length > 0;
}

async function main() {
  const directoryPath = path.resolve(process.argv[2] || process.cwd());
  const stat = await fs.stat(directoryPath).catch(() => null);

  if (!stat || !stat.isDirectory()) {
    throw new Error(`Diretorio invalido: ${directoryPath}`);
  }

  const { metadataFiles, records } = await collectRecords(directoryPath);
  const analysis = analyzeRecords(records);
  printSummary(metadataFiles, analysis);
  process.exitCode = hasBlockingIssues(analysis) ? 1 : 0;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});