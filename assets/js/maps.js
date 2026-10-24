const modal = document.getElementById('map-modal');
const modalTitle = document.getElementById('map-modal-title');
const modalModes = document.getElementById('map-modal-modes');
let mousedownOnBackdrop = false;
let repositionMarkers = null;

function formatDelay(s) {
  if (s === 0) return 'Immediate';
  if (s % 60 === 0) return `${s / 60} min`;
  return `${s}s`;
}

function teamCard(team, tickets, label) {
  if (!team) return '';
  return `
    <div class="mode-team">
      <div class="mode-team-header">
        <img src="/assets/img/flags/${team.icon}.svg" class="mode-team-flag" alt="${team.short}">
        <div>
          <div class="mode-team-name">${team.name}</div>
          <div class="mode-team-short">
            ${team.short}
            ${tickets != null ? `<span class="mode-team-tickets">${tickets} ${label}</span>` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

function groupVehicles(vehicles) {
  const map = new Map();
  for (const v of vehicles) {
    const key = `${v.displayName}|${v.initialSpawnDelay}|${v.respawnDelay}`;
    if (map.has(key)) map.get(key).count++;
    else map.set(key, { ...v, count: 1 });
  }
  return [...map.values()];
}

function vehicleRow(v) {
  const name = v.count > 1 ? `${v.displayName} <span class="vehicle-count">×${v.count}</span>` : v.displayName;
  return `
    <tr>
      <td>${name}</td>
      <td>${formatDelay(v.initialSpawnDelay)}</td>
      <td>${formatDelay(v.respawnDelay)}</td>
    </tr>`;
}

function openModesView(mapKey, displayName, modes, minimap) {
  modalTitle.innerHTML = displayName;
  modalModes.classList.remove('detail-view');
  modalModes.innerHTML = modes.map((mode, i) => `
    <div class="game-mode-card" data-index="${i}">
      <img src="https://cdn.bf3reality.com/minimap/levels/${mapKey}_${mode.version}.png" alt="${mode.fullName}" loading="lazy">
      <div class="game-mode-card-label">${mode.fullName}</div>
    </div>
  `).join('');

  modalModes.querySelectorAll('.game-mode-card').forEach(card => {
    card.addEventListener('click', () => {
      openModeDetail(mapKey, displayName, modes[parseInt(card.dataset.index)], modes, minimap);
    });
  });

  modal.classList.add('active');
}

function openModeDetail(mapKey, displayName, mode, modes, minimap) {
  repositionMarkers = null;

  modalTitle.innerHTML = `
    <button class="map-modal-back" id="map-modal-back">
      <span>&#8592;</span> ${displayName}
    </button>
    <span class="map-modal-subtitle">${mode.fullName}</span>
  `;
  modalModes.classList.add('detail-view');

  const team1Vehicles = (mode.vehicles || []).filter(v => v.team === 1);
  const team2Vehicles = (mode.vehicles || []).filter(v => v.team === 2);

  const vehicleTable = (vehicles, label) => {
    if (!vehicles.length) return '';
    return `
      <div class="mode-vehicles-team">
        <div class="mode-vehicles-label">${label}</div>
        <table class="mode-vehicles-table">
          <thead><tr><th>Vehicle</th><th>Initial</th><th>Respawn</th></tr></thead>
          <tbody>${groupVehicles(vehicles).map(vehicleRow).join('')}</tbody>
        </table>
      </div>`;
  };

  modalModes.innerHTML = `
    <div class="mode-sidebar">
      <div class="mode-teams">
        ${teamCard(mode.team1, mode.tickets1 ?? null, 'tickets')}
        <div class="mode-teams-vs">VS</div>
        ${teamCard(mode.team2, mode.name === 'INS' ? (mode.cacheCount ?? 3) : (mode.tickets2 ?? null), mode.name === 'INS' ? 'caches' : 'tickets')}
      </div>
      ${(team1Vehicles.length || team2Vehicles.length) ? `
      <div class="mode-vehicles">
        <div class="mode-section-title">Vehicles</div>
        <div class="mode-vehicles-grid">
          ${vehicleTable(team1Vehicles, mode.team1 ? mode.team1.short : 'Team 1')}
          ${vehicleTable(team2Vehicles, mode.team2 ? mode.team2.short : 'Team 2')}
        </div>
      </div>` : ''}
    </div>
    <div class="mode-map-panel">
      <div class="zoom-hint">Scroll to zoom &nbsp;·&nbsp; Drag to pan &nbsp;·&nbsp; Double-click to reset</div>
      <div class="zoom-container" id="zoom-container">
        <div class="zoom-inner" id="zoom-inner">
          <img id="zoom-image" src="https://cdn.bf3reality.com/minimap/levels/${mapKey}_${mode.version}.png" alt="${mode.fullName}" draggable="false">
        </div>
        <svg class="spawn-overlay" id="spawn-overlay"></svg>
      </div>
    </div>
  `;

  document.getElementById('map-modal-back').addEventListener('click', () => {
    openModesView(mapKey, displayName, modes, minimap);
  });

  const container = document.getElementById('zoom-container');
  const inner = document.getElementById('zoom-inner');
  const img = document.getElementById('zoom-image');
  initZoomPan(container, inner, img);

  const effectiveMinimap = mode.minimapCx != null
    ? { cx: mode.minimapCx, cz: mode.minimapCz, width: mode.minimapWidth }
    : minimap;

  if (effectiveMinimap) {
    const doRender = () => renderSpawnMarkers(mode, effectiveMinimap, container, img);
    img.addEventListener('load', doRender, { once: true });
    if (img.complete) doRender();
  }
}

function renderSpawnMarkers(mode, minimap, container, img) {
  const svg = document.getElementById('spawn-overlay');
  if (!svg) return;

  const T1_COLOR = '#5aabff';
  const T2_COLOR = '#ff6b4a';

  const worldToUV = (x, z) => [
    0.5 - (x - minimap.cx) / minimap.width,
    0.5 - (z - minimap.cz) / minimap.width
  ];

  const neutralUVs = (mode.boundariesN || []).map(p => worldToUV(p[0], p[1]));

  const boundaries = [
    { uvs: (mode.boundaries1 || []).map(p => worldToUV(p[0], p[1])), color: T1_COLOR },
    { uvs: (mode.boundaries2 || []).map(p => worldToUV(p[0], p[1])), color: T2_COLOR }
  ].filter(b => b.uvs.length > 0);

  const spawnPoints = [
    ...(mode.spawnPoints1 || []).filter(sp => sp.x !== undefined).map(sp => ({ uv: worldToUV(sp.x, sp.z), color: T1_COLOR, name: sp.name })),
    ...(mode.spawnPoints2 || []).filter(sp => sp.x !== undefined).map(sp => ({ uv: worldToUV(sp.x, sp.z), color: T2_COLOR, name: sp.name }))
  ];

  const maskId = 'oob-mask-' + Date.now();
  const hasBoundaries = neutralUVs.length > 0 || boundaries.length > 0;

  svg.innerHTML =
    (hasBoundaries ? `<defs><mask id="${maskId}">
      <rect x="-9999" y="-9999" width="19999" height="19999" fill="white"/>
      ${neutralUVs.length ? `<polygon class="mask-neutral" fill="black" points=""/>` : ''}
      ${boundaries.map((_, i) => `<polygon class="mask-team-${i}" fill="black" points=""/>`).join('')}
    </mask></defs>` : '') +
    (hasBoundaries ? `<rect class="oob-rect" fill="black" fill-opacity="0.72" mask="url(#${maskId})"/>` : '') +
    (neutralUVs.length ? `<polygon class="neutral-outline" fill="none" stroke="white" stroke-width="1.5" stroke-opacity="0.35" stroke-linejoin="round" points=""/>` : '') +
    boundaries.map(b =>
      `<polygon class="team-boundary" fill="${b.color}" fill-opacity="0.06" stroke="${b.color}" stroke-width="1.5" stroke-opacity="0.55" stroke-linejoin="round" points=""/>`
    ).join('') +
    spawnPoints.map(sp => {
      const escaped = sp.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      return `<circle r="4" fill="${sp.color}" stroke="white" stroke-width="1" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))"><title>${escaped}</title></circle>`;
    }).join('');

  const oobRect      = svg.querySelector('.oob-rect');
  const maskNeutral  = svg.querySelector('.mask-neutral');
  const maskTeams    = boundaries.map((_, i) => svg.querySelector(`.mask-team-${i}`));
  const neutralOutline = svg.querySelector('.neutral-outline');
  const polys        = [...svg.querySelectorAll('.team-boundary')];
  const circles      = [...svg.querySelectorAll('circle')];

  repositionMarkers = function() {
    const cr = container.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    const iL = ir.left - cr.left;
    const iT = ir.top  - cr.top;
    const iW = ir.width;
    const iH = ir.height;

    const toScreen = ([u, v]) =>
      `${(iL + u * iW).toFixed(1)},${(iT + v * iH).toFixed(1)}`;

    if (oobRect) {
      const rx = Math.floor(iL);
      const ry = Math.floor(iT);
      oobRect.setAttribute('x', rx);
      oobRect.setAttribute('y', ry);
      oobRect.setAttribute('width',  Math.ceil(iL + iW) - rx);
      oobRect.setAttribute('height', Math.ceil(iT + iH) - ry);
    }

    const neutralPts = neutralUVs.map(toScreen).join(' ');
    if (maskNeutral)   maskNeutral.setAttribute('points', neutralPts);
    if (neutralOutline) neutralOutline.setAttribute('points', neutralPts);
    maskTeams.forEach((el, i) => el && el.setAttribute('points', boundaries[i].uvs.map(toScreen).join(' ')));
    polys.forEach((p, i) => p.setAttribute('points', boundaries[i].uvs.map(toScreen).join(' ')));
    spawnPoints.forEach((sp, i) => {
      const [cx, cy] = toScreen(sp.uv).split(',');
      circles[i].setAttribute('cx', cx);
      circles[i].setAttribute('cy', cy);
    });
  };

  repositionMarkers();
}

