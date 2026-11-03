export type Outcome='victory'|'civilians-lost'|undefined;
export function matchOutcome(civilians:number,infected:number,wavesComplete:boolean):Outcome {
    if(civilians<=0)return 'civilians-lost';
    if(wavesComplete&&infected===0)return 'victory';
    return undefined;
}
