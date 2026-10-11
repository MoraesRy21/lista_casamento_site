# Lista de Casamento — Guia de instalação

Este projeto foi preparado para funcionar como uma lista de casamento simples, hospedada no **GitHub Pages**, com as reservas compartilhadas por meio de **Google Sheets + Google Apps Script**.

## Arquivos

- `index.html` — site da lista de casamento.
- `Code.gs` — backend para Google Apps Script.
- `README.md` — este guia.

## 1. Testar localmente

Abra `index.html` no navegador.

Enquanto nenhuma URL do Apps Script estiver configurada, o site funciona em **modo demonstração** e salva as reservas apenas no navegador (`localStorage`).

Isso permite validar o visual, os presentes e o fluxo antes de configurar o backend.

## 2. Criar a planilha no Google Sheets

1. Crie uma nova planilha no Google Sheets.
2. Dê um nome fácil de identificar, por exemplo: `Lista de Casamento`.
3. Na planilha, abra **Extensões → Apps Script**.
4. Apague o conteúdo inicial do editor.
5. Copie todo o conteúdo do arquivo `Code.gs` deste pacote e cole no editor.
6. Salve o projeto.

O script criará/organizará a estrutura necessária para registrar as reservas.

## 3. Publicar o Apps Script

No editor do Apps Script:

1. Clique em **Implantar → Nova implantação**.
2. Escolha o tipo **Aplicativo da Web**.
3. Configure para executar como o proprietário da planilha.
4. Defina o acesso de forma que os convidados que usarão o site possam chamar o aplicativo.
5. Conclua a implantação.
6. Autorize o script quando o Google solicitar.
7. Copie a URL do aplicativo da Web gerada pela implantação.

> Guarde essa URL. Ela será colocada no `index.html`.

## 4. Conectar o site ao Google Sheets

Abra `index.html` em um editor de código e procure a configuração:

`appsScriptUrl`

Cole nela a URL da implantação do Apps Script.

Exemplo conceitual:

`appsScriptUrl: "URL_DO_APPS_SCRIPT_AQUI"`

Salve o arquivo.

A partir desse momento, o site deixa de depender somente do armazenamento local e pode usar o backend compartilhado para as reservas.

## 5. Personalizar o casamento

No bloco de configuração do `index.html`, revise principalmente:

- nome dos noivos;
- texto de apresentação;
- chave Pix;
- QR Code do Pix;
- presentes;
- categorias;
- quantidades;
- valores sugeridos.

Antes da publicação, substitua todos os dados de demonstração pelos dados reais.

## 6. Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `lista-casamento`.
2. Adicione pelo menos o arquivo `index.html`.
3. Faça commit e push.
4. No GitHub, abra **Settings → Pages**.
5. Em **Build and deployment**, selecione a publicação a partir de uma branch.
6. Escolha a branch usada pelo projeto (normalmente `main`) e a pasta raiz `/`.
7. Salve.
8. Aguarde o GitHub disponibilizar a URL pública do site.

O `index.html` precisa permanecer na raiz publicada.

## 7. Teste antes de enviar aos convidados

Faça um teste em dois navegadores ou dispositivos diferentes:

1. Abra a URL do GitHub Pages.
2. Reserve um presente informando os dados de teste.
3. Abra a página no segundo dispositivo.
4. Atualize a lista.
5. Confirme que a disponibilidade foi reduzida.
6. Confira se a reserva apareceu na planilha.
7. Teste um item com apenas uma unidade disponível.
8. Confira a chave Pix e o QR Code.
9. Depois, exclua da planilha os registros usados apenas para teste.

## 8. Checklist de publicação

- [ ] Nome dos noivos correto
- [ ] Texto inicial revisado
- [ ] Lista de presentes revisada
- [ ] Quantidades revisadas
- [ ] Valores revisados
- [ ] Chave Pix correta
- [ ] QR Code Pix correto
- [ ] Apps Script implantado
- [ ] `appsScriptUrl` configurada
- [ ] Reserva testada em dois dispositivos
- [ ] Registros chegando ao Google Sheets
- [ ] GitHub Pages publicado
- [ ] Teste no celular concluído

## Arquitetura

`Convidado → GitHub Pages (index.html) → Google Apps Script → Google Sheets`

O GitHub Pages hospeda a interface. O Apps Script funciona como uma pequena API. O Google Sheets mantém os registros compartilhados.

## Observação importante

O modo `localStorage` é adequado para demonstração, mas **não sincroniza convidados diferentes**. Para a lista real, publique e configure o Apps Script antes de divulgar o link.

## Manutenção

Para alterar textos, produtos, valores ou configurações visuais, edite `index.html`, faça commit/push no GitHub e aguarde a atualização do GitHub Pages.

Se o código do `Code.gs` for alterado, verifique no Apps Script se é necessário atualizar/criar uma nova implantação e, caso a URL mude, atualize também `appsScriptUrl` no site.


## Personalização rápida — versão 3

No início do JavaScript de `index.html` existe o bloco `CONFIG`. Altere ali:
`coupleNames`, `weddingDate`, `babyName`, `babyMonth`, `introMessage`, `pixTitle`, `pixMessage`, `pixKey`, `pixQrImage` e `appsScriptUrl`.

### Fotos automáticas dos presentes

Crie a pasta `images` ao lado do `index.html`. O site procura automaticamente a foto e, se não encontrar, mantém o ícone original.

Formatos tentados, nesta ordem: `.webp`, `.jpg`, `.jpeg`, `.png`.

O nome é gerado automaticamente a partir do presente:
- `Air fryer` → `images/air-fryer.webp`
- `Jogo de panelas` → `images/jogo-de-panelas.webp`
- `Carrinho de bebê` → `images/carrinho-de-bebe.webp`
- `Babá eletrônica` → `images/baba-eletronica.webp`
- `Cota lua de mel` → `images/cota-lua-de-mel.webp`

Recomendação: WebP quadrado, entre 600×600 e 1000×1000 px.
