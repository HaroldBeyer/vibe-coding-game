/** Balanceamento do jogo. Porcentagens: 0–100; tempo: segundos; distâncias: pixels; velocidades: px/s.
 * Salve para aplicar via Vite. Uma mudança reinicia a partida; produção exige novo build.
 */
export const config = {
    // População inicial e distância mínima dos zumbis ao jogador.
    population: {
        zombies: 10,
        civilians: 80,
        zombieSafeRadius: 300
    },
    // Vida, movimento, proteção após dano e ponto inicial do jogador.
    player: {
        health: 100,
        walkSpeed: 105,
        runSpeed: 175,
        invulnerability: 1.1,
        spawn: {
            x: 1230,
            y: 900
        }
    },
    // Capacidade, consumo/recuperação por segundo e percentual para voltar a correr.
    stamina: {
        max: 100,
        drainPerSecond: 32,
        recoveryPerSecond: 18,
        unlockPercent: 30
    },
    // Arma, dano e chance de crítico. Crítico continua letal, qualquer que seja a vida.
    pistol: {
        magazineSize: 7,
        initialReserve: 0,
        reloadSeconds: 1.15,
        shotInterval: 0.28,
        damage: 1,
        criticalPercent: 5,
        range: 470,
        hitRadius: 13,
        noiseRadius: 340,
        noiseSeconds: 0.45
    },
    // Quantidade de caixas e balas por coleta.
    ammo: {
        boxes: 38,
        roundsPerBox: 7,
        firstBox: {
            x: 1290,
            y: 930
        }
    },
    // Vida, velocidades, percepção, memória, contato e movimentação ociosa.
    zombie: {
        health: 3,
        chaseSpeed: 29,
        wanderSpeed: 12,
        sightRadius: 145,
        walkHearing: 42,
        runHearing: 105,
        civilianHearing: 55,
        memorySeconds: 3,
        contactDamage: 20,
        arrivalRadius: 12,
        wanderTurnMin: 2,
        wanderTurnMax: 5,
        obstacleTurnSeconds: 0.5
    },
    // Vida, fuga e percepção dos civis. initialPositions pode ser [] para sortear todos.
    civilian: {
        health: 100,
        speedMin: 24,
        speedMax: 40,
        firstSpeed: 22,
        invulnerability: 1.1,
        sightRadius: 230,
        hearingRadius: 55,
        escapeLookahead: 65,
        initialPositions: [
            {
                x: 1470,
                y: 900
            },
            {
                x: 1350,
                y: 900
            }
        ]
    },
    // Chance por NOVO encontro; não por frame. Freeze = parado, flee = corrida aleatória.
    panic: {
        chancePercent: 15,
        freezePercent: 50,
        freezeMin: 2,
        freezeMax: 3.5,
        fleeMin: 1.5,
        fleeMax: 3,
        runSpeed: 90,
        cooldownSeconds: 14,
        newEncounterSeconds: 2,
        obstacleTurnSeconds: 0.5,
        showLabel: true
    },
    // Adesão, coesão, velocidade, duração e renovação do destino de patrulha.
    horde: {
        joinPercent: 45,
        neighborRadius: 220,
        separationRadius: 38,
        cohesionRadius: 65,
        wanderCohesionPercent: 55,
        patrolCohesionPercent: 15,
        patrolSpeed: 23,
        joinIntervalMin: 3,
        joinIntervalMax: 6,
        lifetimeMin: 28,
        lifetimeMax: 44,
        destinationMinDistance: 300,
        destinationSeconds: 18,
        arrivalRadius: 50
    },
    // Mapa e navegação. Dimensões devem ser múltiplas de navigationCell; confira os pontos iniciais.
    world: {
        width: 2400,
        height: 1800,
        navigationCell: 60,
        navigationRefreshSeconds: 0.65,
        blockSpacingX: 480,
        blockSpacingY: 420,
        rubbleCount: 1800
    },
    // Alcance visual, zoom da câmera e raios do escurecimento em pixels da tela.
    vision: {
        radius: 240,
        zoom: 1.5,
        clearScreenRadius: 210,
        darkScreenRadius: 360
    },
    // Intensidade dos tremores e duração dos efeitos visuais.
    feedback: {
        shakeOnDamage: 0.003,
        shakeOnShot: 0.0015,
        shotTrailSeconds: 0.07,
        hitFlashSeconds: 0.12,
        criticalTextSeconds: 0.65
    }
};

// Falhe com mensagem útil em vez de gerar sorteios ou navegação inválidos.
const percentages = [config.stamina.unlockPercent, config.pistol.criticalPercent, config.panic.chancePercent,
    config.panic.freezePercent, config.horde.joinPercent, config.horde.wanderCohesionPercent, config.horde.patrolCohesionPercent];
if (percentages.some(value => !Number.isFinite(value) || value < 0 || value > 100)) throw new Error('config: porcentagens devem estar entre 0 e 100.');
if (config.horde.patrolCohesionPercent >= 50) throw new Error('config: patrolCohesionPercent deve ser menor que 50 para a horda avançar.');
for (const [name, min, max] of [
    ['velocidade civil', config.civilian.speedMin, config.civilian.speedMax],
    ['congelamento', config.panic.freezeMin, config.panic.freezeMax], ['corrida em pânico', config.panic.fleeMin, config.panic.fleeMax],
    ['rumo ocioso', config.zombie.wanderTurnMin, config.zombie.wanderTurnMax], ['adesão à horda', config.horde.joinIntervalMin, config.horde.joinIntervalMax],
    ['duração da horda', config.horde.lifetimeMin, config.horde.lifetimeMax],
] as const) if (min < 0 || max < min) throw new Error(`config: intervalo inválido: ${name}.`);
for (const value of [config.population.zombies, config.population.civilians, config.ammo.boxes, config.ammo.roundsPerBox, config.world.rubbleCount, config.pistol.initialReserve])
    if (!Number.isInteger(value) || value < 0) throw new Error('config: quantidades devem ser inteiros não negativos.');
if (config.world.navigationCell <= 0 || config.world.width % config.world.navigationCell || config.world.height % config.world.navigationCell ||
    config.world.blockSpacingX <= 0 || config.world.blockSpacingY <= 0 || config.pistol.magazineSize <= 0 || config.pistol.reloadSeconds <= 0 || config.stamina.max <= 0)
    throw new Error('config: confira dimensões, grade, espaçamento, carregador e stamina.');
function checkNumbers(object: object, path = 'config') {
    for (const [key, value] of Object.entries(object)) {
        if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) throw new Error(`${path}.${key}: use um número finito não negativo.`);
        if (typeof value === 'object' && value !== null) checkNumbers(value, `${path}.${key}`);
    }
}
checkNumbers(config);
if (![config.world.width, config.world.height, config.player.health, config.civilian.health, config.zombie.health, config.vision.zoom].every(value => value > 0) ||
    config.vision.darkScreenRadius <= config.vision.clearScreenRadius || !Number.isInteger(config.pistol.magazineSize))
    throw new Error('config: vida, dimensões e zoom devem ser positivos; raio escuro deve superar o claro; carregador deve ser inteiro.');
