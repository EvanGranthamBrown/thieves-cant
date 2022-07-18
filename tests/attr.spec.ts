import { Attr, Entity } from '../src/attr';
import { ExprType } from '../src/expr-base';

describe('Entity', () => {
  it('runs on a valid template without erroring', () => {
    expect(() => {
      const entity = new Entity({
        dexMod: {
          type: 'number',
          calc: 'floor((dexterity - 10) / 2)',
        },
      });
    }).not.toThrow();
  });

  it('errors when an attribute type does not match its calc formula', () => {
    expect(() => {
      const entity = new Entity({
        dexMod: {
          type: 'text',
          calc: 'floor((dexterity - 10) / 2)',
        },
      });
    }).toThrow();
  });

  it('computes dependencies properly', () => {
    const entity = new Entity({
      dexterity: {
        type: 'number',
      },
      dexMod: {
        type: 'number',
        calc: 'floor((dexterity - 10) / 2)',
      },
      initiative: {
        type: 'number',
        calc: '1d20 + dexMod',
      },
      baseArmorClass: {
        type: 'number',
        calc: '10 + dexMod',
      },
    });

    expect(entity._attrs.dexterity.requires).toEqual([]);
    expect(entity._attrs.dexterity.requiredBy).toEqual([
      { attr: entity._attrs.dexMod, marked: false },
    ]);

    expect(entity._attrs.dexMod.requires).toEqual([
      { attr: entity._attrs.dexterity, marked: false },
    ]);
    expect(entity._attrs.dexMod.requiredBy).toEqual([
      { attr: entity._attrs.initiative, marked: false },
      { attr: entity._attrs.baseArmorClass, marked: false },
    ]);

    expect(entity._attrs.initiative.requires).toEqual([
      { attr: entity._attrs.dexMod, marked: false },
    ]);
    expect(entity._attrs.initiative.requiredBy).toEqual([]);
  });
});
