import {settings,SETTINGS_KEY,validateSettings,writeValue} from './settings-model.ts';
/** Balanceamento do jogo. Porcentagens: 0–100; tempo: segundos; distâncias: pixels; velocidades: px/s.
 * Salve para aplicar via Vite. Uma mudança reinicia a partida; produção exige novo build.
 */
export const config = {
    // Papéis e interações. Quantidades fazem parte do total de civis.
    npc: { soldiers: 9, medics: 4, interactionRadius: 75, socialRadius: 90,
        initialGreetingSeconds: 8, spawnColumns: 4, spawnRows: 4, spawnSeparation: 90,
        socialInterval: 10, socialTalkPercent: 25, alertSeconds: 3,
        healAmount: 30, healRange: 55, healSeekRange: 180, healCooldown: 8, medicalCharges: 5,
        soldierRounds: 14, soldierClip: 7, soldierShotInterval: .8, soldierReloadSeconds: 1.6,
        soldierRange: 250, soldierRetreatRange: 80, ammoGift: 7 },
    tactics: { thinkInterval: .65, allyMemory: 5, civilianGuardRange: 320, civilianGuardDistance: 90,
        squadRange: 260, squadSpacing: 48, squadMaxMembers: 3, medicsPerGroup: 1, escortRange: 320, escortDistance: 65,
        escortCivilianLimit: 5, evacuationTimeout: 45, evacuationCooldown: 35,
        shelterCapacity: 7, rescueSearchSeconds: 8, rescueSearchMinDistance: 300, rescueSearchLifetime: 18, medicFollowDistance: 60,
        playerFollowDistance: 55, playerFollowSight: 420, playerFollowMemory: 6, playerFollowSprintDistance: 120,
        shelterChancePercent: 65, shelterSearchRadius: 400, shelterDangerRadius: 70,
        shelterHoldSeconds: 25, shelterEntryTimeout: 18, shelterPlanInterval: 4 },
    // População inicial. zombieSafeRadius fica disponível para spawns aleatórios auxiliares; hordas usam waves.spawn.
    population: {
        zombies: 30,
        mutants: 1,
        civilians: 80,
        zombieSafeRadius: 300
    },
    // Três entradas: início, 2 e 4 minutos. Ponto fixo na entrada oeste.
    waves: { reinforcements: 2, zombiesPerHorde: 30, intervalSeconds: 120,
        mutantsPerHorde: 1, minimumMutants: 1, spawn: { x: 90, y: 870 }, spawnRadius: 85, spacing: 23 },
    interiors: { everyBlocks: 2, wallThickness: 10, doorwayWidth: 72, revealDistance: 100 },
    doors: { health: 160, interactionRadius: 55, attackRange: 36, attackDamage: 18, mutantDamage: 36, attackInterval: .9 },
    // Vida, movimento, proteção após dano e ponto inicial do jogador.
    player: {
        health: 100,
        walkSpeed: 78,
        runSpeed: 132,
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
    // Arma: dispersão em radianos; recuo acumula e recupera ao parar de disparar.
    pistol: {
        magazineSize: 7,
        initialReserve: 0,
        reloadSeconds: 1.15,
        shotInterval: 0.28,
        damage: 1,
        criticalPercent: 5,
        spread: .025, movingSpread: .055, recoilPerShot: .045, maxRecoil: .18, recoilRecovery: .22, kickSpeed: 65,
        range: 470,
        hitRadius: 13,
        noiseRadius: 340,
        noiseSeconds: 0.45
    },
    mutant: { health: 5, criticalHits: 2, speed: 170, killsToEvolve: 3 },
    melee: { range: 43, cooldown: 1.1, damage: 1, knockbackSpeed: 260, knockbackSeconds: .22,
        civilianDamage: .5, civilianCooldown: 1.6, civilianKnockbackSpeed: 80, civilianKnockbackSeconds: .14 },
    gore: { enabled: true, particlesPerHit: 14, maxParticles: 220, maxStains: 420, maxCorpses: 64,
        maxRemains: 100, gravity: 260, groundRefreshSeconds: .1 },
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
        chaseSpeed: 100,
        wanderSpeed: 80,
        sightRadius: 145,
        walkHearing: 42,
        runHearing: 105,
        civilianHearing: 55,
        memorySeconds: 3,
        contactDamage: 40,
        arrivalRadius: 12,
        wanderTurnMin: 2,
        wanderTurnMax: 5,
        obstacleTurnSeconds: 0.5
    },
    // Vida, fuga e percepção dos civis. initialPositions pode ser [] para sortear todos.
    civilian: {
        health: 100,
        speedMin: 64,
        speedMax: 75,
        firstSpeed: 64,
        runSpeed: 128,
        sprintDistance: 110,
        stamina: { max: 100, drainPerSecond: 32, recoveryPerSecond: 18, unlockPercent: 30 },
        invulnerability: 1.1,
        sightRadius: 230,
        hearingRadius: 55,
        escapeLookahead: 65,
        // Passeio autônomo quando não há ameaça.
        roamMinDistance: 180,
        roamMaxDistance: 480,
        roamArrivalRadius: 16,
        roamDestinationSeconds: 12,
        roamPausePercent: 15,
        roamPauseMin: .4,
        roamPauseMax: 1.2,
        roamStuckSeconds: 1.5,
        initialPositions: [] as {x:number;y:number}[]
    },
    // Chance por NOVO encontro; não por frame. Freeze = parado, flee = corrida aleatória.
    panic: {
        chancePercent: 15,
        civilianChancePercent: 60,
        freezePercent: 50,
        freezeMin: 2,
        freezeMax: 3.5,
        fleeMin: 1.5,
        fleeMax: 3,
        runSpeed: 142,
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
        patrolSpeed: 90,
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
        rubbleCount: 1800,
        mazeDistrictsEnabled: true
    },
    // Alcance visual, zoom da câmera e raios do escurecimento em pixels da tela.
    vision: {
        radius: 240,
        zoom: 1.5,
        clearScreenRadius: 210,
        darkScreenRadius: 360
    },
    // Luz 0–1; dispersão extra em radianos. Só humanos sofrem penalidades.
    lighting: { influencePercent: 100, ambient: .14, lampRadius: 185, shopRadius: 125, minimumSight: .42, darkSpread: .11, darknessOpacity: .78, textureCell: 8 },
    // Volumes 0–100. Gritos têm alcance e intervalo próprios para evitar cacofonia.
    audio: { masterPercent: 70, musicPercent: 28, effectsPercent: 65, growlRadius: 220,
        effectRadius: 520, voiceRadius: 430, voiceCooldown: 2.2, helpInterval: 9 },
    // Intensidade dos tremores e duração dos efeitos visuais.
    feedback: {
        shakeOnDamage: 0.003,
        shakeOnShot: 0.0015,
        shotTrailSeconds: 0.07,
        hitFlashSeconds: 0.12,
        criticalTextSeconds: 0.65
    }
};

