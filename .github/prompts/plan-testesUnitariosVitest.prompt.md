## Plan: Testes Unitários com Vitest para Funções Utilitárias

O objetivo é implementar testes unitários para as funções `defaultObj`, `orderArray`, `shuffleArray`, `isValidEmail`, `getSumFromValues` e `sleep` do [src/scripts/utils.js](src/scripts/utils.js), utilizando o Vitest. Os testes ficarão na pasta [tests](tests), localizada na raiz do projeto.

**Steps**
1. **Adicionar Vitest ao Projeto**
   - Instalar Vitest como dependência de desenvolvimento no [package.json](package.json).
   - Adicionar script de teste: `"test": "vitest"`.

2. **Configurar Vitest**
   - Criar (se necessário) arquivo de configuração [vitest.config.js](vitest.config.js) na raiz, ajustando paths para suportar importação dos módulos JS.

3. **Criar Arquivo de Testes**
   - Criar [tests/unit/utils.test.js](tests/unit/utils.test.js) para agrupar todos os testes das funções utilitárias.

4. **Importar Funções**
   - Importar as funções do [src/scripts/utils.js](src/scripts/utils.js) no arquivo de testes.

5. **Escrever Testes Unitários**
   - **defaultObj**: testar valores padrão, acesso a propriedades inexistentes, uso de função construtora.
   - **orderArray**: testar ordenação de arrays numéricos, vazios, negativos, repetidos.
   - **shuffleArray**: testar embaralhamento (mesmos elementos, ordem diferente), arrays vazios e unitários.
   - **isValidEmail**: testar e-mails válidos e inválidos.
   - **getSumFromValues**: testar objetos com valores numéricos, vazios, negativos, mistos.
   - **sleep**: testar se retorna Promise e respeita tempo de espera (usar timers do Vitest).

6. **Cobrir Casos Limite**
   - Incluir testes para entradas inesperadas (undefined, null, tipos errados).

7. **Executar Testes**
   - Rodar `npm test` ou `npx vitest` para validar os testes.

**Verification**
- Executar os testes com Vitest e garantir que todos passam.
- Validar cobertura dos cenários descritos.
- Conferir que o arquivo [tests/unit/utils.test.js](tests/unit/utils.test.js) cobre todas as funções e casos relevantes.

**Decisions**
- Framework: Vitest, conforme solicitado.
- Localização dos testes: pasta [tests](tests) na raiz do projeto.
- Estrutura: um arquivo de teste agrupando todas as funções utilitárias.

Se desejar dividir os testes em arquivos separados ou adicionar mais funções, basta informar antes da execução.
