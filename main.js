// Vira o cartão entre o lado 1 (perfil) e o lado 2 (top 10).
const badge = document.getElementById('badge');
const show_side1 = document.getElementById('container_side1');
const show_side2 = document.getElementById('container_side2');

function flip(toBack) {
    badge.classList.toggle('flipped', toBack);
    // "inert" impede foco/clique no lado que está virado para trás.
    show_side1.inert = toBack;
    show_side2.inert = !toBack;
    (toBack ? document.getElementById('replace_side2') : document.getElementById('replace_side1')).focus();
}

// Diminui o crachá inteiro por igual quando ele não cabe na tela, mantendo a
// proporção ID-1 e o layout interno intactos. Usa transform: scale (funciona igual
// em todo navegador, ao contrário de "zoom") e margens negativas para que o espaço
// ocupado na página encolha junto com o desenho.
const BADGE_WIDTH = 380;
const BADGE_HEIGHT = BADGE_WIDTH * 85.6 / 53.98;
const PAGE_MARGIN = 32 + 6; // padding da página + sombra do cartão
const SHARE_AREA = 60; // botão de compartilhar abaixo do cartão + espaçamento

function fitBadge() {
    const scale = Math.min(
        1,
        (window.innerWidth - PAGE_MARGIN) / BADGE_WIDTH,
        (window.innerHeight - PAGE_MARGIN - SHARE_AREA) / BADGE_HEIGHT,
    );
    const shrink = scale < 1;
    badge.style.transform = shrink ? `scale(${scale})` : '';
    badge.style.transformOrigin = 'top left';
    badge.style.marginRight = shrink ? `${BADGE_WIDTH * (scale - 1)}px` : '';
    badge.style.marginBottom = shrink ? `${BADGE_HEIGHT * (scale - 1)}px` : '';
}
window.addEventListener('resize', fitBadge);
fitBadge();

document.getElementById('replace_side1').addEventListener('click', () => flip(true));
document.getElementById('replace_side2').addEventListener('click', () => flip(false));
