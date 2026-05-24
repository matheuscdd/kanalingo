package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	bookCode       = "ALL"
	buildID        = "5Z8tb8XG2WHV92II1LJ0d"
	languagePath   = "en"
	versionID      = 83
	versionSuffix  = "JCB"
	outputDir      = "downloads"
	concurrency    = 8
	maxRetries     = 5
	retryBackoff   = 800 * time.Millisecond
	requestTimeout = 20 * time.Second
	userAgent      = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
)

var (
	buildIDPattern       = regexp.MustCompile(`buildId":"([^"]+)`)
	buildManifestPattern = regexp.MustCompile(`/_next/static/([^/]+)/_buildManifest\.js`)
)

type apiResponse struct {
	PageProps struct {
		ChapterText string `json:"chapterText"`
		USFM        string `json:"usfm"`
	} `json:"pageProps"`
}

type chapterResult struct {
	chapter  int
	fileName string
	err      error
}

func main() {
	log.SetFlags(0)

	if err := run(); err != nil {
		log.Printf("erro: %v", err)
		os.Exit(1)
	}
}

func run() error {
	booksToDownload, err := resolveBooksToDownload()
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: requestTimeout}
	activeBuildID, err := resolveBuildID(client, booksToDownload[0])
	if err != nil {
		return fmt.Errorf("não foi possível descobrir o build id atual: %w", err)
	}

	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return fmt.Errorf("não foi possível criar o diretório %q: %w", outputDir, err)
	}

	log.Printf("build id detectado: %s", activeBuildID)
	log.Printf("iniciando download de %d livro(s)", len(booksToDownload))

	bookFailures := make([]string, 0)
	for index, selectedBook := range booksToDownload {
		log.Printf("livro %d/%d: %s", index+1, len(booksToDownload), selectedBook)
		if err := downloadBook(client, activeBuildID, selectedBook); err != nil {
			log.Printf("livro %s falhou: %v", selectedBook, err)
			bookFailures = append(bookFailures, selectedBook)
		}
	}

	log.Printf("resumo final: %d/%d livro(s) baixados sem falhas permanentes", len(booksToDownload)-len(bookFailures), len(booksToDownload))
	if len(bookFailures) == 0 {
		return nil
	}

	return fmt.Errorf("%d livro(s) falharam: %s", len(bookFailures), strings.Join(bookFailures, ", "))
}

func downloadBook(client *http.Client, activeBuildID string, selectedBook string) error {
	chapterTotal, ok := chapterCounts[selectedBook]
	if !ok {
		return fmt.Errorf("livro inválido %q; use um código USFM como GEN, EXO, MAT, REV ou ALL", selectedBook)
	}

	workerCount := min(concurrency, chapterTotal)
	jobs := make(chan int)
	results := make(chan chapterResult)

	var workers sync.WaitGroup
	for workerIndex := 0; workerIndex < workerCount; workerIndex++ {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for chapter := range jobs {
				fileName, err := processChapter(client, activeBuildID, selectedBook, chapter)
				results <- chapterResult{
					chapter:  chapter,
					fileName: fileName,
					err:      err,
				}
			}
		}()
	}

	go func() {
		for chapter := 1; chapter <= chapterTotal; chapter++ {
			jobs <- chapter
		}
		close(jobs)
		workers.Wait()
		close(results)
	}()

	failures := make([]chapterResult, 0)
	successCount := 0

	log.Printf("iniciando download de %d capítulos de %s com %d workers", chapterTotal, selectedBook, workerCount)
	for result := range results {
		if result.err != nil {
			log.Printf("capítulo %d falhou: %v", result.chapter, result.err)
			failures = append(failures, result)
			continue
		}

		successCount++
		log.Printf("capítulo %d salvo em %s", result.chapter, result.fileName)
	}

	sort.Slice(failures, func(left, right int) bool {
		return failures[left].chapter < failures[right].chapter
	})

	log.Printf("resumo: %d/%d capítulos baixados com sucesso", successCount, chapterTotal)
	if len(failures) == 0 {
		return nil
	}

	for _, failure := range failures {
		log.Printf("falha permanente no capítulo %d: %v", failure.chapter, failure.err)
	}

	return fmt.Errorf("%d capítulo(s) falharam", len(failures))
}

func resolveBooksToDownload() ([]string, error) {
	selectedBook := strings.ToUpper(strings.TrimSpace(bookCode))
	if selectedBook == "" || selectedBook == "ALL" {
		if len(bookOrder) != len(chapterCounts) {
			return nil, fmt.Errorf("catálogo inconsistente: %d livros na ordem e %d no mapa de capítulos", len(bookOrder), len(chapterCounts))
		}

		for _, code := range bookOrder {
			if _, ok := chapterCounts[code]; !ok {
				return nil, fmt.Errorf("catálogo inconsistente: %q está na ordem dos livros, mas não no mapa de capítulos", code)
			}
		}

		return append([]string(nil), bookOrder...), nil
	}

	if _, ok := chapterCounts[selectedBook]; !ok {
		return nil, fmt.Errorf("livro inválido %q; use um código USFM como GEN, EXO, MAT, REV ou ALL", selectedBook)
	}

	return []string{selectedBook}, nil
}

