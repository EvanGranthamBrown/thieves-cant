import { EntityTemplate } from '../src/attr';
import { CircularDependencyError, AttributeTypeError } from '../src/errors';
import { ExprType } from '../src/expr-base';

describe('EntityTemplate', () => {
  it('runs on a valid template without erroring', () => {
    expect(() => {
      const entity = new EntityTemplate('creature', {
        attrs: {
          dexterity: {
            type: 'number',
          },
          dexMod: {
            type: 'number',
            calc: 'floor((dexterity - 10) / 2)',
          },
        },
      });
    }).not.toThrow();
  });

  it('errors when an attribute type does not match its calc formula', () => {
    expect(() => {
      const entity = new EntityTemplate('creature', {
        attrs: {
          dexterity: {
            type: 'number',
          },
          dexMod: {
            type: 'text',
            calc: 'floor((dexterity - 10) / 2)',
          },
        },
      });
    }).toThrow(AttributeTypeError);
  });

  it('computes dependencies properly', () => {
    const entity = new EntityTemplate('creature', {
      attrs: {
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
      },
    });

    expect(entity.attrs.dexterity.depends).toEqual([
    ]);

    expect(entity.attrs.dexMod.depends).toEqual([
      { attr: entity.attrs.dexterity, reverseAttr: entity.attrs.dexMod, marked: false },
    ]);

    expect(entity.attrs.initiative.depends).toEqual([
      { attr: entity.attrs.dexMod, reverseAttr: entity.attrs.initiative, marked: false },
    ]);

    expect(entity.attrs.baseArmorClass.depends).toEqual([
      { attr: entity.attrs.dexMod, reverseAttr: entity.attrs.baseArmorClass, marked: false },
    ]);
  });

  it('computes reverse dependencies properly', () => {
    const entity = new EntityTemplate('creature', {
      attrs: {
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
      },
    });

    expect(entity.attrs.dexterity.reverseDepends).toEqual([
      { attr: entity.attrs.dexterity, reverseAttr: entity.attrs.dexMod, marked: false },
    ]);

    expect(entity.attrs.dexMod.reverseDepends).toEqual([
      { attr: entity.attrs.dexMod, reverseAttr: entity.attrs.initiative, marked: false },
      { attr: entity.attrs.dexMod, reverseAttr: entity.attrs.baseArmorClass, marked: false },
    ]);

    expect(entity.attrs.initiative.reverseDepends).toEqual([
    ]);

    expect(entity.attrs.baseArmorClass.reverseDepends).toEqual([
    ]);
  });

  it('errors on a circular dependency', () => {
    expect(() => {
      const entity = new EntityTemplate('creature', {
        attrs: {
          strMod: {
            type: 'number',
          },
          challengeRating: {
            type: 'number',
            calc: 'floor(attackMod / 5)'
          },
          profBonus: {
            type: 'number',
            calc: 'floor((challengeRating + 5) / 4)',
          },
          attackMod: {
            type: 'number',
            calc: 'profBonus + strMod',
          },
        },
      });
    }).toThrow(CircularDependencyError);
  });
});
