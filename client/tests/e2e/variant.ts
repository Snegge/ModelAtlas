import {Locator} from '@playwright/test';
export async function chooseVariant(select:Locator,label:string) {
  await select.click();
  await select.page().getByRole('option',{name:label,exact:true}).click();
}