function initZoomPan(container, inner, img) {
  img.style.maxWidth  = container.clientWidth  + 'px';
  img.style.maxHeight = container.clientHeight + 'px';

  let scale = 1, tx = 0, ty = 0;
  let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;
  let rafId = null;
  const MIN_SCALE = 1, MAX_SCALE = 6;

  function applyTransform(animated = false) {
    inner.style.transition = animated ? 'transform 0.2s ease-out' : 'none';
    inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    if (repositionMarkers) repositionMarkers();
  }

  function clampTranslate(newTx, newTy, s) {
    const maxX = Math.max(0, (img.offsetWidth * s - container.offsetWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * s - container.offsetHeight) / 2);
    return [
      Math.min(maxX, Math.max(-maxX, newTx)),
      Math.min(maxY, Math.max(-maxY, newTy))
    ];
  }

  function reset() {
    scale = 1; tx = 0; ty = 0;
    applyTransform(true);
    container.style.cursor = 'default';
  }

  container.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left - rect.width / 2;
    const cursorY = e.clientY - rect.top - rect.height / 2;
    const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta));
    const ratio = newScale / scale;
    scale = newScale;
    [tx, ty] = clampTranslate(cursorX - (cursorX - tx) * ratio, cursorY - (cursorY - ty) * ratio, scale);
    applyTransform();
    container.style.cursor = scale > 1 ? 'grab' : 'default';
  }, { passive: false });

  container.addEventListener('mousedown', e => {
    if (scale === 1) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startTx = tx; startTy = ty;
    container.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      [tx, ty] = clampTranslate(startTx + (e.clientX - startX), startTy + (e.clientY - startY), scale);
      applyTransform();
    });
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    container.style.cursor = scale > 1 ? 'grab' : 'default';
  });

  container.addEventListener('dblclick', reset);
}

document.querySelectorAll('.map-card').forEach(card => {
  card.addEventListener('click', () => {
    const minimap = card.dataset.minimap ? JSON.parse(card.dataset.minimap) : null;
    openModesView(card.dataset.map, card.dataset.display, JSON.parse(card.dataset.modes), minimap);
  });
});

document.getElementById('map-modal-close').addEventListener('click', () => {
  modal.classList.remove('active');
});

modal.addEventListener('mousedown', e => {
  mousedownOnBackdrop = e.target === modal;
});

modal.addEventListener('click', e => {
  if (e.target === modal && mousedownOnBackdrop) modal.classList.remove('active');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') modal.classList.remove('active');
});