func processChapter(client *http.Client, buildID string, book string, chapter int) (string, error) {
	chapterText, fileName, err := fetchChapterWithRetry(client, buildID, book, chapter)
	if err != nil {
		return "", err
	}

	if err := saveChapter(fileName, chapterText); err != nil {
		return "", err
	}

	return fileName, nil
}

func fetchChapterWithRetry(client *http.Client, buildID string, book string, chapter int) (string, string, error) {
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		chapterText, fileName, err := fetchChapter(client, buildID, book, chapter)
		if err == nil {
			return chapterText, fileName, nil
		}

		lastErr = err
		if attempt == maxRetries {
			break
		}

		time.Sleep(retryBackoff * time.Duration(attempt+1))
	}

	return "", "", fmt.Errorf("depois de %d tentativas: %w", maxRetries+1, lastErr)
}

func fetchChapter(client *http.Client, buildID string, book string, chapter int) (string, string, error) {
	requestURL := buildChapterURL(buildID, book, chapter)
	req, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		return "", "", fmt.Errorf("não foi possível criar a requisição: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", userAgent)

	response, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("requisição HTTP falhou: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		bodyPreview, _ := io.ReadAll(io.LimitReader(response.Body, 512))
		return "", "", fmt.Errorf("status HTTP %d: %s", response.StatusCode, previewText(string(bodyPreview)))
	}

	var payload apiResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return "", "", fmt.Errorf("não foi possível decodificar o JSON: %w", err)
	}

	chapterText := strings.TrimSpace(payload.PageProps.ChapterText)
	if chapterText == "" {
		return "", "", errors.New("pageProps.chapterText veio vazio")
	}

	fileName := strings.TrimSpace(payload.PageProps.USFM)
	if fileName == "" {
		return "", "", errors.New("pageProps.usfm veio vazio")
	}

	if strings.ContainsAny(fileName, `\\/`) {
		return "", "", fmt.Errorf("pageProps.usfm gerou nome de arquivo inválido: %q", fileName)
	}

	return chapterText, fileName, nil
}

func saveChapter(fileName string, chapterText string) error {
	filePath := filepath.Join(outputDir, fileName)
	if err := os.WriteFile(filePath, []byte(chapterText), 0o644); err != nil {
		return fmt.Errorf("não foi possível gravar %q: %w", filePath, err)
	}

	return nil
}

func buildChapterURL(buildID string, book string, chapter int) string {
	return fmt.Sprintf(
		"https://www.bible.com/_next/data/%s/%s/audio-bible/%d/%s.%d.%s.json?versionId=%d&usfm=%s.%d.%s",
		buildID,
		languagePath,
		versionID,
		book,
		chapter,
		versionSuffix,
		versionID,
		book,
		chapter,
		versionSuffix,
	)
}

func buildChapterPageURL(book string, chapter int) string {
	return fmt.Sprintf(
		"https://www.bible.com/%s/audio-bible/%d/%s.%d.%s",
		languagePath,
		versionID,
		book,
		chapter,
		versionSuffix,
	)
}

func resolveBuildID(client *http.Client, book string) (string, error) {
	requestURL := buildChapterPageURL(book, 1)
	req, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		return "", fmt.Errorf("não foi possível criar a requisição da página: %w", err)
	}

	req.Header.Set("Accept", "text/html,application/xhtml+xml")
	req.Header.Set("User-Agent", userAgent)

	response, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("requisição da página falhou: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		bodyPreview, _ := io.ReadAll(io.LimitReader(response.Body, 512))
		return "", fmt.Errorf("status HTTP %d ao buscar a página: %s", response.StatusCode, previewText(string(bodyPreview)))
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	if err != nil {
		return "", fmt.Errorf("não foi possível ler a página para descobrir o build id: %w", err)
	}

	bodyText := string(body)
	if matches := buildIDPattern.FindStringSubmatch(bodyText); len(matches) == 2 {
		return matches[1], nil
	}

	if matches := buildManifestPattern.FindStringSubmatch(bodyText); len(matches) == 2 {
		return matches[1], nil
	}

	if strings.TrimSpace(buildID) != "" {
		return buildID, nil
	}

	return "", errors.New("nenhum build id foi encontrado na página HTML")
}

func previewText(raw string) string {
	compact := strings.Join(strings.Fields(raw), " ")
	if len(compact) <= 160 {
		return compact
	}

	return compact[:160] + "..."
}

func min(left int, right int) int {
	if left < right {
		return left
	}

	return right
}
