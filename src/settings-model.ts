export type Setting = {path:string;label:string;group:string;min:number;max:number;step:number};
const field=(group:string,path:string,label:string,min:number,max:number,step=1):Setting=>({group,path,label,min,max,step});
export const settings:Setting[]=[
field('Partida','waves.reinforcements','Ondas adicionais (além da inicial)',0,2),
field('Partida','waves.intervalSeconds','Intervalo das ondas (s)',15,300),
field('Partida','population.civilians','Total de humanos',20,80),
field('Partida','npc.soldiers','Soldados',0,20),field('Partida','npc.medics','Médicos',0,10),
field('Partida','population.zombies','Zumbis na primeira onda',1,30),field('Partida','waves.zombiesPerHorde','Zumbis por reforço',1,30),
field('Partida','population.mutants','Evoluídos iniciais',1,3),field('Partida','waves.mutantsPerHorde','Evoluídos por reforço',1,3),
field('Combate','zombie.contactDamage','Dano da mordida (jogador e NPCs)',1,100),
field('Combate','zombie.health','Vida do zumbi',1,20),field('Combate','mutant.health','Vida do evoluído',1,40),
field('Combate','pistol.damage','Dano da pistola',0.25,10,0.25),field('Combate','pistol.criticalPercent','Crítico (%)',0,100),
field('Combate','pistol.magazineSize','Balas no carregador',1,30),field('Combate','pistol.initialReserve','Munição inicial reserva',0,200),
field('Combate','pistol.reloadSeconds','Tempo de recarga (s)',0.2,5,0.05),field('Combate','pistol.shotInterval','Intervalo de disparo (s)',0.1,2,0.01),
field('Combate','pistol.spread','Dispersão parada (rad)',0,0.3,0.005),field('Combate','pistol.movingSpread','Dispersão em movimento (rad)',0,0.3,0.005),
field('Combate','pistol.recoilPerShot','Recuo por tiro (rad)',0,0.2,0.005),
field('Combate','melee.damage','Dano corpo a corpo treinado',0.25,10,0.25),field('Combate','melee.civilianDamage','Dano corpo a corpo civil',0.25,5,0.25),
field('Combate','npc.soldierRounds','Munição por soldado',0,100),field('Combate','ammo.boxes','Caixas de munição',0,100),field('Combate','ammo.roundsPerBox','Balas por caixa',1,30),
field('Humanos','player.health','Vida do jogador',25,300),field('Humanos','civilian.health','Vida dos NPCs',25,300),
field('Humanos','player.walkSpeed','Caminhada do jogador',30,120),field('Humanos','player.runSpeed','Corrida do jogador',121,220),
field('Humanos','civilian.speedMin','Caminhada mínima dos NPCs',30,75),field('Humanos','civilian.speedMax','Caminhada máxima dos NPCs',75,120),field('Humanos','civilian.runSpeed','Corrida dos NPCs',121,220),
field('Humanos','stamina.drainPerSecond','Consumo de stamina do jogador / s',5,60),field('Humanos','stamina.recoveryPerSecond','Recuperação de stamina / s',5,60),
field('Humanos','panic.civilianChancePercent','Pânico dos civis (%)',0,100),field('Humanos','panic.chancePercent','Pânico dos especialistas (%)',0,100),field('Humanos','panic.freezePercent','Pânico com paralisia (%)',0,100),
field('Humanos','npc.healAmount','Cura por atendimento',5,100),field('Humanos','npc.medicalCharges','Atendimentos por médico',0,20),
field('Humanos','tactics.shelterCapacity','Civis por abrigo',1,12),field('Humanos','tactics.squadMaxMembers','Soldados por grupo',1,3),field('Humanos','tactics.escortCivilianLimit','Civis por escolta',1,5),
field('Infectados','zombie.chaseSpeed','Velocidade de perseguição',30,180),field('Infectados','zombie.wanderSpeed','Velocidade ao vagar',20,140),field('Infectados','mutant.speed','Velocidade do evoluído',80,240),
field('Infectados','zombie.sightRadius','Visão dos zumbis (px)',40,350),field('Infectados','zombie.runHearing','Audição de corrida (px)',20,250),field('Infectados','zombie.memorySeconds','Memória dos zumbis (s)',1,15),
field('Infectados','horde.joinPercent','Tendência de formar horda (%)',0,100),field('Infectados','horde.patrolSpeed','Velocidade da patrulha',20,150),field('Infectados','mutant.killsToEvolve','Vítimas para evoluir',1,10),
field('Luz e cidade','lighting.influencePercent','Influência da escuridão na visão e mira (%)',0,100),
field('Luz e cidade','lighting.ambient','Luz ambiente',0,1,0.01),field('Luz e cidade','lighting.minimumSight','Visão mínima no escuro',0.1,1,0.01),field('Luz e cidade','lighting.darkSpread','Dispersão extra no escuro (rad)',0,0.3,0.01),
field('Luz e cidade','vision.radius','Alcance de visão do jogador (px)',120,400),field('Luz e cidade','doors.health','Resistência das portas',40,400),field('Luz e cidade','doors.attackDamage','Dano dos zumbis nas portas',1,80),
];
export const SETTINGS_KEY='dead-district-settings-v1';
export function readValue(source:object,path:string):number {
    return path.split('.').reduce<unknown>((o,k)=>(o as Record<string,unknown>)[k],source) as number;
}
export function writeValue(source:object,path:string,value:number) {
    const keys=path.split('.'),last=keys.pop()!;
    const target=keys.reduce<unknown>((o,k)=>(o as Record<string,unknown>)[k],source) as Record<string,unknown>;
    target[last]=value;
}
export function validateSettings(raw:unknown,defaults:object):Record<string,number> {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Configurações inválidas.');
    const values:Record<string,number>={};
    for(const setting of settings) {
        const value=(raw as Record<string,unknown>)[setting.path]??readValue(defaults,setting.path);
        if(typeof value!=='number'||!Number.isFinite(value)||value<setting.min||value>setting.max||Math.abs((value-setting.min)/setting.step-Math.round((value-setting.min)/setting.step))>0.00001)
            throw new Error(`${setting.label}: use um valor de ${setting.min} a ${setting.max}, em passos de ${setting.step}.`);
        values[setting.path]=value;
    }
    if(values['npc.soldiers']+values['npc.medics']>=values['population.civilians'])throw new Error('Reserve ao menos um humano para ser civil comum.');
    return values;
}
