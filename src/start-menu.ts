import {config,defaultConfig} from './config';
import {settings,readValue,validateSettings,SETTINGS_KEY} from './settings-model';
export function showStartMenu(start:()=>unknown) {
    const app=document.querySelector<HTMLElement>('#app')!;
    const panel=document.createElement('section');panel.className='start-menu';panel.setAttribute('aria-label','Menu inicial');app.append(panel);
    function home() {
        panel.innerHTML=`<div class="menu-eyebrow">NEUSTADT · ZONA DE CONTENÇÃO</div><h2>A cidade ainda respira.</h2><p>Elimine todos os infectados das ${config.waves.reinforcements+1} ondas.<br>Mantenha pelo menos um civil vivo e sobreviva.</p><div class="mission-summary">${config.population.civilians-config.npc.soldiers-config.npc.medics} civis · ${config.npc.soldiers} soldados · ${config.npc.medics} médicos<br>Reforços a cada ${config.waves.intervalSeconds}s · infectados podem converter humanos</div><button type="button" class="primary" id="start-game">Iniciar jogo</button><button type="button" id="open-settings">Configurações</button>`;
        panel.querySelector<HTMLButtonElement>('#start-game')!.onclick=()=>{
            panel.remove();start();
            const back=document.createElement('button');back.className='back-menu';back.textContent='Menu inicial';back.onclick=()=>location.reload();document.querySelector('.audio-controls')!.prepend(back);
        };
        panel.querySelector<HTMLButtonElement>('#open-settings')!.onclick=()=>configure();
    }
    function configure() {
        panel.innerHTML='<div class="settings-heading"><div><div class="menu-eyebrow">REGRAS DA PRÓXIMA PARTIDA</div><h2>Configurações</h2></div><button type="button" id="cancel-settings">Voltar</button></div><p>As alterações são salvas neste navegador e valem para novas partidas. Influência da escuridão em 0% remove as penalidades humanas de visão e mira; zumbis não são afetados.</p><form><div class="settings-fields"></div><p class="settings-error" role="alert"></p><div class="settings-actions"><button type="button" id="reset-settings">Restaurar padrões</button><button class="primary" type="submit">Salvar configurações</button></div></form>';
        const fields=panel.querySelector('.settings-fields')!,inputs=new Map<string,HTMLInputElement>();
        for(const group of new Set(settings.map(s=>s.group))) {
            const fieldset=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=group;fieldset.append(legend);fields.append(fieldset);
            for(const setting of settings.filter(s=>s.group===group)) {
                const label=document.createElement('label'),text=document.createElement('span'),input=document.createElement('input');text.textContent=setting.label;input.type='number';input.min=String(setting.min);input.max=String(setting.max);input.step=String(setting.step);input.value=String(readValue(config,setting.path));input.required=true;label.append(text,input);fieldset.append(label);inputs.set(setting.path,input);
            }
        }
        panel.querySelector<HTMLButtonElement>('#cancel-settings')!.onclick=home;
        panel.querySelector<HTMLButtonElement>('#reset-settings')!.onclick=()=>{for(const setting of settings)inputs.get(setting.path)!.value=String(readValue(defaultConfig,setting.path));panel.querySelector('.settings-error')!.textContent='Padrões restaurados no formulário. Salve para aplicar.';};
        panel.querySelector('form')!.onsubmit=event=>{
            event.preventDefault();
            try {
                const values=validateSettings(Object.fromEntries([...inputs].map(([key,input])=>[key,input.valueAsNumber])),defaultConfig);
                localStorage.setItem(SETTINGS_KEY,JSON.stringify(values));location.reload();
            } catch(error) {panel.querySelector('.settings-error')!.textContent=error instanceof Error?error.message:'Não foi possível salvar as configurações neste navegador.';}
        };
    }
    home();
}
