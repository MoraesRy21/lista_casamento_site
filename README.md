# Lista de Casamento — Guia de instalação

Este projeto foi preparado para funcionar como uma lista de casamento simples, hospedada no **GitHub Pages**, com as reservas compartilhadas por meio de **Google Sheets + Google Apps Script**.

## Arquivos

- `index.html` — site da lista de casamento.
- `Code.gs` — backend para Google Apps Script.
- `images/` — fotos dos presentes e QR Code do Pix.
- `README.md` — este guia.

## Como funciona

`Convidado → GitHub Pages (index.html) → Google Apps Script → Google Sheets`

O site **reserva** presentes; ele não processa pagamentos. O convidado escolhe um item, informa nome e e-mail e confirma. Em seguida, o site mostra o próximo passo: comprar o presente e entregar ao casal, ou enviar o valor sugerido via Pix.

A planilha tem duas abas:

- **`Catalogo`** — os presentes (`id`, `nome`, `categoria`, `preco`, `quantidade`, `emoji`, `ativo`). É a única fonte de verdade da lista publicada.
- **`Presentes`** — uma linha por reserva, com os dados do convidado.

## 1. Testar localmente

Abra `index.html` no navegador.

Enquanto nenhuma URL do Apps Script estiver configurada, o site funciona em **modo demonstração**: usa a lista `DEMO_ITEMS` do próprio `index.html` e salva as reservas apenas no navegador (`localStorage`).

Isso permite validar o visual e o fluxo antes de configurar o backend.

## 2. Criar a planilha no Google Sheets

1. Crie uma nova planilha no Google Sheets, por exemplo `Lista de Casamento`.
2. Na planilha, abra **Extensões → Apps Script**. O script precisa ser criado por esse caminho, pois ele usa a planilha à qual está vinculado.
3. Apague o conteúdo inicial do editor, cole todo o conteúdo de `Code.gs` e salve.
4. Recarregue a planilha. Aparecerá o menu **Lista de Casamento**.
5. Clique em **Lista de Casamento → Configurar planilha** e autorize o script quando o Google solicitar. As abas `Catalogo` e `Presentes` serão criadas.

Mantenha a planilha **privada** (não compartilhe por link): ela contém nome, e-mail e mensagem dos convidados.

## 3. Definir o código do convite (recomendado)

Sem um código, qualquer pessoa que descubra o endereço do site consegue reservar presentes.

1. Na planilha, clique em **Lista de Casamento → Gerar código do convite**.
2. Anote o código exibido.
3. Envie aos convidados o link do site terminado em `#c=CODIGO`, por exemplo:
   `https://seu-usuario.github.io/lista-casamento/#c=1a2b3c4d5e6f`

O código fica guardado nas Propriedades do Script, não no código-fonte, então o repositório pode ser público. Quem abrir o site sem o código no link verá um campo para digitá-lo ao reservar.

Para consultar, trocar ou remover o código, use o mesmo menu. Gerar um novo código invalida os links já enviados.

## 4. Publicar o Apps Script

No editor do Apps Script:

1. Clique em **Implantar → Nova implantação**.
2. Escolha o tipo **Aplicativo da Web**.
3. Em **Executar como**, selecione **Eu**.
4. Em **Quem pode acessar**, selecione **Qualquer pessoa**.
5. Conclua a implantação e copie a URL terminada em `/exec`.

## 5. Conectar o site ao Google Sheets

No bloco `CONFIG` do `index.html`, cole a URL em `appsScriptUrl`:

`appsScriptUrl: "https://script.google.com/macros/s/.../exec"`

O site só aceita URLs nesse formato. Com ela configurada, o indicador no topo passa a mostrar **Lista sincronizada**.

## 6. Personalizar

### Textos, Pix e aparência — `index.html`

No bloco `CONFIG`: `coupleNames`, `weddingDate`, `babyName`, `babyMonth`, `introMessage`, `pixTitle`, `pixMessage`, `pixKey`, `pixQrImage`, `nextStepMessage` e `appsScriptUrl`.

`nextStepMessage` é o texto exibido depois da reserva; `{valor}` é substituído pelo valor sugerido do presente.

