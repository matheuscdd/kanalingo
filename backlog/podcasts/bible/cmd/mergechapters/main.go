package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

const (
	inputDir       = "downloads"
	outputFile     = "biblia-completa.txt"
	expectedSuffix = "JCB"
)

type chapterFile struct {
	bookCode  string
	bookTitle string
	chapter   int
	filePath  string
}

func main() {
	log.SetFlags(0)

	if err := run(); err != nil {
		log.Printf("erro: %v", err)
		os.Exit(1)
	}
}

func run() error {
	entries, err := os.ReadDir(inputDir)
	if err != nil {
		return fmt.Errorf("nao foi possivel ler %q: %w", inputDir, err)
	}

	chapters := make([]chapterFile, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		chapter, ok := parseChapterFile(entry.Name())
		if !ok {
			continue
		}

		chapters = append(chapters, chapter)
	}

	if len(chapters) == 0 {
		return fmt.Errorf("nenhum capitulo encontrado em %q", inputDir)
	}

	sort.Slice(chapters, func(left, right int) bool {
		if chapters[left].bookCode != chapters[right].bookCode {
			return bookIndex[chapters[left].bookCode] < bookIndex[chapters[right].bookCode]
		}

		return chapters[left].chapter < chapters[right].chapter
	})

	var builder strings.Builder
	firstHeader := ""

	for index, chapter := range chapters {
		body, err := os.ReadFile(chapter.filePath)
		if err != nil {
			return fmt.Errorf("nao foi possivel ler %q: %w", chapter.filePath, err)
		}

		if index > 0 {
			builder.WriteString("\n\n")
		}

		header := fmt.Sprintf("%s %d", chapter.bookTitle, chapter.chapter)
		if firstHeader == "" {
			firstHeader = header
		}

		builder.WriteString(header)
		builder.WriteString("\n\n")
		builder.WriteString(strings.TrimSpace(string(body)))
	}

	if err := os.WriteFile(outputFile, []byte(builder.String()), 0o644); err != nil {
		return fmt.Errorf("nao foi possivel gravar %q: %w", outputFile, err)
	}

	log.Printf("arquivo gerado: %s", outputFile)
	log.Printf("capitulos unidos: %d", len(chapters))
	log.Printf("primeiro cabecalho: %s", firstHeader)

	return nil
}

func parseChapterFile(fileName string) (chapterFile, bool) {
	parts := strings.Split(fileName, ".")
	if len(parts) != 3 {
		return chapterFile{}, false
	}

	bookCode := strings.ToUpper(strings.TrimSpace(parts[0]))
	bookTitle, ok := bookTitles[bookCode]
	if !ok {
		return chapterFile{}, false
	}

	if _, ok := bookIndex[bookCode]; !ok {
		return chapterFile{}, false
	}

	if !strings.EqualFold(strings.TrimSpace(parts[2]), expectedSuffix) {
		return chapterFile{}, false
	}

	chapterNumber, err := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil || chapterNumber < 1 {
		return chapterFile{}, false
	}

	return chapterFile{
		bookCode:  bookCode,
		bookTitle: bookTitle,
		chapter:   chapterNumber,
		filePath:  filepath.Join(inputDir, fileName),
	}, true
}
