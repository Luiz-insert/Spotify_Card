# 🧙🏻‍♂️ Spotify Card

Um crachá musical gerado a partir da sua conta do Spotify, no formato de um crachá de verdade (proporção ID-1, a mesma do cartão de crédito).

**No ar:** <https://spotify-card-livid.vercel.app>

- **Frente:** foto de perfil, nome, e-mail, **QR code** (abre o perfil pela câmera do celular) e **Spotify Code** (lido pelo app do Spotify).
- **Verso:** **top 10 músicas** com capa do álbum, alternando entre os períodos **~4 semanas**, **~6 meses** e **~1 ano**.
- **Compartilhar:** gera uma imagem PNG do lado visível do cartão. No celular abre o menu de compartilhar; no computador baixa o arquivo. O e-mail não vai para a imagem.
- O cartão vira em 3D entre os lados e se ajusta ao tamanho da tela.

O login usa o fluxo **Authorization Code + PKCE**, recomendado pelo Spotify para apps que rodam no navegador. Nenhum `client_secret` fica no código.

## Configuração (uma vez)

1. Acesse o [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) e abra (ou crie) seu app.
2. Em **Settings → Redirect URIs**, adicione os endereços onde o cartão vai rodar, exatamente assim (com a barra no final):
   - `http://127.0.0.1:3000/` (local)
   - `https://spotify-card-livid.vercel.app/` (produção)

   > O Spotify não aceita `localhost`, só o IP `127.0.0.1` ou um endereço HTTPS.
3. Marque **Web API** em *APIs used*.
4. Se o app estiver em *Development mode*, adicione em **User Management** o e-mail de cada conta que vai usar o cartão. Só essas contas conseguem entrar.
5. Copie o **Client ID** para a constante `CLIENT_ID` em [index.js](index.js).

## Rodando localmente

Requer [Node.js](https://nodejs.org/) (sem dependências extras):

```bash
cd backend
npm start
```

Abra **<http://127.0.0.1:3000/>** e clique em **Entrar com Spotify**.

## Deploy (Vercel)

O site é 100% estático: a Vercel publica a pasta como está (`backend/` fica de fora pelo `.vercelignore`).

```bash
vercel --prod
```

O projeto também está conectado ao GitHub: cada push na `master` gera um deploy automático.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Tela de login, os dois lados do cartão e os botões abaixo dele |
| `index.js` | Login (PKCE), renovação do token, chamadas à API, top 10 por período, QR code / Spotify Code |
| `main.js` | Vira o cartão entre os lados e o encolhe para caber na tela |
| `share.js` | Gera a imagem (PNG) do lado visível e compartilha / baixa |
| `lado1.css` | Estilos comuns, tela de login e lado 1 (perfil) |
| `lado2.css` | Lado 2 (top 10) |
| `placeholder.svg` | Avatar usado quando a conta não tem foto |
| `vendor/qrcode.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT), gera o QR code do perfil |
| `vendor/html-to-image.js` | [html-to-image](https://github.com/bubkoo/html-to-image) 1.11.13 (MIT), transforma o cartão em imagem |
| `vercel.json` | Cabeçalhos de segurança do site publicado |
| `backend/server.js` | Servidor estático local (só para desenvolvimento) |

O Spotify Code é a imagem gerada pelo próprio Spotify em `scannables.scdn.co`. A página também carrega o script do Coddara Analytics para contar visitas.