### Presentes — aba `Catalogo` da planilha

Edite direto na planilha; o site reflete a mudança ao recarregar, sem novo deploy.

- **`id`** — número inteiro único. **Nunca reutilize nem altere o id de um item que já tem reservas**: as reservas são ligadas a ele. Para novos itens, use o próximo número livre.
- **`quantidade`** — total de cotas do item.
- **`preco`** — valor sugerido (deixe `0` para não exibir).
- **`ativo`** — escreva `não` para ocultar um item sem apagá-lo.

### Fotos dos presentes

Coloque as fotos na pasta `images`. O site procura a foto pelo nome do presente e, se não encontrar, mostra o emoji.

Formatos tentados, nesta ordem: `.webp`, `.jpg`, `.jpeg`, `.png`.

- `Air fryer` → `images/air-fryer.webp`
- `Carrinho de bebê` → `images/carrinho-de-bebe.webp`
- `Babá eletrônica` → `images/baba-eletronica.webp`

Recomendação: WebP quadrado, entre 600×600 e 1000×1000 px.

## 7. Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `lista-casamento`.
2. Adicione `index.html` e a pasta `images`.
3. Faça commit e push.
4. No GitHub, abra **Settings → Pages**, selecione a publicação a partir de uma branch (normalmente `main`, pasta `/`) e salve.
5. Aguarde o GitHub disponibilizar a URL pública do site.

## 8. Teste antes de enviar aos convidados

1. Abra o link com `#c=CODIGO` e reserve um presente com dados de teste.
2. Abra o site em um segundo dispositivo e confirme que a disponibilidade diminuiu.
3. Confira se a reserva apareceu na aba `Presentes`.
4. Abra o site **sem** o código no link e confirme que a reserva pede o código.
5. Teste um item com apenas uma unidade disponível.
6. Confira a chave Pix e o QR Code.
7. Apague da aba `Presentes` as linhas de teste.

## Dia a dia

- **Cancelar uma reserva**: apague a linha correspondente na aba `Presentes`. O item volta a ficar disponível.
- **Alterar presentes**: edite a aba `Catalogo`.
- **Alterar textos ou visual**: edite `index.html`, faça commit e push.
- **Alterar o `Code.gs`**: depois de salvar, abra **Implantar → Gerenciar implantações → Editar → Versão: Nova versão**. Sem isso, a URL `/exec` continua executando a versão antiga. A URL não muda.

## Segurança

O que o projeto já faz:

- O site recebe apenas o catálogo e os totais reservados. Nome, e-mail e mensagem dos convidados nunca saem da planilha.
- Toda validação é feita no servidor: item, quantidade, disponibilidade, e-mail e tamanho dos campos. O nome do item gravado vem sempre do catálogo.
- Reservas simultâneas são serializadas com um lock, então a última unidade não é reservada duas vezes.
- Textos dos convidados não são interpretados como fórmulas na planilha.
- Limites contra abuso: código do convite, 6 reservas por e-mail, 40 reservas por hora no total e um campo-isca contra robôs. Os dois limites numéricos são constantes no início do `Code.gs`.
- O site tem uma Content Security Policy que só permite conexões com o Google Apps Script.

Limites que continuam existindo:

- O código do convite é compartilhado por todos os convidados. Ele bloqueia desconhecidos e robôs, mas não impede um convidado de reservar em nome de outra pessoa. Se notar algo estranho, apague as linhas e gere um novo código.
- Sem o código do convite, os limites por e-mail e por hora só reduzem a velocidade de um abuso; não o impedem.

## Checklist de publicação

- [ ] Nome dos noivos e textos revisados
- [ ] Aba `Catalogo` revisada (itens, quantidades, valores)
- [ ] Chave Pix e QR Code corretos
- [ ] Planilha privada
- [ ] Código do convite gerado
- [ ] Apps Script implantado e `appsScriptUrl` configurada
- [ ] Reserva testada em dois dispositivos
- [ ] Linhas de teste apagadas da aba `Presentes`
- [ ] GitHub Pages publicado e testado no celular
