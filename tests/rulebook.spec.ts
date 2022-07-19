import { Rulebook } from '../src/rulebook';
import { EntityTemplate } from '../src/entity-template';
import { ExprType } from '../src/expr-base';

describe('Rulebook', () => {
  let rulebook: Rulebook;

  beforeEach(() => {
    rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
      armor: {
        includes: ['item'],
        attrs: {
          baseArmorClass: {
            type: 'number',
          },
        },
      },
      plate: {
        includes: ['armor'],
        attrs: {
          weight: {
            calc: '65',
          },
          baseArmorClass: {
            calc: '18',
          },
        },
      },
    });
  })
  it('generates an entry for each top-level key in the JSON', () => {
    expect(Object.keys(rulebook.entries)).toEqual(['item', 'armor', 'plate']);
  });
  it('generates a template for each entry', () => {
    for(let name in rulebook.entries) {
      expect(rulebook.entries[name].template).toBeInstanceOf(EntityTemplate);
    }
  });
  it('generates the correct template attributes for an entry without includes', () => {
    const item = rulebook.entries.item.template;

    expect(Object.keys(item.__attrs).length).toEqual(1); // weight

    expect(item.__attrs.weight.type).toEqual(ExprType.Number);
    expect(item.__attrs.weight.calc).toEqual(undefined);
  });
  it('an entry without includes matches only itself', () => {
    const item = rulebook.entries.item.template;

    expect(item.__is('item')).toBeTruthy();
    expect(item.__is('armor')).toBeFalsy();
    expect(item.__is('plate')).toBeFalsy();
    expect(item.__is('flumph')).toBeFalsy();
  });
  it('generates the correct template attributes for an entry with a simple include', () => {
    const armor = rulebook.entries.armor.template;

    expect(Object.keys(armor.__attrs).length).toEqual(2); // weight, baseArmorClass

    expect(armor.__attrs.weight.type).toEqual(ExprType.Number);
    expect(armor.__attrs.weight.calc).toEqual(undefined);

    expect(armor.__attrs.baseArmorClass.type).toEqual(ExprType.Number);
    expect(armor.__attrs.baseArmorClass.calc).toEqual(undefined);
  });
  it('an entry with a simple include matches itself and its include', () => {
    const armor = rulebook.entries.armor.template;

    expect(armor.__is('item')).toBeTruthy();
    expect(armor.__is('armor')).toBeTruthy();
    expect(armor.__is('plate')).toBeFalsy();
    expect(armor.__is('flumph')).toBeFalsy();
  });
  it('generates the correct template attributes for an entry with transitive includes', () => {
    const plate = rulebook.entries.plate.template;

    expect(Object.keys(plate.__attrs).length).toEqual(2); // weight, baseArmorClass

    expect(plate.__attrs.weight.type).toEqual(ExprType.Number);
    expect(plate.__attrs.weight.calc.eval({})).toEqual(65);

    expect(plate.__attrs.baseArmorClass.type).toEqual(ExprType.Number);
    expect(plate.__attrs.baseArmorClass.calc.eval({})).toEqual(18);
  });
  it('an entry with transitive includes matches itself and its whole include chain', () => {
    const plate = rulebook.entries.plate.template;

    expect(plate.__is('item')).toBeTruthy();
    expect(plate.__is('armor')).toBeTruthy();
    expect(plate.__is('plate')).toBeTruthy();
    expect(plate.__is('flumph')).toBeFalsy();
  });
});

