// Desktop reference specifications; memory variants are separate entries. Reviewed 2026-11-27.
const specs: [string, number, number, string][] = [
  ['5090',32,1792,'50'], ['5080',16,960,'50'], ['5070 Ti',16,896,'50'], ['5070',12,672,'50'],
  ['5060 Ti',16,448,'50'], ['5060 Ti',8,448,'50'], ['5060',8,448,'50'], ['5050',8,320,'50'],
  ['4090',24,1008,'40'], ['4080 SUPER',16,736,'40'], ['4080',16,716.8,'40'],
  ['4070 Ti SUPER',16,672,'40'], ['4070 Ti',12,504,'40'], ['4070 SUPER',12,504,'40'],
  ['4070 GDDR6X',12,504,'40'], ['4060 Ti',16,288,'40'], ['4060 Ti',8,288,'40'], ['4060',8,272,'40'],
  ['3090 Ti',24,1008,'30'], ['3090',24,936,'30'], ['3080 Ti',12,912,'30'],
  ['3080',12,912,'30'], ['3080',10,760,'30'], ['3070 Ti',8,608,'30'], ['3070',8,448,'30'],
  ['3060 Ti GDDR6',8,448,'30'], ['3060',12,360,'30'], ['3060',8,240,'30'],
  ['3050',8,224,'30'], ['3050',6,168,'30'],
];
export const GPUS = specs.map(([model,vram,bandwidth,generation]) => ({
  name: `NVIDIA GeForce RTX ${model} · ${vram} GB`, vram, bandwidth,
  source: `https://www.nvidia.com/en-us/geforce/graphics-cards/compare/?section=compare-${generation}`,
}));

export function contextK(tokens: number | null | undefined): string {
  return tokens == null ? 'Not specified' : `${Number((tokens / 1024).toFixed(2))}K`;
}
