(() => {
  const CX = 200, CY = 200, R = 190;
  const N = CATEGORIES.length;
  const SEG = 360 / N;
  const CLIP_START = 30;    // segundo donde empieza el fragmento
  const CLIP_LENGTH = 20000; // ms que suena antes de auto-pausar

  const svg = document.getElementById('wheel');
  const hub = document.getElementById('btnSpin');
  const hubLabel = document.getElementById('hubLabel');
  const resultCard = document.getElementById('resultCard');
  const resultBadge = document.getElementById('resultBadge');
  const resultPrompt = document.getElementById('resultPrompt');
  const playerCard = document.getElementById('playerCard');
  const playerStatus = document.getElementById('playerStatus');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnReplay = document.getElementById('btnReplay');
  const btnReveal = document.getElementById('btnReveal');
  const answerBox = document.getElementById('answerBox');
  const btnNewSong = document.getElementById('btnNewSong');
  const btnVideoToggle = document.getElementById('btnVideoToggle');
  const apiWarning = document.getElementById('apiWarning');

  let currentRotation = 0;
  let spinning = false;
  let usedSongs = new Set();
  let currentSong = null;
  let player = null;
  let ytApiReady = false;
  let pauseTimer = null;
  let loadSafetyTimer = null;

  // ---------- Comprobación de API key ----------
  if (!YT_API_KEY || YT_API_KEY === "TU_API_KEY_AQUI") {
    apiWarning.classList.remove('hidden');
  }

  // ---------- Dibujar ruleta ----------
  function polar(angleDeg, r) {
    const a = (angleDeg - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  }

  function buildWheel() {
    svg.innerHTML = '';
    CATEGORIES.forEach((cat, i) => {
      const start = i * SEG;
      const end = start + SEG;
      const p1 = polar(start, R);
      const p2 = polar(end, R);
      const large = SEG > 180 ? 1 : 0;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} Z`);
      path.setAttribute('fill', cat.color);
      svg.appendChild(path);
    });

    // Líneas divisorias dibujadas una sola vez (evita el artefacto de costuras dobles en Firefox móvil)
    CATEGORIES.forEach((cat, i) => {
      const p = polar(i * SEG, R);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', CX); line.setAttribute('y1', CY);
      line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
      line.setAttribute('stroke', '#0D0B14');
      line.setAttribute('stroke-width', '2');
      svg.appendChild(line);
    });

    CATEGORIES.forEach((cat, i) => {
      const start = i * SEG;
      const mid = start + SEG / 2;
      const lines = cat.label.split('\n');
      const textR = R * 0.62;
      const tp = polar(mid, textR);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', tp.x);
      text.setAttribute('y', tp.y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#12101B');
      text.setAttribute('font-family', "'Bebas Neue', sans-serif");
      text.setAttribute('font-size', '17');
      text.setAttribute('transform', `rotate(${mid}, ${tp.x}, ${tp.y})`);
      lines.forEach((line, li) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', tp.x);
        tspan.setAttribute('dy', li === 0 ? `${-(lines.length - 1) * 9}` : '18');
        tspan.textContent = line;
        text.appendChild(tspan);
      });
      svg.appendChild(text);
    });
  }
  buildWheel();

  // ---------- Girar ----------
  function spin() {
    if (spinning) return;
    spinning = true;
    if (player && player.stopVideo) player.stopVideo();
    clearTimeout(pauseTimer);
    clearTimeout(loadSafetyTimer);
    hub.disabled = true;
    resultCard.classList.add('hidden');
    playerCard.classList.add('hidden');
    btnNewSong.classList.add('hidden');
    answerBox.classList.add('hidden');
    hubLabel.textContent = '...';

    const idx = Math.floor(Math.random() * N);
    const segCenter = idx * SEG + SEG / 2;
    const jitter = (Math.random() - 0.5) * (SEG * 0.6);
    const desiredMod = ((360 - (segCenter + jitter)) % 360 + 360) % 360;
    const extraSpins = 5 + Math.floor(Math.random() * 2);
    const currentMod = ((currentRotation % 360) + 360) % 360;
    const delta = ((desiredMod - currentMod) + 360) % 360;
    currentRotation = currentRotation + extraSpins * 360 + delta;

    svg.style.transform = `rotate(${currentRotation}deg) translateZ(0)`;

    const onEnd = () => {
      svg.removeEventListener('transitionend', onEnd);
      spinning = false;
      hub.disabled = false;
      hubLabel.textContent = 'GIRAR';
      showResult(CATEGORIES[idx]);
    };
    svg.addEventListener('transitionend', onEnd);
  }

  function showResult(cat) {
    resultBadge.textContent = cat.label.replace(/\n/g, ' ');
    resultBadge.style.background = cat.color;
    resultBadge.style.color = '#12101B';
    resultPrompt.textContent = cat.prompt;
    resultCard.classList.remove('hidden');
    startRound();
  }

  // ---------- Ronda: buscar canción ----------
  function pickSong() {
    if (usedSongs.size >= SONGS.length) usedSongs.clear();
    let song, tries = 0;
    do {
      song = SONGS[Math.floor(Math.random() * SONGS.length)];
      tries++;
    } while (usedSongs.has(song.t + song.a) && tries < 50);
    usedSongs.add(song.t + song.a);
    return song;
  }

  async function startRound() {
    playerCard.classList.remove('hidden');
    playerStatus.textContent = 'Buscando canción…';
    btnPlayPause.disabled = true;
    btnReplay.disabled = true;
    btnReveal.disabled = true;
    answerBox.classList.add('hidden');
    btnPlayPause.textContent = '▶️ Reproducir';

    currentSong = pickSong();

    if (!YT_API_KEY || YT_API_KEY === "TU_API_KEY_AQUI") {
      playerStatus.textContent = 'Configura tu API key en config.js para buscar el audio.';
      return;
    }

    try {
      const q = `${currentSong.a} ${currentSong.t} audio`;
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(q)}&key=${YT_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const videoId = data?.items?.[0]?.id?.videoId;
      if (!videoId) {
        playerStatus.textContent = 'No se encontró vídeo. Prueba con "Nueva canción".';
        btnNewSong.classList.remove('hidden');
        return;
      }
      cueVideo(videoId);
    } catch (e) {
      playerStatus.textContent = 'Error buscando la canción. Revisa tu conexión o la API key.';
      btnNewSong.classList.remove('hidden');
    }
  }

  function cueVideo(videoId) {
    if (!ytApiReady) {
      playerStatus.textContent = 'Cargando reproductor…';
      setTimeout(() => cueVideo(videoId), 400);
      return;
    }
    // Bloqueamos los controles hasta que el vídeo esté listo. Timeout de seguridad por si YouTube
    // no dispara ningún evento (para que nunca se quede colgado en "Cargando...").
    btnPlayPause.disabled = true;
    btnReplay.disabled = true;
    playerStatus.textContent = 'Cargando canción…';
    clearTimeout(loadSafetyTimer);
    loadSafetyTimer = setTimeout(() => { if (btnPlayPause.disabled) onCued(); }, 4000);

    if (!player) {
      player = new YT.Player('ytPlayer', {
        height: '72', width: '96',
        videoId,
        playerVars: { start: CLIP_START, controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, playsinline: 1 },
        events: { onReady: onCued, onStateChange: onStateChange, onError: onPlayerError }
      });
    } else {
      player.cueVideoById({ videoId, startSeconds: CLIP_START });
      onCued();
    }
  }

  function onCued() {
    clearTimeout(loadSafetyTimer);
    playerStatus.textContent = 'Canción lista. Dale al play 🎧';
    btnPlayPause.disabled = false;
    btnReplay.disabled = false;
    btnReveal.disabled = false;
    btnNewSong.classList.remove('hidden');
  }

  function onPlayerError() {
    clearTimeout(loadSafetyTimer);
    playerStatus.textContent = 'Este vídeo falló. Prueba "Nueva canción".';
    btnNewSong.classList.remove('hidden');
  }

  function onStateChange(e) {
    if (e.data === YT.PlayerState.PLAYING) {
      btnPlayPause.textContent = '⏸️ Pausa';
      playerStatus.textContent = 'Reproduciendo… 🎧';
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => { if (player) player.pauseVideo(); }, CLIP_LENGTH);
    }
    if (e.data === YT.PlayerState.PAUSED) {
      btnPlayPause.textContent = '▶️ Reproducir';
      playerStatus.textContent = 'En pausa. Dale al play cuando quieras.';
      clearTimeout(pauseTimer);
    }
  }

  window.onYouTubeIframeAPIReady = () => { ytApiReady = true; };

  // ---------- Controles ----------
  hub.addEventListener('click', spin);

  btnPlayPause.addEventListener('click', () => {
    if (!player) return;
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  });

  btnReplay.addEventListener('click', () => {
    if (!player) return;
    player.seekTo(CLIP_START, true);
    player.playVideo();
  });

  btnReveal.addEventListener('click', () => {
    if (!currentSong) return;
    answerBox.innerHTML = `<b>${currentSong.t}</b><br>${currentSong.a} · ${currentSong.y} · ${currentSong.g ? 'Grupo' : 'Solista'}`;
    answerBox.classList.remove('hidden');
  });

  btnNewSong.addEventListener('click', startRound);

  btnVideoToggle.addEventListener('click', () => {
    playerCard.classList.toggle('showVideo');
  });

})();
