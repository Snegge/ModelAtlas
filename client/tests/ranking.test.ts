import { describe, it, expect } from "vitest";
import { evaluate, quality, compareRecommendations, recommendedVariant, EMPTY_PROFILE, readWorkspace, GPUS } from "../src/app/workspace/ranking";
import { Release, Artifact, Estimate } from "../src/app/core/models";
const r = { id:"test", qualityRating:{score:60}, referenceQuality:{values:[.8,.4],score:60} } as Release;
const a = { id:"q4", sizeBytes:4*2**30 } as Artifact;
const e = {status:"gpu-fit",weightsGiB:4,cacheGiB:1,totalGiB:6,speed:{low:20,high:40,typical:30},eligible:true,suitabilityScore:60,contextSatisfied:true,reasons:[]} as Estimate;
const gpu = GPUS.find(x=>x.vram===12 && x.bandwidth===360)!;
const p = {...EMPTY_PROFILE,gpu:gpu.name,vram:gpu.vram,bandwidth:gpu.bandwidth};
describe("evidence-based catalog ranking",()=>{
  it("has no default personal hardware and discards legacy fields",()=>{
    expect(readWorkspace(null).profile).toEqual(EMPTY_PROFILE);
    const stored=readWorkspace(JSON.stringify({profile:{...p,ram:64,cpu:'old',offload:true}}));
    expect(stored.profile).toEqual({...p,ram:64});expect(stored.profile).not.toHaveProperty('offload');
    expect(readWorkspace('{').profile).toEqual(EMPTY_PROFILE);
  });
  it("preserves unlimited favourites and migrates old comparisons",()=>{
    const ids=Array.from({length:100},(_,i)=>'id-'+i);
    expect(readWorkspace(JSON.stringify({favourites:[...ids,ids[0],null,1]})).favourites).toEqual(ids);
    expect(readWorkspace(JSON.stringify({favourites:[],comparisons:['old']})).favourites).toEqual([]);
    expect(readWorkspace(JSON.stringify({comparisons:['a','a','b']})).favourites).toEqual(['a','b']);
  });
  it("uses measured reference values and never invents quantization penalties",()=>{
    expect(quality(r,'All tasks')).toBe(60);expect(quality(r,'IFEval')).toBe(80);expect(quality(r,'MMLU-Pro')).toBe(40);
    expect(evaluate(r,a,e,p,'All tasks').score).toBe(evaluate(r,{...a,id:'q8'},e,p,'Coding').score);
  });
  it("requires fit, supplied bandwidth and conservative minimum speed",()=>{
    expect(evaluate(r,a,e,EMPTY_PROFILE,'All tasks').eligible).toBe(false);
    expect(evaluate(r,a,e,{...p,bandwidth:null},'All tasks').eligible).toBe(false);
    expect(evaluate(r,a,{...e,status:'outside-budget'},p,'All tasks').eligible).toBe(false);
    expect(evaluate(r,a,e,p,'All tasks').eligible).toBe(true);
    expect(evaluate(r,a,{...e,eligible:false},p,'All tasks').eligible).toBe(false);
  });
  it("consumes server speed instead of using a second context formula",()=>{
    expect(evaluate(r,a,e,p,'All tasks').speed).toEqual(e.speed);
    expect(evaluate(r,a,null,p,'All tasks').speed).toBeNull();
  });
  it("gates suitability without changing original quality or hiding slow speed",()=>{
    expect(evaluate(r,a,e,p,'All tasks').score).toBe(60);
    const slow=evaluate(r,a,{...e,suitabilityScore:0,eligible:false}, p,'All tasks');
    expect(slow.score).toBe(0);expect(slow.speed).toEqual(e.speed);
    expect(slow.assessmentMessage).toContain('does not meet');
    const unfit=evaluate(r,a,{...e,status:'outside-budget',suitabilityScore:0},p,'All tasks');
    expect(unfit.score).toBe(0);expect(unfit.speedMessage).toBe('Insufficient VRAM');
    expect(unfit.r.qualityRating.score).toBe(60);
    const context=evaluate(r,a,{...e,status:'outside-budget',contextSatisfied:false},p,'All tasks');
    expect(context.score).toBe(0);expect(context.speedMessage).toBe('Context limit exceeded');
  });
  it("keeps missing inputs, loading and failure unassessed with actionable messages",()=>{
    const memory=evaluate(r,a,e,EMPTY_PROFILE,'All tasks');
    expect(memory.score).toBeNull();expect(memory.speedMessage).toBe('Select a GPU');
    for(const bandwidth of [null,0]) {
      const missing=evaluate(r,a,e,{...p,bandwidth},'All tasks');
      expect(missing.score).toBeNull();expect(missing.speedMessage).toBe('Enter GPU memory bandwidth');
    }
    const pending=evaluate(r,a,null,p,'All tasks');
    expect(pending.score).toBeNull();expect(pending.scoreText).toBe('Calculating…');
    for(const state of ['failed','ready'] as const) {
      const failed=evaluate(r,a,null,p,'All tasks',state);
      expect(failed.score).toBeNull();expect(failed.speedMessage).toContain('retry');
    }
    const invalid=evaluate(r,a,{...e,status:'unknown',speed:null,suitabilityScore:null,reasons:['Missing architecture parameters.']},p,'All tasks');
    expect(invalid.score).toBeNull();expect(invalid.assessmentMessage).toContain('Missing architecture');
  });
  it("recommends a feasible variant even if another variant fails",()=>{
    const small=evaluate(r,a,e,p,'All tasks');
    const large=evaluate(r,{...a,id:'q8',sizeBytes:8*2**30},{...e,status:'outside-budget'},p,'All tasks');
    expect(recommendedVariant([large,small]).a.id).toBe('q4');
  });
  it("orders fit then composite score then speed with stable tie-breaking",()=>{
    const row=(id:string,score:number,low:number,fit=true)=>evaluate({...r,id,qualityRating:{...r.qualityRating,score}},a,{...e,status:fit?'gpu-fit':'outside-budget',suitabilityScore:score,speed:{low,high:low+10,typical:low+5,method:'fixture'}},p,'All tasks');
    const rows=[row('unfit',99,99,false),row('lower',59.9,100),row('slow',60.9,20),row('fast',60.1,30),row('higher',61.1,15)];
    expect(rows.sort(compareRecommendations).map(x=>x.r.id)).toEqual(['higher','slow','fast','lower','unfit']);
  });
  it("restores sourced GPU values and discards unknown hardware",()=>{
    expect(readWorkspace(JSON.stringify({profile:{...p,gpu:'unknown'}})).profile).toEqual(EMPTY_PROFILE);
    expect(GPUS.length).toBeGreaterThanOrEqual(30);
    expect(readWorkspace(JSON.stringify({profile:{...p,vram:999,bandwidth:999}})).profile).toEqual(p);
  });
});
