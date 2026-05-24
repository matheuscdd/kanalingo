# Arena de Traducoes

Aplicacao fullstack em JavaScript puro para avaliacao humana de traducoes de dicionário sem vies. O backend compara `azure_translator.json` e `chat_gpt.json`, gera a fila de revisao e salva as decisoes em arquivos JSON locais.

## Stack

- Node.js
- Express
- HTML, CSS puro e JavaScript vanilla
- Font Awesome servido localmente
- Persistencia apenas com `fs`

## Estrutura

```txt
backend/
frontend/
data/
azure_translator.json
chat_gpt.json
```

## Como executar

```bash
npm install
npm run merge
npm start
```

Abra `http://localhost:3000` no navegador.

## O que o merge gera

- `data/merged.json`: itens que exigem avaliacao humana
- `data/auto_saved.json`: itens resolvidos automaticamente quando apenas uma fonte possui traducao
- `data/skipped.json`: itens sem traducao em ambas as fontes

## O que a aplicacao salva

- `data/decisions.json`: decisoes humanas registradas pela interface
- `data/final_dictionary.json`: resultado final pronto para uso no dicionário

## API

- `GET /next`: retorna o proximo item para avaliacao com A/B embaralhados
- `POST /decision`: salva a escolha do usuario sem expor a origem real ao frontend
- `GET /stats`: retorna progresso, XP, streak e contadores da fila

## Observacoes

- O servidor gera os artefatos de merge automaticamente na primeira subida se `data/merged.json` e `data/auto_saved.json` ainda nao existirem.
- A origem real da traducao fica apenas nos arquivos internos e no `final_dictionary.json`, nunca nos payloads usados pela interface.
- A interface suporta atalhos: `A`, `B`, `J` e `E`.