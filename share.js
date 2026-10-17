// Compartilhar: gera um PNG do lado do crachá que está visível (perfil ou top 10).
// No celular abre o menu nativo de compartilhar; no computador baixa a imagem.
const SHARE_PIXEL_RATIO = 2;
// Imagem usada no lugar de fotos que não puderem ser lidas (servidor sem CORS).
const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const shareBtn = document.getElementById('shareBtn');
const shareLabel = document.getElementById('shareLabel');

// Arquivo já gerado esperando um novo toque (alguns navegadores só deixam
// compartilhar logo após o clique, e gerar a imagem leva um tempinho).
let readyFile = null;

// Rejeita se a promessa não terminar no prazo (nada pode deixar o botão "carregando" para sempre).
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Tempo esgotado (${ms} ms)`)), ms)),
    ]);
}

const isBackVisible = () => badge.classList.contains('flipped');

function currentSide() {
    return isBackVisible()
        ? { card: show_side2, label: 'Compartilhar top 10', file: 'meu-top-10-spotify.png' }
        : { card: show_side1, label: 'Compartilhar perfil', file: 'meu-cracha-spotify.png' };
}

// Desenha o lado "de frente". Usa uma cópia fora da tela para trocar os botões
// pelo endereço do site sem mexer no cartão que o usuário está vendo.
async function renderSide(card) {
    const stage = document.createElement('div');
    stage.className = 'badge shareStage';
    const clone = card.cloneNode(true);
    clone.removeAttribute('inert');
    // Os ids ficam: o CSS do cartão depende deles. A cópia vem depois do original
    // no documento (getElementById continua achando o original) e dura só a captura.
    // Fora da imagem: setas de período, mensagens e o e-mail (a imagem é pública).
    clone.querySelectorAll('.rangeBtn, .status, .email').forEach((node) => node.remove());

    const footer = document.createElement('p');
    footer.className = 'shareFooter';
    footer.textContent = window.location.host;
    clone.querySelector('.actions').replaceChildren(footer);

    // Imagens "lazy" fora da tela podem nunca carregar (Safari): força o carregamento.
    clone.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });

    stage.append(clone);
    document.body.append(stage);
    try {
        await Promise.all([...clone.querySelectorAll('img')].map((img) => withTimeout(img.decode(), 3000).catch(() => {})));
        return await htmlToImage.toCanvas(clone, {
            pixelRatio: SHARE_PIXEL_RATIO,
            width: BADGE_WIDTH,
            height: BADGE_HEIGHT,
            imagePlaceholder: TRANSPARENT_PIXEL,
        });
    } finally {
        stage.remove();
    }
}

async function buildShareImage({ card, file }) {
    const side = await renderSide(card);

    const scale = SHARE_PIXEL_RATIO;
    const pad = 40 * scale;
    const shadow = 6 * scale;
    const radius = 10 * scale;

    const canvas = document.createElement('canvas');
    canvas.width = side.width + pad * 2 + shadow;
    canvas.height = side.height + pad * 2 + shadow;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f1f1ec';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Sombra dura igual à do cartão na página.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(pad + shadow, pad + shadow, side.width, side.height, radius);
    ctx.fill();
    ctx.drawImage(side, pad, pad);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return new File([blob], file, { type: 'image/png' });
}

function downloadFile(file) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function setShareState(state) {
    shareBtn.classList.toggle('busy', state === 'busy');
    shareBtn.classList.toggle('ready', state === 'ready');
    shareBtn.disabled = state === 'busy';
    shareLabel.textContent = {
        busy: 'Gerando imagem...',
        ready: 'Toque para compartilhar',
    }[state] || currentSide().label;
}

// Retorna false se o navegador bloqueou o compartilhamento por ter demorado demais após o clique.
async function shareFile(file) {
    const data = {
        files: [file],
        title: 'Meu Spotify Card',
        text: `Meu crachá musical 🎧 Monte o seu: ${window.location.origin}`,
    };
    if (!navigator.canShare?.(data)) {
        downloadFile(file);
        return true;
    }
    try {
        await navigator.share(data);
    } catch (err) {
        if (err.name === 'NotAllowedError') return false;
        if (err.name !== 'AbortError') throw err; // AbortError = usuário fechou o menu
    }
    return true;
}

async function onShareClick() {
    try {
        if (readyFile) {
            const file = readyFile;
            readyFile = null;
            setShareState('idle');
            await shareFile(file);
            return;
        }
        setShareState('busy');
        const file = await withTimeout(buildShareImage(currentSide()), 25000);
        if (await shareFile(file)) {
            setShareState('idle');
        } else {
            readyFile = file;
            setShareState('ready');
        }
    } catch (err) {
        console.error(err);
        setShareState('idle');
        alert('Não foi possível gerar a imagem do cartão.');
    }
}

shareBtn.addEventListener('click', onShareClick);

// Quando o cartão vira, o botão passa a compartilhar o outro lado.
new MutationObserver(() => {
    readyFile = null;
    if (!shareBtn.disabled) setShareState('idle');
}).observe(badge, { attributes: true, attributeFilter: ['class'] });
