import type {Campaign} from './campaign.ts';
import {NEIGHBORHOODS} from './polish.ts';
import {atPoint} from './navigation.ts';
export const FIELD_NOTES=[
 'Brass Walk: the Quarter’s balcony stages turn a normal street into a nightly gathering place.',
 'Heritage Trail: Tremé’s station and reading room preserve the stories behind its music.',
 'Magnolia Way: the Garden District mixes shaded courtyards, flowers and old-money facades.',
 'River Freight: the Docks live by manifests, repair shifts and the next boat’s arrival.',
 'Cypress Landing: quiet observation and safe distances matter around the Bayou waterways.',
];
export function inspectNeighborhood(c:Campaign,x:number,z:number){
 const index=NEIGHBORHOODS.findIndex(n=>atPoint(x,z,n,5));if(index<0)return null;const area=NEIGHBORHOODS[index]!;
 if(c.districtVisits.includes(area.id))return `${area.name} field note already recorded. ${FIELD_NOTES[index]}`;
 c.districtVisits.push(area.id);return `FIELD NOTE ${c.districtVisits.length}/5 · ${FIELD_NOTES[index]} No cash or ownership granted.`;
}