export const defaultConfig=structuredClone(config);
if(typeof window!=='undefined') {
    try {
        const saved=window.localStorage.getItem(SETTINGS_KEY);
        if(saved) {
            const values=validateSettings(JSON.parse(saved),defaultConfig);
            for(const setting of settings)writeValue(config,setting.path,values[setting.path]);
        }
    } catch { /* Invalid/unavailable storage falls back to the entire default configuration. */ }
}
// Falhe com mensagem útil em vez de gerar sorteios ou navegação inválidos.
const percentages = [config.tactics.shelterChancePercent, config.panic.civilianChancePercent, config.npc.socialTalkPercent, config.civilian.roamPausePercent, config.audio.masterPercent, config.audio.musicPercent, config.audio.effectsPercent, config.civilian.stamina.unlockPercent, config.stamina.unlockPercent, config.pistol.criticalPercent, config.panic.chancePercent,
    config.panic.freezePercent, config.horde.joinPercent, config.horde.wanderCohesionPercent, config.horde.patrolCohesionPercent];
if (percentages.some(value => !Number.isFinite(value) || value < 0 || value > 100)) throw new Error('config: porcentagens devem estar entre 0 e 100.');
if (config.horde.patrolCohesionPercent >= 50) throw new Error('config: patrolCohesionPercent deve ser menor que 50 para a horda avançar.');
for (const [name, min, max] of [
    ['distância de passeio', config.civilian.roamMinDistance, config.civilian.roamMaxDistance],
    ['pausa de passeio', config.civilian.roamPauseMin, config.civilian.roamPauseMax],
    ['velocidade civil', config.civilian.speedMin, config.civilian.speedMax],
    ['congelamento', config.panic.freezeMin, config.panic.freezeMax], ['corrida em pânico', config.panic.fleeMin, config.panic.fleeMax],
    ['rumo ocioso', config.zombie.wanderTurnMin, config.zombie.wanderTurnMax], ['adesão à horda', config.horde.joinIntervalMin, config.horde.joinIntervalMax],
    ['duração da horda', config.horde.lifetimeMin, config.horde.lifetimeMax],
] as const) if (min < 0 || max < min) throw new Error(`config: intervalo inválido: ${name}.`);
for (const value of [config.waves.reinforcements, config.waves.zombiesPerHorde, config.waves.mutantsPerHorde, config.waves.minimumMutants, config.population.mutants, config.population.zombies, config.population.civilians, config.npc.soldiers, config.npc.medics, config.npc.medicalCharges, config.npc.soldierRounds, config.npc.soldierClip, config.npc.ammoGift, config.ammo.boxes, config.ammo.roundsPerBox, config.world.rubbleCount, config.pistol.initialReserve])
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
if ([config.lighting.ambient, config.lighting.minimumSight, config.lighting.darknessOpacity].some(value => value > 1) ||
    config.lighting.textureCell <= 0 || config.lighting.lampRadius <= 0 || config.lighting.shopRadius <= 0 ||
    config.audio.effectRadius <= 0 || config.audio.voiceRadius <= 0)
    throw new Error('config: luz e opacidade devem ficar entre 0 e 1; células e alcances devem ser positivos.');
