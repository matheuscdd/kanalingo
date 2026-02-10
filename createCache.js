const fs = require('node:fs');
const path = require('node:path');

// --- CONFIGURAÇÕES ---
const FOLDER_TO_CACHE = './src'; // Pasta onde estão seus arquivos (ajuste se for '.' ou 'public')
const SW_FILE_PATH = './sw.js'; 
const VERSION_FILE_PATH = './version.json';  // Onde está o seu Service Worker
const IGNORE_LIST = [            // Arquivos para IGNORAR (não colocar no cache)
    '.DS_Store', 
    'sw.js', 
    'version.json',
    'update-sw.js', 
    '.git',
    'package.json',
    'package-lock.json',
    'node_modules'
];
// ---------------------

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        const fullPath = path.join(dirPath, file);
        
        // Se for pasta, entra nela (recursividade)
        if (fs.statSync(fullPath).isDirectory()) {
            if (!IGNORE_LIST.includes(file)) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            // Se for arquivo, adiciona na lista (se não estiver na lista de ignorados)
            if (!IGNORE_LIST.includes(file)) {
                // Truque para normalizar caminhos no Windows (\\) para Web (/)
                const relativePath = path.relative('.', fullPath).replaceAll('\\', '/');
                
                // Adiciona o "./" no começo para garantir compatibilidade com GitHub Pages
                arrayOfFiles.push('./' + relativePath);
            }
        }
    });

    return arrayOfFiles;
}

try {
    console.log(`🔍 Escaneando arquivos em: ${FOLDER_TO_CACHE}...`);
    
    // 1. Pega todos os arquivos
    const allFiles = getAllFiles(FOLDER_TO_CACHE);
    
    // Adiciona a raiz "/" explicitamente se necessário (opcional)
    if(!allFiles.includes('./')) allFiles.unshift('./');

    console.log(`✅ Encontrados ${allFiles.length} arquivos.`);

    // 2. Lê o arquivo sw.js atual
    let swContent = fs.readFileSync(SW_FILE_PATH, 'utf-8');

    // 3. Regex para encontrar a variável STATIC_ASSETS = [...]
    // Procura por: const STATIC_ASSETS = [ ... ]; (aceita quebras de linha)
    const regexArray = /const STATIC_ASSETS = \[[\s\S]*?\];/;

    if (!regexArray.test(swContent)) {
        throw new Error("❌ Não encontrei 'const STATIC_ASSETS = [...]' no seu sw.js. Verifique o nome da variável.");
    }

    // 4. Cria a nova string do array formatada bonitinha
    const newArrayString = `const STATIC_ASSETS = [\n    "${allFiles.join('",\n    "')}"\n];`;

    // 5. Substitui no conteúdo
    let newSwContent = swContent.replace(regexArray, newArrayString);

    const regexVersion = /const\s+CACHE_NAME\s*=\s*"(.*?)";/;
    const newVersionString = `const CACHE_NAME = "kanalingo_v${Date.now()}";`;
    newSwContent = newSwContent.replace(regexVersion, newVersionString);

    // 6. Salva o arquivo
    fs.writeFileSync(SW_FILE_PATH, newSwContent, 'utf-8');

    fs.writeFileSync(VERSION_FILE_PATH, `{"version": "${Date.now}"}`, 'utf-8');

    console.log(`🎉 Sucesso! O arquivo ${SW_FILE_PATH} foi atualizado.`);

} catch (error) {
    console.error("❌ Erro:", error.message);
}