if (![config.world.width, config.world.height, config.player.health, config.civilian.health, config.zombie.health, config.vision.zoom].every(value => value > 0) ||
    config.vision.darkScreenRadius <= config.vision.clearScreenRadius || !Number.isInteger(config.pistol.magazineSize))
    throw new Error('config: vida, dimensões e zoom devem ser positivos; raio escuro deve superar o claro; carregador deve ser inteiro.');

if (config.waves.intervalSeconds <= 0 || config.waves.spacing < 18 || config.waves.spawnRadius <= 0) throw new Error('config: intervalo/raio de horda devem ser positivos e spacing deve ser ao menos 18 px.');

if (!Number.isInteger(config.interiors.everyBlocks) || config.interiors.everyBlocks<1 ||
    config.interiors.wallThickness<4 || config.interiors.wallThickness>14 || config.interiors.doorwayWidth<36 || config.interiors.doorwayWidth>150 ||
    config.doors.health<=0 || config.doors.attackInterval<=0 || config.doors.interactionRadius<=0)
    throw new Error('config: confira frequência dos interiores, espessura das paredes (4–14), largura das portas (36–150), vida e intervalos.');

if(config.tactics.thinkInterval<=0||config.tactics.allyMemory<=0||config.tactics.shelterHoldSeconds<=0||config.tactics.shelterEntryTimeout<=0||config.tactics.shelterPlanInterval<=0)
    throw new Error('config: intervalos e memória da IA devem ser positivos.');

for(const count of [config.gore.particlesPerHit,config.gore.maxParticles,config.gore.maxStains,config.gore.maxCorpses,config.gore.maxRemains])
    if(!Number.isInteger(count)||count<0)throw new Error('config: limites de gore devem ser inteiros não negativos.');
if(config.gore.gravity<=0||config.gore.groundRefreshSeconds<=0)throw new Error('config: gravidade e intervalo visual do gore devem ser positivos.');

if(!Number.isInteger(config.tactics.squadMaxMembers)||config.tactics.squadMaxMembers<1||config.tactics.squadMaxMembers>3||
    !Number.isInteger(config.tactics.escortCivilianLimit)||config.tactics.escortCivilianLimit<1||config.tactics.escortCivilianLimit>5||config.tactics.medicsPerGroup!==1||config.tactics.evacuationTimeout<=0||
    config.tactics.evacuationCooldown<=0||config.tactics.rescueSearchSeconds<=0||config.tactics.rescueSearchLifetime<=0||config.tactics.medicFollowDistance<=0||!Number.isInteger(config.tactics.shelterCapacity)||config.tactics.shelterCapacity<1)throw new Error('config: esquadrão entre 1 e 3, até 5 civis e 1 médico por grupo e tempos de escolta positivos.');

if([config.tactics.playerFollowDistance,config.tactics.playerFollowSight,config.tactics.playerFollowMemory,config.tactics.playerFollowSprintDistance].some(value=>value<=0))
    throw new Error('config: distância, visão, memória e limite de corrida dos seguidores devem ser positivos.');

if(!Number.isInteger(config.npc.spawnColumns)||config.npc.spawnColumns<1||!Number.isInteger(config.npc.spawnRows)||config.npc.spawnRows<1||config.npc.spawnSeparation<=18)
    throw new Error('config: setores de população inteiros positivos e separação maior que 18 px.');
